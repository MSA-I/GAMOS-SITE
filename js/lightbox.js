/**
 * lightbox.js — the ONE shared fullscreen-image engine (2026-07-13).
 *
 * Owner : conversion pass (marketing critique: "אותו Lightbox בכל מקום")
 * Spec  : CLAUDE.md §2 (vanilla ESM), §4 (RTL), §8 (reduced-motion),
 *         §9 (a11y — dialog, focus, keyboard), §10 (module-scoped).
 *
 * History: js/lounge-lightbox.js and js/gallery-lightbox.js carried two
 * mirrored copies of the same open/show/step/close + swipe skeleton (the
 * gallery header said: "If a third lightbox appears, factor a shared
 * js/lightbox.js then"). The unification pass factored it NOW so every
 * gallery speaks one interaction language. Behavior is byte-equivalent to
 * the two former copies; the consumers keep only their entry gestures
 * (lounge: tap-vs-drag hit-testing; gallery: grid click delegation).
 *
 * The overlay reuses the existing `.lounge-lightbox*` classes from
 * css/components/lounge-lightbox.css — zero CSS churn; mobile/css/lounge.css
 * already hides the chevrons ≤768px (phones navigate by swipe).
 *
 * Public API:
 *   createLightbox({ getItem, count, withCaption }) → { open, close, isOpen }
 *     getItem(i)  → { src, alt, title?, desc? } for the wrapped index i
 *     count()     → current number of items
 *     withCaption → render the figcaption block (lounge) or omit it (gallery)
 */

import { prefersReducedMotion } from "./utils/media-query.js";

// A horizontal pointer drag inside the open lightbox of at least this many CSS
// pixels swaps the image. Below it the gesture is a tap/click (backdrop-close
// still works). Same value both former copies used.
const SWIPE_THRESHOLD_PX = 40;

export function createLightbox({ getItem, count, withCaption = false }) {
  const st = {
    overlay: null,
    imgEl: null,
    titleEl: null,
    descEl: null,
    currentIndex: -1,
    lastFocus: null,
    // Swipe bookkeeping inside the open lightbox.
    lbPointerId: null,
    lbDownX: 0,
    lbDownY: 0,
    lbSwiped: false,
    onKeyDown: null,
  };

  function open(index) {
    if (st.overlay) {
      show(index); // already open → just swap
      return;
    }
    st.lastFocus = document.activeElement;

    const overlay = document.createElement("div");
    overlay.className = "lounge-lightbox";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "תצוגת תמונה במסך מלא");

    const caption = withCaption
      ? `
      <figcaption class="lounge-lightbox__caption">
        <h3 class="lounge-lightbox__title"></h3>
        <p class="lounge-lightbox__desc"></p>
      </figcaption>`
      : "";

    overlay.innerHTML = `
      <button type="button" class="lounge-lightbox__close" aria-label="סגירה">&times;</button>
      <button type="button" class="lounge-lightbox__nav lounge-lightbox__nav--prev" aria-label="התמונה הקודמת"></button>
      <figure class="lounge-lightbox__figure">
        <img class="lounge-lightbox__img" alt="">${caption}
      </figure>
      <button type="button" class="lounge-lightbox__nav lounge-lightbox__nav--next" aria-label="התמונה הבאה"></button>
    `;

    document.body.appendChild(overlay);
    st.overlay = overlay;
    st.imgEl = overlay.querySelector(".lounge-lightbox__img");
    st.titleEl = overlay.querySelector(".lounge-lightbox__title");
    st.descEl = overlay.querySelector(".lounge-lightbox__desc");

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

    // Swipe-to-navigate (RTL-aware). Pointer capture is deliberately NOT taken
    // on down — capturing would retarget the following `click` to the overlay,
    // defeating the chevrons' stopPropagation and tripping backdrop-close. We
    // capture only once a real horizontal swipe crosses the threshold (in move).
    overlay.addEventListener("pointerdown", onLbPointerDown);
    overlay.addEventListener("pointermove", onLbPointerMove);
    overlay.addEventListener("pointerup", onLbPointerUp);
    overlay.addEventListener("pointercancel", onLbPointerUp);

    // Keyboard: Esc + arrows.
    st.onKeyDown = onKeyDown;
    window.addEventListener("keydown", st.onKeyDown);

    // Move focus into the dialog (a11y §9).
    close.focus();
  }

  function show(index) {
    const n = count();
    st.currentIndex = ((index % n) + n) % n;
    const item = getItem(st.currentIndex) || {};
    st.imgEl.src = item.src || "";
    st.imgEl.alt = item.alt || "";
    if (withCaption) {
      st.titleEl.textContent = item.title || "";
      st.descEl.textContent = item.desc || "";
    }
  }

  function step(delta) {
    if (!st.overlay) return;
    show(st.currentIndex + delta);
  }

  // Swipe-to-navigate — RTL: drag LEFT (dx<0) advances forward = step(1)
  // (same as ArrowLeft); drag RIGHT goes back = step(-1).
  function onLbPointerDown(event) {
    if (event.button !== undefined && event.button !== 0) return;
    st.lbPointerId = event.pointerId;
    st.lbDownX = event.clientX;
    st.lbDownY = event.clientY;
    st.lbSwiped = false;
  }

  function onLbPointerMove(event) {
    if (event.pointerId !== st.lbPointerId) return;
    if (st.lbSwiped) return; // one image-change per gesture
    const dx = event.clientX - st.lbDownX;
    const dy = event.clientY - st.lbDownY;
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(dx) <= Math.abs(dy)) return; // horizontal intent only
    // A genuine swipe — capture so a drag that wanders off the figure keeps
    // tracking to pointerup.
    if (st.overlay) {
      try { st.overlay.setPointerCapture(event.pointerId); } catch { /* fine */ }
    }
    step(dx < 0 ? 1 : -1);
    st.lbSwiped = true;
  }

  function onLbPointerUp(event) {
    if (event.pointerId !== st.lbPointerId) return;
    if (st.overlay) {
      try { st.overlay.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
    }
    st.lbPointerId = null;
    // Swallow the click that follows a real swipe so backdrop-close doesn't fire.
    if (st.lbSwiped && st.overlay) {
      st.overlay.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
      }, { capture: true, once: true });
    }
  }

  function onKeyDown(e) {
    if (!st.overlay) return;
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
    const overlay = st.overlay;
    if (!overlay) return;

    if (st.onKeyDown) {
      window.removeEventListener("keydown", st.onKeyDown);
      st.onKeyDown = null;
    }
    // The overlay (with its swipe listeners) leaves the DOM below.
    st.lbPointerId = null;
    st.lbSwiped = false;
    document.documentElement.style.overflow = "";

    overlay.classList.remove("is-open");
    // Remove after the fade (or immediately under reduced-motion).
    const ms = prefersReducedMotion() ? 0 : 240;
    window.setTimeout(() => {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, ms);

    st.overlay = null;
    st.imgEl = null;
    st.titleEl = null;
    st.descEl = null;
    st.currentIndex = -1;

    // Restore focus to where it was (a11y §9).
    if (st.lastFocus && typeof st.lastFocus.focus === "function") {
      try { st.lastFocus.focus(); } catch { /* ignore */ }
    }
    st.lastFocus = null;
  }

  return {
    open,
    close: closeLightbox,
    isOpen: () => !!st.overlay,
  };
}

export default { createLightbox };
