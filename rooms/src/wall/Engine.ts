import * as THREE from "three";
import Wall from "./Wall";
import Drag from "./Drag";
import Hover from "./Hover";
import { detectQuality, type QualityProfile } from "./quality";
import type { RoomCard } from "../roomsData";

export interface EngineOptions {
  cards: RoomCard[];
}

// Front-arc label gate: a card is labelled only when its (top) surface Z is
// above this (i.e. near the front of the cylinder, not wrapped to the sides).
// Tuned to keep ~3–5 labels visible at once so they never pile up.
const FRONT_LABEL_Z = -1.6;

/** Screen-space projection of one card, fed to the DOM label overlay. */
export interface CardProjection {
  index: number;
  x: number; // CSS px
  y: number; // CSS px
  visible: boolean; // in front of camera + within viewport bleed
}

/**
 * Engine — owns the Three.js Scene / Camera / Renderer + the wallGroup the cards
 * live in, and drives the render loop. Forked from halls/src/depth-gallery/
 * Engine.ts; the dual-scene background pass is dropped (single scene, autoClear
 * on, ink-deep clear color), and the camera is FIXED while a wallGroup pans in
 * X/Y (vs. halls panning the camera in Z).
 *
 * Reused verbatim from the fork: IntersectionObserver RAF-pause, ResizeObserver,
 * pixelRatio cap from the quality profile, reduced-motion idle short-circuit
 * (keyed here on the PAN OFFSET being unchanged), idempotent disposed guard, and
 * the strict dispose order (stop → listeners → drag/hover → wall → renderer).
 * Wall is the sole GPU-dispose owner of geometries/materials/textures.
 *
 * Per-frame feeds to React (via stable callbacks): the active card index
 * (nearest the viewport centre) and the projected screen positions of every
 * card (for the DOM label overlay) — written imperatively, never through React
 * state, to avoid re-render storms / jitter.
 */
export default class Engine {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly quality: QualityProfile;

  public readonly group: THREE.Group;
  public readonly wall: Wall;
  public drag: Drag | null = null;
  public hover: Hover | null = null;

  private readonly canvas: HTMLCanvasElement;
  private rafId: number | null = null;
  private running = false;
  private disposed = false;
  private initialized = false;
  private readonly observer: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly handleResize: () => void;
  private readonly handleVisibility: IntersectionObserverCallback;
  private renderErrorLogged = false;

  // Active-index feed.
  private activeCallback: ((index: number) => void) | null = null;
  private lastActiveIndex = -1;

  // Projection feed (label overlay).
  private projectionCallback: ((projections: CardProjection[]) => void) | null =
    null;
  private projScratch = new THREE.Vector3();

  // Reduced-motion idle short-circuit: the pan offset at the last GPU draw.
  private lastPanX = Number.NaN;
  private lastPanY = Number.NaN;
  private hasPaintedOnce = false;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.canvas = canvas;
    this.quality = detectQuality();

    this.scene = new THREE.Scene();

