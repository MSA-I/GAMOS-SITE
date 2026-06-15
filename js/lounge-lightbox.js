/**
 * lounge-lightbox.js — tap-to-fullscreen for the #lounge 3D ring gallery.
 *
 * Owner : Lounge Section (companion to lounge-selector.js)
 * Spec  : CLAUDE.md §2 (vanilla ESM, no framework), §4 (RTL-first, logical
 *         props), §8 (reduced-motion), §9 (a11y — dialog, focus, keyboard),
 *         §10 (init/destroy, module-scoped, idempotent, no globals).
 *
 * Why this module is SEPARATE from lounge-selector.js
 * ---------------------------------------------------
 * lounge-selector.js owns the ring's pointer-DRAG → rotate/fling. This module
 * owns the pointer-TAP → open fullscreen. They coexist on the same
 * [data-lounge-stage] element: both add their own pointer listeners (the DOM
 * allows many), neither stops the other's propagation. A gesture is a TAP only
 * when the pointer barely moved between down and up (< TAP_MOVE_PX) within a
 * short window — anything more is a drag and belongs to lounge-selector, so we
 * stay out of its way.
 *
 * Which image opens
 * -----------------
 * The images/figcaptions are `pointer-events:none` (so the drag gesture isn't
 * hijacked), so the tap's DOM target is always the stage — we can't read it off
 * `event.target`. Instead, at pointerup we hit-test every [data-lounge-item]'s
 * PROJECTED rect (getBoundingClientRect reflects the 3D on-screen position):
 * among the items whose rect contains the tap point we pick the FRONT-MOST one
 * (highest --lounge-opacity, which lounge-selector writes per frame). Tap on a
 * gap → the front item. In the reduced-motion grid fallback there's no overlap
 * and no opacity, so "rect contains point" alone resolves the tapped cell.
 *
 * The lightbox itself: full-viewport ink-deep overlay, the image at full size
 * (object-fit:contain), its caption (h3 + p) beneath, and prev/next arrows that
 * cycle all items (RTL-aware). Esc/×/backdrop close; ArrowLeft = next,
 * ArrowRight = previous (RTL reading order). Focus moves into the dialog on open
 * and returns to the stage on close.
 *
 * Public API: init(), destroy()
 */

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
  // Tap tracking (mirrors lounge-selector's pointer bookkeeping but read-only).
  downX: 0,
  downY: 0,
  downTs: 0,
  moved: false,
  activePointerId: null,
  // Open-state DOM.
  overlay: null,
  imgEl: null,
  titleEl: null,
  descEl: null,
  currentIndex: -1,
  lastFocus: null, // element to restore focus to on close
  bound: {
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp: null,
    onKeyDown: null,
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
  if (index >= 0) open(index);
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
// Lightbox open / navigate / close
// ----------------------------------------------------------------------------

function open(index) {
  if (state.overlay) {
    show(index); // already open → just swap
    return;
  }
  state.lastFocus = document.activeElement;

  const overlay = document.createElement("div");
  overlay.className = "lounge-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "תצוגת תמונה במסך מלא");

  overlay.innerHTML = `
    <button type="button" class="lounge-lightbox__close" aria-label="סגירה">&times;</button>
    <button type="button" class="lounge-lightbox__nav lounge-lightbox__nav--prev" aria-label="התמונה הקודמת"></button>
    <figure class="lounge-lightbox__figure">
      <img class="lounge-lightbox__img" alt="">
      <figcaption class="lounge-lightbox__caption">
        <h3 class="lounge-lightbox__title"></h3>
        <p class="lounge-lightbox__desc"></p>
      </figcaption>
    </figure>
    <button type="button" class="lounge-lightbox__nav lounge-lightbox__nav--next" aria-label="התמונה הבאה"></button>
  `;

  document.body.appendChild(overlay);
  state.overlay = overlay;
  state.imgEl = overlay.querySelector(".lounge-lightbox__img");
  state.titleEl = overlay.querySelector(".lounge-lightbox__title");
  state.descEl = overlay.querySelector(".lounge-lightbox__desc");

  const close = overlay.querySelector(".lounge-lightbox__close");
  const prev = overlay.querySelector(".lounge-lightbox__nav--prev");
  const next = overlay.querySelector(".lounge-lightbox__nav--next");

  close.addEventListener("click", closeLightbox);
  prev.addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
  next.addEventListener("click", (e) => { e.stopPropagation(); step(1); });
  // Click on the backdrop (outside the figure/buttons) closes.
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeLightbox();
  });

  // Lock background scroll while open.
  document.documentElement.style.overflow = "hidden";

  show(index);

  // Reflow then reveal so the fade-in transition runs.
  void overlay.offsetWidth;
  overlay.classList.add("is-open");

  // Keyboard: Esc + arrows.
  state.bound.onKeyDown = onKeyDown;
  window.addEventListener("keydown", state.bound.onKeyDown);

  // Move focus into the dialog (a11y §9).
  close.focus();
}

function show(index) {
  const n = state.items.length;
  state.currentIndex = ((index % n) + n) % n;
  const fig = state.items[state.currentIndex];
  const img = fig.querySelector("img");
  const h3 = fig.querySelector("figcaption h3");
  const p = fig.querySelector("figcaption p");

  // currentSrc gives the actually-decoded source (the webp when supported);
  // fall back to src for not-yet-loaded lazy images.
  state.imgEl.src = img.currentSrc || img.src;
  state.imgEl.alt = img.alt || "";
  state.titleEl.textContent = h3 ? h3.textContent : "";
  state.descEl.textContent = p ? p.textContent : "";
}

function step(delta) {
  if (!state.overlay) return;
  show(state.currentIndex + delta);
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

  if (state.bound.onKeyDown) {
    window.removeEventListener("keydown", state.bound.onKeyDown);
    state.bound.onKeyDown = null;
  }
  document.documentElement.style.overflow = "";

  const remove = () => {
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };
  overlay.classList.remove("is-open");
  // Remove after the fade (or immediately under reduced-motion's ~0ms transition).
  const ms = prefersReducedMotion() ? 0 : 240;
  window.setTimeout(remove, ms);

  state.overlay = null;
  state.imgEl = null;
  state.titleEl = null;
  state.descEl = null;
  state.currentIndex = -1;

  // Restore focus to where it was (the stage), a11y §9.
  if (state.lastFocus && typeof state.lastFocus.focus === "function") {
    try { state.lastFocus.focus(); } catch { /* ignore */ }
  }
  state.lastFocus = null;
}

function prefersReducedMotion() {
  return Boolean(
    typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
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

  if (state.overlay) closeLightbox();

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
  state.activePointerId = null;
  state.moved = false;
  state.bound.onPointerDown = null;
  state.bound.onPointerMove = null;
  state.bound.onPointerUp = null;
}

export default { init, destroy };
