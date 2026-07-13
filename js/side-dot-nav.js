/**
 * side-dot-nav.js — vertical dot navigation on the right edge (RTL-leading)
 *
 * Owner : Agent 19 (Loading Overlay + Side-Dot Nav)
 * Spec  : architecture/transitions-and-nav.md §8–§16
 *
 * Responsibilities
 * ----------------
 * 1. Inject the <nav> with 8 dots on init() — one per major section.
 *    Skip dots whose target sections aren't in the DOM (warn, don't error).
 * 2. Track active section via IntersectionObserver (rootMargin -40%/-40%).
 *    Hero is special-cased via window.gamosHero.onProgress (sticky over
 *    700vh spacer breaks naive IO).
 * 3. Click handler: smooth-scroll to target, push hash to history without
 *    triggering the browser's default scroll-jump.
 * 4. Keyboard: Tab + Arrow Up/Down (with wrap), Home, End, Enter/Space.
 * 5. Coordinate with loading-overlay: pause IO updates while overlay is up,
 *    via custom events `gamos:loading-show` / `gamos:loading-hide`.
 *
 * Public API: init(), destroy()
 *
 * Constitution
 * - §4 logical CSS only (handled in side-dot-nav.css).
 * - §10.3 module-scoped state, init/destroy contract.
 * - §9 focus rings, keyboard nav, aria-current.
 *
 * Note on ARIA
 * ------------
 * Spec §11 originally suggested role="tablist"/"tab" semantics. The agent's
 * implementation prompt overrides that to plain `<nav><a>` with
 * `aria-current="true"` for the active dot — more reliable across screen
 * readers (per Agent 14's a11y risk note §14.5). We follow that override.
 */

// ----------------------------------------------------------------------------
// Constants — section list (per spec §9)
// ----------------------------------------------------------------------------

// 2026-06-03: 12 dots. The trailing #contact dot covers BOTH the contact
// form and the routes-map reveal beneath it (same scroll continuum, single
// hub in the user's mind). Placeholder ids (no DOM target yet) render as
// muted dots; the picker skips them and they become navigable as soon as
// the new component supplies the matching id.
//
// To re-wire: change `id` to match a section's id="…" attribute and
// `label` to the dot's hover-tooltip Hebrew text. Order in this array =
// visual top-to-bottom order on the right edge.
const SECTIONS = [
  { id: "hero",         label: "פתיחה" },
  { id: "why-gamos",    label: "למה גאמוס" },   // conversion pass 2026-07-13
  { id: "lounge",       label: "לאונג'" },
  { id: "culinary",     label: "קולינריה" },
  { id: "rooms",        label: "חדרים" },
  { id: "about",        label: "אודות" },
  { id: "testimonials", label: "המלצות" },
  { id: "gallery",      label: "גלריה" },
  { id: "events",       label: "סוגי אירועים" },
  { id: "kosher",       label: "כשרות" },
  { id: "contact",      label: "צור קשר" },
];

// Hero dominance threshold: while hero progress < this, hero dot is active.
const HERO_DOMINANCE_END = 0.85;

// Active-dot picker — fraction of the viewport height where we read the
// "active line". 0.5 = exact center; 0.4 (used here) means the line sits a
// bit above center, which feels natural because reading attention skews
// toward the upper third on long pages.
const ACTIVE_LINE_RATIO = 0.4;

// Hero hook polling.
const HERO_HOOK_TIMEOUT  = 5000;
const HERO_HOOK_INTERVAL = 100;

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:    false,
  nav:            null,           // root <nav.side-dot-nav>
  dots:           [],             // [{ id, label, el, sectionEl }]
  reducedMQ:      null,
  reducedMotion:  false,
  suppressed:     false,          // true while loading-overlay is up
  heroProgress:   0,
  unsubHero:      null,
  hookWaitTimer:  null,
  rafId:          0,              // active RAF id for the continuous picker
  lastActiveId:   null,           // skip DOM writes when active hasn't changed
  bound: {
    onClick:        null,
    onKeydown:      null,
    onLoadingShow:  null,
    onLoadingHide:  null,
    onMediaChange:  null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function watchReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  state.reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  state.reducedMotion = state.reducedMQ.matches;

  state.bound.onMediaChange = (e) => {
    state.reducedMotion = e.matches;
  };
  if (typeof state.reducedMQ.addEventListener === "function") {
    state.reducedMQ.addEventListener("change", state.bound.onMediaChange);
  } else if (typeof state.reducedMQ.addListener === "function") {
    state.reducedMQ.addListener(state.bound.onMediaChange);
  }
}

