/**
 * quality.ts — the SINGLE source of truth for the Wave-6 perf / accessibility
 * guardrails (plan risk #5 + sections 8/9).
 *
 * Three independent device/preference signals collapse into one immutable
 * `QualityProfile`, plus a `DownscaleLadder` of concrete numbers the trail
 * subsystem consumes. Detected ONCE per Engine construction and threaded down
 * to the sub-modules from {@link Experience}, so every module honours the same
 * gate (no module re-querying `matchMedia` independently and drifting).
 *
 *   - reducedMotion — `prefers-reduced-motion: reduce`. The MASTER switch:
 *       planes static (no breath/drift/parallax), trail particles off + trail
 *       frozen at its seed, blob animation frozen (uTime constant) + velocity
 *       response zeroed, scroll snapped (no lerp). One coherent gate.
 *   - coarsePointer — `(pointer: coarse)` (touch-primary). Disables the trail
 *       head particles entirely + drops the trail to MeshBasicMaterial.
 *   - smallViewport — `innerWidth <= 768`. Trims radialSegments + the trail
 *       point cap so the tube stays cheap on phones.
 *
 * `isMobile` = coarsePointer OR smallViewport — the umbrella flag that flips the
 * downscale ladder on. Desktop (fine pointer, wide viewport) keeps full
 * fidelity.
 *
 * NOTE these are sampled at construction. Each hall is a fresh document
 * (window.location navigation, fresh WebGL context, fresh Engine), so a profile
 * never needs to live-update across halls. Scroll.ts keeps its own live
 * `matchMedia('reduce')` change-listener for the rare in-session OS toggle on
 * the scroll axis (snap ⇄ lerp); the heavier subsystems (trail / blobs) are
 * gated at construction, which is the correct granularity for them.
 */

export interface DownscaleLadder {
  /** Tube roundness (sides around the trail). Desktop 8 → mobile 4. */
  radialSegments: number;
  /** Hard cap on accumulated trail points. Desktop 220 → mobile ~80. */
  maxTrailPoints: number;
  /**
   * Whether the head-particle pool runs at all. Always ON (2026-06-11
   * mobile-fidelity pass — keep all 4 systems on mobile, tune-not-remove);
   * capped small via maxHeadParticles on mobile. Only reduced-motion suppresses
   * the particles (the master switch in TrailController, not this gate).
   */
  headParticlesEnabled: boolean;
  /** Head-particle pool size where it DOES run. Desktop 18 → mobile 8. */
  maxHeadParticles: number;
  /**
   * Whether the trail tube uses the cheaper unlit MeshBasicMaterial instead of
   * MeshStandardMaterial. True on coarse pointer (mobile GPUs) — Standard's
   * lighting model is wasted on an emissive ribbon anyway.
   */
  useBasicTrailMaterial: boolean;
}

export interface QualityProfile {
  /** `prefers-reduced-motion: reduce` — the master animation kill switch. */
  reducedMotion: boolean;
  /** `(pointer: coarse)` — touch-primary device. */
  coarsePointer: boolean;
  /** `innerWidth <= 768` — phone-class viewport. */
  smallViewport: boolean;
  /** coarsePointer OR smallViewport — the downscale umbrella. */
  isMobile: boolean;
  /** Concrete trail-subsystem numbers derived from the flags above. */
  ladder: DownscaleLadder;
  /** Renderer pixelRatio cap: desktop ≤ 2, mobile ≤ 1.5 (plan §8). */
  pixelRatioCap: number;
}

const MOBILE_BREAKPOINT_PX = 768;

// --- Desktop (full fidelity) defaults ---
const DESKTOP_RADIAL_SEGMENTS = 8;
const DESKTOP_MAX_TRAIL_POINTS = 220;
const DESKTOP_MAX_HEAD_PARTICLES = 18;
const DESKTOP_PIXEL_RATIO_CAP = 2;

// --- Mobile downscale ladder ---
const MOBILE_RADIAL_SEGMENTS = 4;
const MOBILE_MAX_TRAIL_POINTS = 80;
const MOBILE_MAX_HEAD_PARTICLES = 8;
const MOBILE_PIXEL_RATIO_CAP = 1.5;

/** Safe `matchMedia` read (guards SSR / very old engines without it). */
function matches(query: string): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia(query).matches
  );
}

/**
 * Sample the device + preference signals once and assemble the immutable
 * profile + downscale ladder. Call from Engine construction; pass the result
 * to Experience, which routes the flags to the sub-modules.
 */
export function detectQuality(): QualityProfile {
  const reducedMotion = matches("(prefers-reduced-motion: reduce)");
  const coarsePointer = matches("(pointer: coarse)");
  const smallViewport =
    typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT_PX;
  const isMobile = coarsePointer || smallViewport;

  const ladder: DownscaleLadder = {
    radialSegments: isMobile
      ? MOBILE_RADIAL_SEGMENTS
      : DESKTOP_RADIAL_SEGMENTS,
    maxTrailPoints: isMobile
      ? MOBILE_MAX_TRAIL_POINTS
      : DESKTOP_MAX_TRAIL_POINTS,
    // Head particles (signature system #3) STAY ON for mobile (2026-06-11
    // mobile-fidelity pass — keep all 4 systems, tune-not-remove). They're kept
    // cheap by the small MOBILE_MAX_HEAD_PARTICLES cap + the unlit
    // MeshBasicMaterial on coarse pointers. Only reduced-motion suppresses them.
    headParticlesEnabled: true,
    maxHeadParticles: isMobile
      ? MOBILE_MAX_HEAD_PARTICLES
      : DESKTOP_MAX_HEAD_PARTICLES,
    // Unlit material for the tube on coarse-pointer GPUs (cheaper than Standard).
    useBasicTrailMaterial: coarsePointer,
  };

  return {
    reducedMotion,
    coarsePointer,
    smallViewport,
    isMobile,
    ladder,
    pixelRatioCap: isMobile ? MOBILE_PIXEL_RATIO_CAP : DESKTOP_PIXEL_RATIO_CAP,
  };
}
