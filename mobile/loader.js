/* =============================================================================
   mobile/loader.js — single-file bootstrap for the mobile pass
   ---------------------------------------------------------------------------
   This file is the ONLY entry point that the main site needs to know about.
   /index.html includes ONE line:

       <script src="/mobile/loader.js" defer></script>

   …and everything else (CSS link tags, font preloads, picture half.webp
   sources, hero CTA pill labels, culinary mobile manifest swap) is set up
   by this loader at runtime, against the existing DOM.

   Why this design
   ---------------
   The mobile pass lives entirely under /mobile/ so it can be merged to
   main without touching unrelated files. An earlier draft edited
   index.html in 7 places (link tags, source tags, span labels,
   data-attributes, font preloads), edited js/main.js (2 imports + 2
   MODULES entries), and edited js/lounge-selector.js (2 exported hooks).
   That made the diff against main noisy and made cherry-picking a single
   mobile change painful.

   This loader replaces all of that with one <script> tag. Anyone who wants
   to remove the mobile pass deletes the /mobile/ folder + that one line.
   No other footprint anywhere.

   Order of operations (synchronous + idempotent)
   ----------------------------------------------
   1. Inject <link> tags for every /mobile/css/*.css file into <head>.
      Loaded AFTER all desktop CSS already in <head>, so cascade tie-breaks
      go to the mobile rules without needing !important spam.
   2. Inject the Heebo-400 font preload (was a CLS risk on Slow 4G).
   3. Walk every <picture> in <main> and insert a
        <source media="(max-width: 768px)" srcset="…half.webp">
      before each existing full.webp <source>. Halves mobile image payload.
   4. Append a <span class="hero-static__cta-label"> to each of the
      events/resort hero CTAs carrying the Hebrew label "אירועים" /
      "ריזורט". Visually hidden on desktop via a single inline rule we
      also inject; surfaces as a brass pill button at ≤768px via
      /mobile/css/hero-static.css.
   5. Add data-manifest-url-mobile attribute to the culinary scrub canvas.
      Then on ≤768px, rewrite data-manifest-url to point at the mobile
      manifest BEFORE js/scroll-scene.js fetches it.
   6. Inject transparent ≥48px tap overlays over the hero EVENTS/RESORT bands
      (above the desert layer) that forward the tap to the real CTA anchors —
      so the real desktop hero composition is shown on phones with finger-sized
      touch targets (2026-06-11 mobile-fidelity pass).

   No globals are leaked. No exports — this is a side-effect script.
   ========================================================================= */

