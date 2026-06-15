/**
 * media-query.js — shared matchMedia helpers (Constitution §10.3).
 *
 * Consolidates the `matchMedia("(prefers-reduced-motion: reduce)")` pattern
 * that ~30 modules previously re-implemented inline (some reading `.matches`
 * once, some attaching a change listener). Two entry points cover both:
 *   - prefersReducedMotion()        → boolean snapshot, read now
 *   - onReducedMotionChange(cb)      → live subscription, returns unsubscribe
 *
 * Plus small viewport helpers (isMobile/isTouch/matches) for the breakpoint
 * checks scattered across modules. All are SSR-safe (guard typeof window).
 */

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const MOBILE_QUERY = "(max-width: 768px)";

/** Snapshot: does the user prefer reduced motion right now? */
export function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/**
 * Subscribe to reduced-motion changes. Calls `cb(matches)` on every change.
 * Returns an unsubscribe function (call it in your module's destroy()).
 * No-op + returns a no-op unsubscribe when window is unavailable.
 */
export function onReducedMotionChange(cb) {
  if (typeof window === "undefined") return () => {};
  const mql = window.matchMedia(REDUCED_MOTION_QUERY);
  const handler = (e) => cb(e.matches);
  mql.addEventListener("change", handler);
  return () => mql.removeEventListener("change", handler);
}

/** Snapshot: is the viewport at/under the mobile breakpoint (≤768px)? */
export function isMobile() {
  return typeof window !== "undefined"
    && window.matchMedia(MOBILE_QUERY).matches;
}

/** Snapshot: is this a touch-primary device? */
export function isTouch() {
  return typeof window !== "undefined"
    && window.matchMedia("(pointer: coarse)").matches;
}

/** Generic snapshot for an arbitrary media query string. */
export function matches(query) {
  return typeof window !== "undefined" && window.matchMedia(query).matches;
}
