/**
 * lounge-lightbox.js — tap-to-fullscreen for the #lounge 3D ring gallery.
 *
 * Owner : Lounge Section (companion to lounge-selector.js)
 * Spec  : CLAUDE.md §2 (vanilla ESM, no framework), §4 (RTL-first, logical
 *         props), §8 (reduced-motion), §9 (a11y — dialog, focus, keyboard),
 *         §10 (init/destroy, module-scoped, idempotent, no globals).
 *
 * FACTORED 2026-07-13 (conversion pass): the open/show/step/close + swipe
 * skeleton moved to the shared js/lightbox.js engine (one lightbox language
 * site-wide, per the marketing critique). This module keeps only what is
 * lounge-specific — the delicate tap-vs-drag detection and the projected-rect
 * hit-test, both untouched:
 *
 * Why tap detection lives here
 * ----------------------------
 * lounge-selector.js owns the ring's pointer-DRAG → rotate/fling. This module
 * owns the pointer-TAP → open fullscreen. They coexist on the same
 * [data-lounge-stage] element: both add their own pointer listeners, neither
 * stops the other's propagation. A gesture is a TAP only when the pointer
 * barely moved between down and up (< TAP_MOVE_PX) within a short window —
 * anything more is a drag and belongs to lounge-selector.
 *
 * Which image opens
 * -----------------
 * The images/figcaptions are `pointer-events:none`, so the tap's DOM target is
 * always the stage. At pointerup we hit-test every [data-lounge-item]'s
 * PROJECTED rect (getBoundingClientRect reflects the 3D on-screen position):
 * among the items whose rect contains the tap point we pick the FRONT-MOST one
 * (highest --lounge-opacity, written per frame by lounge-selector). Tap on a
 * gap → the front item. In the reduced-motion grid fallback there's no overlap
 * and no opacity, so "rect contains point" alone resolves the tapped cell.
 *
 * Public API: init(), destroy()
 */

import { createLightbox } from "./lightbox.js";

// A gesture counts as a tap only if the pointer moved less than this many CSS
// pixels between down and up. Above it, lounge-selector treats it as a drag and
// this module ignores it.
const TAP_MOVE_PX = 8;
// …and only if it completed within this window (a slow press-and-hold isn't a tap).
const TAP_MAX_MS = 600;

const state = {
  initialised: false,
  stage: null, // [data-lounge-stage]
  items: [], // [data-lounge-item] figures, DOM order
  lightbox: null,
  // Tap tracking (mirrors lounge-selector's pointer bookkeeping but read-only).
  downX: 0,
  downY: 0,
  downTs: 0,
  moved: false,
  activePointerId: null,
  bound: {
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp: null,
  },
};

// ----------------------------------------------------------------------------
// Tap detection on the stage
// ----------------------------------------------------------------------------

function onPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  state.activePointerId = event.pointerId;
  state.downX = event.clientX;
  state.downY = event.clientY;
  state.downTs = performance.now();
  state.moved = false;
}

function onPointerMove(event) {
  if (event.pointerId !== state.activePointerId) return;
  if (state.moved) return;
  const dx = event.clientX - state.downX;
  const dy = event.clientY - state.downY;
  if (Math.hypot(dx, dy) > TAP_MOVE_PX) state.moved = true;
}

function onPointerUp(event) {
  if (event.pointerId !== state.activePointerId) return;
  state.activePointerId = null;

  // Drag (or fling-stop with travel) → not a tap; leave it to lounge-selector.
  if (state.moved) return;
  if (performance.now() - state.downTs > TAP_MAX_MS) return;

  const index = pickItemAt(event.clientX, event.clientY);
  if (index >= 0) state.lightbox.open(index);
}

/**
 * Hit-test the projected rects of all items. Among items whose rect contains
 * the point, return the front-most (highest --lounge-opacity). If none contains
 * the point (tap on a gap), return the global front-most item. -1 if no items.
 */
function pickItemAt(x, y) {
  let best = -1;
  let bestOpacity = -1;
  let frontMost = -1;
  let frontOpacity = -1;

  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    const opacity = readOpacity(item);
    if (opacity > frontOpacity) {
      frontOpacity = opacity;
      frontMost = i;
    }
    const r = item.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    const inside = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
    if (inside && opacity > bestOpacity) {
      bestOpacity = opacity;
      best = i;
    }
  }
  return best >= 0 ? best : frontMost;
}

function readOpacity(item) {
  // lounge-selector writes --lounge-opacity each frame (front≈1, sides/back 0.85).
  // In the reduced-motion grid there's no such prop → treat as fully visible.
  const v = parseFloat(item.style.getPropertyValue("--lounge-opacity"));
  return Number.isFinite(v) ? v : 1;
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.stage = document.querySelector("[data-lounge-stage]");
  if (!state.stage) return; // no lounge on this page → no-op

  state.items = Array.from(state.stage.querySelectorAll("[data-lounge-item]"));
  if (state.items.length === 0) return;

  state.lightbox = createLightbox({
    count: () => state.items.length,
    // currentSrc gives the actually-decoded source (the webp when supported);
    // fall back to src for not-yet-loaded lazy images.
    getItem: (i) => {
      const fig = state.items[i];
      const img = fig.querySelector("img");
      const h3 = fig.querySelector("figcaption h3");
      const p = fig.querySelector("figcaption p");
      return {
        src: img.currentSrc || img.src,
        alt: img.alt || "",
        title: h3 ? h3.textContent : "",
        desc: p ? p.textContent : "",
      };
    },
    withCaption: true,
  });

  state.bound.onPointerDown = onPointerDown;
  state.bound.onPointerMove = onPointerMove;
  state.bound.onPointerUp = onPointerUp;
  state.stage.addEventListener("pointerdown", state.bound.onPointerDown);
  state.stage.addEventListener("pointermove", state.bound.onPointerMove);
  state.stage.addEventListener("pointerup", state.bound.onPointerUp);
  state.stage.addEventListener("pointercancel", state.bound.onPointerUp);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  if (state.lightbox) state.lightbox.close();

  if (state.stage) {
    if (state.bound.onPointerDown) {
      state.stage.removeEventListener("pointerdown", state.bound.onPointerDown);
    }
    if (state.bound.onPointerMove) {
      state.stage.removeEventListener("pointermove", state.bound.onPointerMove);
    }
    if (state.bound.onPointerUp) {
      state.stage.removeEventListener("pointerup", state.bound.onPointerUp);
      state.stage.removeEventListener("pointercancel", state.bound.onPointerUp);
    }
  }

  state.initialised = false;
  state.stage = null;
  state.items = [];
  state.lightbox = null;
  state.activePointerId = null;
  state.moved = false;
  state.bound.onPointerDown = null;
  state.bound.onPointerMove = null;
  state.bound.onPointerUp = null;
}

export default { init, destroy };
