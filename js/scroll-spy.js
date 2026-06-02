/**
 * scroll-spy.js — top-nav scroll state + active-section highlighting
 *
 * Constitution refs
 * - §2  — vanilla ESM, no framework.
 * - §3  — module-scoped state, init(el-less)/destroy() contract.
 * - §8  — passive listeners + rAF throttle (no scroll jank).
 * - §9  — sets aria-current="true" on the active link for AT.
 * - §10 — module-scoped, idempotent.
 *
 * Responsibilities
 * ----------------
 * (a) Condense state: add `.is-scrolled` to `.site-nav` once the page is
 *     scrolled past ~SCROLL_THRESHOLD px. CSS shrinks the bar. Implemented
 *     with a passive scroll listener + requestAnimationFrame throttle.
 *
 * (b) Scroll-spy: observe the main sections with an IntersectionObserver and
 *     mark the nav link whose target section is currently in view with
 *     aria-current="true" + an `.is-active` class. Mirrors the state onto the
 *     mobile-overlay clone links too (matched by href).
 *
 * Public API: init(), destroy()  — init() takes no args, queries `.site-nav`,
 * is a no-op if the nav is missing, and is idempotent.
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const NAV_SELECTOR     = ".site-nav";
const LINK_SELECTOR    = ".site-nav__links a[href^='#']";
const SCROLL_THRESHOLD = 40;   // px scrolled before the bar condenses
const SCROLLED_CLASS   = "is-scrolled";
const ACTIVE_CLASS     = "is-active";

// Where the "active" band sits in the viewport. rootMargin shrinks the
// observation box so a section is "current" once it crosses ~40% from the top
// and before its bottom passes ~40% from the bottom — a single dominant
// section at a time, which matches reading expectation.
const IO_ROOT_MARGIN   = "-40% 0px -55% 0px";

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:   false,
  nav:           null,
  observer:      null,   // IntersectionObserver over sections
  sections:      [],     // [{ id, el, links: [<a>...] }]
  linksByHash:   null,   // Map<"#id", Set<HTMLAnchorElement>>
  activeHash:    null,
  ticking:       false,  // rAF throttle guard
  bound: {
    onScroll: null,
  },
};

// ----------------------------------------------------------------------------
// (a) Scroll condense state
// ----------------------------------------------------------------------------

function applyScrolledState() {
  state.ticking = false;
  if (!state.nav) return;
  const scrolled = window.scrollY > SCROLL_THRESHOLD;
  state.nav.classList.toggle(SCROLLED_CLASS, scrolled);
}

function onScroll() {
  if (state.ticking) return;
  state.ticking = true;
  requestAnimationFrame(applyScrolledState);
}

// ----------------------------------------------------------------------------
// (b) Scroll-spy active-link highlighting
// ----------------------------------------------------------------------------

/**
 * Build a lookup of "#hash" → set of anchors pointing at it. Covers both the
 * desktop link list and the injected mobile-overlay clone (same hrefs), so the
 * active state stays in sync across breakpoints.
 */
function buildLinkIndex() {
  const map = new Map();
  // All in-page anchors in the nav + the overlay clone, keyed by hash.
  const anchors = document.querySelectorAll(
    `${LINK_SELECTOR}, .site-nav__mobile__links a[href^='#']`,
  );
  anchors.forEach((a) => {
    const hash = a.getAttribute("href");
    if (!hash || hash === "#") return;
    if (!map.has(hash)) map.set(hash, new Set());
    map.get(hash).add(a);
  });
  return map;
}

/**
 * Resolve the unique section targets from the nav's own link hrefs, in DOM
 * order. We derive the section id list FROM the markup (per the contract) so
 * adding/removing a nav link auto-updates what we observe.
 */
function collectSections() {
  const seen = new Set();
  const sections = [];
  document.querySelectorAll(LINK_SELECTOR).forEach((a) => {
    const hash = a.getAttribute("href");
    if (!hash || hash === "#" || seen.has(hash)) return;
    const el = document.querySelector(hash);
    if (!el) return;            // skip links whose target isn't on the page
    seen.add(hash);
    sections.push({ id: hash, el });
  });
  return sections;
}

function setActiveHash(hash) {
  if (hash === state.activeHash) return;

  // Clear previous.
  if (state.activeHash && state.linksByHash.has(state.activeHash)) {
    state.linksByHash.get(state.activeHash).forEach((a) => {
      a.classList.remove(ACTIVE_CLASS);
      a.removeAttribute("aria-current");
    });
  }

  state.activeHash = hash;

  // Apply new.
  if (hash && state.linksByHash.has(hash)) {
    state.linksByHash.get(hash).forEach((a) => {
      a.classList.add(ACTIVE_CLASS);
      a.setAttribute("aria-current", "true");
    });
  }
}

function onIntersect(entries) {
  // Pick the most-visible intersecting section. Multiple may intersect during
  // fast scrolls; choose the highest intersectionRatio, tie-break by DOM order.
  let best = null;
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    if (!best || entry.intersectionRatio > best.intersectionRatio) {
      best = entry;
    }
  });

  if (best) {
    const match = state.sections.find((s) => s.el === best.target);
    if (match) setActiveHash(match.id);
  }
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.nav = document.querySelector(NAV_SELECTOR);
  if (!state.nav) return; // no-op if the nav isn't present

  // ---- (a) Scroll condense -------------------------------------------------
  state.bound.onScroll = onScroll;
  window.addEventListener("scroll", state.bound.onScroll, { passive: true });
  applyScrolledState(); // set correct initial state (e.g. reload mid-page)

  // ---- (b) Scroll-spy ------------------------------------------------------
  state.linksByHash = buildLinkIndex();
  state.sections    = collectSections();

  if (state.sections.length > 0 && "IntersectionObserver" in window) {
    state.observer = new IntersectionObserver(onIntersect, {
      root: null,
      rootMargin: IO_ROOT_MARGIN,
      threshold: [0, 0.25, 0.5, 0.75, 1],
    });
    state.sections.forEach((s) => state.observer.observe(s.el));
  }

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  if (state.bound.onScroll) {
    window.removeEventListener("scroll", state.bound.onScroll);
  }

  if (state.observer) {
    state.observer.disconnect();
  }

  // Clear any active markers we set.
  if (state.activeHash && state.linksByHash && state.linksByHash.has(state.activeHash)) {
    state.linksByHash.get(state.activeHash).forEach((a) => {
      a.classList.remove(ACTIVE_CLASS);
      a.removeAttribute("aria-current");
    });
  }
  if (state.nav) state.nav.classList.remove(SCROLLED_CLASS);

  // Reset state.
  state.initialised = false;
  state.nav         = null;
  state.observer    = null;
  state.sections    = [];
  state.linksByHash = null;
  state.activeHash  = null;
  state.ticking     = false;
  state.bound.onScroll = null;
}
