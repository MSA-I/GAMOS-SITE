import * as THREE from "three";
import { bgVert, bgFrag } from "./backgroundShaders";

/**
 * Background — atmospheric GLSL backdrop rendered in its OWN orthographic
 * scene, BEHIND the textured planes. Faithful rewrite of the Codrops
 * reference `Background/index.js` (the previous port painted a flat CSS
 * `<div>`; this is the real shader pass with animated mood "blobs" + film
 * grain + velocity luminance lift).
 *
 * Render contract (driven by Engine, see Engine._render):
 *   renderer.autoClear = false;
 *   renderer.clear();
 *   background.render(renderer);   // paints this ortho scene first
 *   renderer.clearDepth();         // so the planes draw on top
 *   renderer.render(scene, camera);
 *
 * Color contract (driven by Experience.update each frame):
 *   background.setMoodBlend({ currentMood, nextMood, blend });
 *   background.setMotionResponse({ depthProgress, velocityIntensity });
 *   background.update(timeSeconds);
 *
 * Ownership: Background is constructed + disposed by Experience (the single
 * dispose owner of all sub-modules). It holds its own scene/camera/material/
 * mesh and frees them in dispose().
 *
 * Warm-luxury skin: the reference's cream defaults (`#FBE8CD` bg /
 * `#FFD56D` / `#5D816A`) are replaced with Gamos ivory + warm brass tints.
 * Wave 5 finalizes the exact skin; these are sensible warm starting values
 * (per-plane mood colors from extractedColors.json override them at runtime
 * via setMoodBlend, so these only show before the first blend lands).
 */

export interface Mood {
  background: string;
  blob1: string;
  blob2: string;
}

export interface MoodBlend {
  currentMood: Mood;
  nextMood?: Mood;
  blend?: number;
}

export interface MotionResponse {
  depthProgress?: number;
  velocityIntensity?: number;
}

interface BgUniforms {
  uBackgroundColor: { value: THREE.Color };
  uBlob1Color: { value: THREE.Color };
  uBlob2Color: { value: THREE.Color };
  uNoiseStrength: { value: number };
  uBlobRadius: { value: number };
  uBlobRadiusSecondary: { value: number };
  uBlobStrength: { value: number };
  uTime: { value: number };
  uVelocityIntensity: { value: number };
}

// Wrap uTime to a period so sin/cos arguments stay small over long sessions
// (precision guard, plan risk #4). The fragment multiplies uTime by 0.28, so
// a 6000s wrap keeps animTime within a few thousand radians — well inside
// highp float range — while the period is long enough to be imperceptible.
const TIME_WRAP_SECONDS = 6000;

export default class Background {
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private material: THREE.ShaderMaterial;
  private mesh: THREE.Mesh;
  private disposed = false;

  // --- Warm-luxury default skin (Wave 5 LOCKED) ---
  // Shown only for the split-second before the first per-plane mood blend
  // lands (setMoodBlend overrides these with extractedColors.json tones).
  // Tuned to read continuous with the main site: a warm ivory ground
  // (matching index.css `body` #ECE3D3, a notch warmer than the reference
  // cream #FBE8CD) with brass / cocoa blobs rather than the reference's
  // amber+green (#FFD56D / #5D816A).
  private backgroundColor = new THREE.Color("#ECE3D3"); // ivory-warm
  private blob1Color = new THREE.Color("#CFAE83"); // brass
  private blob2Color = new THREE.Color("#534133"); // cocoa

  // Scratch colors reused by setMoodBlend so we don't allocate per frame.
  private readonly nextBackgroundColor = new THREE.Color();
  private readonly nextBlob1Color = new THREE.Color();
  private readonly nextBlob2Color = new THREE.Color();

  // --- Blob tuning (reference values) ---
  private readonly baseBlobRadius = 0.65;
  private readonly secondaryBlobRadiusRatio = 0.78;
  private readonly baseBlobStrength = 0.9;
  private readonly noiseStrength = 0.04;

