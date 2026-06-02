/**
 * site-nav.js — Mobile hamburger nav (overlay) + desktop link list helper
 *
 * Owner : Agent 23 (Phase D Interactivity Coder)
 * Plan  : PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md (Phase D2)
 * Spec  : agent-plans/agent-23_phase-d-interactivity-coder.md
 *
 * Background
 * ----------
 * The header markup ships a hamburger button with `aria-controls="site-nav-mobile"`,
 * but `#site-nav-mobile` doesn't exist anywhere in the DOM (broken target). This
 * module fixes that by injecting a full-screen overlay clone of the link list on
 * init, and wiring all the keyboard / a11y / scroll-lock behaviors.
 *
 * Responsibilities
 * ----------------
 * 1. Inject `<div id="site-nav-mobile" class="site-nav__mobile" hidden>` once on
 *    init() (idempotent). The overlay contains a CLONE of `<ul.site-nav__links>`.
 * 2. Wire toggle behavior:
 *    - Click hamburger → toggle `aria-expanded`, `hidden` on overlay, `is-open`
 *      class on toggle + overlay, `nav-open` class on `<html>` for scroll-lock.
 * 3. Close behaviors:
 *    - Click any link inside the overlay → close (lets the anchor scroll work).
 *    - Press Escape → close.
 * 4. Focus trap while open: tab cycles between toggle button + first/last link.
 *    Shift+tab from toggle goes to last link, tab from last goes back to toggle.
 * 5. Reduced-motion: no special handling needed (CSS owns the animation; we
 *    just toggle classes).
 *
 * Public API: init(), destroy()
 *
 * Constitution refs
 * - §2  — vanilla JS only.
 * - §4  — RTL-first, logical CSS.
 * - §9  — `aria-expanded`, `aria-controls`, focus trap, keyboard reachability.
 * - §10 — module-scoped state, init/destroy.
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const OVERLAY_ID         = "site-nav-mobile";
const OVERLAY_CLASS      = "site-nav__mobile";
const TOGGLE_OPEN_CLASS  = "is-open";
const HTML_LOCK_CLASS    = "nav-open";

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:   false,
  toggle:        null,
  overlay:       null,
  desktopLinks:  null,   // original <ul> in header.
  overlayLinks:  [],     // <a> elements inside overlay (focus-trap targets).
  isOpen:        false,
  bound: {
    onToggleClick:    null,
    onOverlayClick:   null,
    onKeyDown:        null,
    onLinkClick:      null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/**
 * Build the overlay element with a cloned link list. We clone to keep two
 * separate <ul>s — desktop's original stays untouched (CSS toggles its
 * visibility per breakpoint).
 */
function buildOverlay(originalLinks) {
  const wrap = document.createElement("div");
  wrap.id = OVERLAY_ID;
  wrap.className = OVERLAY_CLASS;
  wrap.hidden = true;
  // Mark as a navigation landmark for AT — but only one of the navs is
  // visible at a time per breakpoint, so duplicate landmark warning is rare.
  wrap.setAttribute("role", "dialog");
  wrap.setAttribute("aria-modal", "true");
  wrap.setAttribute("aria-label", "תפריט ראשי");

  const inner = document.createElement("div");
  inner.className = `${OVERLAY_CLASS}__inner`;

  const ul = document.createElement("ul");
  ul.className = `${OVERLAY_CLASS}__links`;
  ul.setAttribute("role", "list");

  // Clone each original <li> structure (anchor + text), preserving hrefs +
  // any aria-* / lang attributes the original carried. NOTE: this clones ALL
  // links — including [data-secondary] ones the CSS hides on the desktop bar —
  // so the overlay is the single place every section is reachable on mobile.
  originalLinks.querySelectorAll("li").forEach((li) => {
    const liClone = li.cloneNode(true);
    ul.appendChild(liClone);
  });

  inner.appendChild(ul);

  // The CTA ("קבעו פגישה") is a sibling of the desktop <ul> and is hidden on
  // mobile by CSS, so clone it into the overlay too — otherwise mobile users
  // lose the primary conversion action. Looked up relative to the same nav.
  const navRoot = originalLinks.closest(".site-nav__inner") || document;
  const cta = navRoot.querySelector(".site-nav__cta");
  if (cta) {
    const ctaClone = cta.cloneNode(true);
    ctaClone.removeAttribute("id"); // avoid duplicate ids if any
    inner.appendChild(ctaClone);
  }

  wrap.appendChild(inner);

  return wrap;
}

function focusableLinks() {
  if (!state.overlay) return [];
  return Array.from(state.overlay.querySelectorAll("a[href]"));
}

function open() {
  if (state.isOpen || !state.overlay || !state.toggle) return;
  state.isOpen = true;

  state.overlay.hidden = false;
  state.overlay.classList.add(TOGGLE_OPEN_CLASS);
  state.toggle.classList.add(TOGGLE_OPEN_CLASS);
  state.toggle.setAttribute("aria-expanded", "true");
  state.toggle.setAttribute("aria-label", "סגור תפריט");
  document.documentElement.classList.add(HTML_LOCK_CLASS);

  // Refresh focus-trap targets (in case the link list was mutated).
  state.overlayLinks = focusableLinks();

  // Move focus to the first link for instant keyboard navigation.
  // (Many users prefer focus stays on the toggle — but spec says trap, so we
  // keep focus reachable from the start of the list.)
  if (state.overlayLinks.length > 0) {
    requestAnimationFrame(() => {
      try { state.overlayLinks[0].focus(); } catch { /* ignore */ }
    });
  }
}

