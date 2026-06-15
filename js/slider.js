/**
 * slider.js — Touch + keyboard slider for testimonials / gallery.
 *
 * Agent 09 — Motion Engineer (static sections).
 *
 * Markup contract:
 *   <section data-slider data-autoplay-ms="6000">
 *     <div data-slider-track>
 *       <article data-slider-item>...</article>
 *       <article data-slider-item>...</article>
 *     </div>
 *     <button data-slider-prev aria-label="הקודם">…</button>
 *     <button data-slider-next aria-label="הבא">…</button>
 *     <div data-slider-dots aria-label="ניווט סליידר"></div>
 *   </section>
 *
 * Behavior:
 *   - Pointer drag: passive listeners; horizontal threshold 50px.
 *   - Keyboard: ArrowLeft / ArrowRight when focus is inside the slider.
 *               In RTL, ArrowLeft = next, ArrowRight = prev (matches user mental model).
 *   - Prev/next buttons: optional, advance one slide.
 *   - Dots: rendered programmatically into [data-slider-dots]. Each dot is a
 *           <button> with aria-label="עבור לשקופית N".
 *   - Autoplay: opt-in via data-autoplay-ms="<ms>". Pauses on hover/focus.
 *
 * RTL handling:
 *   The track uses translateX. In RTL, "next" should move the visual content
 *   in the same direction the eye scans — leftward.
 *     - LTR: index N → translateX(-N * 100%)
 *     - RTL: index N → translateX( N * 100%)  (because flex children also reverse)
 *   We detect direction via getComputedStyle(...).direction at init time.
 *
 * Reduced motion: track jumps without transition.
 *
 * Constitution refs: §4 (RTL logical properties), §8 (reduced-motion),
 *                    §9 (keyboard, ARIA labels), §10 (init/destroy contract).
 */

import { prefersReducedMotion } from "./utils/media-query.js";

const SWIPE_THRESHOLD_PX = 50;
const DEFAULT_TRANSITION_MS = 600; // matches --dur-deluxe
const DEFAULT_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

const instances = new WeakMap();

/**
 * Build a single slider instance bound to one DOM container.
 */
