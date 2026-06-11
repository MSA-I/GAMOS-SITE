import * as THREE from "three";
import Wall from "./Wall";
import Drag from "./Drag";
import Hover from "./Hover";
import { detectQuality, type QualityProfile } from "./quality";
import type { RoomCard } from "../roomsData";

export interface EngineOptions {
  cards: RoomCard[];
}

/** Screen-space bounding rect of a card (CSS px) — for the FLIP detail morph. */
export interface CardScreenRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** Input→world metrics handed to Drag (no bounds — the pan is infinite). */
export interface DragMetrics {
  worldPerPixel: number;
}

const INTRO_MS = 1200; // intro bloom duration

/**
 * Engine — owns the Three.js Scene / Camera / Renderer + the group the pooled
 * cards live in, and drives the render loop. This is the phantom "lens" model:
 * the camera is FIXED in front of a concave paraboloid wall (FOV 52 @ z 16.5) and
 * the Wall reads the pan offset directly + wraps the grid modulo (the group is NOT
 * translated). Clear colour is the §5 ink-deep (warm near-black) so the boot tone,
 * the IntroGate veil, and the first painted frame all match — no flash.
 *
 * Reused from the prior rooms Engine: IntersectionObserver RAF-pause,
 * ResizeObserver, pixelRatio cap from the quality profile, reduced-motion idle
 * short-circuit (keyed on the pan offset AND intro completion), idempotent
 * disposed guard, and the strict dispose order (stop → listeners → drag/hover →
 * wall → renderer). Wall is the sole GPU-dispose owner.
 *
 * Per-frame feed to React: the active card (nearest the viewport centre), deduped
 * by id, for the bottom aria-live title. The per-card DOM-label projection is GONE
 * (metadata is now baked onto the card textures, like the source).
 *
 * FLIP support: freeze(true) pauses pan/hover while the detail page is open;
 * cardScreenRect(mesh) projects a card's bbox to CSS px for the morph; pickAt(x,y)
 * raycasts the pooled meshes from a tap point.
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
  private frozen = false;
  private readonly observer: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly handleResize: () => void;
  private readonly handleVisibility: IntersectionObserverCallback;
  private renderErrorLogged = false;

  // Active-card feed.
  private activeCallback: ((card: RoomCard | null) => void) | null = null;
  private lastActiveId: string | null = null;

  // Pan + intro state.
  private panX = 0;
  private panY = 0;
  private introStart = 0; // perf timestamp of first frame
  private introT = 0;

  // Reduced-motion idle short-circuit.
  private lastPanX = Number.NaN;
  private lastPanY = Number.NaN;
  private hasPaintedOnce = false;

  private readonly raycaster = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();
  private readonly box = new THREE.Box3();
  private readonly corner = new THREE.Vector3();

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.canvas = canvas;
    this.quality = detectQuality();

    this.scene = new THREE.Scene();

    const { clientWidth, clientHeight } = this.getViewportSize();
    // Phantom lens camera: FOV 52 at z 16.5, looking at the origin. Far plane
    // comfortably past the deepest rim card.
    this.camera = new THREE.PerspectiveCamera(
      52,
      clientWidth / clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 0, 16.5);
    this.camera.lookAt(0, 0, 0);

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
    // §5 ink-deep (warm near-black, NOT pure black). Opaque clear.
    this.renderer.setClearColor(0x1a1410, 1);
    this.renderer.setSize(clientWidth, clientHeight, false);
    this.scene.add(new THREE.AmbientLight(0xffffff, 1));

    // The group all pooled cards live in (kept at the origin — Wall wraps + lenses).
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.wall = new Wall(this.scene, this.group, opts.cards, this.quality);

    // Reduced motion → no bloom (cards start at scale 1; introT pinned at 1).
    this.introT = this.quality.reducedMotion ? 1 : 0;

    this.handleResize = (): void => {
      if (this.disposed) return;
      const size = this.getViewportSize();
      this.camera.aspect = size.clientWidth / size.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(size.clientWidth, size.clientHeight, false);
      this.drag?.setMetrics(this.getInitialMetrics());
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

  /** Input→world scale for Drag (the pan is infinite, so there are no bounds). */
  public getInitialMetrics(): DragMetrics {
    const { clientWidth } = this.getViewportSize();
    const dist = this.camera.position.z;
    const vFov = (this.camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
    const visibleWidth = visibleHeight * this.camera.aspect;
    return { worldPerPixel: visibleWidth / Math.max(clientWidth, 1) };
  }

  public setDrag(drag: Drag): void {
    this.drag = drag;
  }

  public setHover(hover: Hover): void {
    this.hover = hover;
  }

  /** Fire when the active (centre-most) card changes. */
  public setActiveCallback(cb: (card: RoomCard | null) => void): void {
    this.activeCallback = cb;
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

  /** Freeze pan/hover (detail page open). Rendering continues with the last pan. */
  public freeze(v: boolean): void {
    this.frozen = v;
    if (this.drag) this.drag.enabled = !v;
    if (v) this.wall.setHovered(null);
    // Resume the idle short-circuit accounting so a thaw repaints.
    this.lastPanX = Number.NaN;
    this.lastPanY = Number.NaN;
  }

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
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();

    // Intro bloom progress (skipped under reduced motion → introT pinned 1).
    if (!this.quality.reducedMotion && this.introT < 1) {
      if (this.introStart === 0) this.introStart = now;
      this.introT = Math.min(1, (now - this.introStart) / INTRO_MS);
    }

    // Drag owns the pan offset. The group stays at the origin; Wall reads the
    // pan directly and wraps + lenses each card.
    if (this.drag && !this.frozen) {
      const offset = this.drag.update();
      this.panX = offset.x;
      this.panY = offset.y;
    }

    // Reduced-motion idle short-circuit: under reduce, with the intro done and
    // the pan unchanged, nothing animates — skip the whole pass.
    if (
      this.quality.reducedMotion &&
      this.introT >= 1 &&
      this.hasPaintedOnce &&
      this.panX === this.lastPanX &&
      this.panY === this.lastPanY
    ) {
      return;
    }

    if (!this.frozen) this.hover?.update();

    this.wall.update(this.panX, this.panY, this.introT);

    if (this.activeCallback) {
      const card = this.wall.getActiveCard(this.panX, this.panY);
      const id = card ? card.id : null;
      if (id !== this.lastActiveId) {
        this.lastActiveId = id;
        this.activeCallback(card);
      }
    }

    try {
      this.renderer.render(this.scene, this.camera);
      this.lastPanX = this.panX;
      this.lastPanY = this.panY;
      this.hasPaintedOnce = true;
    } catch (err) {
      if (!this.renderErrorLogged) {
        console.error("[Engine] render frame failed:", err);
        this.renderErrorLogged = true;
      }
    }
  }

  // ---- FLIP support -------------------------------------------------------

  /** Raycast the pooled meshes from a client point → the card + mesh hit (or null). */
  public pickAt(
    clientX: number,
    clientY: number,
  ): { card: RoomCard; mesh: THREE.Mesh } | null {
    const { clientWidth, clientHeight } = this.getViewportSize();
    this.ndc.x = (clientX / clientWidth) * 2 - 1;
    this.ndc.y = -((clientY / clientHeight) * 2 - 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const hits = this.raycaster.intersectObjects(this.wall.getMeshes(), false);
    if (hits.length === 0) return null;
    const mesh = hits[0].object as THREE.Mesh;
    const card = this.wall.getCardForMesh(mesh);
    if (!card) return null;
    return { card, mesh };
  }

  /**
   * Screen-space bounding rect of a card's projected box (CSS px). Ported from
   * phantom-sphere-gallery gallery.js cardScreenRect — project the 6 box corners
   * to NDC, then to canvas px. The canvas is fixed/full-viewport so its rect's
   * left/top fold in cleanly (RTL/DPR-independent).
   */
  public cardScreenRect(mesh: THREE.Mesh): CardScreenRect {
    const r = this.canvas.getBoundingClientRect();
    this.box.setFromObject(mesh);
    const b = this.box;
    const pts = [
      [b.min.x, b.min.y, b.max.z],
      [b.max.x, b.min.y, b.max.z],
      [b.min.x, b.max.y, b.max.z],
      [b.max.x, b.max.y, b.max.z],
      [b.min.x, b.min.y, b.min.z],
      [b.max.x, b.max.y, b.min.z],
    ];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const [x, y, z] of pts) {
      this.corner.set(x, y, z).project(this.camera);
      const sx = r.left + (this.corner.x * 0.5 + 0.5) * r.width;
      const sy = r.top + (-this.corner.y * 0.5 + 0.5) * r.height;
      if (sx < minX) minX = sx;
      if (sx > maxX) maxX = sx;
      if (sy < minY) minY = sy;
      if (sy > maxY) maxY = sy;
    }
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  private getViewportSize(): { clientWidth: number; clientHeight: number } {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    return { clientWidth: w, clientHeight: h };
  }
}
