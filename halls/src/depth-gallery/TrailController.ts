import * as THREE from "three";
import Trail from "./Trail";
import TrailHeadParticles from "./TrailHeadParticles";
import Gallery from "./Gallery";
import type Scroll from "./Scroll";
import type { QualityProfile } from "./quality";

/**
 * TrailController — drives the glowing trail head along a sine path through the
 * depth corridor, synced to scroll progress, and feeds positions to {@link Trail}
 * + {@link TrailHeadParticles}. Faithful port of the Codrops reference
 * `TrailController.js` (path math, length lerp 14→220, direction-reversal reset,
 * edge-fade opacity, mobile width scaling, seed points).
 *
 * One deliberate adaptation for our public API: the reference's primary progress
 * source was `scroll.maxCameraZ` / `scroll.minCameraZ`, which are PRIVATE in our
 * port's Scroll. Our Gallery exposes the SAME reference bounds publicly
 * (`getCameraMaxZ()` = nearestZ+5, `getCameraMinZ()` = deepestZ+5), so we compute
 * the scroll-range progress `(maxCameraZ - camZ) / range` from the gallery (the
 * single source of truth for the depth layout). The reference's two fallbacks
 * (`getPlaneBlendData` → `getDepthProgress`) are preserved verbatim. Behaviour is
 * identical; only the data source for the bounds moves from Scroll to Gallery.
 *
 * Ownership: TrailController OWNS the Trail + TrailHeadParticles. `init` adds both
 * groups to the scene + seeds the initial points; `dispose` tears both down. It is
 * called every frame from `Experience.update(camera, scroll, time)`.
 *
 * WAVE 6 (perf / accessibility, plan §7 gl-6 + risk #5): the constructor takes an
 * optional {@link QualityProfile}. It is the trail's slice of the ONE coherent
 * gate Experience routes from Engine —
 *   - downscale ladder → Trail ctor opts (radialSegments 8→4, maxPathPointCap
 *     220→80, MeshBasicMaterial on coarse pointer) + `maximumPointCount` clamp +
 *     `showHeadParticles` off on coarse pointer.
 *   - reduced motion → `isEnabled = false`: the trail is hidden, never grows, and
 *     the head particles never spawn (update() bails early). Nothing animates.
 */

const FULL_CIRCLE_RADIANS = Math.PI * 2;

export interface TrailControllerOptions {
  gallery: Gallery;
  /** Wave-6 device/preference profile (downscale ladder + reduced-motion gate). */
  quality?: QualityProfile;
}

export default class TrailController {
  private trail: Trail;
  private trailHeadParticles: TrailHeadParticles;
  private readonly gallery: Gallery;
  private readonly timer: THREE.Timer;
  private readonly headPosition = new THREE.Vector3();

  // Full reference configuration (path / responsive / point / opacity / visual).
  // Warm-luxury skin: reference cold colors (#f6f9ff / #7fd5ff / #ffffff) → brass.
  private readonly configuration = {
    isEnabled: true,
    pathSettings: {
      startXPosition: -0.96, // base X where the path starts
      startYPosition: -1.05, // base Y where the path starts
      horizontalWidth: 3, // how wide the path swings left/right
      horizontalCycles: 1.85, // number of horizontal waves
      verticalAmplitude: 0.78, // how much the path moves up/down
      verticalCycles: 2.1, // number of vertical waves
      distanceAheadOfCamera: 1.65, // base forward offset from the camera
      baseDepthOffset: 4.78, // base depth subtraction
      depthSpan: 6.52, // extra depth across full progress
      progressDepthOffset: -0.1, // bias so the trail appears earlier at start
    },
    responsiveSettings: {
      mobileBreakpoint: 768, // mobile viewport limit (px)
      mobileWidthScale: 0.35, // horizontal width multiplier on mobile
      mobileStartXOffset: 0.35, // extra X offset applied on mobile
    },
    pointSettings: {
      minimumPointCount: 14, // trail length near the start
      maximumPointCount: 220, // trail length near the end
      reverseLengthScale: 0.55, // shrink length while reversing
      initialSeedPointCount: 10, // number of startup seed points
      initialSeedStepZ: 0.12, // Z spacing between startup points
      trimPerFrameForward: 4, // max old points removed per frame (forward)
      trimPerFrameReverse: 32, // max old points removed per frame (reverse)
    },
    opacitySettings: {
      baseOpacity: 0.51, // max material opacity
      idleOpacityAtStart: 0.55, // opacity before the user has moved
      idleProgressThreshold: 0.01, // progress considered "at start"
      startVisibilityBias: 0.1, // boost visibility near the start
      edgeFadeStart: 0.04, // edge fade lower bound
      edgeFadeEnd: 0.2, // edge fade upper bound
      opacitySmoothing: 0.12, // opacity lerp speed
    },
    visualSettings: {
      trailColor: "#CFAE83", // brass (warm skin)
      glowColor: "#CFAE83", // brass glow (reference used #ffffff)
      glowIntensity: 1.0, // emissive intensity
      curveTension: 0.67, // curviness of the generated spline
      pointSmoothing: 0.53, // smoothing when adding new points
    },
    specialEffectsSettings: {
      showHeadParticles: true, // toggle the sparkle effect
    },
    directionChangeEpsilon: 0.0005, // ignore tiny direction noise
  };

