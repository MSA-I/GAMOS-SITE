import * as THREE from "three";
import Experience from "./Experience";
import { detectQuality, type QualityProfile } from "./quality";
import type Scroll from "./Scroll";
import type { ProjectWithColors } from "../types";

export type HallId = "events" | "resort";

export interface EngineOptions {
  hallId: HallId;
  projects: ProjectWithColors[];
}

/**
 * Engine — owns the Three.js Scene / Camera / Renderer + the per-instance
 * Experience for the Depth Gallery, and drives the render loop.
 *
 * Faithful to the Codrops reference Engine.js render sequence (dual-scene):
 *   renderer.autoClear = false;
 *   scroll.update();                            // writes camera Z
 *   experience.update(time, camera, scroll);    // trail + gallery + bg state
 *   renderer.clear();
 *   experience.background.render(renderer);     // ortho bg pass behind planes
 *   renderer.clearDepth();                      // so planes draw on top
 *   renderer.render(scene, camera);             // textured planes
 *
 * Ownership (plan risk #3 — no double-free):
 *   - Experience is the SOLE dispose owner of its GPU sub-modules
 *     (gallery / background / trailController). Engine NEVER walks the scene
 *     graph to dispose geometries/materials/textures — that would double-free
 *     what Experience already cleans up.
 *   - Engine owns { experience, renderer } as the GPU pair, plus the input
 *     `scroll` (DOM-listener layer, injected by DepthGallery). Engine.dispose()
 *     tears down scroll listeners → experience (GPU sub-modules) →
 *     renderer.dispose() (frees the WebGL context last).
 *
 * Preserved from the prior port: IntersectionObserver RAF-pause when offscreen,
 * ResizeObserver-driven resize. Idempotent `disposed` guard.
 *
 * WAVE 6 (perf / accessibility guardrails): a single {@link QualityProfile} is
 * sampled once at construction ({@link detectQuality}) and threaded into
 * Experience, which routes the flags to the sub-modules — so the whole tree
 * honours ONE coherent gate.
 *   - pixelRatio cap comes from the profile: desktop ≤ 2, mobile ≤ 1.5 (§8).
 *   - reduced-motion RAF gating: under `prefers-reduced-motion: reduce` nothing
 *     animates continuously (planes static, trail frozen at its seed, blobs
 *     frozen, scroll snapped), so the loop short-circuits the GPU draw on any
 *     frame where the camera Z has not changed since the last paint. The first
 *     paint and every post-input frame still render; the IntersectionObserver
 *     pause is untouched. This keeps a reduce user's machine idle instead of
 *     re-drawing 60 identical frames a second.
 *
 * Active-index feed: the label index comes from Experience's BLEND-AWARE index
 * (blend >= 0.5 ? next : current), not a nearest-plane scan. Engine forwards
 * Experience's active-plane + frame-dark callbacks to the React surface.
 */
export default class Engine {
  // --- Three.js core ---
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;

  // --- Per-instance orchestrator (gallery + background + trailController) ---
  public readonly experience: Experience;

  // --- Wave-6 device/preference profile (sampled once; routed to Experience) ---
  public readonly quality: QualityProfile;

  // --- Input layer (injected by DepthGallery; owns the camera Z) ---
  public scroll: Scroll | null = null;

  // --- Internals ---
  private readonly canvas: HTMLCanvasElement;
  private readonly hallId: HallId;
  private rafId: number | null = null;
  private running = false;
  private disposed = false;
  private initialized = false;
  private readonly observer: IntersectionObserver;
  private readonly resizeObserver: ResizeObserver;
  private readonly handleResize: () => void;
  private readonly handleVisibility: IntersectionObserverCallback;
  private renderErrorLogged = false;

  // Reduced-motion idle short-circuit (Wave 6): the camera Z at the last GPU
  // draw + whether we have painted at all. Under reduced motion, a frame whose
  // camera Z matches `lastRenderedCameraZ` (and where we've already painted) is
  // skipped — nothing else can move under reduce, so re-drawing is wasted work.
  private lastRenderedCameraZ = Number.NaN;
  private hasPaintedOnce = false;

