import * as THREE from "three";
import type Gallery from "./Gallery";
import type Scroll from "./Scroll";
import type Background from "./Background";

export type HallId = "oasis" | "lumina";

export interface EngineOptions {
  hallId: HallId;
}

/**
 * Engine — owns the Three.js Scene / Camera / Renderer for the Depth Gallery.
 *
 * Wave 1 scope: bare render loop + resize + IntersectionObserver gating + dispose.
 * Wave 2 will plug in Gallery / Scroll / Background modules through the
 * placeholder fields below. Keep this class framework-agnostic — DepthGallery.tsx
 * is the only React surface.
 */
export default class Engine {
  // --- Three.js core ---
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  // --- Wave 2 modules (intentionally null in Wave 1) ---
  public gallery: Gallery | null = null;
  public scroll: Scroll | null = null;
  public background: Background | null = null;

  // --- Internals ---
  private readonly canvas: HTMLCanvasElement;
  private readonly hallId: HallId;
  private rafId: number | null = null;
  private running = false;
  private disposed = false;
  private readonly observer: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly handleResize: () => void;
  private readonly handleVisibility: IntersectionObserverCallback;
  private onActivePlaneChangeCb: ((index: number) => void) | null = null;
  private lastActivePlaneIndex = -1;
  private renderErrorLogged = false;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.canvas = canvas;
    this.hallId = opts.hallId;

    // --- Scene ---
    this.scene = new THREE.Scene();

    // --- Camera ---
    const { clientWidth, clientHeight } = this.getViewportSize();
    this.camera = new THREE.PerspectiveCamera(
      45,
      clientWidth / clientHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 6);

    // --- Renderer ---
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.debug.checkShaderErrors = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(clientWidth, clientHeight, false);

    // --- Resize listener ---
    this.handleResize = (): void => {
      if (this.disposed) return;
      const size = this.getViewportSize();
      this.camera.aspect = size.clientWidth / size.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(size.clientWidth, size.clientHeight, false);
      this._render();
    };
    window.addEventListener("resize", this.handleResize, { passive: true });

    // --- IntersectionObserver: pause when canvas is offscreen ---
    this.handleVisibility = (entries): void => {
      if (this.disposed) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
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

    // ResizeObserver: defensively re-fire handleResize whenever the canvas's
    // own box size changes (post-mount layout, container size shifts, etc).
    // The window.resize listener never fires for layout-driven changes, so
    // without this the renderer can stay stuck at a 0×0 buffer if the canvas
    // got its real size only AFTER construction.
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.canvas);

    // Attach the hallId to the canvas for downstream debugging / Wave 2 wiring.
    this.canvas.dataset.hallId = this.hallId;

