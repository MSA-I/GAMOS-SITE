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
    "/mobile/css/shabbat-chatan.css",
    "/mobile/css/culinary.css",
    "/mobile/css/hero-static.css",
    "/mobile/css/responsive-images.css",
    "/mobile/css/touch-targets.css",
    "/mobile/css/headings.css",
    "/mobile/css/kosher.css",
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
  // 4. Hero CTA pill labels
  // ---------------------------------------------------------------------------
  // The desktop hero shows the EVENTS / RESORT bitmap PNGs as the CTA face.
  // On phones the bitmap shrinks to ~56vw and reads as decoration, not a
  // tappable button. We append a <span class="hero-static__cta-label"> to
  // each anchor; the inline default rule below hides it on desktop, and
  // /mobile/css/hero-static.css surfaces it as a brass pill button at
  // ≤768px.
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
  function domReady () {
    injectHalfSources();
    injectCtaLabels();
    setupCulinaryMobileManifest();
  }
})();
