/**
 * contact-map-cue.js — make the #contact "scroll to the arrival map" cue
 * actually reveal the #routes map (2026-06-22).
 *
 * Problem: #contact and #routes are a sticky-reveal pair — #routes is
 * position:sticky bottom:0 (z-index:0) and #contact sits opaque on top
 * (z-index:1), occluding it until the user scrolls #contact up. A native
 * `href="#routes"` jump lands on #routes' IN-FLOW position, which is still
 * hidden behind #contact, so the click appears to do nothing.
 *
 * Fix: intercept the click and smooth-scroll to the END of the .reveal-pair
 * wrapper — the scroll position where #contact has fully slid up and #routes
 * fills the viewport. Works identically on desktop and mobile (one index.html).
 * Falls back to the native href if the expected structure is missing.
 *
 * §10.3 module-scoped state, init()/destroy() contract. §9: moves focus to the
 * revealed map region. Honours prefers-reduced-motion (instant jump).
 */

const CUE_SELECTOR = ".contact__scroll-cue";

const state = { el: null, handler: null };

export function init() {
  if (typeof document === "undefined") return;
  const el = document.querySelector(CUE_SELECTOR);
  if (!el) return;

  const pair = el.closest(".reveal-pair");
  const routes = document.querySelector("#routes");
  if (!pair || !routes) return; // structure changed — keep the native href jump

  state.el = el;
  state.handler = (event) => {
    event.preventDefault();
    const reduce = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // End of the reveal-pair: #contact fully scrolled out, #routes filling view.
    const rect = pair.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset || 0;
    const target = Math.max(0, Math.round(scrollY + rect.bottom - window.innerHeight));

    window.scrollTo({ top: target, behavior: reduce ? "auto" : "smooth" });

    // a11y: move focus to the revealed map region without re-jumping the page.
    routes.setAttribute("tabindex", "-1");
    setTimeout(() => {
      try { routes.focus({ preventScroll: true }); } catch { /* ignore */ }
    }, reduce ? 0 : 600);
  };
  el.addEventListener("click", state.handler);
}

export function destroy() {
  if (state.el && state.handler) {
    state.el.removeEventListener("click", state.handler);
  }
  state.el = null;
  state.handler = null;
}
