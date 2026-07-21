/**
 * footer.js — back-to-top control for the closing <footer> (2026-07-21).
 *
 * Constitution §2 (Lenis smooth-scroll is the desktop scroll driver), §10.3
 * (ESM module-scoped init()/destroy(), no globals). Idempotent.
 *
 * The site already has a document-level `[data-scroll-to-top]` handler in
 * js/scrollytelling.js, but it is registered INSIDE scrollytelling.init(),
 * which returns early on desktop + prefers-reduced-motion — so that path
 * would leave the footer control dead for exactly the users who rely on it.
 * This dedicated module owns `[data-footer-totop]` unconditionally.
 *
 * Behaviour (matches the brief): scroll to #hero via window.gamosSmoothScrollTo
 * when Lenis is active (desktop, motion allowed), else native smooth scroll —
 * and an instant jump under prefers-reduced-motion. The control is a <button>,
 * so it is keyboard-operable (Enter/Space) for free; the ≥44px hit area + the
 * two-tone focus ring come from the CSS/base layer.
 */

let btn = null;
let onClick = null;

function scrollToTop() {
  const hero = document.getElementById("hero");
  // Lenis (desktop, motion on): route through the same hook the nav uses so
  // GSAP ScrollToPlugin never fights Lenis. Target the #hero element (== page
  // top); fall back to 0 if the section id ever moves.
  if (typeof window.gamosSmoothScrollTo === "function") {
    window.gamosSmoothScrollTo(hero || 0, { duration: 1.0 });
    return;
  }
  // Native fallback (mobile / Lenis off). Respect reduced motion: no animation.
  const reduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = reduced ? "auto" : "smooth";
  if (hero && typeof hero.scrollIntoView === "function") {
    hero.scrollIntoView({ behavior, block: "start" });
  } else {
    window.scrollTo({ top: 0, behavior });
  }
}

export function init() {
  if (typeof document === "undefined") return;
  btn = document.querySelector("[data-footer-totop]");
  if (!btn) return;                    // footer absent (e.g. /press/) — no-op
  onClick = (event) => {
    event.preventDefault();
    scrollToTop();
  };
  btn.addEventListener("click", onClick);
}

export function destroy() {
  if (btn && onClick) btn.removeEventListener("click", onClick);
  btn = null;
  onClick = null;
}

export default { init, destroy };