function buildNavDom(dots) {
  const nav = document.createElement("nav");
  nav.className = "side-dot-nav";
  nav.setAttribute("aria-label", "ניווט מהיר באתר");

  const frag = document.createDocumentFragment();
  for (const dot of dots) {
    const a = document.createElement("a");
    a.className = "side-dot-nav__dot";
    a.href = "#" + dot.id;
    a.dataset.section = dot.id;
    // Placeholder dots (no DOM target yet) are rendered but inert — muted
    // visually + not in the tab order + aria-disabled so SR users skip them.
    if (!dot.sectionEl) {
      a.setAttribute("data-placeholder", "");
      a.setAttribute("aria-disabled", "true");
      a.setAttribute("tabindex", "-1");
    }
    // Active by default on the first dot only (hero).
    if (dot.id === "hero") {
      a.setAttribute("aria-current", "true");
    }

    const label = document.createElement("span");
    label.className = "side-dot-nav__label";
    label.textContent = dot.label;
    a.appendChild(label);

    frag.appendChild(a);
    dot.el = a;
  }
  nav.appendChild(frag);
  return nav;
}

function setActive(sectionId) {
  if (state.suppressed) return;
  if (state.lastActiveId === sectionId) return;       // no DOM churn
  state.lastActiveId = sectionId;
  for (const dot of state.dots) {
    if (!dot.el) continue;
    if (dot.id === sectionId) {
      dot.el.setAttribute("aria-current", "true");
    } else {
      dot.el.removeAttribute("aria-current");
    }
  }
}

// ----------------------------------------------------------------------------
// Active-dot picker — viewport-rect based, continuous RAF loop
// ----------------------------------------------------------------------------
//
// Why not IntersectionObserver? Sections of wildly different heights (the
// culinary scrub takes ~1100vh, while #rooms is ~120vh) make IO's
// intersectionRatio worthless: a giant section never reaches a high ratio
// inside an inset rootMargin, while a small adjacent section can reach 1.0
// with just a sliver of overlap — flipping the active dot off culinary the
// moment rooms peeks in.
//
// Why getBoundingClientRect() and not offsetTop? offsetTop is relative to
// the offsetParent. The sticky-footer rule put `position: relative` on
// <main>, which changed every section's offsetParent to <main> — so
// offsetTop went from "document Y" to "main-relative Y" and the picker
// stopped landing on the correct section. Rect-based reads are always in
// viewport coordinates, immune to ancestor positioning quirks.
//
// Why continuous RAF instead of scroll listener? Smooth-scroll libs and
// long sticky scrubs can dirty layout without firing user-visible scroll
// events. A 60fps poll costs ~10 rect reads per frame (free, all from
// composited layout) and guarantees the dot is always live.

function pickActiveSection() {
  if (state.suppressed) return null;

  // Hero is special-cased through its own progress hook (sticky over a
  // 700vh spacer would confuse a naive picker).
  if (state.heroProgress < HERO_DOMINANCE_END) return "hero";

  const vh = window.innerHeight;
  const activeY = vh * ACTIVE_LINE_RATIO;     // viewport-relative line

  // Walk dots; the active section is the one whose viewport-relative
  // top is the LATEST (largest) value still <= activeY. Equivalent to
  // "the last section the user has scrolled the active line past."
  let bestId  = state.dots[0] ? state.dots[0].id : null;
  let bestTop = -Infinity;

  for (const dot of state.dots) {
    const el = dot.sectionEl;
    if (!el) continue;
    const rect = el.getBoundingClientRect();
    // Active line crosses this section if section.top <= line < section.bottom
    // — but we want the section whose top is just-above-or-at the line, which
    // is the same condition expressed monotonically.
    if (rect.top <= activeY && rect.top > bestTop) {
      bestTop = rect.top;
      bestId  = dot.id;
    }
  }

  // Edge case: the user scrolls to the very bottom and the LAST section's
  // top is above the active line, but a later section (e.g. contact) has
  // its top BELOW the line because the page has run out of scroll. Catch
  // that by snapping to the last section if its bottom is in view.
  const last = state.dots[state.dots.length - 1];
  if (last && last.sectionEl) {
    const r = last.sectionEl.getBoundingClientRect();
    if (r.bottom <= vh + 4 && r.bottom > 0) {
      bestId = last.id;
    }
  }

  return bestId;
}

function rafLoop() {
  state.rafId = window.requestAnimationFrame(rafLoop);
  if (state.suppressed) return;
  const id = pickActiveSection();
  if (id) setActive(id);
}

function installScrollPicker() {
  rafLoop();
}

