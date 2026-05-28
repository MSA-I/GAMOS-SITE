/**
 * RTL utility helpers (placeholder).
 *
 * Owner: Agents 05/09. Expected exports:
 *  - isRTL(): boolean
 *  - logicalDelta(deltaX): flips horizontal scroll/drag deltas in RTL
 */
export function isRTL() {
  return document.documentElement.getAttribute("dir") === "rtl";
}