    console.info("[Engine] init", {
      hallId: this.hallId,
      canvasRect: this.canvas.getBoundingClientRect(),
      rendererSize: this.renderer.getSize(new THREE.Vector2()),
      pixelRatio: this.renderer.getPixelRatio(),
      baseUrl: import.meta.env.BASE_URL,
    });
  }

  /** Read-only access to the Three.js scene for module construction (Gallery). */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /** Read-only access to the camera's current Z position. Used by the React
   * surface's active-index poller without needing a Scroll reference. */
  public getCameraZ(): number {
    return this.camera.position.z;
  }

  /**
   * Inject the Gallery once it's been constructed by the React surface.
   * Engine is framework-agnostic and never builds Gallery itself, so this
   * is the documented seam between Wave 1 (render loop) and Wave 2+
   * (planes / scroll / background). Calling with the same instance twice
   * is fine — last writer wins and dispose() will clean up whatever is
   * currently attached.
   */
  public setGallery(gallery: Gallery): void {
    this.gallery = gallery;
  }

  /**
   * Inject the Scroll input handler. Scroll owns the camera Z position —
   * once attached, `_render()` calls `scroll.update()` every frame and
   * writes the returned value to `camera.position.z` BEFORE Gallery reads
   * it. Calling with the same instance twice is fine; dispose() will tear
   * down whatever is currently attached.
   */
  public setScroll(scroll: Scroll): void {
    this.scroll = scroll;
  }

  /**
   * Inject the Background painter. Background owns a CSS-styled DOM element
   * behind the canvas and reads `gallery.getMoodBlendData(cameraZ)` each
   * frame to crossfade its color. Order in `_render()` is Scroll → Background
   * → Gallery: Background only depends on the freshly-updated cameraZ, and
   * Gallery's per-plane uniform writes don't affect mood data, so this
   * ordering is safe and keeps Background visually in lockstep with the
   * camera. Calling with the same instance twice is fine; dispose() will
   * tear down whatever is currently attached.
   */
  public setBackground(background: Background): void {
    this.background = background;
  }

  /**
   * Register a callback fired from the render loop when the active plane
   * (the one closest to the camera, per Gallery.getMoodBlendData) changes.
   * Replaces the polling setInterval that DepthGallery.tsx used to run —
   * one source of truth (RAF) and no work when Engine is paused offscreen.
   */
  public setActivePlaneCallback(cb: (index: number) => void): void {
    this.onActivePlaneChangeCb = cb;
  }

  /** Force a resize + render cycle. Used by the React surface after start()
   * to ensure the renderer's pixel buffer matches the canvas's final layout
   * size — IntersectionObserver and ResizeObserver should both also catch
   * this, but calling it explicitly closes the race window where neither has
   * fired yet on the very first paint. */
  public forceResize(): void {
    this.handleResize();
  }

  /** Begin the requestAnimationFrame loop. Idempotent. */
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

  /** Cancel the requestAnimationFrame loop. Idempotent. */
  public stop(): void {
    this.running = false;
    if (this.rafId !== null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  /**
   * Tear down in reverse-of-construction order. Each module owns the GPU
   * resources it created (Gallery: textures/materials/geometries; Background:
   * its DOM node + any internals; Scroll: input listeners), so we delegate
   * to their dispose() methods rather than walking the scene graph here —
   * scene.traverse + manual material/geometry disposal would double-free
   * everything Gallery already cleans up.
   *
   * Order rationale:
   *   1. stop() / removeEventListener / observer.disconnect — kill inbound events
   *   2. background — removes its user-visible DOM node FIRST so it doesn't
   *      flicker against a cleared/black canvas in the final frames
   *   3. scroll — detaches input listeners so nothing tries to drive a
   *      half-disposed gallery
   *   4. gallery — releases planes/textures/materials it owns
   *   5. renderer.dispose() — last; frees the WebGL context after every
   *      consumer has released its references to it
   *
   * Safe to call once; subsequent calls are no-ops.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stop();
    window.removeEventListener("resize", this.handleResize);
    this.observer.disconnect();
    this.resizeObserver.disconnect();

    this.background?.dispose();
    this.background = null;
    this.scroll?.dispose();
    this.scroll = null;
    this.gallery?.dispose();
    this.gallery = null;

    this.renderer.dispose();
  }

  // --- Private ---

  /** Single per-frame render. Wave 2 wires Scroll → Gallery into the loop. */
  private _render(): void {
    // Scroll owns the camera Z. It must run BEFORE Gallery so the gallery's
    // per-plane opacity/desaturation reads the freshly-damped camera position.
    if (this.scroll) {
      this.camera.position.z = this.scroll.update();
    }
    // Background reads gallery.getMoodBlendData(cameraZ), which only depends
    // on the camera's Z. Running it BEFORE Gallery is safe because Gallery's
    // per-plane uniform writes don't affect mood data, and it keeps the bg
    // color visually in lockstep with the camera position the Scroll just
    // wrote.
    this.background?.update(this.camera.position.z);
    // Gallery reads camera.position.z directly to compute per-plane
    // opacity/desaturation; it stays Scroll-agnostic — only Engine knows
    // both modules.
    this.gallery?.update(this.camera.position.z);
    if (this.gallery && this.onActivePlaneChangeCb) {
      const mood = this.gallery.getMoodBlendData(this.camera.position.z);
      if (mood.activeIndex !== this.lastActivePlaneIndex) {
        this.lastActivePlaneIndex = mood.activeIndex;
        this.onActivePlaneChangeCb(mood.activeIndex);
      }
    }
    try {
      this.renderer.render(this.scene, this.camera);
    } catch (err) {
      if (!this.renderErrorLogged) {
        console.error("[Engine] renderer.render failed:", err);
        this.renderErrorLogged = true;
      }
    }
  }

  private getViewportSize(): { clientWidth: number; clientHeight: number } {
    // Prefer the canvas's bounding rect once it has a layout box; fall back to
    // window dimensions during very early construction.
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    return { clientWidth: w, clientHeight: h };
  }
}