(function mobileLoader () {
  "use strict";

  // ---------------------------------------------------------------------------
  // 1. CSS link tags
  // ---------------------------------------------------------------------------
  // These files contain `@media (max-width: …)` rules ONLY (per the §13
  // convention in /mobile/README.md). They're harmless on desktop — the
  // rules just don't fire.
  const MOBILE_CSS = [
    "/mobile/css/lounge.css",
    "/mobile/css/culinary.css",
    "/mobile/css/hero-scene.css",   // 2026-06-15: v10 scroll hero (replaces hero-static.css; that file kept as legacy)
    "/mobile/css/responsive-images.css",
    "/mobile/css/touch-targets.css",
    "/mobile/css/headings.css",
    "/mobile/css/directions.css",
    "/mobile/css/testimonials.css",
    "/mobile/css/interaction-hint.css", // 2026-06-30: phone tuning for brass affordance cues
    "/mobile/css/lang-switch.css",       // 2026-07-01: always-visible language FAB before nav reveals
    "/mobile/css/buttons.css",           // 2026-07-02: wrap long EN/FR CTAs so they don't clip off-screen
    "/mobile/css/why-gamos.css",         // 2026-07-13: conversion pass — trust section fit ≤768px
    "/mobile/css/cta-bar.css",           // 2026-07-13: conversion pass — fixed bottom action bar
    "/mobile/css/events.css",            // 2026-07-13: #events hover-list gallery — phone layout (scroll-driven activation lives in js/events-gallery.js)
    "/mobile/css/site-footer.css",       // 2026-07-21: closing footer — narrow stack + CTA-bar clearance
  ];

  function injectStylesheets () {
    const head = document.head;
    if (!head) return;
    for (const href of MOBILE_CSS) {
      // Idempotent — don't double-inject if loader runs twice.
      if (head.querySelector('link[rel="stylesheet"][href="' + href + '"]')) continue;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      head.appendChild(link);
    }
  }

  // ---------------------------------------------------------------------------
  // 2. Heebo font preload
  // ---------------------------------------------------------------------------
  function injectFontPreload () {
    const head = document.head;
    if (!head) return;
    const href = "/assets/fonts/heebo-400.woff2";
    if (head.querySelector('link[rel="preload"][href="' + href + '"]')) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "font";
    link.type = "font/woff2";
    link.crossOrigin = "anonymous";
    link.href = href;
    head.appendChild(link);
  }

  // ---------------------------------------------------------------------------
  // 3. Responsive <picture> sources
  // ---------------------------------------------------------------------------
  // For every <picture> that contains a <source srcset="…full.webp">, insert
  // a half.webp source above it gated by `media="(max-width: 768px)"`. Skips
  // sources that already have a media attribute (hero already uses srcset+sizes).
  function injectHalfSources () {
    const sources = document.querySelectorAll(
      'picture > source[type="image/webp"]'
    );
    for (const src of sources) {
      // Already has a media query → leave it alone (hero base/desert use sizes).
      if (src.hasAttribute("media")) continue;
      const ss = (src.getAttribute("srcset") || "").trim();
      // Only act on simple single-URL srcset values pointing to .full.webp.
      if (!/^\/assets\/images\/[^"\s,]+\.full\.webp$/.test(ss)) continue;
      const halfUrl = ss.replace(/\.full\.webp$/, ".half.webp");
      // Idempotent — skip if a previous loader run already added the half.
      const prev = src.previousElementSibling;
      if (prev && prev.tagName === "SOURCE" &&
          (prev.getAttribute("srcset") || "").includes(halfUrl)) continue;
      const halfSource = document.createElement("source");
      halfSource.setAttribute("type", "image/webp");
      halfSource.setAttribute("media", "(max-width: 768px)");
      halfSource.setAttribute("srcset", halfUrl);
      src.parentNode.insertBefore(halfSource, src);
    }
  }

  // ---------------------------------------------------------------------------
  // 4. Hero CTA sr-only labels  (2026-06-11 mobile-fidelity pass)
  // ---------------------------------------------------------------------------
  // The mobile hero now renders the IDENTICAL desktop 5-layer composition (the
  // real EVENTS / RESORT bitmaps stay visible — no pills). We still append a
  // <span class="hero-static__cta-label"> as a sr-only accessible label; the
  // inline default rule below keeps it clipped on EVERY viewport (it is NOT a
  // visible pill anymore). The actual finger-sized touch targets are the
  // transparent overlays injected by injectHeroTapZones() (step 6).
  function injectCtaLabels () {
    const pairs = [
      [".hero-static__layer--events", "אירועים"],
      [".hero-static__layer--resort", "ריזורט"],
    ];
    for (const pair of pairs) {
      const a = document.querySelector(pair[0]);
      if (!a) continue;
      // Idempotent.
      if (a.querySelector(".hero-static__cta-label")) continue;
      const span = document.createElement("span");
      span.className = "hero-static__cta-label";
      span.setAttribute("aria-hidden", "true");
      span.textContent = pair[1];
      a.appendChild(span);
    }

    // Inject the visually-hidden default rule so desktop never paints the
    // span. The mobile pass overrides it inside @media (max-width: 768px).
    // Done as a <style> tag (not a CSS file) because it pairs tightly with
    // the DOM injection above — keeping them together avoids "loader
    // added the span but nobody hid it on desktop" footguns.
    if (!document.getElementById("mobile-loader-cta-default")) {
      const style = document.createElement("style");
      style.id = "mobile-loader-cta-default";
      style.textContent =
        ".hero-static__cta-label{position:absolute;width:1px;height:1px;" +
        "padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);" +
        "white-space:nowrap;border:0;}";
      document.head.appendChild(style);
    }
  }

  // ---------------------------------------------------------------------------
  // 5. Culinary mobile manifest swap
  // ---------------------------------------------------------------------------
  // The desktop scrub frames are 4K (~200MB). On phones we serve a 960px
  // /assets/frames/culinary-mobile/ set (~13MB). The user must run
  // `node mobile/scripts/encode-frames-mobile.mjs` once to populate that
  // directory; until then the canvas falls back to the poster.
  //
  // Strategy: tag the canvas with data-manifest-url-mobile (so the desktop
  // attribute stays as the canonical source), then on ≤768px swap the live
  // data-manifest-url BEFORE js/scroll-scene.js reads it. Because this
  // loader runs from a `defer` <script> in <head>, it executes after HTML
  // parse but before DOMContentLoaded fires — and js/main.js (also defer)
  // queues its DOMContentLoaded listener after this script's, so the swap
  // wins the race.
  function setupCulinaryMobileManifest () {
    const canvas = document.querySelector(".culinary canvas[data-manifest-url]");
    if (!canvas) return;
    const desktopUrl = canvas.dataset.manifestUrl;
    const mobileUrl = "/assets/frames/culinary-mobile/manifest.json";
    if (!canvas.dataset.manifestUrlMobile) {
      canvas.dataset.manifestUrlMobile = mobileUrl;
    }
    if (typeof window.matchMedia === "function" &&
        window.matchMedia("(max-width: 768px)").matches) {
      canvas.dataset.manifestUrl = canvas.dataset.manifestUrlMobile;
      // Lift the drawn frame upward so the plated dish (lower in the frame)
      // rises toward screen centre on a tall phone instead of sitting
      // bottom-cropped. canvas-frame-renderer reads data-scrub-voffset as a
      // fraction of canvas height; negative = up. Desktop has no dataset →
      // verticalOffset 0 → pure-centre, byte-identical. (2026-06-22)
      canvas.dataset.scrubVoffset = "-0.13";
    } else {
      canvas.dataset.manifestUrl = desktopUrl;
    }
  }

  // ---------------------------------------------------------------------------
  // Boot sequence
  // ---------------------------------------------------------------------------
  // CSS injection runs synchronously at <head> parse time (right after this
  // script executes) so that mobile rules are loaded before first paint.
  // DOM-mutation steps wait for DOMContentLoaded so the elements they patch
  // exist. The canvas manifest swap also waits, but runs BEFORE main.js's
  // bootstrap (which fires inside DOMContentLoaded too — order within
  // listeners is registration order, and this script is loaded earlier in
  // <head> than /js/main.js so its listener queues first).

  injectStylesheets();
  injectFontPreload();

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", domReady, { once: true });
  } else {
    domReady();
  }
  // ---------------------------------------------------------------------------
  // 7a. Language FAB  (2026-07-01)
  // ---------------------------------------------------------------------------
  // The navbar is hidden on page load (data-hero-mode) and only reveals after
  // scroll, taking the language toggle with it. Inject a fixed FAB so HE⇄EN
  // is reachable immediately. Uses the same .site-nav__lang markup so
  // js/i18n.js updateToggles() targets it via .site-nav__lang [data-lang-set].
  // The delegated click listener in i18n.js covers the whole document, so no
  // extra wiring is needed. FAB hides once html[data-nav-revealed] is set
  // (via /mobile/css/lang-switch.css).
  function buildLangGroupHTML () {
    var GLOBE_SVG =
      '<svg class="site-nav__lang-globe" viewBox="0 0 24 24" width="15" height="15"' +
      ' fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>' +
      '<path d="M12 3c2.6 2.6 3.9 5.8 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.8-3.9-9S9.4 5.6 12 3z"/></svg>';
    var lang = document.documentElement.lang || "he";
    var heActive = lang === "he";
    var enActive = lang === "en";
    var frActive = lang === "fr";
    return (
      '<div class="site-nav__lang" role="group" aria-label="Language \u00b7 \u05e9\u05e4\u05d4">' +
      GLOBE_SVG +
      '<button type="button" class="site-nav__lang-opt' + (heActive ? " is-active" : "") +
      '" data-lang-set="he" lang="he" aria-pressed="' + heActive + '">\u05e2\u05d1</button>' +
      '<span class="site-nav__lang-sep" aria-hidden="true"></span>' +
      '<button type="button" class="site-nav__lang-opt' + (enActive ? " is-active" : "") +
      '" data-lang-set="en" lang="en" aria-pressed="' + enActive + '">EN</button>' +
      '<span class="site-nav__lang-sep" aria-hidden="true"></span>' +
      '<button type="button" class="site-nav__lang-opt' + (frActive ? " is-active" : "") +
      '" data-lang-set="fr" lang="fr" aria-pressed="' + frActive + '">FR</button>' +
      "</div>"
    );
  }

  function injectLangFab () {
    if (typeof window.matchMedia === "function" &&
        !window.matchMedia("(max-width: 768px)").matches) return;
    if (document.querySelector(".mobile-lang-fab")) return;
    var fab = document.createElement("div");
    fab.className = "mobile-lang-fab";
    fab.innerHTML = buildLangGroupHTML();
    document.body.appendChild(fab);
  }

  // ---------------------------------------------------------------------------
  // 7c. Language toggle IN the navbar  (2026-07-13, user request: "\u05d1\u05de\u05d5\u05d1\u05d9\u05d9\u05dc \u05ea\u05de\u05d9\u05d3
  // \u05e6\u05e8\u05d9\u05da \u05e9\u05ea\u05d4\u05d9\u05d4 \u05d0\u05e4\u05e9\u05e8\u05d5\u05ea \u05dc\u05d4\u05d7\u05dc\u05e4\u05ea \u05e9\u05e4\u05d5\u05ea \u05d1-NAVBAR")
  // ---------------------------------------------------------------------------
  // The desktop bar carries the lang toggle as the last .site-nav__links <li>,
  // but that list is display:none \u2264768px \u2014 so once the navbar reveals (and the
  // FAB hides via lang-switch.css) the phone had NO visible switch. Inject a
  // second .site-nav__lang group directly into .site-nav__inner, between the
  // brand and the hamburger. js/i18n.js updates ALL .site-nav__lang groups and
  // its click handling is document-delegated \u2014 zero extra wiring. Styled by
  // mobile/css/lang-switch.css (\u00a713).
  function injectNavbarLang () {
    if (typeof window.matchMedia === "function" &&
        !window.matchMedia("(max-width: 768px)").matches) return;
    var inner = document.querySelector(".site-nav__inner");
    if (!inner || inner.querySelector(".site-nav__lang--bar")) return;
    var holder = document.createElement("div");
    holder.className = "site-nav__lang-bar-slot";
    holder.innerHTML = buildLangGroupHTML();
    holder.firstChild.classList.add("site-nav__lang--bar");
    var toggleBtn = inner.querySelector(".site-nav__toggle");
    if (toggleBtn) inner.insertBefore(holder, toggleBtn);
    else inner.appendChild(holder);
  }

  // ---------------------------------------------------------------------------
  // 7b. Fixed bottom CTA bar  (2026-07-13, conversion pass)
  // ---------------------------------------------------------------------------
  // Marketing critique: conversion lived only in section 13/14 — phones need an
  // always-available action bar. Three ≥44px targets: phone · WhatsApp · book-
  // a-tour (#contact, the primary). Injected BEFORE main.js bootstrap (this
  // script's DOMContentLoaded listener queues first), so js/i18n.js translates
  // the labels and js/scrollytelling.js binds the #contact anchor for free.
  // Styled by /mobile/css/cta-bar.css (§13: media-query rules only).
  function injectCtaBar () {
    if (typeof window.matchMedia === "function" &&
        !window.matchMedia("(max-width: 768px)").matches) return;
    if (document.querySelector(".mobile-cta-bar")) return;
    var PHONE_SVG =
      '<span class="mobile-cta-bar__icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.9.7a2 2 0 0 1 1.6 2z"/></svg></span>';
    var WA_SVG =
      '<span class="mobile-cta-bar__icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.2-5.4A8.5 8.5 0 1 1 21 11.5z"/>' +
      '<path d="M9 9.5c.5 2.5 3 5 5.5 5.5l1-1.5-2-1-1 .5c-.8-.5-1.5-1.2-2-2l.5-1-1-2z"/></svg></span>';
    var TOUR_SVG =
      '<span class="mobile-cta-bar__icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">' +
      '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>' +
      '<path d="M9.5 15.5l2 2 3.5-3.5"/></svg></span>';
    var WA_HREF = "https://wa.me/972779972343?text=" +
      "%D7%A9%D7%9C%D7%95%D7%9D%2C%20%D7%90%D7%A0%D7%99%20%D7%9E%D7%A2%D7%95%D7%A0%D7%99%D7%99%D7%9F%2F%D7%AA%20" +
      "%D7%9C%D7%A7%D7%91%D7%9C%20%D7%A4%D7%A8%D7%98%D7%99%D7%9D%20%D7%A2%D7%9C%20%D7%90%D7%99%D7%A8%D7%95%D7%A2%20" +
      "%D7%91%D7%92%D7%90%D7%9E%D7%95%D7%A1.";
    var bar = document.createElement("nav");
    bar.className = "mobile-cta-bar";
    bar.setAttribute("aria-label", "פעולות מהירות");
    bar.innerHTML =
      '<a class="mobile-cta-bar__action" href="tel:+972779972343" data-cta="bar-phone">' +
      PHONE_SVG + "<span>שיחה</span></a>" +
      '<a class="mobile-cta-bar__action mobile-cta-bar__action--primary" href="#contact" data-cta="bar-tour">' +
      TOUR_SVG + "<span>תיאום סיור</span></a>" +
      '<a class="mobile-cta-bar__action" href="' + WA_HREF + '" target="_blank" rel="noopener noreferrer" data-cta="bar-whatsapp">' +
      WA_SVG + "<span>וואטסאפ</span></a>";
    document.body.appendChild(bar);
  }

  function domReady () {
    injectHalfSources();
    applyMobileRoutes();   // rewrites #hall-portal CTA hrefs → -mobile sub-app builds
    setupCulinaryMobileManifest();
    injectCtaBar();        // fixed bottom conversion bar (before FAB, before main.js)
    injectLangFab();       // always-visible language toggle before navbar reveals
    injectNavbarLang();    // 2026-07-13: lang toggle inside the navbar itself
    // injectCtaLabels() + injectHeroTapZones() retired 2026-06-15: the v10 hero
    // CTAs live in the #hall-portal composer as visible, finger-sized anchors
    // (clamp() widths, no occluding desert layer) — no tap-zone overlays or
    // sr-only pill labels needed. The functions are kept below (self-no-op on
    // the absent .hero-static__* selectors) for a clean revert to the legacy hero.
  }

  // ---------------------------------------------------------------------------
  // 7. Route phones to the mobile sub-app builds  (2026-06-11)
  // ---------------------------------------------------------------------------
  // The external React sub-apps now have dedicated phone builds whose chrome is
  // re-laid-out for small screens (same WebGL): /halls/dist/events-mobile/,
  // /halls/dist/resort-mobile/, /rooms/dist/mobile/. On ≤768px we rewrite the
  // hard-coded desktop hrefs IN PLACE so the phone lands on the mobile build:
  //   - the real hero EVENTS/RESORT anchors → -mobile (injectHeroTapZones runs
  //     AFTER this and clones the already-rewritten href onto its overlay, so the
  //     forwarded real.click() navigates to the mobile build);
  //   - #rooms-door's href → /rooms/dist/mobile/ (js/rooms-door.js reads
  //     link.href at click time, so it picks this up with no edit to that file).
  // Desktop (≥769px) is untouched — the index.html hrefs stay desktop. This is
  // the SINGLE place the phone-routing decision lives (§13 self-contained).
  function applyMobileRoutes () {
    if (typeof window.matchMedia !== "function" ||
        !window.matchMedia("(max-width: 768px)").matches) {
      return;
    }
    const rewrites = [
      // 2026-06-15: hero CTAs live in the #hall-portal composer (.gamos-hero, the
      // verbatim sandbox class names of the rebuilt scroll hero).
      ['.gamos-hero__cta--events', "/halls/dist/events/", "/halls/dist/events-mobile/"],
      ['.gamos-hero__cta--resort', "/halls/dist/resort/", "/halls/dist/resort-mobile/"],
      ['#rooms-door',              "/rooms/dist/",        "/rooms/dist/mobile/"],
    ];
    for (const [sel, fromHref, toHref] of rewrites) {
      const el = document.querySelector(sel);
      if (!el) continue;
      const cur = el.getAttribute("href");
      // Idempotent + exact-match only (don't double-rewrite or touch already-mobile).
      if (cur === fromHref) el.setAttribute("href", toHref);
    }
  }

  // ---------------------------------------------------------------------------
  // 6. Hero tap overlays  (2026-06-11 mobile-fidelity pass)
  // ---------------------------------------------------------------------------
  // The mobile hero shows the real EVENTS / RESORT bitmaps (decorative
  // typography) which the desert silhouette (z10) partly paints over — so the
  // visible tappable area of each real <a> is small/ambiguous on a phone. We
  // inject a transparent ≥48px overlay <a> over each CTA band, ABOVE the
  // desert (z=15, styled in /mobile/css/hero-static.css under @media ≤768px so
  // it has no footprint on desktop). The overlay carries the real href (no-JS
  // fallback) and forwards the tap to the real anchor via realAnchor.click(),
  // so js/hero-static.js's bound [data-hero-link] whoosh + loading-overlay
  // flourish fires IDENTICALLY. /mobile/ DOM mutation — §13 compliant.
  function injectHeroTapZones () {
    const pin = document.querySelector(".hero-static__pin");
    if (!pin) return;
    const pairs = [
      [".hero-static__layer--events", "events"],
      [".hero-static__layer--resort", "resort"],
    ];
    for (const [sel, mod] of pairs) {
      const real = pin.querySelector(sel);
      if (!real) continue;
      // Idempotent — don't double-inject if the loader runs twice.
      if (pin.querySelector(".hero-static__tap--" + mod)) continue;
      const a = document.createElement("a");
      a.className = "hero-static__tap hero-static__tap--" + mod;
      a.href = real.getAttribute("href") || "#";
      const label = real.getAttribute("aria-label");
      if (label) a.setAttribute("aria-label", label);
      // Forward the tap to the real CTA so its bound whoosh/loading-overlay
      // flourish runs exactly as a direct click would. preventDefault stops the
      // overlay's own navigation; if JS is dead, the real href still navigates.
      a.addEventListener("click", function (ev) {
        ev.preventDefault();
        real.click();
      });
      pin.appendChild(a);
    }
  }
})();
