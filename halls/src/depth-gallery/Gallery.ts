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
 *   - PURE OPACITY crossfade via `MeshBasicMaterial(transparent,
 *     depthWrite:false, DoubleSide)`; no shader. (The old grayscale-desaturation
 *     ShaderMaterial — and the `shaders.ts` it lived in — have been removed.
 *     Only Background uses a shader, via its own `backgroundShaders.ts`.)
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
// The reference photos are PORTRAIT (aspect 0.75): scaled ×1.0 they're 2.25
// world-units wide, sitting at x=±0.9 — narrower than the gap between their
// centres, so a CHANNEL opens between the left/right planes and the camera
// glides BETWEEN them. Our venue photos are LANDSCAPE (aspect ~1.78): at ×1.0
// they'd be 5.33 wide and fully overlap at x=±0.9, so the camera flew THROUGH
// them (the "סחרחורת" / dizziness the user reported).
//
// Fix (user-approved "shrink + spread to the sides", focused 1–2 deep): we no
// longer scale by the raw geometry size × aspect. Instead we target a fixed
// world HEIGHT (~1.7 units ≈ 41% of the 4.14-unit visible height at the start
// distance) and derive width from the texture aspect. A 16:9 photo then lands
// ~3.0 wide — small enough that pushing the centres to x=±1.55 (spread below)
// leaves a real channel between neighbours, exactly like the reference. Height,
// not the geometry, is the size knob now.
const TARGET_PLANE_WORLD_HEIGHT = 1.7; // desktop world-units tall (≈41% screen)
const MOBILE_PLANE_WORLD_HEIGHT = 1.25; // a touch smaller on phones
const MOBILE_BREAKPOINT = 768;
// Side offset of each plane's centre (world units, pre-spread). The reference's
// ±0.9 was tuned to its 2.25-wide portrait planes; our ~3.0-wide planes need a
// wider throw so their centres (2×1.55 = 3.1 apart) exceed the plane width and
// the channel actually opens. Mobile keeps a smaller throw so planes don't run
// off a narrow screen.
const DESKTOP_X_SPREAD_FACTOR = 1.55;
const MOBILE_X_SPREAD_FACTOR = 0.62;
// Yaw each side plane slightly inward to face the channel — like looking down a
// corridor with pictures on alternating walls. 0 = face camera (reference);
// small positive = toe-in. Sign is applied per side in updatePlaneMotion.
const PLANE_INWARD_YAW = 0.20; // radians (~11.5°)

// Sample one gap ahead so the label/mood/fade lands on the plane the camera is
// approaching (reference planeFadeSampleOffset = moodSampleOffset = 1).
const SAMPLE_OFFSET = 1;

// Passing-cull window (world units of z AHEAD of the camera). A plane fully
// fades out over this window as the camera closes on it, hitting 0 by
// PASS_CULL_NEAR so it's gone before the camera is level with it (where a
// side-mounted plane would otherwise smear across the channel). Tuned so the
// cull starts well after the plane has had its on-axis "hero" moment: the gap
// is 5, so a plane is the focused/nearest one around zAhead≈5..2; culling from
// 2.2 down to 0.6 removes only the awkward fly-alongside tail.
const PASS_CULL_RANGE = 2.2; // start culling when this close (in front)
const PASS_CULL_NEAR = 0.6; // fully culled by here

// Default texture anisotropy when the renderer's max-anisotropy is not
// available to us (Gallery doesn't hold a renderer reference). 4 is a safe
// baseline that every modern GPU supports.
const DEFAULT_ANISOTROPY = 4;

