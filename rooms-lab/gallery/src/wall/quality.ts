/**
 * quality.ts — single source of truth for the rooms-wall perf / accessibility
 * guardrails (§8 / §9). Forked from halls/src/depth-gallery/quality.ts, trimmed
 * to the wall's needs (no trail subsystem → no DownscaleLadder), with two
 * wall-specific knobs added: the grid column count and the curve scale.
 *
 * Three device/preference signals collapse into one immutable QualityProfile,
 * sampled ONCE at Engine construction and threaded into Wall + Drag + Hover, so
 * every module honours the same gate (no per-module matchMedia drift).
 *
 *   - reducedMotion — `prefers-reduced-motion: reduce`. MASTER switch: pan snaps
 *       (no inertia), curve frozen at rest, hover lift instant/none, RAF idle
 *       short-circuit holds the GPU idle.
 *   - coarsePointer — `(pointer: coarse)` (touch-primary). Disables hover-lift
 *       (touch taps, doesn't hover).
 *   - smallViewport — `innerWidth <= 768`. Fewer columns, reduced curve, lower
 *       pixelRatio cap.
 *
 * `isMobile` = coarsePointer OR smallViewport — the umbrella flag.
 *
 * NOTE sampled at construction. The page is a fresh document on entry, so a
 * profile never needs to live-update. Drag.ts keeps its own live
 * `matchMedia('reduce')` change-listener for the rare in-session OS toggle on
 * the pan axis (snap ⇄ lerp); the rest is gated at construction.
 */

export interface QualityProfile {
  /** `prefers-reduced-motion: reduce` — master animation kill switch. */
  reducedMotion: boolean;
  /** `(pointer: coarse)` — touch-primary device (no hover-lift). */
  coarsePointer: boolean;
  /** `innerWidth <= 768` — phone-class viewport. */
  smallViewport: boolean;
  /** coarsePointer OR smallViewport — the downscale umbrella. */
  isMobile: boolean;
  /** Renderer pixelRatio cap: desktop ≤ 2, mobile ≤ 1.5 (§8). */
  pixelRatioCap: number;
  /** Grid columns: desktop 6 → mobile 4. */
  columns: number;
  /** Curve amplitude multiplier: desktop 1 → mobile 0.78 (deeper barrel so the 3D reads on phones). */
  curveScale: number;
}

const MOBILE_BREAKPOINT_PX = 768;

const DESKTOP_PIXEL_RATIO_CAP = 2;
const MOBILE_PIXEL_RATIO_CAP = 1.5;
const DESKTOP_COLUMNS = 6;
const MOBILE_COLUMNS = 4;
const DESKTOP_CURVE_SCALE = 1;
const MOBILE_CURVE_SCALE = 0.78;

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
 * profile. Call from Engine construction; pass the result to Wall/Drag/Hover.
 */
export function detectQuality(): QualityProfile {
  const reducedMotion = matches("(prefers-reduced-motion: reduce)");
  const coarsePointer = matches("(pointer: coarse)");
  const smallViewport =
    typeof window !== "undefined" && window.innerWidth <= MOBILE_BREAKPOINT_PX;
  const isMobile = coarsePointer || smallViewport;

  return {
    reducedMotion,
    coarsePointer,
    smallViewport,
    isMobile,
    pixelRatioCap: isMobile ? MOBILE_PIXEL_RATIO_CAP : DESKTOP_PIXEL_RATIO_CAP,
    columns: isMobile ? MOBILE_COLUMNS : DESKTOP_COLUMNS,
    curveScale: isMobile ? MOBILE_CURVE_SCALE : DESKTOP_CURVE_SCALE,
  };
}
