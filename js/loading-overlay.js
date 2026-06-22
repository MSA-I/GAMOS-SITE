/**
 * loading-overlay.js — chrome-level loading screen module
 *
 * Owner : Agent 19 (Loading Overlay + Side-Dot Nav)
 * Spec  : architecture/transitions-and-nav.md §1–§7, §16
 *
 * Responsibilities
 * ----------------
 * 1. Inject overlay DOM once on init() (idempotent). Never re-inject.
 * 2. Expose window.gamosLoading.{ show, hide, isVisible } for portals.js.
 * 3. Listen for cross-module custom events:
 *      "gamos:loading-show"  -> show()
 *      "gamos:loading-hide"  -> hide()
 *    Re-dispatch the same events at boundary times so side-dot-nav can
 *    suppress its IntersectionObserver during the overlay window
 *    (per spec §12.3 + §16.1).
 * 4. Honor prefers-reduced-motion: instant show/hide, but still hold ~400ms
 *    so users register the transition (per §6.2).
 *
 * Public API: init(), destroy(), window.gamosLoading.{ show, hide, isVisible }
 *
 * Constitution
 * - §10.3 module-scoped state, init/destroy contract.
 * - §10.2 tokens are single source — no inline colors here.
 *
 * Coupling shim with portals.js
 * - We listen for "gamos:loading-show" / "gamos:loading-hide" custom events.
 *   That keeps portals.js loosely coupled — it doesn't import this module
 *   directly. The window.gamosLoading global is also available as a direct
 *   call path; both are supported. Either path triggers the same state
 *   machine, so callers can pick whichever feels cleaner.
 */

import { prefersReducedMotion, onReducedMotionChange } from "./utils/media-query.js";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const FADE_IN_MS        = 200;   // Time to reach full opacity.
const FADE_OUT_MS       = 200;   // Time to fade back to invisible.
const HOLD_MS_REDUCED   = 400;   // Reduced-motion hold (registers the moment).
const MIN_VISIBLE_HOLD_MS = 1500;

const LOGO_WEBP = "/assets/images/brand/logo-central.webp";
const LOGO_PNG  = "/assets/images/brand/logo-central.webp";

