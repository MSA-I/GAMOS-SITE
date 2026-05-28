/**
 * debounce / throttle helpers (placeholder).
 *
 * Owner: shared utility. Expected exports:
 *  - debounce(fn, wait)
 *  - throttle(fn, wait)
 */
export function debounce(fn, wait = 150) {
  let t;
  return function debounced(...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