  private readonly runtimeState = {
    hasSeededInitialPoints: false,
    hasUserMovedFromStart: false,
    previousProgress: null as number | null,
    previousDirection: 0,
    currentOpacity: this.configuration.opacitySettings.baseOpacity,
  };

  constructor({ gallery, quality }: TrailControllerOptions) {
    this.gallery = gallery;

    // --- Wave-6 downscale ladder + reduced-motion gate ---
    const ladder = quality?.ladder;
    this.trail = new Trail(
      ladder
        ? {
            radialSegments: ladder.radialSegments,
            maxPathPointCap: ladder.maxTrailPoints,
            useBasicMaterial: ladder.useBasicTrailMaterial,
          }
        : undefined,
    );
    if (ladder) {
      // Clamp the per-frame length ceiling to the mobile cap (the buffer is
      // sized for it; updateLength lerps up to this value).
      this.configuration.pointSettings.maximumPointCount = Math.min(
        this.configuration.pointSettings.maximumPointCount,
        ladder.maxTrailPoints,
      );
      // Head particles off on coarse pointer (first thing the ladder drops).
      this.configuration.specialEffectsSettings.showHeadParticles =
        ladder.headParticlesEnabled;
    }
    // Reduced-motion MASTER switch: the whole trail is disabled — update() hides
    // the tube, never grows it, and never spawns particles. Coherent with the
    // gallery (static planes), background (frozen blobs), and scroll (snapped).
    if (quality?.reducedMotion) {
      this.configuration.isEnabled = false;
    }

    this.trailHeadParticles = new TrailHeadParticles(
      ladder ? { maxParticles: ladder.maxHeadParticles } : undefined,
    );
    this.timer = new THREE.Timer();
    this.applyVisualSettings();
  }

  private applyVisualSettings(): void {
    const { visualSettings, opacitySettings } = this.configuration;
    // applySkin guards the emissive writes so it works for both the desktop
    // MeshStandardMaterial and the Wave-6 coarse-pointer MeshBasicMaterial.
    this.trail.applySkin({
      color: visualSettings.trailColor,
      glowColor: visualSettings.glowColor,
      glowIntensity: visualSettings.glowIntensity,
      opacity: opacitySettings.baseOpacity,
    });
    this.trail.curveTension = visualSettings.curveTension;
    this.trail.pointSmoothing = visualSettings.pointSmoothing;
    for (const particle of this.trailHeadParticles.particles) {
      particle.mesh.material.color.set(visualSettings.trailColor);
    }
  }

  public init(scene: THREE.Scene, camera: THREE.PerspectiveCamera): void {
    scene.add(this.trail.object);
    scene.add(this.trailHeadParticles.object);
    this.seedInitialPoints(camera);
  }

  public dispose(): void {
    this.trail.dispose();
    this.trailHeadParticles.dispose();
    this.runtimeState.hasSeededInitialPoints = false;
    this.runtimeState.hasUserMovedFromStart = false;
    this.runtimeState.previousProgress = null;
    this.runtimeState.previousDirection = 0;
  }

