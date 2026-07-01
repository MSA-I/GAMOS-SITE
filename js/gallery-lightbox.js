/**
 * gallery-lightbox.js — click/tap-to-fullscreen for the #gallery masonry.
 *
 * Owner : Gallery Section (#gallery — "רגעים מהמתחם")
 * Spec  : CLAUDE.md §2 (vanilla ESM, no framework), §4 (RTL-first, logical
 *         props), §8 (reduced-motion), §9 (a11y — dialog, focus, keyboard),
 *         §10 (init/destroy, module-scoped, idempotent, no globals).
 *
 * Unlike js/lounge-lightbox.js (which shares a draggable 3D stage and must
 * distinguish tap-from-drag via projected-rect hit-testing), the gallery is a
 * plain masonry grid: the click target IS the item, so opening is a simple
 * delegated click / Enter / Space → open(index). There are no captions (the
 * user asked for no per-image descriptions), so the overlay omits the figcaption.
 *
 * It REUSES the existing `.lounge-lightbox*` classes from
 * css/components/lounge-lightbox.css — same full-viewport ink overlay, chevrons,
 * fade + zoom, and (crucially) mobile/css/lounge.css already hides the chevrons
 * on ≤768px so phones rely on the swipe below. Zero new CSS.
 *
 * ponytail: the open/show/step/close + swipe skeleton is mirrored from
 * lounge-lightbox.js rather than shared through a common module, to keep this
 * self-contained and leave the delicate lounge tap/drag code untouched. If a
 * third lightbox appears, factor a shared js/lightbox.js then.
 *
 * Public API: init(), destroy()
 */

import { prefersReducedMotion } from "./utils/media-query.js";

// A horizontal pointer drag inside the open lightbox of at least this many CSS
// pixels swaps the image (mirrors lounge-lightbox's feel). Below it the gesture
// is treated as a tap/click so backdrop-close still works.
const SWIPE_THRESHOLD_PX = 40;

const state = {
  initialised: false,
  grid: null, // [data-gallery-stage]
  items: [], // .gallery__item elements, DOM order
  bound: { onGridClick: null, onGridKey: null },
  // Open-state DOM.
  overlay: null,
  imgEl: null,
  currentIndex: -1,
  lastFocus: null,
  // Swipe bookkeeping inside the open lightbox.
  lbPointerId: null,
  lbDownX: 0,
  lbDownY: 0,
  lbSwiped: false,
  lbBound: { onKeyDown: null, onDown: null, onMove: null, onUp: null },
};

// ----------------------------------------------------------------------------
// Grid → open
// ----------------------------------------------------------------------------

function indexOfItem(el) {
  const item = el.closest(".gallery__item");
  return item ? state.items.indexOf(item) : -1;
}

function onGridClick(event) {
  const i = indexOfItem(event.target);
  if (i >= 0) open(i);
}

function onGridKey(event) {
  if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
  const i = indexOfItem(event.target);
  if (i < 0) return;
  event.preventDefault();
  open(i);
}

// ----------------------------------------------------------------------------
// Lightbox open / navigate / close
// ----------------------------------------------------------------------------

function open(index) {
  if (state.overlay) {
    show(index);
    return;
  }
  state.lastFocus = document.activeElement;

  const overlay = document.createElement("div");
  overlay.className = "lounge-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "תצוגת תמונה במסך מלא");

  // No figcaption — the gallery has no per-image text.
  overlay.innerHTML = `
    <button type="button" class="lounge-lightbox__close" aria-label="סגירה">&times;</button>
    <button type="button" class="lounge-lightbox__nav lounge-lightbox__nav--prev" aria-label="התמונה הקודמת"></button>
    <figure class="lounge-lightbox__figure">
      <img class="lounge-lightbox__img" alt="תמונה מגלריית המתחם">
    </figure>
    <button type="button" class="lounge-lightbox__nav lounge-lightbox__nav--next" aria-label="התמונה הבאה"></button>
  `;

  document.body.appendChild(overlay);
  state.overlay = overlay;
  state.imgEl = overlay.querySelector(".lounge-lightbox__img");

  const close = overlay.querySelector(".lounge-lightbox__close");
  const prev = overlay.querySelector(".lounge-lightbox__nav--prev");
  const next = overlay.querySelector(".lounge-lightbox__nav--next");

  close.addEventListener("click", closeLightbox);
  prev.addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  next.addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLightbox();
  });

  document.documentElement.style.overflow = "hidden";

  show(index);

  void overlay.offsetWidth;
  overlay.classList.add("is-open");

  // Swipe-to-navigate (RTL-aware, mirrors lounge-lightbox).
  state.lbBound.onDown = onLbPointerDown;
  state.lbBound.onMove = onLbPointerMove;
  state.lbBound.onUp = onLbPointerUp;
  overlay.addEventListener("pointerdown", state.lbBound.onDown);
  overlay.addEventListener("pointermove", state.lbBound.onMove);
  overlay.addEventListener("pointerup", state.lbBound.onUp);
  overlay.addEventListener("pointercancel", state.lbBound.onUp);

  state.lbBound.onKeyDown = onKeyDown;
  window.addEventListener("keydown", state.lbBound.onKeyDown);

  close.focus();
}