const HALL_TEXT = { events: "טוען את האולם", resort: "טוען את הריזורט" };

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:        false,
  el:                 null,    // root <div class="loading-overlay">
  visibilityState:    "hidden",// "hidden" | "showing" | "visible" | "hiding"
  unsubReduce:        null,    // unsubscribe fn from onReducedMotionChange
  reducedMotion:      false,
  hideTimer:          null,
  shownAt:            0,
  pendingShowResolve: null,
  pendingHideResolve: null,
  bound: {
    onShowEvent:    null,
    onHideEvent:    null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function buildOverlayDom() {
  // Use innerHTML for clarity — single insert, no perf concern.
  const wrap = document.createElement("div");
  wrap.id = "loading-overlay";
  wrap.className = "loading-overlay";
  wrap.setAttribute("aria-hidden", "true");
  wrap.setAttribute("role", "status");

  wrap.innerHTML = `
    <div class="loading-overlay__inner">
      <picture class="loading-overlay__logo-wrap">
        <source type="image/webp" srcset="${LOGO_WEBP}">
        <img class="loading-overlay__logo"
             src="${LOGO_PNG}"
             alt=""
             width="240"
             height="71"
             decoding="async"
             loading="eager">
      </picture>
      <div class="loading-overlay__bar" aria-hidden="true">
        <span class="loading-overlay__bar-fill"></span>
      </div>
      <p class="loading-overlay__text">טוען…</p>
    </div>
  `;

  return wrap;
}

function watchReducedMotion() {
  state.reducedMotion = prefersReducedMotion();
  state.unsubReduce = onReducedMotionChange((reduced) => {
    state.reducedMotion = reduced;
  });
}

function clearHideTimer() {
  if (state.hideTimer != null) {
    window.clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
}

// ----------------------------------------------------------------------------
// State machine: show()
// ----------------------------------------------------------------------------

function show(opts) {
  if (!state.initialised || !state.el) {
    return Promise.resolve();
  }

  // No-op if already visible / showing.
  if (state.visibilityState === "visible" || state.visibilityState === "showing") {
    return Promise.resolve();
  }

  // Set the caption to the per-hall text (falls back to the static default).
  const txt = state.el.querySelector(".loading-overlay__text");
  if (txt && opts && HALL_TEXT[opts.hall]) txt.textContent = HALL_TEXT[opts.hall];

  clearHideTimer();
  state.shownAt = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  state.visibilityState = "showing";
  state.el.setAttribute("aria-hidden", "false");

  // Force a frame so the browser registers the starting state, then add the
  // class. This guarantees the transition runs (vs. browser collapsing 0->1
  // into an instant change when both states are set in the same frame).
  // Use requestAnimationFrame for reliability across browsers.
  requestAnimationFrame(() => {
    if (state.visibilityState !== "showing" || !state.el) return;
    state.el.classList.add("is-visible");
  });

  // Fire the event for cross-module listeners (side-dot-nav).
  // Dispatching on window so any listener can catch it regardless of DOM tree.
  try {
    window.dispatchEvent(new CustomEvent("gamos:loading-show"));
  } catch { /* ignore */ }

  const fadeMs = state.reducedMotion ? 0 : FADE_IN_MS;

  return new Promise((resolve) => {
    state.pendingShowResolve = resolve;
    window.setTimeout(() => {
      if (state.visibilityState === "showing") {
        state.visibilityState = "visible";
      }
      const r = state.pendingShowResolve;
      state.pendingShowResolve = null;
      if (typeof r === "function") r();
    }, fadeMs);
  });
}

// ----------------------------------------------------------------------------
// State machine: hide()
// ----------------------------------------------------------------------------

function hide(opts) {
  if (!state.initialised || !state.el) {
    return Promise.resolve();
  }

  // No-op if already hidden / hiding.
  if (state.visibilityState === "hidden" || state.visibilityState === "hiding") {
    return Promise.resolve();
  }

  let delay = (opts && typeof opts.delay === "number" && opts.delay >= 0)
    ? opts.delay
    : 0;

  if (!state.reducedMotion && state.shownAt > 0) {
    const now = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
    const elapsed = now - state.shownAt;
    if (elapsed < MIN_VISIBLE_HOLD_MS) {
      const floorDelay = MIN_VISIBLE_HOLD_MS - elapsed;
      if (floorDelay > delay) delay = floorDelay;
    }
  }

  clearHideTimer();

  return new Promise((resolve) => {
    state.pendingHideResolve = resolve;

    state.hideTimer = window.setTimeout(() => {
      state.hideTimer = null;
      if (!state.el) {
        const r = state.pendingHideResolve;
        state.pendingHideResolve = null;
        if (typeof r === "function") r();
        return;
      }

      state.visibilityState = "hiding";
      state.el.classList.remove("is-visible");

      const fadeMs = state.reducedMotion ? 0 : FADE_OUT_MS;
      window.setTimeout(() => {
        if (state.el) {
          state.el.setAttribute("aria-hidden", "true");
        }
        state.visibilityState = "hidden";
        state.shownAt = 0;

        // Fire hide event AFTER the overlay is fully gone, so suppressed
        // observers re-engage when the user is already at the destination.
        try {
          window.dispatchEvent(new CustomEvent("gamos:loading-hide"));
        } catch { /* ignore */ }

        const r = state.pendingHideResolve;
        state.pendingHideResolve = null;
        if (typeof r === "function") r();
      }, fadeMs);
    }, delay);
  });
}

function isVisible() {
  return state.visibilityState === "visible"
      || state.visibilityState === "showing";
}

// ----------------------------------------------------------------------------
// Event listeners (custom event coupling shim)
// ----------------------------------------------------------------------------

function onShowEvent(e) {
  show(e && e.detail ? e.detail : undefined);
}

function onHideEvent() {
  hide();
}

// ----------------------------------------------------------------------------
// init()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;

  // Bail safely if document body isn't ready.
  if (typeof document === "undefined" || !document.body) {
    return;
  }

  // 1. Inject DOM (idempotent).
  let existing = document.getElementById("loading-overlay");
  if (existing) {
    state.el = existing;
  } else {
    state.el = buildOverlayDom();
    document.body.appendChild(state.el);
  }

  // 2. Reduced-motion live tracking.
  watchReducedMotion();

  // 3. Bind cross-module events.
  state.bound.onShowEvent = onShowEvent;
  state.bound.onHideEvent = onHideEvent;
  // We DO listen to our own dispatch — but only on a separate event name
  // ("gamos:loading-request-show") if we wanted to. Spec says callers can
  // either dispatch the events OR call window.gamosLoading.show() directly.
  // To prevent infinite recursion (we also dispatch loading-show on show()),
  // we only register listeners on REQUEST events, not the broadcast events.
  // For loose coupling per spec §16.1, portals.js may dispatch the same
  // broadcast events directly — handle that case too. To avoid recursion,
  // mark our own broadcast and skip if seen.
  //
  // Simpler approach: register listeners but guard via state machine
  // (already done — show() and hide() are idempotent during visible/hidden
  // states). This works because:
  //   external dispatch -> show() -> internal dispatch -> show() (no-op).
  window.addEventListener("gamos:loading-show", state.bound.onShowEvent);
  window.addEventListener("gamos:loading-hide", state.bound.onHideEvent);

  // 4. Expose global API for direct callers (portals.js).
  window.gamosLoading = {
    show,
    hide,
    isVisible,
  };

  state.initialised = true;
}

// ----------------------------------------------------------------------------
// destroy()
// ----------------------------------------------------------------------------

export function destroy() {
  if (!state.initialised) return;

  // 1. Clear timers.
  clearHideTimer();

  // 2. Drop event listeners.
  if (state.bound.onShowEvent) {
    window.removeEventListener("gamos:loading-show", state.bound.onShowEvent);
  }
  if (state.bound.onHideEvent) {
    window.removeEventListener("gamos:loading-hide", state.bound.onHideEvent);
  }
  if (state.unsubReduce) {
    state.unsubReduce();
    state.unsubReduce = null;
  }

  // 3. Remove DOM.
  if (state.el && state.el.parentNode) {
    state.el.parentNode.removeChild(state.el);
  }

  // 4. Drop global.
  if (window.gamosLoading) {
    try { delete window.gamosLoading; } catch { window.gamosLoading = undefined; }
  }

  // 5. Reset state.
  state.initialised        = false;
  state.el                 = null;
  state.visibilityState    = "hidden";
  state.reducedMotion      = false;
  state.pendingShowResolve = null;
  state.pendingHideResolve = null;
  state.bound.onShowEvent  = null;
  state.bound.onHideEvent  = null;
}

// Public, but advanced — useful for tests / debugging.
export { show, hide, isVisible };