    const { clientWidth, clientHeight } = this.getViewportSize();
    // Narrow FOV (~30°) at a fair distance → near-orthographic read but keeps a
    // whisper of perspective so the barrel curve reads. Camera is FIXED; the
    // wallGroup pans. far plane comfortably past the deepest curved card.
    this.camera = new THREE.PerspectiveCamera(
      30,
      clientWidth / clientHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 8.5);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.quality.pixelRatioCap),
    );
    // Ink-deep (§5 warm near-black, NOT pure black). Opaque clear.
    this.renderer.setClearColor(0x1a1410, 1);
    this.renderer.setSize(clientWidth, clientHeight, false);

    // The pannable group all cards live in.
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.wall = new Wall(this.scene, this.group, opts.cards, this.quality);

    this.handleResize = (): void => {
      if (this.disposed) return;
      const size = this.getViewportSize();
      this.camera.aspect = size.clientWidth / size.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(size.clientWidth, size.clientHeight, false);
      // Recompute pan bounds + drag scale for the new viewport.
      const bounds = this.wall.computeBounds(
        this.camera,
        size.clientWidth,
        size.clientHeight,
      );
      this.drag?.setMetrics(bounds);
      // Invalidate the idle short-circuit so resize always repaints.
      this.lastPanX = Number.NaN;
      this.lastPanY = Number.NaN;
      this._render();
    };
    window.addEventListener("resize", this.handleResize, { passive: true });

    this.handleVisibility = (entries): void => {
      if (this.disposed) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          this.lastPanX = Number.NaN;
          this.lastPanY = Number.NaN;
          this.start();
        } else {
          this.stop();
        }
      }
    };
    this.observer = new IntersectionObserver(this.handleVisibility, {
      rootMargin: "200px",
      threshold: 0,
    });
    this.observer.observe(this.canvas);

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.canvas);

    console.info("[Engine] init", {
      cards: opts.cards.length,
      rendererSize: this.renderer.getSize(new THREE.Vector2()),
      pixelRatio: this.renderer.getPixelRatio(),
      quality: this.quality,
      baseUrl: import.meta.env.BASE_URL,
    });
  }

  /** Compute initial pan bounds from the wall + viewport (for Drag construction). */
  public getInitialBounds(): import("./Wall").WallBounds {
    const { clientWidth, clientHeight } = this.getViewportSize();
    return this.wall.computeBounds(this.camera, clientWidth, clientHeight);
  }

  /** Inject the Drag input handler (owns the pan offset). */
  public setDrag(drag: Drag): void {
    this.drag = drag;
  }

  /** Inject the Hover handler (raycast lift). */
  public setHover(hover: Hover): void {
    this.hover = hover;
  }

  /** Fire when the active (centre-most) card index changes. */
  public setActiveCallback(cb: (index: number) => void): void {
    this.activeCallback = cb;
  }

  /** Fire each frame with the projected screen positions of every card. */
  public setProjectionCallback(cb: (projections: CardProjection[]) => void): void {
    this.projectionCallback = cb;
  }

  public init(): void {
    if (this.initialized || this.disposed) return;
    this.initialized = true;
  }

  public forceResize(): void {
    this.handleResize();
  }

  public start(): void {
    if (this.disposed || this.running) return;
    this.running = true;
    const tick = (): void => {
      if (!this.running || this.disposed) return;
      this._render();
      this.rafId = window.requestAnimationFrame(tick);
    };
    this.rafId = window.requestAnimationFrame(tick);
  }

  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Tear down. Order: stop → window/observer listeners → drag/hover (DOM
   * listeners) → wall (GPU) → renderer (WebGL context last). Idempotent.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stop();
    window.removeEventListener("resize", this.handleResize);
    this.observer.disconnect();
    this.resizeObserver.disconnect();

    this.hover?.dispose();
    this.hover = null;
    this.drag?.dispose();
    this.drag = null;

    this.wall.dispose();
    this.scene.remove(this.group);

    this.renderer.dispose();
  }

  private _render(): void {
    // Drag owns the pan offset. HORIZONTAL pan is a ROTATION of the cylinder, so
    // the group is NOT translated in X — Wall.update() bakes panX into each card's
    // angle θ and computes its full x/z on the cylinder surface (translating the
    // group too would double-count). VERTICAL pan is a simple slide, so the group
    // translates in Y (cards keep their baseY; the group moves them up/down).
    let panX = -this.group.position.x; // unused-as-translation; kept for resume parity
    let panY = this.group.position.y;
    if (this.drag) {
      const offset = this.drag.update();
      panX = offset.x;
      panY = offset.y;
      this.group.position.x = 0; // cylinder owns horizontal placement
      this.group.position.y = panY;
    }

    // Reduced-motion idle short-circuit: under reduce, pan is snapped and
    // nothing else animates, so skip the whole pass when the pan is unchanged.
    if (
      this.quality.reducedMotion &&
      this.hasPaintedOnce &&
      panX === this.lastPanX &&
      panY === this.lastPanY
    ) {
      return;
    }

    // Hover raycast (idle only) → wall hovered index.
    this.hover?.update();

    // Wall: curve + hover lift + opacity fade.
    this.wall.update(panX, panY);

    // Active-index feed.
    if (this.activeCallback) {
      const active = this.wall.getActiveIndex(panX, panY);
      if (active !== this.lastActiveIndex) {
        this.lastActiveIndex = active;
        this.activeCallback(active);
      }
    }

    // Projection feed (label overlay) — only when pan changed (else identical).
    if (this.projectionCallback && (panX !== this.lastPanX || panY !== this.lastPanY)) {
      this.projectionCallback(this.projectAll());
    }

    try {
      this.renderer.render(this.scene, this.camera);
      this.lastPanX = panX;
      this.lastPanY = panY;
      this.hasPaintedOnce = true;
    } catch (err) {
      if (!this.renderErrorLogged) {
        console.error("[Engine] render frame failed:", err);
        this.renderErrorLogged = true;
      }
    }
  }

  /**
   * Project the FRONT-ARC cards' top edge to CSS pixels for the label overlay.
   * Only cards near front-centre on the cylinder get a label (worldZ above a
   * threshold) — so labels never crowd: the side cards that have wrapped away are
   * unlabelled. The label tracks each card's TOP so it floats above the image,
   * clear of the bottom editorial title.
   */
  private projectAll(): CardProjection[] {
    const { clientWidth, clientHeight } = this.getViewportSize();
    const out: CardProjection[] = [];
    const count = this.wall.getCount();
    for (let i = 0; i < count; i++) {
      this.wall.getCardTopWorldPosition(i, this.projScratch);
      const worldZ = this.projScratch.z;
      const v = this.projScratch.project(this.camera);
      // Front-arc gate: only label cards whose surface is near the front of the
      // cylinder (worldZ not receded far) AND inside the viewport. This keeps a
      // handful of labels at most — no overlap pile-up from the wrapped sides.
      const visible =
        worldZ > FRONT_LABEL_Z &&
        v.z < 1 &&
        Math.abs(v.x) < 1.05 &&
        Math.abs(v.y) < 1.2;
      const x = (v.x * 0.5 + 0.5) * clientWidth;
      const y = (-v.y * 0.5 + 0.5) * clientHeight;
      out.push({ index: i, x: Math.round(x), y: Math.round(y), visible });
    }
    return out;
  }

  private getViewportSize(): { clientWidth: number; clientHeight: number } {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    return { clientWidth: w, clientHeight: h };
  }
}
