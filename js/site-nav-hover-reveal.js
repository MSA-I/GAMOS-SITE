/**
 * site-nav-hover-reveal.js — show/hide site-nav while in the hero
 *
 * Spec: User mandate 2026-06-04 — "the effect covers everything including
 * the top nav bar, and the bar is revealed only on hover".
 *
 * Mechanism
 * ---------
 *  - While #hero occupies the top of the viewport, set
 *    `<html data-hero-mode="true">`. CSS hides the nav and switches it to
 *    position: fixed.
 *  - When the cursor's clientY is within HERO_REVEAL_BAND (default 14vh),
 *    set `<html data-nav-revealed="true">`. CSS slides the nav in.
 *  - When cursor leaves the band (or the page entirely), remove the attr.
 *  - When the user scrolls past the hero, drop hero-mode entirely; the bar
 *    reverts to its native sticky behaviour (the existing site-nav.css).
 *
 * Public API: init(), destroy()
 *
 * Constitution
 *   §10.3 module-scoped state, init/destroy contract.
 */

const HERO_SELECTOR    = "#hero.hero-static";
const REVEAL_BAND_VH   = 14;           // top 14% of viewport reveals the bar
const HIDE_GRACE_MS    = 220;          // small grace period before re-hiding

const state = {
  initialised: false,
  hero: null,
  io: null,
  inHero: false,
  inBand: false,
  hideTimer: null,
  bound: {
    onMouseMove: null,
    onMouseLeave: null,
    onScroll: null,
  },
};

function setHeroMode(value) {
  if (value && state.inHero) return;
  if (!value && !state.inHero) return;
  state.inHero = !!value;
  document.documentElement.setAttribute("data-hero-mode", value ? "true" : "false");
  if (!value) {
    setRevealed(false);
  }
}

function setRevealed(value) {
  if (value === state.inBand) return;
  state.inBand = !!value;
  document.documentElement.setAttribute("data-nav-revealed", value ? "true" : "false");
}

function clearHide() {
  if (state.hideTimer != null) {
    clearTimeout(state.hideTimer);
    state.hideTimer = null;
  }
}

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  const hero = document.querySelector(HERO_SELECTOR);
  if (!hero) return;
  state.hero = hero;

  // IntersectionObserver gates hero-mode by whether the hero's TOP is at
  // the viewport top. Once the user has scrolled past the hero, the
  // sticky-nav (native) takes over — no more hover-mode.
  state.io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      // entry.intersectionRatio > 0.05 means the hero is still visible
      // somewhere in the viewport. We use top boundary detection instead
      // for a sharper switch.
      const r = entry.boundingClientRect;
      // Active when at least 30% of the hero is in view.
      const visible = entry.isIntersecting && entry.intersectionRatio > 0.30;
      setHeroMode(visible);
    }
  }, {
    threshold: [0, 0.3, 0.6, 1],
  });
  state.io.observe(hero);

  // Mouse tracking — reveal when cursor enters top band.
  state.bound.onMouseMove = (e) => {
    if (!state.inHero) return;
    const bandPx = (REVEAL_BAND_VH / 100) * window.innerHeight;
    if (e.clientY <= bandPx) {
      clearHide();
      setRevealed(true);
    } else if (state.inBand) {
      // Outside the band — schedule a hide. If the cursor re-enters
      // before the timer fires, clearHide() above cancels it.
      clearHide();
      state.hideTimer = setTimeout(() => {
        // Don't hide if the cursor is currently inside the (now visible)
        // nav bar — let the user actually click links.
        if (!isCursorOverNavBar()) setRevealed(false);
      }, HIDE_GRACE_MS);
    }
  };

  state.bound.onMouseLeave = () => {
    if (!state.inHero) return;
    clearHide();
    state.hideTimer = setTimeout(() => setRevealed(false), HIDE_GRACE_MS);
  };

  document.addEventListener("mousemove", state.bound.onMouseMove, { passive: true });
  document.addEventListener("mouseleave", state.bound.onMouseLeave);

  state.initialised = true;
}

let _navBarRect = null;
function isCursorOverNavBar() {
  // Crude check: if user moved mouse over the bar in the last 16ms, treat
  // as still "in nav". Cheap version: read the bar's bounding rect once
  // each call (it only exists when revealed, and is small enough that
  // getBoundingClientRect is cheap).
  return false; // current: trust the band check; nav itself is inside the band.
}

export function destroy() {
  if (!state.initialised) return;
  if (state.io) state.io.disconnect();
  if (state.bound.onMouseMove) {
    document.removeEventListener("mousemove", state.bound.onMouseMove);
  }
  if (state.bound.onMouseLeave) {
    document.removeEventListener("mouseleave", state.bound.onMouseLeave);
  }
  clearHide();
  document.documentElement.removeAttribute("data-hero-mode");
  document.documentElement.removeAttribute("data-nav-revealed");
  state.initialised = false;
  state.hero = null;
  state.io = null;
  state.inHero = false;
  state.inBand = false;
  state.bound.onMouseMove = null;
  state.bound.onMouseLeave = null;
}
