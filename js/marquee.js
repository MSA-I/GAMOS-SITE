/**
 * marquee.js — infinite horizontal text marquee
 *
 * Agent 20 — Static Sections Choreographer (2026-06-01).
 *
 * Pure CSS animation owns the visual loop (`.marquee__track` runs
 * marquee-scroll 0 → -50% linear infinite). This module makes that loop
 * SEAMLESS regardless of viewport width by:
 *   1. Reading `data-speed` (seconds, default 30) → inline `--marquee-duration`.
 *   2. Repeating the base set of phrases enough times that the track is an
 *      EVEN number of identical sets AND each half spans ≥ the container.
 *      The CSS shifts by -50% (= half the track); if a half is narrower than
 *      the viewport, an empty gap shows after the last phrase before the loop
 *      wraps (the bug the user reported). Filling each half to ≥ container
 *      width removes the gap; keeping an even set count keeps -50% landing
 *      exactly on a set boundary so the wrap is invisible. Clones are
 *      aria-hidden so SR users don't read the phrases twice.
 *
 * Re-fills on resize (container width changes) and once on window load (web
 * fonts settle and widen the measured base set).
 *
 * Contract:    ES2022 module. Exports `init()` and `destroy()`. Idempotent.
 *
 * Reduced motion is handled by CSS (`@media (prefers-reduced-motion)`).
 *
 * Constitution refs: §2 (vanilla JS, no framework runtime), §8 (perf),
 *                    §9 (a11y — aria-hidden on clones), §10.3 (ESM).
 */

const ROOT_SELECTOR = "[data-marquee]";
const TRACK_SELECTOR = ".marquee__track";
const BASE_COUNT_ATTR = "data-marquee-base"; // # of original (non-clone) children
const FILLED_FLAG = "data-marquee-filled";
const DEFAULT_DURATION_S = 30;

let initialized = false;
let resizeRaf = 0;
let resizeHandler = null;
let loadHandler = null;
const trackedRoots = new Set();

/** Read data-speed (seconds) and apply it as --marquee-duration on the track. */
function applySpeed(track, root) {
  const raw = root.getAttribute("data-speed");
  const speed = raw ? parseFloat(raw) : DEFAULT_DURATION_S;
  const duration = Number.isFinite(speed) && Math.abs(speed) > 0
    ? Math.abs(speed)
    : DEFAULT_DURATION_S;
  track.style.setProperty("--marquee-duration", `${duration}s`);
}

/** Strip every clone, leaving only the original base set. */
function resetToBase(track) {
  const baseCount = parseInt(track.getAttribute(BASE_COUNT_ATTR) ?? "", 10);
  if (!Number.isFinite(baseCount)) return;
  while (track.children.length > baseCount && track.lastElementChild) {
    track.removeChild(track.lastElementChild);
  }
  track.removeAttribute(FILLED_FLAG);
}

/**
 * Repeat the base set so the track is `totalSets` identical sets, where
 * totalSets is even and each half spans ≥ the container width.
 */
function fillTrack(track, root) {
  // Record the base set once, on the very first fill.
  if (!track.hasAttribute(BASE_COUNT_ATTR)) {
    track.setAttribute(BASE_COUNT_ATTR, String(track.children.length));
  }
  resetToBase(track);

  const base = Array.from(track.children);
  if (base.length === 0) return;

  const baseWidth = track.scrollWidth;
  const containerW = root.clientWidth || baseWidth;
  if (baseWidth === 0) return;

  // Sets needed for one half to cover the container; double for the -50% seam.
  const halfSets = Math.max(1, Math.ceil(containerW / baseWidth));
  const totalSets = halfSets * 2;

  const frag = document.createDocumentFragment();
  for (let s = 1; s < totalSets; s++) {
    base.forEach((node) => {
      const clone = node.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      frag.appendChild(clone);
    });
  }
  track.appendChild(frag);
  track.setAttribute(FILLED_FLAG, "1");
}

/** Prepare (or re-fill) every [data-marquee] root in the document. */
function bootRoots() {
  const roots = document.querySelectorAll(ROOT_SELECTOR);
  roots.forEach((root) => {
    const track = root.querySelector(TRACK_SELECTOR);
    if (!track) return;
    applySpeed(track, root);
    fillTrack(track, root);
    trackedRoots.add(root);
  });
}

/** Re-fill all tracked tracks (after a resize / font load changes widths). */
function refillAll() {
  trackedRoots.forEach((root) => {
    const track = root.querySelector(TRACK_SELECTOR);
    if (track) fillTrack(track, root);
  });
}

export function init() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (initialized) {
    bootRoots();
    return;
  }
  initialized = true;
  bootRoots();

  // Re-fill on resize (debounced via rAF) — container width drives the count.
  resizeHandler = () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(refillAll);
  };
  window.addEventListener("resize", resizeHandler, { passive: true });

  // Web fonts widen the measured base set; re-fill once they're ready.
  if (document.readyState === "complete") {
    requestAnimationFrame(refillAll);
  } else {
    loadHandler = () => refillAll();
    window.addEventListener("load", loadHandler, { once: true });
  }
}

export function destroy() {
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  if (loadHandler) window.removeEventListener("load", loadHandler);
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeHandler = null;
  loadHandler = null;
  resizeRaf = 0;

  document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
    const track = root.querySelector(TRACK_SELECTOR);
    if (track) resetToBase(track);
  });
  trackedRoots.clear();
  initialized = false;
}

export default { init, destroy };