function show(index) {
  const n = state.items.length;
  state.currentIndex = ((index % n) + n) % n;
  const img = state.items[state.currentIndex].querySelector("img");
  // Prefer the pre-generated full-res source; fall back to the decoded grid src.
  state.imgEl.src = img.dataset.full || img.currentSrc || img.src;
}

function step(delta) {
  if (!state.overlay) return;
  show(state.currentIndex + delta);
}

// ----------------------------------------------------------------------------
// Swipe-to-navigate (pointer drag inside the open lightbox) — RTL:
// drag LEFT (dx<0) advances forward = step(1); drag RIGHT goes back = step(-1).
// ----------------------------------------------------------------------------

function onLbPointerDown(event) {
  if (event.button !== undefined && event.button !== 0) return;
  state.lbPointerId = event.pointerId;
  state.lbDownX = event.clientX;
  state.lbDownY = event.clientY;
  state.lbSwiped = false;
}

function onLbPointerMove(event) {
  if (event.pointerId !== state.lbPointerId) return;
  if (state.lbSwiped) return; // one image-change per gesture
  const dx = event.clientX - state.lbDownX;
  const dy = event.clientY - state.lbDownY;
  if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
  if (Math.abs(dx) <= Math.abs(dy)) return; // horizontal intent only
  if (state.overlay) {
    try { state.overlay.setPointerCapture(event.pointerId); } catch { /* fine */ }
  }
  step(dx < 0 ? 1 : -1);
  state.lbSwiped = true;
}

function onLbPointerUp(event) {
  if (event.pointerId !== state.lbPointerId) return;
  if (state.overlay) {
    try { state.overlay.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
  }
  state.lbPointerId = null;
  // Swallow the click that follows a real swipe so backdrop-close doesn't fire.
  if (state.lbSwiped && state.overlay) {
    state.overlay.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
    }, { capture: true, once: true });
  }
}

function onKeyDown(e) {
  if (!state.overlay) return;
  switch (e.key) {
    case "Escape":
      e.preventDefault();
      closeLightbox();
      break;
    // RTL reading order: Left = next (forward), Right = previous (back).
    case "ArrowLeft":
      e.preventDefault();
      step(1);
      break;
    case "ArrowRight":
      e.preventDefault();
      step(-1);
      break;
    default:
      break;
  }
}

function closeLightbox() {
  const overlay = state.overlay;
  if (!overlay) return;

  if (state.lbBound.onKeyDown) {
    window.removeEventListener("keydown", state.lbBound.onKeyDown);
    state.lbBound.onKeyDown = null;
  }
  // The overlay (with its swipe listeners) leaves the DOM below; drop refs.
  state.lbBound.onDown = state.lbBound.onMove = state.lbBound.onUp = null;
  state.lbPointerId = null;
  state.lbSwiped = false;
  document.documentElement.style.overflow = "";

  overlay.classList.remove("is-open");
  const ms = prefersReducedMotion() ? 0 : 240;
  window.setTimeout(() => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  }, ms);

  state.overlay = null;
  state.imgEl = null;
  state.currentIndex = -1;

  if (state.lastFocus && typeof state.lastFocus.focus === "function") {
    try { state.lastFocus.focus(); } catch { /* ignore */ }
  }
  state.lastFocus = null;
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.grid = document.querySelector("[data-gallery-stage]");
  if (!state.grid) return; // no gallery on this page → no-op

  state.items = Array.from(state.grid.querySelectorAll(".gallery__item"));
  if (state.items.length === 0) return;

  state.bound.onGridClick = onGridClick;
  state.bound.onGridKey = onGridKey;
  state.grid.addEventListener("click", state.bound.onGridClick);
  state.grid.addEventListener("keydown", state.bound.onGridKey);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  if (state.overlay) closeLightbox();

  if (state.grid) {
    if (state.bound.onGridClick) state.grid.removeEventListener("click", state.bound.onGridClick);
    if (state.bound.onGridKey) state.grid.removeEventListener("keydown", state.bound.onGridKey);
  }

  state.initialised = false;
  state.grid = null;
  state.items = [];
  state.bound.onGridClick = null;
  state.bound.onGridKey = null;
}

export default { init, destroy };
