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
import * as i18n                from "./i18n.js";           // 2026-07-01 — HE⇄EN switch + geo auto-detect; runs FIRST so dir/lang + nav clone are correct before other modules read them
import * as smoothScroll        from "./smooth-scroll.js";  // 2026-07-01 — Lenis smooth scroll (desktop-only); MUST init before ScrollTrigger consumers
import * as scrollOrchestrator from "./scroll-orchestrator.js";
import * as heroScene           from "./hero-scene.js";     // 2026-06-15 — v10 cinematic scroll-pinned hero (replaces hero-static; that file kept as legacy)
import * as scrollScene         from "./scroll-scene.js";
import * as portals             from "./portals.js";
import * as reveals             from "./reveals.js";
import * as eventsGallery       from "./events-gallery.js"; // 2026-07-13 — #events editorial fixed-preview gallery (DOM+CSS, no WebGL); replaced accordions.js (kept as legacy)
import * as slider              from "./slider.js";
import * as loadingOverlay      from "./loading-overlay.js";
import * as sideDotNav          from "./side-dot-nav.js";
import * as marquee             from "./marquee.js";
import * as counters            from "./counters.js";
import * as contactForm         from "./contact-form.js";   // Agent 23 — Phase D1
import * as siteNav             from "./site-nav.js";       // Agent 23 — Phase D2
import * as scrollytelling      from "./scrollytelling.js"; // 2026-06-01 — GSAP + parallax + loader pct
import * as roomsGallery        from "./rooms-gallery.js";  // #rooms — חדרי נופש gallery (legacy, self-no-ops without [data-rooms-stage])
import * as roomsDoor           from "./rooms-door.js";     // 2026-06-11 — #rooms door-opening transition → /rooms/dist/
import * as loungeSelector      from "./lounge-selector.js";// #lounge — lounge selector
import * as loungeLightbox      from "./lounge-lightbox.js";// 2026-06-15 — #lounge tap → fullscreen viewer (drag still rotates)
import * as galleryMasonry      from "./gallery-masonry.js";  // 2026-07-01 — #gallery row-span masonry (even columns, no ragged gap)
import * as galleryLightbox     from "./gallery-lightbox.js";// 2026-07-01 — #gallery click/tap → fullscreen viewer + mobile swipe (reuses .lounge-lightbox CSS)
import * as siteNavHoverReveal  from "./site-nav-hover-reveal.js"; // 2026-06-04 — hide site-nav while in hero
import * as scrollSpy           from "./scroll-spy.js";     // .site-nav — aria-current scroll-spy
import * as directionsMap      from "./directions-map.js";  // 2026-06-10 — #routes branded Leaflet map + origin tabs
import * as contactMapCue      from "./contact-map-cue.js"; // 2026-06-22 — #contact cue → reveal #routes map (sticky-reveal aware)
import * as interactionHint    from "./interaction-hint.js";// 2026-06-30 — brass affordance cues (drag #lounge / scroll #culinary)
import * as analytics          from "./analytics.js";       // 2026-07-13 — conversion events → window.gamosAnalyticsQueue (no PII, no 3rd-party)
import * as footer             from "./footer.js";          // 2026-07-21 — closing footer back-to-top (Lenis → native fallback)

// Order matters:
// - scroll-orchestrator MUST init before any scene (hero or non-hero) that
//   registers via window.gamosScroll.register(...).
// - hero-scene (v10) builds its own GSAP ScrollTrigger and installs
//   window.gamosHero.onProgress (consumed by portals + side-dot-nav), and wires
//   the #hall-portal EVENTS/RESORT CTAs to the halls sub-apps.
// - scroll-scene auto-discovers other [data-scrub] sections AFTER hero so
//   priority handling and DOM-order tie-breaking are deterministic.
// - portals init waits internally for the hero hook, so its placement here is benign.
// - loading-overlay must init BEFORE portals' first click so window.gamosLoading exists
//   (portals only DISPATCHES events; it doesn't call gamosLoading directly, but having it
//    early also prevents a missed event window).
// - side-dot-nav inits AFTER hero so its hero progress hook attaches cleanly.
const MODULES = [
  ["i18n",                i18n],             // 2026-07-01: HE⇄EN + geo detect. Runs before site-nav so the mobile overlay clones the correct-language link list, and before scene modules so dir/lang is settled
  ["smooth-scroll",       smoothScroll],     // 2026-07-01: Lenis (desktop-only). FIRST — wires gsap.ticker + lenis.on("scroll", ScrollTrigger.update) before hero/scroll-scene build their ScrollTriggers
  ["scroll-orchestrator", scrollOrchestrator],
  ["loading-overlay",     loadingOverlay],   // window.gamosLoading must be ready before hero hotspot clicks
  ["hero-scene",          heroScene],        // 2026-06-15: v10 scroll hero — GSAP timeline + gamosHero progress stub (over 500vh) + #hall-portal CTA routing
  ["site-nav-hover-reveal", siteNavHoverReveal], // 2026-06-04: hide site-nav while in hero (revealed only on cursor in top band)
  ["scroll-scene",        scrollScene],
  ["portals",             portals],
  ["side-dot-nav",        sideDotNav],
  ["gallery-masonry",     galleryMasonry], // #gallery — row-span masonry sizing (before reveals so spans are set first)
  ["reveals",             reveals],
  ["events-gallery",      eventsGallery], // 2026-07-13: #events fixed-preview gallery (DOM+CSS; after reveals so the DOM is settled)
  ["directions-map",      directionsMap], // 2026-06-10: #routes Leaflet map (after reveals so [data-reveal] is set up)
  ["contact-map-cue",     contactMapCue], // 2026-06-22: #contact scroll-cue → reveal the #routes map (both desktop + mobile)
  ["slider",              slider],
  ["marquee",             marquee],       // Agent 20 — weblove-motion marquee bands
  ["counters",            counters],      // Agent 20 — animated stat numbers
  ["contact-form",        contactForm],   // Agent 23 — Phase D1: WhatsApp + mailto
  ["site-nav",            siteNav],       // Agent 23 — Phase D2: hamburger overlay
  ["scrollytelling",      scrollytelling],// Cinematic loader % + GSAP scroll-to + parallax
  ["rooms-gallery",       roomsGallery],  // #rooms — חדרי נופש gallery (legacy, self-no-ops)
  ["rooms-door",          roomsDoor],     // #rooms — door-opening transition → /rooms/dist/
  ["lounge-selector",     loungeSelector],// #lounge — lounge selector
  ["lounge-lightbox",     loungeLightbox],// #lounge — tap → fullscreen viewer (after selector; shares the stage's pointer events)
  ["gallery-lightbox",    galleryLightbox],// #gallery — click/tap → fullscreen viewer + mobile swipe
  ["scroll-spy",          scrollSpy],     // .site-nav — aria-current highlighting
  ["interaction-hint",    interactionHint],// brass drag/scroll affordance cues (after the sections they annotate exist)
  ["footer",              footer],        // 2026-07-21: closing footer back-to-top (binds [data-footer-totop])
  ["analytics",           analytics],     // 2026-07-13: conversion pass — LAST (observes; must never affect the modules above)
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
