import * as THREE from "three";
import type { ProjectWithColors } from "../types";
import { lerp, clamp } from "./utils";
import type { Mood, MoodBlend } from "./Background";
import type Scroll from "./Scroll";

/**
 * Gallery — builds and animates the textured planes for the Codrops-style
 * Depth Gallery. Vanilla TS (no React). Engine.ts owns the scene/camera/
 * renderer; Gallery owns the planes and all their per-frame motion.
 *
 * Faithful rewrite (WAVE 2) of the reference `Gallery.js`:
 *   - PURE OPACITY crossfade between the two planes the camera is between —
 *     `MeshBasicMaterial(transparent, depthWrite:false, DoubleSide)`, NOT the
 *     grayscale-desaturation ShaderMaterial the prior port used. (`shaders.ts`
 *     is no longer imported here; it is now unused — only Background relies on
 *     its own `backgroundShaders.ts`.)
 *   - VELOCITY-DRIVEN MOTION: this is the feature the user explicitly wants.
 *       • breath  — scroll velocity magnitude → per-plane tilt + scale pulse
 *       • drift   — signed scroll velocity → per-plane Y offset
 *       • pointer — window pointermove → per-plane X/Y parallax (RAW clientX/Y,
 *                   NOT RTL-negated — this is screen space, not reading flow)
 *     All scaled by each plane's current opacity so off-screen planes don't move.
 *
 * Per-frame contract:
 *   Experience.update() calls `gallery.update(camera, scroll)` which runs
 *   updatePlaneVisibility(cameraZ) then updatePlaneMotion(scroll). It also calls
 *   getMoodBlendData / getPlaneBlendData / getDepthProgress each frame for the
 *   background blend, the blend-aware active index / frame-dark tone, and the
 *   trail progress. Gallery owns this math because it owns the plane positions.
 *
 * Reduced motion: `prefers-reduced-motion: reduce` snaps opacity (no fade lerp)
 * and zeroes breath / drift / pointer parallax (Constitution §8).
 *
 * WAVE 6: the reduced-motion flag can be INJECTED by Experience (the single
 * gate Engine routes) via the constructor's optional `reducedMotion` arg. When
 * omitted it falls back to a self `matchMedia` read (backward-compatible). Either
 * way the source is the same `(prefers-reduced-motion: reduce)` query, so the
 * gallery stays coherent with the trail / background / scroll under the master
 * switch — planes go fully static (no breath/drift/parallax, opacity snaps).
 */

/**
 * Reference-shaped plane-blend tuple: which plane the camera is currently
 * between and how far (0..1). Experience uses this for the blend-aware active
 * index, frame-dark tone, and trail progress.
 */
export interface PlaneBlendData {
  currentPlaneIndex: number;
  nextPlaneIndex: number;
  blend: number;
}

const PLANE_GAP = 5;
const FIRST_VIEW_OFFSET = 5;
const LAST_VIEW_OFFSET = 5;
const PLANE_FADE_SMOOTHING = 0.14;
// Reference uses a square PlaneGeometry(3,3) and scales by texture aspect.
const PLANE_GEOMETRY_SIZE = 3;
const DESKTOP_PLANE_SCALE = 1.0;
const MOBILE_PLANE_SCALE = 0.65;
const MOBILE_BREAKPOINT = 768;
const DESKTOP_X_SPREAD_FACTOR = 1;
const MOBILE_X_SPREAD_FACTOR = 0.25;

// Sample one gap ahead so the label/mood/fade lands on the plane the camera is
// approaching (reference planeFadeSampleOffset = moodSampleOffset = 1).
const SAMPLE_OFFSET = 1;

// Default texture anisotropy when the renderer's max-anisotropy is not
// available to us (Gallery doesn't hold a renderer reference). 4 is a safe
// baseline that every modern GPU supports.
const DEFAULT_ANISOTROPY = 4;

// Base "position.x" magnitude (world units) for the zig-zag corridor rhythm.
// The reference reads this from galleryData.position.x (±0.7..1.0); our project
// data has no position, so we synthesize an alternating ±X (plane 0 centered).
// Multiplied by the x-spread factor (1 desktop / 0.25 mobile) at layout time.
const BASE_X_MAGNITUDE = 0.9;

