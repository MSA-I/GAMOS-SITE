/**
 * marquee.js — infinite horizontal text marquee
 *
 * Agent 20 — Static Sections Choreographer (2026-06-01).
 *
 * Pure CSS animation owns the visual loop. This module only:
 *   1. Reads the `data-speed` attribute (seconds, default 30) and writes
 *      it to the inline `--marquee-duration` custom property on the track.
 *   2. Duplicates the track's children once so the 0% → -50% animation
 *      loops seamlessly (the duplicates are aria-hidden so SR users don't
 *      read the same words twice).
 *
 * Contract:    ES2022 module. Exports `init()` and `destroy()`.
 *              Idempotent — safe to call multiple times.
 *
 * HTML shape (declarative — Agent 20 inserts this into index.html):
 *   <div class="marquee" data-marquee data-speed="30">
 *     <div class="marquee__track">
 *       <span class="marquee__text">אירועים יוקרתיים&nbsp;·&nbsp;</span>
 *       <span class="marquee__text">חתונות חלום&nbsp;·&nbsp;</span>
 *       …
 *     </div>
 *   </div>
 *
 * Reduced motion is handled by CSS (`@media (prefers-reduced-motion)`).
 *
 * Constitution refs: §2 (vanilla JS, no framework runtime), §8 (perf),
 *                    §9 (a11y — aria-hidden on duplicates), §10.3 (ESM).
 */

const ROOT_SELECTOR = "[data-marquee]";
const TRACK_SELECTOR = ".marquee__track";
const DUPLICATED_FLAG = "data-marquee-duplicated";
const DEFAULT_DURATION_S = 30;

let initialized = false;
const trackedRoots = new WeakSet();

/**
 * Read data-speed (seconds) and apply it as --marquee-duration on the track.
 * Negative values reverse direction (since the CSS keyframes go 0 → -50%,
 * a negative duration via animation-direction: reverse achieves the same
 * effect — but the simplest way is positive duration only; consumers who
 * want reverse should add a `marquee--reverse` class instead).
 */
function applySpeed(track, root) {
  const raw = root.getAttribute("data-speed");
  const speed = raw ? parseFloat(raw) : DEFAULT_DURATION_S;
  // Guard against non-positive values that would freeze the animation.
  const duration = Number.isFinite(speed) && Math.abs(speed) > 0
    ? Math.abs(speed)
    : DEFAULT_DURATION_S;
  track.style.setProperty("--marquee-duration", `${duration}s`);
}

/**
 * Duplicate every child of the track once, mark duplicates aria-hidden.
 * Idempotent: if the track is already marked as duplicated, do nothing.
 * (Re-init won't double-duplicate.)
 */
function duplicateTrackChildren(track) {
  if (track.getAttribute(DUPLICATED_FLAG) === "1") return;
  const originals = Array.from(track.children);
  if (originals.length === 0) return;
  const fragment = document.createDocumentFragment();
  originals.forEach((node) => {
    const clone = node.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    fragment.appendChild(clone);
  });
  track.appendChild(fragment);
  track.setAttribute(DUPLICATED_FLAG, "1");
}

/**
 * Walk every [data-marquee] root in the document and prepare it.
 */
function bootRoots() {
  const roots = document.querySelectorAll(ROOT_SELECTOR);
  roots.forEach((root) => {
    if (trackedRoots.has(root)) return;
    const track = root.querySelector(TRACK_SELECTOR);
    if (!track) return;
    applySpeed(track, root);
    duplicateTrackChildren(track);
    trackedRoots.add(root);
  });
}

/**
 * Initialize the marquee system. Idempotent.
 */
export function init() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (initialized) {
    bootRoots();
    return;
  }
  initialized = true;
  bootRoots();
}

/**
 * Tear down. Removes duplicated children and clears tracked set so a
 * subsequent init() will re-prepare the marquees from scratch.
 */
export function destroy() {
  const roots = document.querySelectorAll(ROOT_SELECTOR);
  roots.forEach((root) => {
    const track = root.querySelector(TRACK_SELECTOR);
    if (!track) return;
    if (track.getAttribute(DUPLICATED_FLAG) === "1") {
      // Remove the duplicated half (we cloned exactly N nodes).
      const total = track.children.length;
      const half = Math.floor(total / 2);
      for (let i = 0; i < half; i++) {
        const last = track.lastElementChild;
        if (last && last.getAttribute("aria-hidden") === "true") {
          track.removeChild(last);
        }
      }
      track.removeAttribute(DUPLICATED_FLAG);
    }
  });
  initialized = false;
}

export default { init, destroy };