// ----------------------------------------------------------------------------
// Hero progress hook (special-case — hero is sticky over 700vh spacer)
// ----------------------------------------------------------------------------

function waitForHeroHook(timeout = HERO_HOOK_TIMEOUT, interval = HERO_HOOK_INTERVAL) {
  return new Promise((resolve) => {
    const start = performance.now();
    const check = () => {
      if (window.gamosHero && typeof window.gamosHero.onProgress === "function") {
        resolve(window.gamosHero.onProgress);
        return;
      }
      if (performance.now() - start >= timeout) {
        resolve(null);
        return;
      }
      state.hookWaitTimer = window.setTimeout(check, interval);
    };
    check();
  });
}

function attachHeroHook() {
  waitForHeroHook().then((onProgress) => {
    if (!onProgress) return;
    try {
      const result = onProgress((p) => {
        state.heroProgress = p;
        if (state.suppressed) return;
        // While hero dominates, force the hero dot active. After crossing
        // the threshold, the RAF picker (running every frame) takes over —
        // no extra scheduling needed.
        if (p < HERO_DOMINANCE_END) {
          setActive("hero");
        }
      });
      if (typeof result === "function") {
        state.unsubHero = result;
      }
    } catch (err) {
      // Hero hook failed — IO fallback already handles active-state.
      // eslint-disable-next-line no-console
      console.warn("[side-dot-nav] hero progress hook failed; using IO only.", err);
    }
  });
}

// ----------------------------------------------------------------------------
// Click handler — smooth-scroll + history.pushState
// ----------------------------------------------------------------------------

function onDotClick(event) {
  // Only handle clicks on dot anchors.
  const dot = event.target.closest(".side-dot-nav__dot");
  if (!dot || !state.nav.contains(dot)) return;

  const sectionId = dot.dataset.section;
  if (!sectionId) return;

  const target = document.getElementById(sectionId);
  if (!target) return;

  event.preventDefault();

  const behavior = state.reducedMotion ? "auto" : "smooth";

  // Prefer Lenis (desktop smooth scroll) so its inertia drives the jump —
  // a GSAP window.scrollTo tween would fight Lenis's own loop. Falls through
  // to the shared hash-push + optimistic active-state update below.
  const gsap = window.gsap;
  if (window.gamosSmoothScrollTo) {
    window.gamosSmoothScrollTo(sectionId === "hero" ? 0 : target, { duration: 1.1 });
  }
  // Otherwise prefer GSAP ScrollToPlugin (self-hosted, already loaded with the
  // page) so we have a single smooth animation that won't fight the hero RAF.
  else if (gsap && typeof gsap.to === "function") {
    try {
      gsap.to(window, {
        duration: state.reducedMotion ? 0 : 1.1,
        ease: "power3.inOut",
        scrollTo: sectionId === "hero" ? 0 : { y: target, autoKill: false },
      });
    } catch {
      // Fall back to native if GSAP misbehaves.
      if (sectionId === "hero") window.scrollTo({ top: 0, behavior });
      else target.scrollIntoView({ behavior, block: "start" });
    }
  } else if (sectionId === "hero") {
    try { window.scrollTo({ top: 0, behavior }); } catch { window.scrollTo(0, 0); }
  } else {
    try { target.scrollIntoView({ behavior, block: "start" }); }
    catch { target.scrollIntoView(); }
  }

  // Push hash without browser default scroll-jump.
  try {
    history.pushState({}, "", "#" + sectionId);
  } catch { /* ignore */ }

  // Optimistic active-state update — IO will confirm in 1-2 frames.
  setActive(sectionId);
}

// ----------------------------------------------------------------------------
// Keyboard handler — Arrow Up/Down (wrap), Home, End
// ----------------------------------------------------------------------------