  // --- Motion-response state (reference values) ---
  private readonly depthToRadiusAmount = 0.08;
  private readonly velocityToStrengthAmount = 0.1;
  private readonly motionSmoothing = 0.1;

  // Warm-skin velocity-lift damping (Wave 5, plan risk #2). The fragment adds
  // a FLAT `uVelocityIntensity * 0.10` luminance lift to every channel. Over
  // the reference's dark/cream ground that reads as a pleasant glow; over our
  // bright ivory ground (#ECE3D3 ≈ 0.92 luma) the same lift shoves the warm
  // tone toward flat white and kills the luxury feel. Scaling the intensity
  // that reaches the uniform by 0.45 keeps a perceptible velocity shimmer
  // without washing the base out. (Kept in Background — color/feel — rather
  // than editing the shared backgroundShaders.ts fragment.)
  private readonly velocityLiftScale = 0.45;
  private motionDepthProgress = 0;
  private motionVelocityIntensity = 0;
  private smoothedDepthProgress = 0;
  private smoothedVelocityIntensity = 0;

  private blobRadius = this.baseBlobRadius;
  private blobStrength = this.baseBlobStrength;

  // Wave-6 reduced-motion freeze (set by Experience). When true, update() snaps
  // the eased depth/velocity values to their targets instead of lerping — so a
  // single rendered frame fully resolves the blob radius (the Engine RAF
  // short-circuit only re-draws on camera-Z change under reduce, which would
  // otherwise leave the lerp permanently mid-ease). Combined with the constant
  // uTime Experience feeds, the backdrop is completely static under reduce.
  private reducedMotion = false;

  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms: BgUniforms = {
      uBackgroundColor: { value: this.backgroundColor },
      uBlob1Color: { value: this.blob1Color },
      uBlob2Color: { value: this.blob2Color },
      uNoiseStrength: { value: this.noiseStrength },
      uBlobRadius: { value: this.blobRadius },
      uBlobRadiusSecondary: {
        value: this.blobRadius * this.secondaryBlobRadiusRatio,
      },
      uBlobStrength: { value: this.blobStrength },
      uTime: { value: 0 },
      uVelocityIntensity: { value: 0 },
    };

    this.material = new THREE.ShaderMaterial({
      vertexShader: bgVert,
      fragmentShader: bgFrag,
      depthWrite: false,
      depthTest: false,
      uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);

    this.applyMotionToBlob();
  }

  private get uniforms(): BgUniforms {
    return this.material.uniforms as unknown as BgUniforms;
  }

  /** Set the three mood colors directly (no blend). */
  public setMoodColors(mood: Partial<Mood>): void {
    if (mood.background) this.backgroundColor.set(mood.background);
    if (mood.blob1) this.blob1Color.set(mood.blob1);
    if (mood.blob2) this.blob2Color.set(mood.blob2);
    this.updateUniformColors();
  }

  /**
   * Lerp the three mood colors between the current plane and the next plane
   * by `blend` (0..1). Mirrors reference Background.setMoodBlend.
   */
  public setMoodBlend({ currentMood, nextMood, blend }: MoodBlend): void {
    if (!currentMood) return;

    const safeBlend = THREE.MathUtils.clamp(blend ?? 0, 0, 1);
    if (!nextMood || safeBlend <= 0) {
      this.setMoodColors(currentMood);
      return;
    }

    this.backgroundColor
      .set(currentMood.background)
      .lerp(this.nextBackgroundColor.set(nextMood.background), safeBlend);
    this.blob1Color
      .set(currentMood.blob1)
      .lerp(this.nextBlob1Color.set(nextMood.blob1), safeBlend);
    this.blob2Color
      .set(currentMood.blob2)
      .lerp(this.nextBlob2Color.set(nextMood.blob2), safeBlend);

    this.updateUniformColors();
  }

