/**
 * GAMOS-SITE — main entry shell
 *
 * Constitution §10.3: JS is module-scoped. ESM modules with `init(el)` + `destroy()`.
 * No globals. Each section module exports an `init()` function that's safe to call
 * even if the DOM nodes are missing (so this entry never throws).
 *
 * Phase A complete (2026-06-01, Agent 15): GSAP fully removed.
 *   - hero-video-scrub uses native scroll listener + RAF.
 *   - portals uses Web Animations API (Element.animate) for the expand timeline.
 *   - This entry boots without any external CDN imports — pure local ESM + DOM.
 */

// Section modules — placeholder shells. Each exposes `init()`.
import * as scrollOrchestrator from "./scroll-orchestrator.js";
import * as heroShader          from "./hero-shader.js";    // 2026-06-04 — Three.js WebGL hero
import * as scrollScene         from "./scroll-scene.js";
import * as heroVideoScrub      from "./hero-video-scrub.js";
import * as portals             from "./portals.js";
import * as reveals             from "./reveals.js";
import * as accordions          from "./accordions.js";
import * as slider              from "./slider.js";
import * as lenis               from "./lenis.js";
import * as loadingOverlay      from "./loading-overlay.js";
import * as sideDotNav          from "./side-dot-nav.js";
import * as marquee             from "./marquee.js";
import * as counters            from "./counters.js";
import * as contactForm         from "./contact-form.js";   // Agent 23 — Phase D1
import * as siteNav             from "./site-nav.js";       // Agent 23 — Phase D2
import * as scrollytelling      from "./scrollytelling.js"; // 2026-06-01 — GSAP + parallax + loader pct
import * as roomsGallery        from "./rooms-gallery.js";  // #rooms — חדרי נופש gallery
import * as loungeSelector      from "./lounge-selector.js";// #lounge — lounge selector
import * as corridor            from "./corridor.js";       // 2026-06-04 — corridor halls
import * as projectDrawer       from "./project-drawer.js"; // 2026-06-04 — ProjectDetail side panel
import * as siteNavHoverReveal  from "./site-nav-hover-reveal.js"; // 2026-06-04 — hide site-nav while in hero
import * as scrollSpy           from "./scroll-spy.js";     // .site-nav — aria-current scroll-spy
import * as shabbatParallax    from "./shabbat-parallax.js";// 2026-06-04 — #shabbat-chatan vertical parallax column

// Order matters:
// - scroll-orchestrator MUST init before any scene (hero or non-hero) that
//   registers via window.gamosScroll.register(...).
// - hero-video-scrub registers itself with the orchestrator and installs
//   window.gamosHero.onProgress (consumed by portals + side-dot-nav).
// - scroll-scene auto-discovers other [data-scrub] sections AFTER hero so
//   priority handling and DOM-order tie-breaking are deterministic.
// - portals init waits internally for the hero hook, so its placement here is benign.
// - loading-overlay must init BEFORE portals' first click so window.gamosLoading exists
//   (portals only DISPATCHES events; it doesn't call gamosLoading directly, but having it
//    early also prevents a missed event window).
// - side-dot-nav inits AFTER hero so its hero progress hook attaches cleanly.
const MODULES = [
  ["lenis",               lenis],
  ["scroll-orchestrator", scrollOrchestrator],
  ["loading-overlay",     loadingOverlay],   // moved earlier so window.gamosLoading is ready before hero-shader click handlers
  ["hero-shader",         heroShader],       // 2026-06-04: must precede side-dot-nav so gamosHero stub releases the dominance gate
  ["hero-video-scrub",    heroVideoScrub],   // legacy hero (no-op when #hero is the new shader hero)
  ["corridor",            corridor],         // 2026-06-04: scroll-driven 3D corridor + window.gamosCorridor + window.gamosHeroToGallery
  ["project-drawer",      projectDrawer],    // 2026-06-04: window.gamosProjectDrawer.open(id) — must follow corridor so card-click can call it
  ["site-nav-hover-reveal", siteNavHoverReveal], // 2026-06-04: hide site-nav while in hero (revealed only on cursor in top band)
  ["shabbat-parallax",    shabbatParallax],  // 2026-06-04: must precede scroll-scene so window.gamosShabbat is resolved at custom-mode binding time
  ["scroll-scene",        scrollScene],
  ["portals",             portals],
  ["side-dot-nav",        sideDotNav],
  ["reveals",             reveals],
  ["accordions",          accordions],
  ["slider",              slider],
  ["marquee",             marquee],       // Agent 20 — weblove-motion marquee bands
  ["counters",            counters],      // Agent 20 — animated stat numbers
  ["contact-form",        contactForm],   // Agent 23 — Phase D1: WhatsApp + mailto
  ["site-nav",            siteNav],       // Agent 23 — Phase D2: hamburger overlay
  ["scrollytelling",      scrollytelling],// Cinematic loader % + GSAP scroll-to + parallax
  ["rooms-gallery",       roomsGallery],  // #rooms — חדרי נופש gallery
  ["lounge-selector",     loungeSelector],// #lounge — lounge selector
  ["scroll-spy",          scrollSpy],     // .site-nav — aria-current highlighting
];

function safeInit(name, mod) {
  try {
    if (mod && typeof mod.init === "function") {
      mod.init();
    } else {
      console.info(`[main] module "${name}" has no init() — skipping.`);
    }
  } catch (err) {
    // Intentionally swallow: a single broken module must not break the page.
    console.error(`[main] module "${name}" init failed:`, err);
  }
}

function bootstrap() {
  for (const [name, mod] of MODULES) {
    safeInit(name, mod);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
