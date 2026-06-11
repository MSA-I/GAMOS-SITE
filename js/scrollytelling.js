/* ===========================================================================
   scrollytelling.js — orchestrates 4 cinematic scroll-driven canvas scenes
   ---------------------------------------------------------------------------
   Implements user spec "Cinematic Scrollytelling with Canvas & GSAP" across
   the project's 4 anchored scenes:
       #hero          → /assets/frames/hero/manifest.json
       #hall-venue    → /assets/frames/venue/manifest.json     (when ready)
       #hall-resort   → /assets/frames/resort/manifest.json    (when ready)
       #culinary      → /assets/frames/culinary/manifest.json

   Loader: a single shared overlay shows the cumulative percentage of all
   scenes' frames as they decode. Hides once 100% decoded (with a 240ms
   fade), revealing the page underneath.

   Init order in main.js: this module replaces the per-scene wiring of
   the older `scroll-scene` module for `mode="canvas-frames"` sections.
   The poster-ken-burns mode (resort/venue scaffolds) keeps using
   scroll-scene.js.

   Scene config (auto-discovers from DOM):
       <canvas class="hero__canvas|scroll-scene__canvas"
               data-manifest-url="/assets/frames/<scene>/manifest.json">
   The canvas's nearest [data-scrub] / .scroll-scene / section ancestor
   becomes the scroll host (drives progress).

   ========================================================================= */

import { createRenderer } from "./canvas-frame-renderer.js";

const LOADER_FADE_MS = 360;

let scenes = [];
let loaderEl = null;
let totalLoaded = 0;
let totalTotal = 0;

// ----------------------------------------------------------------------------
// Loader overlay — single shared loader shown while frames are decoding
// ----------------------------------------------------------------------------

function ensureLoader() {
  // 2026-06-04: loader overlay disabled per user request — frame preloads
  // still run in the background, but no full-screen "טוען חוויה" chrome
  // appears on refresh. Returning null here makes updateLoaderPct/hideLoader
  // no-ops without changing the rest of the scene-registration flow.
  return null;
}

function updateLoaderPct() {
  if (!loaderEl) return;
  const pct = totalTotal === 0 ? 0 : Math.floor((totalLoaded / totalTotal) * 100);
  const fill = loaderEl.querySelector(".scrollytelling-loader__fill");
  const lbl = loaderEl.querySelector(".scrollytelling-loader__pct");
  if (fill) fill.style.transform = `scaleX(${pct / 100})`;
  if (lbl) lbl.textContent = pct + "%";
}

function hideLoader() {
  if (!loaderEl) return;
  loaderEl.classList.add("is-done");
  setTimeout(() => {
    if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
    loaderEl = null;
  }, LOADER_FADE_MS + 60);
}

function onSceneFrameProgress(_loaded, _total, delta) {
  totalLoaded += delta;
  updateLoaderPct();
}

// ----------------------------------------------------------------------------
// Scene registration
// ----------------------------------------------------------------------------

async function registerScene(canvas) {
  const manifestUrl = canvas.dataset.manifestUrl;
  if (!manifestUrl) {
    console.warn("[scrollytelling] canvas missing data-manifest-url", canvas);
    return null;
  }

  let manifest;
  try {
    const res = await fetch(manifestUrl, { cache: "force-cache" });
    if (!res.ok) throw new Error("manifest http " + res.status);
    manifest = await res.json();
  } catch (e) {
    console.warn("[scrollytelling] manifest fetch failed:", manifestUrl, e);
    return null;
  }

  totalTotal += manifest.frameCount;
  updateLoaderPct();

  let prevLoaded = 0;
  const renderer = createRenderer({
    canvas,
    manifest,
    options: {
      zoom: 1.35,
      parallax: true,
      parallaxStrength: 28,
      bgColor: "#0E0E0C",
      onProgress: (loaded, total) => {
        const delta = loaded - prevLoaded;
        prevLoaded = loaded;
        onSceneFrameProgress(loaded, total, delta);
      },
    },
  });

  // Mark canvas ready for CSS hooks (poster fade-out, etc.)
  canvas.classList.add("is-mounted");

  // Bind scroll + resize + parallax — preload runs in parallel.
  renderer.bindScroll();
  renderer.bindResize();
  renderer.bindMouseParallax();

  return { canvas, renderer, manifest };
}

// ----------------------------------------------------------------------------
// init / destroy
// ----------------------------------------------------------------------------

export function init() {
  // Honour reduced motion on DESKTOP only. 2026-06-11 (§8 mobile exception,
  // user-requested): many phones force `prefers-reduced-motion: reduce` via
  // battery-saver / iOS Low-Power Mode even when the user never asked to
  // reduce motion — which was silently freezing the culinary scrub to its
  // static poster on mobile. The user wants the scrub to play on phones
  // regardless, so we only bail on RM when NOT mobile. Desktop RM is
  // unchanged (scrub off, poster shows). The matching mobile CSS
  // (mobile/css/culinary.css) re-shows the canvas + restores the scroll
  // spacer under RM≤768px. See CLAUDE.md §12.
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = matchMedia("(max-width: 768px)").matches;
  if (reduced && !mobile) {
    // Just hide poster fallbacks etc. Caller's CSS handles it.
    return;
  }

  // Wire GSAP plugins if present (set up by main.js BEFORE this module runs).
  if (window.gsap && window.ScrollToPlugin) {
    try {
      gsap.registerPlugin(ScrollToPlugin);
    } catch (_) {
      // already registered — fine
    }
  }

  ensureLoader();

  // Only canvases that opt in (data-scrollytelling). Hero canvas keeps its
  // own renderer (hero-video-scrub.js) because it has 4-stage logic that
  // would conflict with this module's pure scroll → frame mapping.
  const canvases = document.querySelectorAll(
    "canvas[data-manifest-url][data-scrollytelling]"
  );
  if (canvases.length === 0) {
    hideLoader();
    return;
  }

  const work = Array.from(canvases).map((c) => registerScene(c));
  Promise.all(work).then((registered) => {
    scenes = registered.filter(Boolean);

    // Kick off all preloads in parallel.
    const preloads = scenes.map((s) => s.renderer.preload());
    Promise.all(preloads).then(() => {
      hideLoader();
      // After preload, mark ready + draw frame 0 to flush any racing.
      scenes.forEach((s) => {
        s.canvas.classList.add("is-ready");
        s.renderer.drawFrame(0);
      });
    });
  });

  // "Scroll to top" helpers — any [data-scroll-to-top] button uses GSAP if available.
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-scroll-to-top]");
    if (!target) return;
    e.preventDefault();
    if (window.gsap && window.ScrollToPlugin) {
      gsap.to(window, { duration: 1.0, scrollTo: 0, ease: "power3.inOut" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Programmatic anchor scrolls (used by side-dot-nav). If GSAP is present,
  // smooth via ScrollToPlugin; otherwise let the browser do it.
  document.addEventListener("click", (e) => {
    if (!window.gsap || !window.ScrollToPlugin) return;
    const a = e.target.closest('a[href^="#"]:not([data-no-smooth])');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    gsap.to(window, {
      duration: 1.1,
      scrollTo: { y: el, autoKill: true },
      ease: "power3.inOut",
    });
    // Update URL hash without jump.
    history.pushState(null, "", "#" + id);
  });
}

export function destroy() {
  scenes.forEach((s) => {
    try { s.renderer.destroy(); } catch (_) {}
  });
  scenes = [];
  if (loaderEl && loaderEl.parentNode) loaderEl.parentNode.removeChild(loaderEl);
  loaderEl = null;
  totalLoaded = 0;
  totalTotal = 0;
}
