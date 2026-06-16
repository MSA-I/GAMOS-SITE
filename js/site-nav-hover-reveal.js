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

const HERO_SELECTOR    = "#hero";   // class-agnostic — the rebuilt hero is #hero.hero_root
const REVEAL_BAND_VH   = 14;           // top 14% of viewport reveals the bar
const HIDE_GRACE_MS    = 220;          // small grace period before re-hiding

// Touch devices have no hover affordance, so the cursor-band reveal never
// fires — the hamburger (which lives INSIDE the hidden .site-nav) would be
// unreachable while in the hero. On such devices we keep the bar REVEALED
// throughout hero-mode so the toggle is always tappable. Desktop (fine pointer)
// keeps the hover-reveal behaviour. (§9 keyboard/touch reachability; §13 rule 8
// — equivalent experience on touch, not a degraded one.)
const isTouch = typeof window !== "undefined"
  && window.matchMedia
  && window.matchMedia("(hover: none)").matches;

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
  // On touch, mirror reveal to hero-mode so the hamburger is always reachable
  // (no mousemove will ever reveal it). On desktop, leave reveal to the cursor.
  if (isTouch) {
    setRevealed(!!value);
  } else if (!value) {
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

  // index.html ships a static `data-hero-mode="true"` on <html> so the nav
  // paints already-hidden — no first-paint flash (no visible→hidden transition).
  // Sync our state flag to that painted seed so the IntersectionObserver becomes
  // the single owner WITHOUT a transient removeAttribute (which would briefly
  // re-show the nav before the first async IO callback fires). With inHero=true:
  //   • hero visible at boot (normal) → setHeroMode(true) is a no-op → attribute
  //     stays "true", nav stays hidden, zero flash.
  //   • loaded scrolled past the hero → setHeroMode(false) writes "false" → nav
  //     reverts to its native sticky bar. Correct either way.
  state.inHero = document.documentElement.getAttribute("data-hero-mode") === "true";

  // On touch we mirror reveal→hero-mode inside setHeroMode, but the first IO
  // callback (visible===true) early-returns because inHero is already true, so
  // setRevealed would never run. Seed the reveal here so the hamburger is
  // tappable from the first frame on touch.
  if (isTouch && state.inHero) setRevealed(true);

  // hero-mode is active while the hero still OWNS the viewport, i.e. its 100vh
  // sticky pin is filling the screen (top has reached/passed the viewport top
  // AND its bottom is still below the fold). Once the user scrolls past the
  // 500vh track, the native sticky bar takes over.
  //
  // NOTE: an intersectionRatio threshold is WRONG here — the hero is 500vh, so
  // even pinned-and-filling it only ever intersects ~innerHeight/offsetHeight
  // (~20%) of its own box; a `ratio > 0.30` test (the old code) was NEVER true,
  // so hero-mode stayed off and the nav was never hidden. We test the hero's
  // top/bottom rect against the viewport directly instead. The observer just
  // wakes us on the relevant boundary crossings; the rect read is the source of
  // truth, so we also recompute on scroll.
  const evalHeroMode = () => {
    const r = state.hero.getBoundingClientRect();
    const vh = window.innerHeight || 1;
    // pinned-and-filling: top at/above 0, bottom still past the last screen.
    setHeroMode(r.top <= 1 && r.bottom > vh);
  };
  state.io = new IntersectionObserver(() => evalHeroMode(), {
    threshold: [0, 0.05, 0.3, 0.6, 1],
  });
  state.io.observe(hero);
  // The IO fires on threshold crossings only; while pinned, the ratio barely
  // changes, so also re-evaluate on scroll (cheap rect read, rAF-throttled).
  state.bound.onScroll = () => {
    if (state._navTick) return;
    state._navTick = true;
    requestAnimationFrame(() => { state._navTick = false; evalHeroMode(); });
  };
  window.addEventListener("scroll", state.bound.onScroll, { passive: true });
  evalHeroMode();

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

  // Cursor tracking only matters with a fine pointer. On touch the bar is
  // already reveal-pinned by setHeroMode, so skip the listeners entirely.
  if (!isTouch) {
    document.addEventListener("mousemove", state.bound.onMouseMove, { passive: true });
    document.addEventListener("mouseleave", state.bound.onMouseLeave);
  }

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
  if (state.bound.onScroll) {
    window.removeEventListener("scroll", state.bound.onScroll);
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
  state.bound.onScroll = null;
}
