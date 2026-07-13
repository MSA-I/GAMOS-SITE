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

import { prefersReducedMotion } from "./utils/media-query.js";

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const OVERLAY_ID         = "site-nav-mobile";
const OVERLAY_CLASS      = "site-nav__mobile";
const TOGGLE_OPEN_CLASS  = "is-open";
const HTML_LOCK_CLASS    = "nav-open";

// Per-language nav a11y labels. These are set on elements the i18n DOM walk
// either can't reach (built after its pass) or overwrites dynamically (open/close),
// so they can't be plain data-i18n keys — we localise them here and refresh on
// gamos:langchange, the same signal hero-scene.js / directions-map.js listen to.
const LABELS = {
  he: { open: "פתח תפריט", close: "סגור תפריט", dialog: "תפריט ראשי" },
  en: { open: "Open menu", close: "Close menu", dialog: "Main menu" },
  fr: { open: "Ouvrir le menu", close: "Fermer le menu", dialog: "Menu principal" },
};
function label(key) {
  const lang = document.documentElement.lang || "he";
  return (LABELS[lang] || LABELS.he)[key];
}

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:   false,
  toggle:        null,
  overlay:       null,
  closeBtn:      null,   // dedicated close (X) button inside the overlay.
  desktopLinks:  null,   // original <ul> in header.
  overlayLinks:  [],     // <a> elements inside overlay (click-to-close targets).
  isOpen:        false,
  bound: {
    onToggleClick:    null,
    onOverlayClick:   null,
    onKeyDown:        null,
    onLinkClick:      null,
    onLangChange:     null,
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
  wrap.setAttribute("aria-label", label("dialog"));

  // Dedicated close (X) button. The hamburger toggle animates into an X but it
  // lives inside .site-nav (z-index:--z-sticky → its own stacking context), so
  // the body-level overlay (z:--z-overlay) paints OVER it and the X is invisible.
  // This button lives inside the overlay's own stacking context, so it's always
  // visible + tappable. Click handled in onOverlayClick.
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = `${OVERLAY_CLASS}__close`;
  closeBtn.setAttribute("aria-label", label("close"));
  closeBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.6" stroke-linecap="round" aria-hidden="true">' +
    '<path d="M6 6l12 12M18 6L6 18"/></svg>';
  wrap.appendChild(closeBtn);

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

  // The standalone "קבעו פגישה" CTA was removed 2026-06-02 per user direction
  // ("too aggressive — let the NAV bar BE the call to action"). The contact
  // link inside the nav list still leads to #contact for the same purpose.

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
  state.toggle.setAttribute("aria-label", label("close"));
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
  state.toggle.setAttribute("aria-label", label("open"));
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
  // Element (not HTMLElement): a tap on the X lands on the inline <svg>/<path>,
  // which is an SVGElement — the old HTMLElement guard silently swallowed those
  // taps and the close button "didn't work" (user report 2026-07-13). SVG
  // elements have .closest()/.classList too, so the checks below are safe.
  if (!(target instanceof Element)) return;
  // Closing on link click is handled by onLinkClick (event bubbles up but
  // we close there directly so the anchor still navigates).
  if (target.tagName === "A") return;
  // Dedicated close (X) button anywhere in the overlay.
  if (target.closest(`.${OVERLAY_CLASS}__close`)) {
    close();
    return;
  }
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

  // Build current focus loop: [toggle, closeBtn, ...overlayLinks]. The close (X)
  // button is a real focus target — omitting it let Tab escape the overlay.
  const trap = [state.toggle, state.closeBtn, ...state.overlayLinks].filter(Boolean);
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

/**
 * i18n.js dispatches gamos:langchange on every language switch. Refresh the a11y
 * labels the DOM walk can't reach: the overlay/close button are built after i18n's
 * one-time pass, and the hamburger label is overwritten dynamically by open/close.
 */
function onLangChange() {
  if (state.overlay) state.overlay.setAttribute("aria-label", label("dialog"));
  if (state.closeBtn) state.closeBtn.setAttribute("aria-label", label("close"));
  if (state.toggle) state.toggle.setAttribute("aria-label", label(state.isOpen ? "close" : "open"));
}

// ----------------------------------------------------------------------------
// Desktop link smooth-scroll — bypass the orchestrator's RAF that was
// interfering with native hash-jump. Uses GSAP ScrollToPlugin if loaded,
// otherwise falls back to scrollIntoView({behavior:"smooth"}).
// ----------------------------------------------------------------------------

function smoothScrollTo(target) {
  if (!target) return;
  const reduced = prefersReducedMotion();

  // Prefer Lenis (desktop smooth scroll) — its inertia owns the scroll, so a
  // GSAP window.scrollTo tween would fight it.
  if (window.gamosSmoothScrollTo) {
    window.gamosSmoothScrollTo(target === "top" ? 0 : target, { duration: reduced ? 0 : 1.1 });
    return;
  }

  // Otherwise prefer GSAP ScrollToPlugin (already self-hosted at /assets/vendor/)
  // for a single smooth animation that won't fight the hero's RAF loop.
  const gsap = typeof window !== "undefined" ? window.gsap : null;
  if (gsap && typeof gsap.to === "function") {
    try {
      gsap.to(window, {
        duration: reduced ? 0 : 1.1,
        ease: "power3.inOut",
        scrollTo: target === "top" ? 0 : { y: target, autoKill: false },
      });
      return;
    } catch { /* fall through to native */ }
  }

  // Native fallback.
  try {
    if (target === "top") {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } else {
      target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    }
  } catch {
    if (target === "top") window.scrollTo(0, 0);
    else target.scrollIntoView();
  }
}

function onNavLinkClick(event) {
  const link = event.target.closest("a[href^='#']");
  if (!link) return;
  const href = link.getAttribute("href");
  if (!href || href === "#") return;
  const id = href.slice(1);
  const target = id === "hero" || id === "" ? "top" : document.getElementById(id);
  if (target == null) return;
  event.preventDefault();
  smoothScrollTo(target);
  try { history.pushState({}, "", href); } catch { /* ignore */ }
}

function wireDesktopLinkScroll() {
  // Delegated on the entire site-nav (covers desktop links AND footer nav, plus
  // the brand logo "to top" click). Capture phase so we run before any sticky
  // orchestrator might intercept.
  const navRoot = document.querySelector(".site-nav") || document.body;
  if (!navRoot) return;
  navRoot.addEventListener("click", onNavLinkClick);
  // Footer nav links — same treatment.
  const footer = document.querySelector(".site-footer");
  if (footer) footer.addEventListener("click", onNavLinkClick);
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

  // Even if the mobile toggle is missing, we still want desktop link smooth-
  // scroll to work — so wire that BEFORE the early-return.
  wireDesktopLinkScroll();

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
  state.closeBtn = state.overlay.querySelector(`.${OVERLAY_CLASS}__close`);

  // 3. Wire listeners.
  state.bound.onToggleClick  = onToggleClick;
  state.bound.onOverlayClick = onOverlayClick;
  state.bound.onKeyDown      = onKeyDown;
  state.bound.onLinkClick    = onLinkClick;
  state.bound.onLangChange   = onLangChange;

  state.toggle.addEventListener("click", state.bound.onToggleClick);
  state.overlay.addEventListener("click", state.bound.onOverlayClick);

  state.overlayLinks = focusableLinks();
  state.overlayLinks.forEach((a) => {
    a.addEventListener("click", state.bound.onLinkClick);
  });

  document.addEventListener("keydown", state.bound.onKeyDown);
  document.addEventListener("gamos:langchange", state.bound.onLangChange);
  onLangChange(); // sync labels to the boot language (i18n may have set en/fr)

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
  if (state.bound.onLangChange) {
    document.removeEventListener("gamos:langchange", state.bound.onLangChange);
  }

  // 3. Remove the overlay element we injected.
  if (state.overlay && state.overlay.parentNode) {
    state.overlay.parentNode.removeChild(state.overlay);
  }

  // 4. Reset state.
  state.initialised  = false;
  state.toggle       = null;
  state.overlay      = null;
  state.closeBtn     = null;
  state.desktopLinks = null;
  state.overlayLinks = [];
  state.isOpen       = false;
  state.bound.onToggleClick  = null;
  state.bound.onOverlayClick = null;
  state.bound.onKeyDown      = null;
  state.bound.onLinkClick    = null;
  state.bound.onLangChange   = null;
}