  constructor(canvas: HTMLCanvasElement, opts: EngineOptions) {
    this.canvas = canvas;
    this.hallId = opts.hallId;

    // --- Wave-6 quality profile (reduced-motion + coarse-pointer + viewport).
    // Sampled ONCE here so the whole subtree shares one gate (no per-module
    // matchMedia drift). Routed into Experience below; consumed locally for the
    // pixelRatio cap + reduced-motion RAF short-circuit. ---
    this.quality = detectQuality();

    // --- Scene ---
    this.scene = new THREE.Scene();

    // --- Camera (reference: 45° FOV, z = 6) ---
    const { clientWidth, clientHeight } = this.getViewportSize();
    this.camera = new THREE.PerspectiveCamera(
      45,
      clientWidth / clientHeight,
      0.1,
      100,
    );
    this.camera.position.set(0, 0, 6);

    // --- Renderer ---
    // autoClear = false: we clear manually so the ortho background renders
    // first, then clearDepth() lets the perspective planes draw on top
    // (reference Engine.js). alpha:true so the canvas itself is transparent
    // before the bg pass paints — but the bg pass fills the frame opaquely.
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.autoClear = false;
    this.renderer.debug.checkShaderErrors = true;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    // pixelRatio cap from the quality profile: desktop ≤ 2, mobile ≤ 1.5 (§8).
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, this.quality.pixelRatioCap),
    );
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(clientWidth, clientHeight, false);

    // --- Experience (per-instance; owns gallery/background/trailController) ---
    // The quality profile flows in so Experience can route the reduced-motion
    // / downscale flags to the trail subsystem + freeze the blob animation.
    this.experience = new Experience(this.scene, opts.projects, this.quality);

    // --- Resize listener ---
    this.handleResize = (): void => {
      if (this.disposed) return;
      const size = this.getViewportSize();
      this.camera.aspect = size.clientWidth / size.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(size.clientWidth, size.clientHeight, false);
      // Invalidate the reduced-motion idle short-circuit so this resize ALWAYS
      // repaints at the new size — camera Z is unchanged on resize, so without
      // this the short-circuit would skip the redraw under reduced motion.
      this.lastRenderedCameraZ = Number.NaN;
      this._render();
    };
    window.addEventListener("resize", this.handleResize, { passive: true });

    // --- IntersectionObserver: pause when canvas is offscreen ---
    this.handleVisibility = (entries): void => {
      if (this.disposed) return;
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Force one repaint on resume: the WebGL backbuffer is undefined after
          // the RAF pause, so under reduced motion (where the loop otherwise
          // short-circuits on unchanged camera Z) the canvas could come back
          // blank. Invalidating guarantees the first resumed frame redraws.
          this.lastRenderedCameraZ = Number.NaN;
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

    // ResizeObserver: re-fire handleResize whenever the canvas's own box size
    // changes (post-mount layout, container shifts). The window.resize listener
    // never fires for layout-driven changes, so without this the renderer can
    // stay stuck at a 0×0 buffer if the canvas got its real size only AFTER
    // construction.
    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(this.canvas);

    this.canvas.dataset.hallId = this.hallId;

    console.info("[Engine] init", {
      hallId: this.hallId,
      canvasRect: this.canvas.getBoundingClientRect(),
      rendererSize: this.renderer.getSize(new THREE.Vector2()),
      pixelRatio: this.renderer.getPixelRatio(),
      quality: this.quality,
      baseUrl: import.meta.env.BASE_URL,
    });
  }

  /** Read-only access to the Three.js scene for module construction (Scroll). */
  public getScene(): THREE.Scene {
    return this.scene;
  }

  /** The Gallery owned by this Engine's Experience (DepthGallery wires Scroll
   * bounds from it). */
  public getGallery(): Experience["gallery"] {
    return this.experience.gallery;
  }

  /** Read-only access to the camera's current Z position. */
  public getCameraZ(): number {
    return this.camera.position.z;
  }

  /**
   * Inject the Scroll input handler. Scroll owns the camera Z position — once
   * attached, `_render()` calls `scroll.update()` every frame and writes the
   * returned value to `camera.position.z` BEFORE Experience reads it. Calling
   * with the same instance twice is fine; dispose() tears down whatever is
   * currently attached.
   */
  public setScroll(scroll: Scroll): void {
    this.scroll = scroll;
  }

  /**
   * Register a callback fired when the BLEND-AWARE active plane index changes
   * (Experience computes it; blend >= 0.5 ? next : current). One source of
   * truth (RAF), no work when Engine is paused offscreen. Forwarded straight
   * to Experience.
   */
  public setActivePlaneCallback(cb: (index: number) => void): void {
    this.experience.setActivePlaneCallback(cb);
  }

  /**
   * Register a callback fired when the frame-dark flag changes (nearest plane
   * index < 2 → the label should use the dark texture-text variant so it stays
   * readable over a bright image). HallChrome (Wave 4) consumes this.
   */
  public setFrameDarkCallback(cb: (isDark: boolean) => void): void {
    this.experience.setFrameDarkCallback(cb);
  }

  /**
   * Initialize the Experience (seeds the trail + label/frame-dark feed). Must
   * be called after construction and ideally after setScroll. Idempotent.
   */
  public init(): void {
    if (this.initialized || this.disposed) return;
    this.experience.init(this.scene, this.camera);
    this.initialized = true;
  }

  /** Force a resize + render cycle. Closes the race window where neither the
   * IntersectionObserver nor ResizeObserver has fired yet on the first paint. */
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
   * Tear down. Order:
   *   1. stop() / removeEventListener / observer.disconnect — kill inbound events
   *   2. scroll.dispose() — detach input listeners (DOM only, no GPU)
   *   3. experience.dispose() — the SOLE owner frees gallery/background/trail
   *      GPU resources (geometries/materials/textures) in reverse order
   *   4. renderer.dispose() — last; frees the WebGL context after every
   *      consumer has released its references to it
   *
   * Engine never walks the scene graph to dispose meshes — Experience's
   * sub-modules own and free everything they created (no double-free).
   * Idempotent.
   */
  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    this.stop();
    window.removeEventListener("resize", this.handleResize);
    this.observer.disconnect();
    this.resizeObserver.disconnect();

    this.scroll?.dispose();
    this.scroll = null;

    this.experience.dispose();

    this.renderer.dispose();
  }

  // --- Private ---

  /** Single per-frame render (reference dual-scene sequence). */
  private _render(): void {
    // Scroll owns the camera Z. It runs FIRST so Experience reads the freshly
    // damped camera position. Under reduced motion Scroll snaps the target, so
    // this returns a stable Z the instant input stops.
    if (this.scroll) {
      this.camera.position.z = this.scroll.update();
    }

    // Reduced-motion idle short-circuit (Wave 6): under reduce, nothing animates
    // continuously — the only thing that can change the frame is the camera Z
    // (snapped on input). So once we've painted at least once, skip the whole
    // Experience.update + GPU pass on any frame where the camera Z is unchanged.
    // (Index-driven label callbacks can't change without the camera moving, so
    // nothing is missed.) The RAF keeps ticking cheaply; the GPU stays idle.
    if (
      this.quality.reducedMotion &&
      this.hasPaintedOnce &&
      this.camera.position.z === this.lastRenderedCameraZ
    ) {
      return;
    }

    // Experience: trail + gallery planes + background mood/motion state.
    // time in SECONDS (Background wraps it; TrailController feeds THREE.Timer).
    const time = performance.now() / 1000;
    this.experience.update(time, this.camera, this.scroll);

    try {
      // Manual clear (autoClear is off): clear color + depth, paint the ortho
      // background, clear depth again so the perspective planes draw on top.
      this.renderer.clear(true, true, true);
      this.experience.background.render(this.renderer);
      this.renderer.clearDepth();
      this.renderer.render(this.scene, this.camera);

      // Mark the painted camera Z so the reduced-motion idle short-circuit can
      // skip the next frame if nothing moved.
      this.lastRenderedCameraZ = this.camera.position.z;
      this.hasPaintedOnce = true;
    } catch (err) {
      if (!this.renderErrorLogged) {
        console.error("[Engine] render frame failed:", err);
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