function close({ returnFocus = true } = {}) {
  if (!state.isOpen || !state.overlay || !state.toggle) return;
  state.isOpen = false;

  state.overlay.hidden = true;
  state.overlay.classList.remove(TOGGLE_OPEN_CLASS);
  state.toggle.classList.remove(TOGGLE_OPEN_CLASS);
  state.toggle.setAttribute("aria-expanded", "false");
  state.toggle.setAttribute("aria-label", "פתח תפריט");
  document.documentElement.classList.remove(HTML_LOCK_CLASS);

  if (returnFocus) {
    try { state.toggle.focus(); } catch { /* ignore */ }
  }
}

function toggle() {
  if (state.isOpen) close();
  else open();
}

// ----------------------------------------------------------------------------
// Event handlers
// ----------------------------------------------------------------------------

function onToggleClick(event) {
  event.preventDefault();
  toggle();
}

/**
 * Click anywhere in the overlay BACKDROP (not on a link) → close.
 * We detect "backdrop" by checking that the click target is the overlay itself
 * or its inner wrap (NOT a link/list item).
 */
function onOverlayClick(event) {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  // Closing on link click is handled by onLinkClick (event bubbles up but
  // we close there directly so the anchor still navigates).
  if (target.tagName === "A") return;
  // Treat clicks on the overlay root or inner wrapper as "backdrop" clicks.
  if (target === state.overlay || target.classList.contains(`${OVERLAY_CLASS}__inner`)) {
    close();
  }
}

/**
 * Click on a link inside overlay → close (let the navigation/anchor scroll
 * happen naturally).
 */
function onLinkClick(/* event */) {
  // Don't preventDefault — the anchor must still navigate.
  // returnFocus: false because the user is jumping to a new section; pulling
  // focus back to the hamburger feels like a step backwards.
  close({ returnFocus: false });
}

/**
 * Global keydown:
 *   - Escape → close (only when open).
 *   - Tab / Shift+Tab → focus trap between toggle ↔ overlayLinks (when open).
 */
function onKeyDown(event) {
  if (!state.isOpen) return;

  if (event.key === "Escape") {
    event.preventDefault();
    close();
    return;
  }

  if (event.key !== "Tab") return;

  // Build current focus loop: [toggle, ...overlayLinks].
  const trap = [state.toggle, ...state.overlayLinks];
  if (trap.length <= 1) return;

  const active = document.activeElement;
  const idx = trap.indexOf(active);

  if (event.shiftKey) {
    // Backward: if at start, wrap to end.
    if (idx <= 0) {
      event.preventDefault();
      trap[trap.length - 1].focus();
    }
  } else {
    // Forward: if at end, wrap to start.
    if (idx === trap.length - 1) {
      event.preventDefault();
      trap[0].focus();
    } else if (idx === -1) {
      // Focus escaped the trap somehow — pull it back to the toggle.
      event.preventDefault();
      state.toggle.focus();
    }
  }
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  // 1. Locate header pieces. Quietly bail if missing.
  state.toggle       = document.querySelector(".site-nav__toggle");
  state.desktopLinks = document.querySelector(".site-nav__links");
  if (!state.toggle || !state.desktopLinks) return;

  // 2. Inject overlay (idempotent — re-use if it already exists).
  let existing = document.getElementById(OVERLAY_ID);
  if (existing) {
    state.overlay = existing;
  } else {
    state.overlay = buildOverlay(state.desktopLinks);
    // Append to <body> so it overlays everything (including the sticky header).
    if (document.body) {
      document.body.appendChild(state.overlay);
    } else {
      // Body not ready yet (defensive — script is module/defer so this is rare).
      document.addEventListener("DOMContentLoaded",
        () => document.body.appendChild(state.overlay),
        { once: true });
    }
  }

  // Ensure aria-controls points at our overlay.
  state.toggle.setAttribute("aria-controls", OVERLAY_ID);
  state.toggle.setAttribute("aria-expanded", "false");

  // 3. Wire listeners.
  state.bound.onToggleClick  = onToggleClick;
  state.bound.onOverlayClick = onOverlayClick;
  state.bound.onKeyDown      = onKeyDown;
  state.bound.onLinkClick    = onLinkClick;

  state.toggle.addEventListener("click", state.bound.onToggleClick);
  state.overlay.addEventListener("click", state.bound.onOverlayClick);

  state.overlayLinks = focusableLinks();
  state.overlayLinks.forEach((a) => {
    a.addEventListener("click", state.bound.onLinkClick);
  });

  document.addEventListener("keydown", state.bound.onKeyDown);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  // 1. Force-close (clears scroll-lock, etc.).
  close({ returnFocus: false });

  // 2. Drop listeners.
  if (state.toggle && state.bound.onToggleClick) {
    state.toggle.removeEventListener("click", state.bound.onToggleClick);
  }
  if (state.overlay && state.bound.onOverlayClick) {
    state.overlay.removeEventListener("click", state.bound.onOverlayClick);
  }
  if (state.bound.onLinkClick) {
    state.overlayLinks.forEach((a) => {
      a.removeEventListener("click", state.bound.onLinkClick);
    });
  }
  if (state.bound.onKeyDown) {
    document.removeEventListener("keydown", state.bound.onKeyDown);
  }

  // 3. Remove the overlay element we injected.
  if (state.overlay && state.overlay.parentNode) {
    state.overlay.parentNode.removeChild(state.overlay);
  }

  // 4. Reset state.
  state.initialised  = false;
  state.toggle       = null;
  state.overlay      = null;
  state.desktopLinks = null;
  state.overlayLinks = [];
  state.isOpen       = false;
  state.bound.onToggleClick  = null;
  state.bound.onOverlayClick = null;
  state.bound.onKeyDown      = null;
  state.bound.onLinkClick    = null;
}
