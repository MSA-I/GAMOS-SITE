import * as THREE from "three";
import Gallery from "./Gallery";
import Background from "./Background";
import TrailController from "./TrailController";
import type Scroll from "./Scroll";
import type { ProjectWithColors } from "../types";
import type { QualityProfile } from "./quality";

/**
 * Experience — PER-INSTANCE orchestrator owning gallery + background +
 * trailController and the label-feed state. Faithful port of the Codrops
 * reference `Experience/index.js`, with one deliberate change: it is NOT a
 * module singleton.
 *
 * Why per-instance: a singleton leaks state across hall navigation and breaks
 * under React StrictMode's mount → unmount → mount double-cycle (the second
 * mount would reuse a disposed instance). DepthGallery.tsx constructs a fresh
 * Experience inside useEffect([hallId]) and disposes it on cleanup.
 *
 * Dispose ownership: Experience is the SOLE dispose owner of its sub-modules.
 * Engine owns only { experience, renderer } and calls experience.dispose()
 * before renderer.dispose(). Experience.dispose() tears down its sub-modules
 * in reverse-of-construction order (trailController → gallery → background).
 *
 * Per-frame contract (Engine._render calls these in order):
 *   scroll.update();                                  // Engine writes cameraZ
 *   experience.update(time, camera, scroll);          // THIS class
 *   renderer.clear();
 *   experience.background.render(renderer);           // ortho bg pass
 *   renderer.clearDepth();
 *   renderer.render(scene, camera);                   // planes on top
 *
 * Label feed: Experience exposes the BLEND-AWARE active plane index
 * (blend >= 0.5 ? next : current) and a `frame-dark` boolean (nearest plane
 * index < frameDarkPlaneCount). Engine surfaces both to React via callbacks
 * so HallChrome (Wave 4) can drive its editorial label + texture-text variant.
 *
 * WAVE 6 (perf / accessibility): Experience is the single fan-out point for the
 * one coherent gate. Engine samples a {@link QualityProfile} once and passes it
 * in; Experience routes it:
 *   - TrailController ← the whole profile (downscale ladder + reduced-motion).
 *   - Gallery + Scroll already self-detect reduced motion in their constructors
 *     (zeroed breath/drift/parallax + snapped opacity; snapped scroll + zero
 *     velocity) — coherent with the profile (sampled from the same media query).
 *   - Background ← frozen here under reduced motion: update() is fed a CONSTANT
 *     time so the blobs/grain don't animate, and the motion response is zeroed
 *     so velocity can't pump them. (Background itself has no media-query
 *     awareness — Experience owns its reduced-motion freeze.)
 */

const FRAME_DARK_PLANE_COUNT = 2;

// Constant feed for Background.update() under reduced motion — uTime never
// advances, so the blob centers + grain are frozen on the first painted frame.
const FROZEN_BACKGROUND_TIME = 0;

export default class Experience {
  public readonly gallery: Gallery;
  public readonly background: Background;
  public readonly trailController: TrailController;

  private initialized = false;
  private disposed = false;

  // Wave-6 gate. Held so update() can freeze the background under reduced
  // motion (TrailController got its slice in its constructor).
  private readonly reducedMotion: boolean;

  // Blend-aware active index + frame-dark flag, recomputed each frame; Engine
  // reads these (or is pushed them) to drive the React label.
  private activePlaneIndex = -1;
  private isFrameDark: boolean | null = null;
  private onActivePlaneChange: ((index: number) => void) | null = null;
  private onFrameDarkChange: ((isDark: boolean) => void) | null = null;

  constructor(
    scene: THREE.Scene,
    projects: ProjectWithColors[],
    quality?: QualityProfile,
  ) {
    this.reducedMotion = quality?.reducedMotion ?? false;
    this.gallery = new Gallery(scene, projects, this.reducedMotion);
    this.background = new Background();
    // Route the Wave-6 gate: freeze the background's eased values under reduce
    // so a single rendered frame resolves them (coherent with the constant
    // uTime fed in update()).
    this.background.setReducedMotion(this.reducedMotion);
    // Route the Wave-6 gate into the trail subsystem (downscale + reduced-motion).
    this.trailController = new TrailController({
      gallery: this.gallery,
      quality,
    });
  }

  /**
   * Initialize sub-modules that need the scene/camera. Gallery already built
   * its planes in its constructor (it owns the scene reference), so init here
   * only wires the trail and seeds the initial label/frame-dark state.
   */
  public init(_scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    if (this.initialized) return;

    this.trailController.init(_scene, camera);

    // Seed the label/frame-dark feed so the first paint is correct.
    const initialBlend = this.gallery.getPlaneBlendData(camera.position.z);
    this.updateActivePlane(initialBlend);
    this.updateFrameTextTone(initialBlend);

    this.initialized = true;
  }

  /** Register the blend-aware active-plane-index callback (Engine wires it). */
  public setActivePlaneCallback(cb: (index: number) => void): void {
    this.onActivePlaneChange = cb;
  }