function createSliderInstance(root) {
  const track = root.querySelector("[data-slider-track]");
  if (!track) {
    return { destroy: () => {} };
  }

  const items = Array.from(track.querySelectorAll("[data-slider-item]"));
  if (items.length === 0) {
    return { destroy: () => {} };
  }

  const prevBtn = root.querySelector("[data-slider-prev]");
  const nextBtn = root.querySelector("[data-slider-next]");
  const dotsContainer = root.querySelector("[data-slider-dots]");
  const autoplayMs = parseInt(root.getAttribute("data-autoplay-ms") || "0", 10);

  const computedDir =
    typeof window !== "undefined" && window.getComputedStyle
      ? window.getComputedStyle(root).direction
      : "ltr";
  const isRTL = computedDir === "rtl";

  const reduceMotion = prefersReducedMotion();

  // Optional: data-slider-initial-index="N" lets the section choose which
  // slide to land on at first paint. Useful when the first item is meant
  // as a "preview/peek" and the truly primary content is at index 1+
  // (e.g., testimonials section on Gamos — user-marked target = card #2).
  const initialIdxAttr = root.getAttribute("data-slider-initial-index");
  let currentIndex = 0;
  if (initialIdxAttr != null) {
    const n = parseInt(initialIdxAttr, 10);
    if (Number.isFinite(n)) currentIndex = n;
  }
  let dotEls = [];
  let autoplayTimer = null;
  let isDragging = false;
  let dragStartX = 0;
  let dragDeltaX = 0;
  let activePointerId = null;

  // ----- Track positioning -------------------------------------------------

  function applyTrackPosition(transition = true) {
    const sign = isRTL ? 1 : -1;
    const offsetPercent = sign * currentIndex * 100;
    track.style.transition =
      transition && !reduceMotion
        ? `transform ${DEFAULT_TRANSITION_MS}ms ${DEFAULT_EASING}`
        : "none";
    track.style.transform = `translate3d(${offsetPercent}%, 0, 0)`;
  }

  function clampIndex(index) {
    if (index < 0) return 0;
    if (index > items.length - 1) return items.length - 1;
    return index;
  }

  function goTo(index, transition = true) {
    currentIndex = clampIndex(index);
    applyTrackPosition(transition);
    updateDots();
    updateAriaCurrent();
    restartAutoplay();
  }

  function next() {
    const target = currentIndex >= items.length - 1 ? 0 : currentIndex + 1;
    goTo(target);
  }

  function prev() {
    const target = currentIndex <= 0 ? items.length - 1 : currentIndex - 1;
    goTo(target);
  }

  // ----- Dots --------------------------------------------------------------

  function buildDots() {
    if (!dotsContainer) return;
    dotsContainer.innerHTML = "";
    dotsContainer.setAttribute("role", "tablist");
    dotEls = items.map((_, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("data-slider-dot", String(i));
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-label", `עבור לשקופית ${i + 1}`);
      btn.addEventListener("click", () => goTo(i));
      dotsContainer.appendChild(btn);
      return btn;
    });
    updateDots();
  }

  function updateDots() {
    dotEls.forEach((dot, i) => {
      const active = i === currentIndex;
      dot.classList.toggle("is-active", active);
      dot.setAttribute("aria-selected", active ? "true" : "false");
      dot.tabIndex = active ? 0 : -1;
    });
  }

  function updateAriaCurrent() {
    items.forEach((item, i) => {
      if (i === currentIndex) {
        item.setAttribute("aria-current", "true");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  // ----- Pointer (touch + mouse) drag --------------------------------------

  function onPointerDown(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    isDragging = true;
    dragStartX = event.clientX;
    dragDeltaX = 0;
    activePointerId = event.pointerId;
    track.style.transition = "none";
    pauseAutoplay();
  }

  function onPointerMove(event) {
    if (!isDragging || event.pointerId !== activePointerId) return;
    dragDeltaX = event.clientX - dragStartX;
    const trackWidth = track.offsetWidth || 1;
    const dragPercent = (dragDeltaX / trackWidth) * 100;
    const sign = isRTL ? 1 : -1;
    const basePercent = sign * currentIndex * 100;
    track.style.transform = `translate3d(${basePercent + dragPercent}%, 0, 0)`;
  }

  function onPointerUp(event) {
    if (!isDragging || event.pointerId !== activePointerId) return;
    isDragging = false;
    activePointerId = null;

    const passed = Math.abs(dragDeltaX) > SWIPE_THRESHOLD_PX;
    if (passed) {
      // LTR: drag left (negative delta) → next.
      // RTL: drag right (positive delta) → next (same forward intent).
      const isNextDrag = isRTL ? dragDeltaX > 0 : dragDeltaX < 0;
      if (isNextDrag) next();
      else prev();
    } else {
      applyTrackPosition(true);
    }
    dragDeltaX = 0;
    restartAutoplay();
  }

  // ----- Keyboard ----------------------------------------------------------

  function onKeyDown(event) {
    if (!root.contains(document.activeElement)) return;

    let handled = false;
    if (event.key === "ArrowLeft") {
      // RTL: ArrowLeft moves visually leftward → "next" (forward in reading order).
      // LTR: ArrowLeft → "prev".
      if (isRTL) next();
      else prev();
      handled = true;
    } else if (event.key === "ArrowRight") {
      if (isRTL) prev();
      else next();
      handled = true;
    } else if (event.key === "Home") {
      goTo(0);
      handled = true;
    } else if (event.key === "End") {
      goTo(items.length - 1);
      handled = true;
    }

    if (handled) event.preventDefault();
  }

  // ----- Autoplay ----------------------------------------------------------

  function startAutoplay() {
    if (!autoplayMs || autoplayMs <= 0) return;
    if (reduceMotion) return;
    autoplayTimer = window.setInterval(() => {
      next();
    }, autoplayMs);
  }

  function pauseAutoplay() {
    if (autoplayTimer) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  }

  function restartAutoplay() {
    pauseAutoplay();
    startAutoplay();
  }

  function visibilityHandler() {
    if (document.hidden) pauseAutoplay();
    else restartAutoplay();
  }

  // ----- Wire up listeners -------------------------------------------------

  function attach() {
    buildDots();
    // Clamp now that items are known (initial-index could overshoot).
    currentIndex = clampIndex(currentIndex);
    applyTrackPosition(false);
    updateAriaCurrent();
    updateDots();

    if (prevBtn) {
      prevBtn.addEventListener("click", prev);
      if (!prevBtn.hasAttribute("aria-label")) {
        prevBtn.setAttribute("aria-label", "הקודם");
      }
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", next);
      if (!nextBtn.hasAttribute("aria-label")) {
        nextBtn.setAttribute("aria-label", "הבא");
      }
    }

    track.addEventListener("pointerdown", onPointerDown, { passive: true });
    track.addEventListener("pointermove", onPointerMove, { passive: true });
    track.addEventListener("pointerup", onPointerUp, { passive: true });
    track.addEventListener("pointercancel", onPointerUp, { passive: true });
    track.addEventListener("pointerleave", onPointerUp, { passive: true });

    root.addEventListener("keydown", onKeyDown);

    if (autoplayMs > 0 && !reduceMotion) {
      root.addEventListener("mouseenter", pauseAutoplay);
      root.addEventListener("mouseleave", restartAutoplay);
      root.addEventListener("focusin", pauseAutoplay);
      root.addEventListener("focusout", restartAutoplay);
      document.addEventListener("visibilitychange", visibilityHandler);
      startAutoplay();
    }

    if (!root.hasAttribute("tabindex")) {
      root.setAttribute("tabindex", "0");
    }
    if (!root.hasAttribute("role")) {
      root.setAttribute("role", "region");
    }
    if (!root.hasAttribute("aria-roledescription")) {
      root.setAttribute("aria-roledescription", "סליידר");
    }
  }

  function destroy() {
    pauseAutoplay();
    if (prevBtn) prevBtn.removeEventListener("click", prev);
    if (nextBtn) nextBtn.removeEventListener("click", next);
    track.removeEventListener("pointerdown", onPointerDown);
    track.removeEventListener("pointermove", onPointerMove);
    track.removeEventListener("pointerup", onPointerUp);
    track.removeEventListener("pointercancel", onPointerUp);
    track.removeEventListener("pointerleave", onPointerUp);
    root.removeEventListener("keydown", onKeyDown);
    root.removeEventListener("mouseenter", pauseAutoplay);
    root.removeEventListener("mouseleave", restartAutoplay);
    root.removeEventListener("focusin", pauseAutoplay);
    root.removeEventListener("focusout", restartAutoplay);
    document.removeEventListener("visibilitychange", visibilityHandler);

    if (dotsContainer) {
      dotsContainer.innerHTML = "";
      dotEls = [];
    }
    track.style.transform = "";
    track.style.transition = "";
  }

  attach();

  return { destroy, goTo, next, prev };
}

// ---------------------------------------------------------------------------
// Public API — match Agent 09 contract: init() + destroy().
// ---------------------------------------------------------------------------

export function init() {
  if (typeof document === "undefined") return () => {};
  const sliders = document.querySelectorAll("[data-slider]");
  const created = [];
  sliders.forEach((root) => {
    if (instances.has(root)) return;
    const instance = createSliderInstance(root);
    instances.set(root, instance);
    created.push({ root, instance });
  });

  return function destroyAll() {
    created.forEach(({ root, instance }) => {
      instance.destroy();
      instances.delete(root);
    });
  };
}

export function destroy() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-slider]").forEach((root) => {
    const instance = instances.get(root);
    if (instance) {
      instance.destroy();
      instances.delete(root);
    }
  });
}

export default { init, destroy };
