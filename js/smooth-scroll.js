/**
 * smooth-scroll.js — Lenis smooth-scroll (Constitution §2, §10.3).
 *
 * DESKTOP-ONLY (≥769px) + respects prefers-reduced-motion. Mobile keeps native
 * scroll (§8: mobile fallback; §2 original clause "smooth scroll בדסקטופ בלבד").
 * The mobile experience is a separate page (/mobile/) but loads this same
 * main.js, so the matchMedia gate below is what keeps Lenis off touch.
 *
 * Wiring is the canonical GSAP↔Lenis handshake:
 *   - lenis.on("scroll", ScrollTrigger.update) keeps the hero 500vh scrub +
 *     shabbat pin locked to the smoothed scroll position.
 *   - Lenis is driven by gsap.ticker (single RAF loop, no competing loop).
 * All getBoundingClientRect-based progress readers (scroll-orchestrator,
 * gamosHero, canvas-frame-renderer, side-dot-nav) rely on a `window` "scroll"
 * listener. Lenis 1.3 SUPPRESSES the native scroll event during smooth scroll
 * (it intercepts in capture phase + stopPropagation, re-emitting only its own
 * lenis.on("scroll")). So on every Lenis scroll we re-broadcast a
 * CustomEvent("scroll") — which Lenis does NOT suppress — waking those readers.
 * window.scrollY is already the real (Lenis-driven) value, so their reads are
 * correct. Each reader RAF-throttles internally, so per-frame is fine.
 *
 * MODULES order (main.js): this MUST init before any ScrollTrigger consumer so
 * the ticker/handshake exists before hero-scene/shabbat build + refresh.
 *
 * Exposes:
 *   window.lenis                — stop()/start() hook (js/corridor.js pan lock)
 *   window.gamosSmoothScrollTo  — programmatic anchor scroll (nav modules route
 *                                 through this so GSAP ScrollToPlugin tweens
 *                                 don't fight Lenis). Absent when Lenis is off.
 */

import { prefersReducedMotion } from "./utils/media-query.js";

let lenis = null;

export function init() {
  if (prefersReducedMotion()) return;                       // §8: RM → native
  if (!window.matchMedia("(min-width: 769px)").matches) return; // desktop-only
  if (!window.Lenis || !window.gsap || !window.ScrollTrigger) return;

  lenis = new Lenis({
    duration: 1.0,                                          // subtle/tight
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // exp ease-out
    smoothWheel: true,
    // touch smoothing left at Lenis default (off) — desktop-gated anyway.
  });

  window.lenis = lenis;
  lenis.on("scroll", onLenisScroll);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  // Route programmatic anchor scrolls through Lenis (nav modules prefer this).
  window.gamosSmoothScrollTo = (target, opts) =>
    lenis.scrollTo(target, { duration: 1.0, ...opts });
}

let rebroadcasting = false;
function onLenisScroll() {
  ScrollTrigger.update();
  // Re-broadcast so window "scroll" readers (culinary scrub, gamosHero,
  // orchestrator, side-dot-nav) update — Lenis suppresses the native event but
  // not CustomEvents. See header note. Lenis's own native-scroll listener
  // catches this CustomEvent and re-emits lenis "scroll", re-entering here — the
  // guard breaks that recursion (the re-entrant call still runs ScrollTrigger
  // .update, harmlessly, but does not re-dispatch).
  if (rebroadcasting) return;
  rebroadcasting = true;
  try { window.dispatchEvent(new CustomEvent("scroll")); }
  finally { rebroadcasting = false; }
}

function tick(time) {
  // gsap.ticker time is in seconds; Lenis.raf wants milliseconds.
  if (lenis) lenis.raf(time * 1000);
}

export function destroy() {
  if (window.gsap) gsap.ticker.remove(tick);
  if (lenis) { lenis.destroy(); lenis = null; }
  window.lenis = null;
  window.gamosSmoothScrollTo = null;
}