// Base "position.x" magnitude (pre-spread) for the alternating left/right
// corridor rhythm. Multiplied by the x-spread factor at layout time, so the
// final centre offset is BASE_X_MAGNITUDE × DESKTOP_X_SPREAD_FACTOR = 1.0 × 1.55
// = ±1.55 world units — wide enough that ~3.0-wide landscape planes leave a
// channel between left and right (see TARGET_PLANE_WORLD_HEIGHT note). Plane 0
// is NOT centred any more (that would put the very first thing you see dead
// ahead, re-introducing the fly-through); instead every plane sits on a side,
// alternating right/left, so the camera always travels down the channel.
const BASE_X_MAGNITUDE = 1.0;

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
  baseX: number; // synthesized alternating x (pre-spread)
  baseY: number;
  aspectRatio: number;
  side: number; // +1 / −1 — which wall this plane sits on (drives inward yaw)
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
  // Parallel to `planes` — flipped to true by the TextureLoader onLoad callback
  // once the image has decoded and its real aspect ratio is known. update()
  // holds target opacity at 0 until then, so a plane is NEVER shown while its
  // texture is undefined / its scale is still the square build-time default
  // (plan finding #20 — no squashed/untextured frame). For local WebP this
  // resolves within ~1 frame, so the seed plane simply fades in once decoded
  // (a nicer entrance than a square-then-correct pop) and never appears wrong.
  private decoded: boolean[] = [];
  private isMobile: boolean;
  private reducedMotion: boolean;
  // Idempotent dispose guard — a second dispose() (e.g. a stray double
  // engine.dispose()) must not re-dispose already-freed textures/materials/
  // geometries. Coherent with Background + Experience, which guard the same way.
  private disposed = false;

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

      // Alternate every plane right/left (NO centred plane — see
      // BASE_X_MAGNITUDE note). Even indices to the inline-start side, odd to
      // the other, so scrolling walks down a corridor with pictures on
      // alternating walls. Stored pre-spread; layout/motion multiply by the
      // x-spread factor. `side` (+1/−1) is reused to yaw the plane inward.
      const side = i % 2 === 0 ? 1 : -1;
      const baseX = side * BASE_X_MAGNITUDE;
      const userData: PlaneUserData = {
        baseX,
        baseY: 0,
        aspectRatio: 1,
        side,
      };

      const texture = loader.load(
        url,
        (loadedTex) => {
          // Texture decoded — capture its real aspect ratio so motion/scale
          // uses the correct shape (build-time default is 1), and mark the
          // plane decoded so updatePlaneVisibility may now reveal it. The mesh
          // + bookkeeping arrays below are populated synchronously in this same
          // loop iteration; THREE.Cache is disabled (default), so this callback
          // is always async and never races them.
          const img = loadedTex.image as
            | { width?: number; height?: number }
            | undefined;
          if (img && img.width && img.height) {
            userData.aspectRatio = img.width / img.height;
            // Apply the corrected size immediately (don't wait a motion frame)
            // so the first frame this plane is visible already has the right
            // shape. Sizing is now HEIGHT-driven: fix the world height, derive
            // width from aspect (see TARGET_PLANE_WORLD_HEIGHT note).
            const sy = this.getPlaneScaleY();
            mesh.scale.x = sy * userData.aspectRatio;
            mesh.scale.y = sy;
          }
          this.decoded[planeIndex] = true;
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
      // Start fully transparent; updatePlaneVisibility reveals each plane only
      // after its texture has decoded (finding #20). Plane 0 fades in within
      // ~1 frame for local WebP.
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = userData;

      // Initial layout + scale (re-applied each frame by updatePlaneMotion).
      // Height-driven sizing: y = target world height, x = y × aspect. Aspect
      // is 1 until the texture decodes (callback above corrects it within ~1
      // frame for local WebP), and the plane is invisible until decoded anyway.
      const xSpread = this.getXSpreadFactor();
      const sy = this.getPlaneScaleY();
      mesh.position.set(baseX * xSpread, 0, this.getPlaneZ(i));
      mesh.scale.set(sy * userData.aspectRatio, sy, 1);
      // Seed the inward yaw so the very first painted frame already toes in.
      mesh.rotation.y = -side * PLANE_INWARD_YAW;

      this.scene.add(mesh);

      this.planes.push(mesh);
      this.materials.push(material);
      this.textures.push(texture);
      this.currentOpacities.push(0);
      this.failed.push(false);
      this.decoded.push(false);
    }
  }

  /**
   * Vertical scale factor applied to the unit-ish PlaneGeometry so the plane
   * lands at a fixed WORLD HEIGHT (not a fraction of the geometry). Width is
   * this × texture aspect. Geometry is PLANE_GEOMETRY_SIZE tall, so the factor
   * that yields TARGET_PLANE_WORLD_HEIGHT is height / geometry size.
   */
  private getPlaneScaleY(): number {
    const targetHeight = this.isMobile
      ? MOBILE_PLANE_WORLD_HEIGHT
      : TARGET_PLANE_WORLD_HEIGHT;
    return targetHeight / PLANE_GEOMETRY_SIZE;
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

      // PASSING CULL (anti-"bloom"): because planes sit on alternating SIDES at
      // x=±1.55 with the camera travelling straight down the channel at x=0, a
      // plane the camera draws ALONGSIDE (its z ≈ cameraZ) is only ~1.55 units
      // off-axis — at that range a 3-unit-wide plane balloons across half the
      // opposite side of the frame. The pure blend crossfade alone still has it
      // at partial opacity there. So we additionally fade a plane out as the
      // camera closes within PASS_CULL_RANGE in front of it, reaching 0 by the
      // time the camera is level — the leaving image is gone before it can
      // smear across the channel. (Planes deeper than the camera are unaffected;
      // only the one being passed is culled.)
      // Camera starts at z≈+5 and scrolls toward −z, looking down −z. A plane
      // at planeZ is IN FRONT while planeZ < cameraZ, so the in-front distance
      // is cameraZ − planeZ (positive ahead, 0 when level, negative once passed).
      const planeZ = this.getPlaneZ(i);
      const zAhead = cameraZ - planeZ;
      if (zAhead < PASS_CULL_RANGE) {
        const cull = clamp(
          (zAhead - PASS_CULL_NEAR) / (PASS_CULL_RANGE - PASS_CULL_NEAR),
          0,
          1,
        );
        target *= cull;
      }

      // Failed-load planes stay invisible — see `failed` field doc.
      if (this.failed[i]) target = 0;
      // Not-yet-decoded planes stay invisible until their texture lands, so we
      // never paint an untextured / square plane (finding #20). Once decoded
      // the normal crossfade target applies and the plane lerps in.
      if (!this.decoded[i]) target = 0;

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
    const baseScaleY = this.getPlaneScaleY();

    for (let i = 0; i < this.planes.length; i++) {
      const plane = this.planes[i];
      const data = plane.userData as PlaneUserData;
      const opacity = Number.isFinite(this.currentOpacities[i])
        ? this.currentOpacities[i]
        : 0;
      const depthInfluence = 1 + i * 0.05;
      const parallaxInfluence = opacity * depthInfluence;

      // Position: alternating side offset + pointer parallax (X/Y) + drift (Y).
      const parallaxOffsetX =
        this.pointerCurrent.x * PARALLAX_AMOUNT_X * parallaxInfluence;
      const parallaxOffsetY =
        this.pointerCurrent.y * PARALLAX_AMOUNT_Y * parallaxInfluence;
      const gestureOffsetY = this.driftCurrent * GESTURE_PARALLAX_AMOUNT_Y;

      plane.position.x = data.baseX * xSpread + parallaxOffsetX;
      plane.position.y = data.baseY + parallaxOffsetY + gestureOffsetY;
      plane.position.z = this.getPlaneZ(i);

      // Rotation: a constant inward YAW (toe-in toward the channel, like a
      // corridor wall) COMPOSED with the velocity/pointer breath tilt. The yaw
      // is the corridor feel; the breath is the life. side=+1 sits on the +x
      // wall and must yaw negative (face −x, toward centre), hence -side.
      const breathInfluence = this.breathIntensity * opacity;
      plane.rotation.x =
        -this.pointerCurrent.y * BREATH_TILT_AMOUNT * breathInfluence;
      plane.rotation.y =
        -data.side * PLANE_INWARD_YAW +
        this.pointerCurrent.x * BREATH_TILT_AMOUNT * breathInfluence;
      plane.rotation.z = 0;

      // Scale: HEIGHT-driven (fixed world height, width from aspect) + breath
      // scale pulse. This is what keeps landscape photos from filling the frame
      // and re-introducing the fly-through.
      const aspectRatio = data.aspectRatio || 1;
      const scalePulse = 1 + BREATH_SCALE_AMOUNT * breathInfluence;
      plane.scale.x = baseScaleY * aspectRatio * scalePulse;
      plane.scale.y = baseScaleY * scalePulse;
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
    if (this.disposed) return;
    this.disposed = true;

    window.removeEventListener("pointermove", this.onPointerMove);
    window.removeEventListener("pointerleave", this.onPointerLeave);

    // Unparent every plane from the scene graph BEFORE releasing GPU resources
    // (Three.js best practice, plan risk #3 — mirrors Trail/Background dispose).
    for (const mesh of this.planes) this.scene.remove(mesh);
    for (const tex of this.textures) tex.dispose();
    for (const mat of this.materials) mat.dispose();
    for (const mesh of this.planes) mesh.geometry.dispose();

    this.planes = [];
    this.materials = [];
    this.textures = [];
    this.currentOpacities = [];
    this.failed = [];
    this.decoded = [];
  }
}