// --- Velocity-driven motion tuning (reference Gallery.js values) ---
const PARALLAX_AMOUNT_X = 0.16;
const PARALLAX_AMOUNT_Y = 0.08;
const PARALLAX_SMOOTHING = 0.08;
const BREATH_TILT_AMOUNT = 0.045;
const BREATH_SCALE_AMOUNT = 0.03;
const BREATH_SMOOTHING = 0.14;
const BREATH_GAIN = 1.1;
const GESTURE_PARALLAX_AMOUNT_Y = 0.05;
const GESTURE_PARALLAX_SMOOTHING = 0.05;

interface PlaneUserData {
  baseX: number; // synthesized zig-zag x (pre-spread)
  baseY: number;
  aspectRatio: number;
}

export default class Gallery {
  private scene: THREE.Scene;
  private projects: ProjectWithColors[];
  private planes: THREE.Mesh[] = [];
  private materials: THREE.MeshBasicMaterial[] = [];
  private textures: THREE.Texture[] = [];
  private currentOpacities: number[] = [];
  // Parallel to `planes` — flipped to true by the TextureLoader onError
  // callback when an image 404s (or otherwise fails to decode). update()
  // forces target opacity = 0 for failed planes so the user sees nothing
  // instead of an untextured rectangle as the camera scrolls past.
  private failed: boolean[] = [];
  private isMobile: boolean;
  private reducedMotion: boolean;

  // --- Pointer parallax state (screen space; NOT RTL-negated) ---
  private pointerTarget = new THREE.Vector2(0, 0);
  private pointerCurrent = new THREE.Vector2(0, 0);
  private readonly onPointerMove: (e: PointerEvent) => void;
  private readonly onPointerLeave: () => void;

  // --- Breath + drift state (driven by scroll velocity) ---
  private breathIntensity = 0;
  private driftCurrent = 0;