  /**
   * Record the latest depth-progress + velocity-intensity targets. The actual
   * blob radius/strength are eased toward these in update() (motionSmoothing).
   */
  public setMotionResponse({
    depthProgress,
    velocityIntensity,
  }: MotionResponse): void {
    if (typeof depthProgress === "number" && Number.isFinite(depthProgress)) {
      this.motionDepthProgress = THREE.MathUtils.clamp(depthProgress, 0, 1);
    }
    if (
      typeof velocityIntensity === "number" &&
      Number.isFinite(velocityIntensity)
    ) {
      this.motionVelocityIntensity = THREE.MathUtils.clamp(
        velocityIntensity,
        0,
        1,
      );
    }
  }

  /**
   * Enable the reduced-motion freeze (Experience routes the Wave-6 gate here).
   * When set, update() snaps the eased values instead of lerping so the blob
   * radius resolves in one frame.
   */
  public setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
  }

  /** Per-frame tick. `timeSeconds` is wall-clock seconds; wrapped internally. */
  public update(timeSeconds = 0): void {
    // Under reduced motion snap (no ease) so a single rendered frame fully
    // resolves; otherwise lerp toward the targets (motionSmoothing).
    const smoothing = this.reducedMotion ? 1 : this.motionSmoothing;
    this.smoothedDepthProgress = THREE.MathUtils.lerp(
      this.smoothedDepthProgress,
      this.motionDepthProgress,
      smoothing,
    );
    this.smoothedVelocityIntensity = THREE.MathUtils.lerp(
      this.smoothedVelocityIntensity,
      this.motionVelocityIntensity,
      smoothing,
    );

    const wrappedTime =
      ((timeSeconds % TIME_WRAP_SECONDS) + TIME_WRAP_SECONDS) %
      TIME_WRAP_SECONDS;
    this.uniforms.uTime.value = wrappedTime;
    // Damp the flat luminance lift so a fast scroll doesn't wash the ivory
    // ground to white (Wave 5, plan risk #2). blob-strength response below
    // still reads full velocity via smoothedVelocityIntensity.
    this.uniforms.uVelocityIntensity.value =
      this.smoothedVelocityIntensity * this.velocityLiftScale;

    this.applyMotionToBlob();
  }

  /** Render this background's ortho scene. Called by Engine before the planes. */
  public render(renderer: THREE.WebGLRenderer): void {
    if (this.disposed) return;
    renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    // Unparent the mesh FIRST, then release its GPU resources (Three.js best
    // practice, plan risk #3). No scene.clear() — the scene is private to
    // Background and holds only this one mesh; clear() would be both redundant
    // and a foot-gun if Background is ever extended to add more objects.
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.material.dispose();
  }

  // --- private ---

  private updateUniformColors(): void {
    this.uniforms.uBackgroundColor.value.copy(this.backgroundColor);
    this.uniforms.uBlob1Color.value.copy(this.blob1Color);
    this.uniforms.uBlob2Color.value.copy(this.blob2Color);
    this.uniforms.uNoiseStrength.value = this.noiseStrength;
  }

  private applyMotionToBlob(): void {
    const nextBlobRadius =
      this.baseBlobRadius + this.smoothedDepthProgress * this.depthToRadiusAmount;
    const nextBlobStrength =
      this.baseBlobStrength +
      this.smoothedVelocityIntensity * this.velocityToStrengthAmount;

    this.blobRadius = THREE.MathUtils.clamp(nextBlobRadius, 0.05, 1);
    this.blobStrength = THREE.MathUtils.clamp(nextBlobStrength, 0, 1);

    this.uniforms.uBlobRadius.value = this.blobRadius;
    this.uniforms.uBlobRadiusSecondary.value =
      this.blobRadius * this.secondaryBlobRadiusRatio;
    this.uniforms.uBlobStrength.value = this.blobStrength;
  }
}