function onKeydown(event) {
  // Only act when focus is on a dot.
  const active = document.activeElement;
  if (!active || !active.classList.contains("side-dot-nav__dot")) return;
  if (!state.nav.contains(active)) return;

  // Only navigable dots (skip placeholders without a real DOM target).
  const dotsEls = state.dots
    .filter((d) => d.el && d.sectionEl)
    .map((d) => d.el);
  const idx = dotsEls.indexOf(active);
  if (idx < 0) return;

  let nextIdx = -1;
  switch (event.key) {
    case "ArrowDown":
      nextIdx = (idx + 1) % dotsEls.length;
      break;
    case "ArrowUp":
      nextIdx = (idx - 1 + dotsEls.length) % dotsEls.length;
      break;
    case "Home":
      nextIdx = 0;
      break;
    case "End":
      nextIdx = dotsEls.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  const next = dotsEls[nextIdx];
  if (next && typeof next.focus === "function") {
    next.focus();
  }
}

// ----------------------------------------------------------------------------
// Loading-overlay coordination
// ----------------------------------------------------------------------------

function onLoadingShow() {
  state.suppressed = true;
  if (state.nav) {
    state.nav.setAttribute("data-suppressed", "");
  }
}

function onLoadingHide() {
  state.suppressed = false;
  if (state.nav) {
    state.nav.removeAttribute("data-suppressed");
  }
}

// ----------------------------------------------------------------------------
// init()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined" || !document.body) return;

  // 1. Build the dot list. Targets that aren't in the DOM yet (e.g. the new
  //    hero component is still being wired) still render as visual placeholders
  //    so the rail count stays stable; they just have no scroll target and the
  //    active-picker skips them. The user can rebind ids later without the
  //    rail flickering between counts.
  const dots = [];
  for (const def of SECTIONS) {
    const sectionEl = document.getElementById(def.id);
    if (!sectionEl) {
      // eslint-disable-next-line no-console
      console.warn(`[side-dot-nav] section "#${def.id}" missing — dot rendered as placeholder.`);
    }
    dots.push({ id: def.id, label: def.label, el: null, sectionEl });
  }
  state.dots = dots;

  // 2. Reduced-motion live tracking.
  watchReducedMotion();

  // 3. Build + inject DOM.
  state.nav = buildNavDom(dots);
  document.body.appendChild(state.nav);

  // 4. Wire click handler (delegated on nav).
  state.bound.onClick = onDotClick;
  state.nav.addEventListener("click", state.bound.onClick);

  // 5. Wire keyboard handler (window-level — we filter to nav-focused inside).
  state.bound.onKeydown = onKeydown;
  window.addEventListener("keydown", state.bound.onKeydown);

  // 6. Cross-module loading-overlay coordination.
  state.bound.onLoadingShow = onLoadingShow;
  state.bound.onLoadingHide = onLoadingHide;
  window.addEventListener("gamos:loading-show", state.bound.onLoadingShow);
  window.addEventListener("gamos:loading-hide", state.bound.onLoadingHide);

  // 7. Hero progress hook (special-case for sticky hero).
  attachHeroHook();

  // 8. Scroll-position-based active picker (replaces IO — see comment on
  // pickActiveSection() for rationale).
  installScrollPicker();

  state.initialised = true;
}

// ----------------------------------------------------------------------------
// destroy()
// ----------------------------------------------------------------------------

export function destroy() {
  if (!state.initialised) return;

  // 1. Clear hero hook poll.
  if (state.hookWaitTimer != null) {
    window.clearTimeout(state.hookWaitTimer);
    state.hookWaitTimer = null;
  }

  // 2. Unsub hero progress.
  if (typeof state.unsubHero === "function") {
    try { state.unsubHero(); } catch { /* ignore */ }
  }
  state.unsubHero = null;

  // 3. Cancel the picker RAF loop.
  if (state.rafId) {
    try { window.cancelAnimationFrame(state.rafId); } catch { /* ignore */ }
    state.rafId = 0;
  }

  // 4. Remove listeners.
  if (state.nav && state.bound.onClick) {
    state.nav.removeEventListener("click", state.bound.onClick);
  }
  if (state.bound.onKeydown) {
    window.removeEventListener("keydown", state.bound.onKeydown);
  }
  if (state.bound.onLoadingShow) {
    window.removeEventListener("gamos:loading-show", state.bound.onLoadingShow);
  }
  if (state.bound.onLoadingHide) {
    window.removeEventListener("gamos:loading-hide", state.bound.onLoadingHide);
  }
  if (state.reducedMQ && state.bound.onMediaChange) {
    if (typeof state.reducedMQ.removeEventListener === "function") {
      state.reducedMQ.removeEventListener("change", state.bound.onMediaChange);
    } else if (typeof state.reducedMQ.removeListener === "function") {
      state.reducedMQ.removeListener(state.bound.onMediaChange);
    }
  }

  // 5. Remove DOM.
  if (state.nav && state.nav.parentNode) {
    state.nav.parentNode.removeChild(state.nav);
  }

  // 6. Reset state.
  state.initialised   = false;
  state.nav           = null;
  state.dots          = [];
  state.reducedMQ     = null;
  state.reducedMotion = false;
  state.suppressed    = false;
  state.heroProgress  = 0;
  state.lastActiveId  = null;
  state.bound.onClick       = null;
  state.bound.onKeydown     = null;
  state.bound.onLoadingShow = null;
  state.bound.onLoadingHide = null;
  state.bound.onMediaChange = null;
}