  /** Register the frame-dark callback (Engine wires it; HallChrome consumes). */
  public setFrameDarkCallback(cb: (isDark: boolean) => void): void {
    this.onFrameDarkChange = cb;
  }

  /** Current blend-aware active plane index (or -1 before first update). */
  public getActivePlaneIndex(): number {
    return this.activePlaneIndex;
  }

  /**
   * Per-frame update. Replicates reference index.js update() in full:
   *   1. trailController.update(camera, scroll, time)
   *   2. gallery.update(camera, scroll)
   *   3. planeBlendData → active index + frame-dark tone
   *   4. moodBlendData → background.setMoodBlend
   *   5. depthProgress + stabilized velocityIntensity → background.setMotionResponse
   *   6. background.update(time)
   *
   * `time` is wall-clock SECONDS (performance.now() / 1000) — Background wraps
   * it internally; TrailController feeds it to a THREE.Timer.
   */
  public update(
    time: number,
    camera: THREE.PerspectiveCamera | null = null,
    scroll: Scroll | null = null,
  ): void {
    if (this.disposed) return;

    // 1. Trail first (reads camera + scroll; renders into the main scene).
    this.trailController.update(camera, scroll, time);

    // 2. Gallery planes (opacity crossfade + breath/drift/parallax in Wave 2).
    this.gallery.update(camera, scroll);

    // 3–5. Camera-driven background response.
    if (camera) {
      const cameraZ = camera.position.z;

      // Frame text tone + active index (blend-aware).
      const planeBlendData = this.gallery.getPlaneBlendData(cameraZ);
      this.updateActivePlane(planeBlendData);
      this.updateFrameTextTone(planeBlendData);

      // Mood colors → background blend.
      const moodBlendData = this.gallery.getMoodBlendData(cameraZ);
      if (moodBlendData) {
        this.background.setMoodBlend(moodBlendData);
      }

      // Depth + velocity → background motion response. The velocity intensity
      // is stabilized by a smoothstep on the distance-from-blend-center so a
      // mid-transition (blend ~0.5) doesn't pump the blobs while the crossfade
      // is at its most visible (reference index.js).
      //
      // Reduced motion: zero the velocity response so the blobs can't pulse
      // (depthProgress still informs blob radius — a STATIC value at the snapped
      // camera Z, no animation). Coherent with the frozen uTime below.
      const depthProgress = this.gallery.getDepthProgress(cameraZ);
      let stabilizedVelocityIntensity = 0;
      if (!this.reducedMotion) {
        const velocityMax = scroll?.velocityMax || 1;
        const velocityIntensity = THREE.MathUtils.clamp(
          Math.abs(scroll?.velocity || 0) / Math.max(velocityMax, 0.0001),
          0,
          1,
        );
        const blend = planeBlendData?.blend ?? 0;
        const distanceFromBlendCenter = Math.abs(blend - 0.5) * 2;
        const transitionStability = THREE.MathUtils.smoothstep(
          distanceFromBlendCenter,
          0.35,
          1,
        );
        stabilizedVelocityIntensity = velocityIntensity * transitionStability;
      }

      this.background.setMotionResponse({
        depthProgress,
        velocityIntensity: stabilizedVelocityIntensity,
      });
    }

    // 6. Background tick (eases blob radius/strength, advances grain time).
    //    Reduced motion: feed a CONSTANT time so uTime never advances — the
    //    blob centers + film grain freeze (the master gate's blob-anim kill).
    this.background.update(this.reducedMotion ? FROZEN_BACKGROUND_TIME : time);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;

    // Reverse-of-construction: trail → gallery → background.
    this.trailController.dispose();
    this.gallery.dispose();
    this.background.dispose();

    this.onActivePlaneChange = null;
    this.onFrameDarkChange = null;
  }

  // --- private ---

  private updateActivePlane(
    planeBlendData: {
      currentPlaneIndex: number;
      nextPlaneIndex: number;
      blend: number;
    } | null,
  ): void {
    if (!planeBlendData) return;
    const index =
      planeBlendData.blend >= 0.5
        ? planeBlendData.nextPlaneIndex
        : planeBlendData.currentPlaneIndex;
    if (index === this.activePlaneIndex) return;
    this.activePlaneIndex = index;
    this.onActivePlaneChange?.(index);
  }

  private updateFrameTextTone(
    planeBlendData: {
      currentPlaneIndex: number;
      nextPlaneIndex: number;
      blend: number;
    } | null,
  ): void {
    if (!planeBlendData) return;
    const nearestPlaneIndex =
      planeBlendData.blend >= 0.5
        ? planeBlendData.nextPlaneIndex
        : planeBlendData.currentPlaneIndex;
    const shouldUseDarkText = nearestPlaneIndex < FRAME_DARK_PLANE_COUNT;
    if (this.isFrameDark === shouldUseDarkText) return;
    this.isFrameDark = shouldUseDarkText;
    this.onFrameDarkChange?.(shouldUseDarkText);
  }
}