  public update(
    camera: THREE.PerspectiveCamera | null = null,
    scroll: Scroll | null = null,
    time: number | null = null,
  ): void {
    if (!camera) return;

    if (typeof time === "number" && Number.isFinite(time)) {
      this.timer.update(time);
    } else {
      this.timer.update();
    }
    const deltaSeconds = this.timer.getDelta();

    this.trail.object.visible = this.configuration.isEnabled;
    const shouldShowHeadParticles =
      this.configuration.isEnabled &&
      this.configuration.specialEffectsSettings.showHeadParticles;
    this.trailHeadParticles.setEnabled(shouldShowHeadParticles);
    if (!this.configuration.isEnabled) return;

    const currentProgress = this.getProgress(camera, scroll); // 0..1
    if (
      currentProgress > this.configuration.opacitySettings.idleProgressThreshold
    ) {
      this.runtimeState.hasUserMovedFromStart = true;
    }

    const currentDirection = this.getDirection(currentProgress); // -1 | 0 | 1
    const hasDirectionReversed =
      currentDirection !== 0 &&
      this.runtimeState.previousDirection !== 0 &&
      currentDirection !== this.runtimeState.previousDirection;

    this.updateLength(
      currentProgress,
      currentDirection || this.runtimeState.previousDirection,
    );
    const trailHeadPosition = this.computeHeadPosition(
      camera.position.z,
      currentProgress,
    );
    this.updateOpacity(currentProgress);

    if (hasDirectionReversed) {
      this.trail.reset();
      const restartLeadPosition = trailHeadPosition.clone(); // small lead point
      restartLeadPosition.z +=
        currentDirection * this.configuration.pointSettings.initialSeedStepZ;
      this.trail.addPoint(restartLeadPosition);
    }

    this.trail.addPoint(trailHeadPosition);

    if (currentDirection !== 0) {
      this.runtimeState.previousDirection = currentDirection;
    }
    this.runtimeState.previousProgress = currentProgress;

    this.trailHeadParticles.update(
      deltaSeconds,
      trailHeadPosition,
      this.runtimeState.currentOpacity,
      true,
    );
  }

  /**
   * Normalized 0..1 scroll progress (reference TrailController.getProgress).
   * Primary path: `(maxCameraZ - camZ) / (maxCameraZ - minCameraZ)` using the
   * gallery's public camera bounds (reference used Scroll's, private here — same
   * values). Fallbacks (verbatim from the reference): blended plane progress,
   * then raw depth progress.
   */
  private getProgress(
    camera: THREE.PerspectiveCamera,
    scroll: Scroll | null,
  ): number {
    void scroll; // bounds come from the gallery (Scroll's are private); kept for parity
    const maxCameraZ = this.gallery.getCameraMaxZ();
    const minCameraZ = this.gallery.getCameraMinZ();
    const scrollRange = maxCameraZ - minCameraZ;

    if (Number.isFinite(scrollRange) && scrollRange > 0) {
      return THREE.MathUtils.clamp(
        (maxCameraZ - camera.position.z) / scrollRange,
        0,
        1,
      );
    }

    const blend = this.gallery.getPlaneBlendData(camera.position.z);
    if (blend) {
      const lastIndex = Math.max(this.gallery.getCount() - 1, 1);
      return THREE.MathUtils.clamp(
        (blend.currentPlaneIndex + blend.blend) / lastIndex,
        0,
        1,
      );
    }

    return this.gallery.getDepthProgress(camera.position.z);
  }

  /**
   * Head position on the sine path at the given camera Z + progress (reference
   * computeHeadPosition). Horizontal + vertical sine waves, depth driven from the
   * camera minus a progress-scaled offset. Mobile widens/offsets the X swing.
   */
  private computeHeadPosition(cameraZ: number, progress: number): THREE.Vector3 {
    const clampedProgress = THREE.MathUtils.clamp(progress, 0, 1);
    const { pathSettings, responsiveSettings } = this.configuration;
    const horizontalCycles = Math.max(pathSettings.horizontalCycles, 0.0001);
    const verticalCycles = Math.max(pathSettings.verticalCycles, 0.0001);

    const isMobileViewport =
      typeof window !== "undefined" &&
      window.innerWidth <= responsiveSettings.mobileBreakpoint;
    const responsiveStartXPosition =
      pathSettings.startXPosition +
      (isMobileViewport ? responsiveSettings.mobileStartXOffset : 0);
    const responsiveHorizontalWidth =
      pathSettings.horizontalWidth *
      (isMobileViewport ? responsiveSettings.mobileWidthScale : 1);

    const xPosition =
      responsiveStartXPosition +
      Math.sin(clampedProgress * FULL_CIRCLE_RADIANS * horizontalCycles) *
        responsiveHorizontalWidth;

    const yPosition =
      pathSettings.startYPosition +
      Math.sin(clampedProgress * FULL_CIRCLE_RADIANS * verticalCycles) *
        pathSettings.verticalAmplitude;

    const depthProgress =
      pathSettings.progressDepthOffset +
      clampedProgress * (1 - pathSettings.progressDepthOffset);

    const zPosition =
      cameraZ +
      pathSettings.distanceAheadOfCamera -
      (pathSettings.baseDepthOffset + depthProgress * pathSettings.depthSpan);

    this.headPosition.set(xPosition, yPosition, zPosition);
    return this.headPosition;
  }

