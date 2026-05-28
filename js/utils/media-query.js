/**
 * Media-query helpers (placeholder).
 *
 * Owner: Agents 06/07/09. Expected exports:
 *  - prefersReducedMotion(): boolean
 *  - isMobile(): boolean (max-width: 768px)
 *  - isTouch(): boolean
 */
export function prefersReducedMotion() {
  return typeof window !== "undefined"
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