  constructor(
    scene: THREE.Scene,
    projects: ProjectWithColors[],
    reducedMotion?: boolean,
  ) {
    this.scene = scene;
    this.projects = projects;
    this.isMobile = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT}px)`,
    ).matches;
    // Wave-6: prefer the gate-injected flag (from Experience/Engine's single
    // detectQuality()); fall back to self-detection for a bare `new Gallery()`.
    this.reducedMotion =
      reducedMotion ??
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Pointer parallax: map raw clientX/Y to NDC-ish [-1,1]. The Y is flipped
    // so "up on screen" is +y in three space. NOT RTL-negated — pointer is in
    // screen pixels, independent of text direction.
    this.onPointerMove = (e: PointerEvent): void => {
      const x = (e.clientX / window.innerWidth) * 2 - 1;
      const y = (e.clientY / window.innerHeight) * 2 - 1;
      this.pointerTarget.set(x, -y);
    };
    this.onPointerLeave = (): void => {
      this.pointerTarget.set(0, 0);
    };

    this.build();
    this.bindPointerEvents();
  }

  private build(): void {
    const loader = new THREE.TextureLoader();

    // Vite serves the `public/` folder at import.meta.env.BASE_URL
    // (configured to "/halls/dist/" in vite.config.ts). Each project.image
    // is "images/projects/oasis-NN.webp" — concatenating with BASE_URL
    // yields an absolute path that resolves the same way on every page.
    const base = import.meta.env.BASE_URL;

    // Square geometry shared by every plane (reference); per-plane scale carries
    // the texture aspect ratio.
    const geometry = new THREE.PlaneGeometry(
      PLANE_GEOMETRY_SIZE,
      PLANE_GEOMETRY_SIZE,
    );

    for (let i = 0; i < this.projects.length; i++) {
      const project = this.projects[i];
      const url = base + project.image;
      const planeIndex = i;

      const texture = loader.load(
        url,
        (loadedTex) => {
          // Texture decoded — capture its real aspect ratio so the next frame's
          // motion/scale uses the correct shape (build-time default is 1).
          const img = loadedTex.image as
            | { width?: number; height?: number }
            | undefined;
          if (img && img.width && img.height) {
            const data = this.planes[planeIndex]?.userData as
              | PlaneUserData
              | undefined;
            if (data) data.aspectRatio = img.width / img.height;
          }
        },
        undefined, // onProgress — not used
        (err) => {
          console.warn("[Gallery] texture load failed:", url, err);
          this.failed[planeIndex] = true;
        },
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = DEFAULT_ANISOTROPY;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      // Pure-opacity crossfade material — no shader, no desaturation. White base
      // color so the texture shows at full fidelity; opacity is the only knob.
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        opacity: i === 0 ? 1 : 0,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Synthesize the zig-zag: plane 0 centered, then alternate ±. Stored
      // pre-spread; layout/motion multiply by the x-spread factor.
      const baseX = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * BASE_X_MAGNITUDE;
      const userData: PlaneUserData = { baseX, baseY: 0, aspectRatio: 1 };
      mesh.userData = userData;

      // Initial layout + scale (re-applied each frame by updatePlaneMotion).
      const xSpread = this.getXSpreadFactor();
      const planeScale = this.getPlaneScale();
      mesh.position.set(baseX * xSpread, 0, this.getPlaneZ(i));
      mesh.scale.set(planeScale, planeScale, 1);

      this.scene.add(mesh);

      this.planes.push(mesh);
      this.materials.push(material);
      this.textures.push(texture);
      this.currentOpacities.push(i === 0 ? 1 : 0);
      this.failed.push(false);
    }
  }

  private getPlaneScale(): number {
    return this.isMobile ? MOBILE_PLANE_SCALE : DESKTOP_PLANE_SCALE;
  }

  private getXSpreadFactor(): number {
    return this.isMobile ? MOBILE_X_SPREAD_FACTOR : DESKTOP_X_SPREAD_FACTOR;
  }

  private bindPointerEvents(): void {
    window.addEventListener("pointermove", this.onPointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", this.onPointerLeave, {
      passive: true,
    });
  }

  /**
   * Per-frame update (reference Gallery.update). Runs the pure-opacity
   * crossfade then the velocity-driven motion.
   *
   * Planes sit at z = -i * PLANE_GAP (negative); the camera starts at the
   * nearest-plane offset and scrolls toward the deepest.
   */
  public update(
    camera: THREE.PerspectiveCamera | null = null,
    scroll: Scroll | null = null,
  ): void {
    if (!camera) return;
    this.updatePlaneVisibility(camera.position.z);
    this.updatePlaneMotion(scroll);
  }

  /**
   * Pure-opacity crossfade (reference updatePlaneVisibility). The plane the
   * camera is leaving fades to `1 - blend`, the one it's approaching rises to
   * `blend`; everything else fades to 0. Lerp-smoothed (0.14) so the transition
   * is gentle. NO desaturation — receding planes simply fade out.
   */
  private updatePlaneVisibility(cameraZ: number): void {
    const blendData = this.getPlaneBlendData(cameraZ);
    if (!blendData) return;
    const { currentPlaneIndex, nextPlaneIndex, blend } = blendData;

    for (let i = 0; i < this.planes.length; i++) {
      let target = 0;
      if (i === currentPlaneIndex) target = 1 - blend;
      if (i === nextPlaneIndex) target = Math.max(target, blend);
      // Failed-load planes stay invisible — see `failed` field doc.
      if (this.failed[i]) target = 0;

      const prev = Number.isFinite(this.currentOpacities[i])
        ? this.currentOpacities[i]
        : 0;
      const next = this.reducedMotion
        ? target
        : lerp(prev, target, PLANE_FADE_SMOOTHING);
      this.currentOpacities[i] = next;
      this.materials[i].opacity = next;
    }
  }

  /**
   * Velocity-driven motion (reference updatePlaneMotion). Combines:
   *   - pointer parallax  (pointerCurrent lerped toward pointerTarget @0.08)
   *   - breath            (|velocity|/velocityMax * gain → tilt + scale pulse)
   *   - drift             (signed velocity/velocityMax → Y offset)
   * Each per-plane effect is scaled by that plane's current opacity (so faded
   * planes don't move) and a slight depth influence (deeper planes parallax a
   * touch more). Reduced motion zeroes all three.
   */
  private updatePlaneMotion(scroll: Scroll | null): void {
    // Smooth pointer toward target (disabled under reduced motion).
    if (this.reducedMotion) {
      this.pointerCurrent.set(0, 0);
    } else {
      this.pointerCurrent.lerp(this.pointerTarget, PARALLAX_SMOOTHING);
    }

    // Velocity → breath + drift targets.
    const velocityMax = Math.max(scroll?.velocityMax || 1, 0.0001);
    const velocityNormalized = clamp(
      Math.abs(scroll?.velocity || 0) / velocityMax,
      0,
      1,
    );
    const scrollDrift = clamp((scroll?.velocity || 0) / velocityMax, -1, 1);

    const targetBreathIntensity = this.reducedMotion
      ? 0
      : clamp(velocityNormalized * BREATH_GAIN, 0, 1);
    this.breathIntensity = this.reducedMotion
      ? 0
      : lerp(this.breathIntensity, targetBreathIntensity, BREATH_SMOOTHING);

    const driftTarget = this.reducedMotion ? 0 : scrollDrift;
    this.driftCurrent = this.reducedMotion
      ? 0
      : lerp(this.driftCurrent, driftTarget, GESTURE_PARALLAX_SMOOTHING);

    const xSpread = this.getXSpreadFactor();
    const baseScale = this.getPlaneScale();

    for (let i = 0; i < this.planes.length; i++) {
      const plane = this.planes[i];
      const data = plane.userData as PlaneUserData;
      const opacity = Number.isFinite(this.currentOpacities[i])
        ? this.currentOpacities[i]
        : 0;
      const depthInfluence = 1 + i * 0.05;
      const parallaxInfluence = opacity * depthInfluence;

      // Position: base zig-zag + pointer parallax (X/Y) + drift (Y).
      const parallaxOffsetX =
        this.pointerCurrent.x * PARALLAX_AMOUNT_X * parallaxInfluence;
      const parallaxOffsetY =
        this.pointerCurrent.y * PARALLAX_AMOUNT_Y * parallaxInfluence;
      const gestureOffsetY = this.driftCurrent * GESTURE_PARALLAX_AMOUNT_Y;

      plane.position.x = data.baseX * xSpread + parallaxOffsetX;
      plane.position.y = data.baseY + parallaxOffsetY + gestureOffsetY;
      plane.position.z = this.getPlaneZ(i);

      // Rotation: breath tilt driven by pointer + velocity, scaled by opacity.
      const breathInfluence = this.breathIntensity * opacity;
      plane.rotation.x =
        -this.pointerCurrent.y * BREATH_TILT_AMOUNT * breathInfluence;
      plane.rotation.y =
        this.pointerCurrent.x * BREATH_TILT_AMOUNT * breathInfluence;
      plane.rotation.z = 0;

      // Scale: base * aspect + breath scale pulse.
      const aspectRatio = data.aspectRatio || 1;
      const scalePulse = 1 + BREATH_SCALE_AMOUNT * breathInfluence;
      plane.scale.x = baseScale * aspectRatio * scalePulse;
      plane.scale.y = baseScale * scalePulse;
      plane.scale.z = 1;
    }
  }

  public getDepthRange(): { nearestZ: number; deepestZ: number } {
    const count = this.projects.length;
    if (count === 0) return { nearestZ: 0, deepestZ: 0 };
    return {
      nearestZ: this.getPlaneZ(0), // largest Z (= 0)
      deepestZ: this.getPlaneZ(count - 1), // most negative
    };
  }

  /**
   * Plane-blend tuple (reference Gallery.getPlaneBlendData). Maps cameraZ to a
   * fractional position along the plane stack: the current plane, the next
   * plane, and a 0..1 blend between them. Drives the pure-opacity crossfade,
   * the blend-aware active index, the frame-dark tone (Experience), and the
   * trail progress (Wave 3). Samples one gap ahead (SAMPLE_OFFSET = 1).
   */
  public getPlaneBlendData(cameraZ: number): PlaneBlendData | null {
    const count = this.projects.length;
    if (count === 0) return null;

    const planeGap = Math.max(PLANE_GAP, 0.0001);
    const firstPlaneZ = this.getPlaneZ(0);
    const lastPlaneIndex = count - 1;
    const sampledCameraZ = cameraZ - planeGap * SAMPLE_OFFSET;
    const normalizedDepth = clamp(
      (firstPlaneZ - sampledCameraZ) / planeGap,
      0,
      lastPlaneIndex,
    );
    const currentPlaneIndex = Math.floor(normalizedDepth);
    const nextPlaneIndex = Math.min(currentPlaneIndex + 1, lastPlaneIndex);
    const blend = normalizedDepth - currentPlaneIndex;

    return { currentPlaneIndex, nextPlaneIndex, blend };
  }

  /**
   * 0..1 progress of the camera through the full depth span (reference
   * Gallery.getDepthProgress). 0 at the nearest plane, 1 at the deepest.
   */
  public getDepthProgress(cameraZ: number): number {
    const { nearestZ, deepestZ } = this.getDepthRange();
    const depthSpan = nearestZ - deepestZ;
    if (depthSpan <= 0) return 0;
    return clamp((nearestZ - cameraZ) / depthSpan, 0, 1);
  }

  /**
   * Blend-aware active plane index (reference label target: blend >= 0.5 ?
   * next : current). Engine/Experience also compute this; exposed here for
   * callers that want it straight from Gallery.
   */
  public getActivePlaneIndex(cameraZ: number): number {
    const blendData = this.getPlaneBlendData(cameraZ);
    if (!blendData) return -1;
    return blendData.blend >= 0.5
      ? blendData.nextPlaneIndex
      : blendData.currentPlaneIndex;
  }

  /** The three mood colors for plane `index`, or null if out of range. */
  private getMoodColorsByIndex(index: number): Mood | null {
    if (index < 0 || index >= this.projects.length) return null;
    const { colors } = this.projects[index];
    return {
      background: colors.background,
      blob1: colors.blob1,
      blob2: colors.blob2,
    };
  }

  /**
   * Reference-shaped mood blend (Gallery.getMoodBlendData). Returns the current
   * + next plane moods and a 0..1 blend; Experience feeds this straight into
   * Background.setMoodBlend so the GLSL blob colors crossfade as the camera
   * glides past each plane. Uses the same one-gap-ahead sampling as
   * getPlaneBlendData (reference moodSampleOffset = 1).
   */
  public getMoodBlendData(cameraZ: number): MoodBlend | null {
    const blendData = this.getPlaneBlendData(cameraZ);
    if (!blendData) return null;

    const { currentPlaneIndex, nextPlaneIndex, blend } = blendData;
    const currentMood = this.getMoodColorsByIndex(currentPlaneIndex);
    if (!currentMood) return null;
    const nextMood = this.getMoodColorsByIndex(nextPlaneIndex) ?? currentMood;

    return { currentMood, nextMood, blend };
  }

  public getCount(): number {
    return this.projects.length;
  }

  public getPlaneZ(i: number): number {
    return -i * PLANE_GAP;
  }

  public getCameraStartZ(): number {
    return FIRST_VIEW_OFFSET; // nearestZ (0) + FIRST_VIEW_OFFSET
  }

  public getCameraMinZ(): number {
    // deepestZ + LAST_VIEW_OFFSET (reference minCameraZ).
    return this.getPlaneZ(Math.max(this.projects.length - 1, 0)) +
      LAST_VIEW_OFFSET;
  }

  public getCameraMaxZ(): number {
    return FIRST_VIEW_OFFSET; // = cameraStartZ
  }

  public dispose(): void {
    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerleave", this.onPointerLeave);

    for (const tex of this.textures) tex.dispose();
    for (const mat of this.materials) mat.dispose();
    for (const mesh of this.planes) {
      mesh.geometry.dispose();
      this.scene.remove(mesh);
    }
    this.planes = [];
    this.materials = [];
    this.textures = [];
    this.currentOpacities = [];
    this.failed = [];
  }
}