  /**
   * Seed the trail with a short run of points behind the head so it has a visible
   * tail on the very first frame (reference seedInitialPoints).
   */
  private seedInitialPoints(camera: THREE.PerspectiveCamera | null): void {
    if (this.runtimeState.hasSeededInitialPoints || !camera) return;

    const startPosition = this.computeHeadPosition(
      camera.position.z,
      0,
    ).clone();

    for (
      let index = this.configuration.pointSettings.initialSeedPointCount;
      index >= 0;
      index -= 1
    ) {
      const seedPosition = startPosition.clone();
      seedPosition.z -=
        index * this.configuration.pointSettings.initialSeedStepZ;
      this.trail.addPoint(seedPosition);
    }

    this.runtimeState.hasSeededInitialPoints = true;
  }

  /** Movement direction this frame: -1, 0, or 1 (reference getDirection). */
  private getDirection(progress: number): number {
    if (this.runtimeState.previousProgress === null) return 0;
    const progressDelta = progress - this.runtimeState.previousProgress;
    if (Math.abs(progressDelta) <= this.configuration.directionChangeEpsilon) {
      return 0;
    }
    return Math.sign(progressDelta);
  }

  /**
   * Lerp the trail length 14→220 by progress (shrunk while reversing) and pick
   * the per-frame trim budget by direction (reference updateLength).
   */
  private updateLength(progress: number, direction: number): void {
    const { pointSettings } = this.configuration;
    const lengthProgress =
      direction < 0 ? progress * pointSettings.reverseLengthScale : progress;

    this.trail.maxPoints = Math.round(
      THREE.MathUtils.lerp(
        pointSettings.minimumPointCount,
        pointSettings.maximumPointCount,
        THREE.MathUtils.clamp(lengthProgress, 0, 1),
      ),
    );

    this.trail.maxTrimPerFrame =
      direction < 0
        ? pointSettings.trimPerFrameReverse
        : pointSettings.trimPerFrameForward;
  }

  /**
   * Edge-fade + idle-start opacity, lerp-smoothed onto the trail material
   * (reference updateOpacity). The trail dims near both ends of the scroll range
   * and shows a small idle hint before the user has scrolled.
   */
  private updateOpacity(progress: number): void {
    const { opacitySettings } = this.configuration;

    const startDistance = THREE.MathUtils.clamp(
      progress + opacitySettings.startVisibilityBias,
      0,
      1,
    );
    const endDistance = 1 - progress;
    const closestEdgeDistance = Math.min(startDistance, endDistance);

    const edgeVisibility = THREE.MathUtils.smoothstep(
      closestEdgeDistance,
      opacitySettings.edgeFadeStart,
      opacitySettings.edgeFadeEnd,
    );

    const startupVisibility =
      !this.runtimeState.hasUserMovedFromStart &&
      progress <= opacitySettings.idleProgressThreshold
        ? opacitySettings.idleOpacityAtStart
        : 0;

    const visibility = Math.max(edgeVisibility, startupVisibility);
    const targetOpacity = opacitySettings.baseOpacity * visibility;

    this.runtimeState.currentOpacity = THREE.MathUtils.lerp(
      this.runtimeState.currentOpacity,
      targetOpacity,
      opacitySettings.opacitySmoothing,
    );

    this.trail.setOpacity(this.runtimeState.currentOpacity);
  }
}
