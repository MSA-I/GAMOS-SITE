/* ===========================================================================
   scrollytelling.js — orchestrates 4 cinematic scroll-driven canvas scenes
   ---------------------------------------------------------------------------
   Implements user spec "Cinematic Scrollytelling with Canvas & GSAP".
   The live canvas-frames scene is #culinary (the hero uses js/hero-scene.js,
   not canvas frames).

   2026-06-16: #culinary briefly moved to <video> scrub to stop a tab-OOM, then
   restored to canvas-frames once the renderer gained SLIDING-WINDOW decode
   (js/canvas-frame-renderer.js — only ~9 desktop / ~17 mobile frames held at
   once instead of eager-loading all 361). Canvas-frames is the only scrub that
   works on iOS (video.currentTime can't be scrubbed there), so this is also
   the mobile path. The smooth-scroll helpers (scroll-to-top + side-dot-nav
   anchor smoothing) are registered ABOVE the canvas early-return so they keep
   working regardless of how many canvas scenes exist.

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
import { prefersReducedMotion, isMobile } from "./utils/media-query.js";

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

  // Optional start-trim: data-scrub-frame-start="0.4" skips the first 40% of
  // the clip (a dead intro) so the whole scroll maps onto the meaningful
  // remainder. Used by the culinary scrub (empty-conveyor opening). Absent /
  // 0 → unchanged full-range scrub. (2026-06-15)
  const frameStart = parseFloat(canvas.dataset.scrubFrameStart || "0") || 0;

  // Optional vertical framing nudge: data-scrub-voffset="-0.12" lifts the drawn
  // frame UP by 12% of canvas height (fraction). Used on mobile so the plated
  // dish rises toward screen centre instead of bottom-cropped. Absent / 0 →
  // pure-centre (desktop, byte-identical). (2026-06-22)
  const verticalOffset = parseFloat(canvas.dataset.scrubVoffset || "0") || 0;

  let prevLoaded = 0;
  const renderer = createRenderer({
    canvas,
    manifest,
    options: {
      // 2026-06-25: reduced 1.35 → 1.05. The 1.35 overshoot upscaled the 1080p
      // frames ~35% past cover, which read as soft (esp. the conveyor dishes).
      // 1.05 is near-native cover (sharpest) — only a 5% overshoot to keep a
      // hair of mouse-parallax margin and hide any baked-in edge.
      zoom: 1.05,
      parallax: true,
      parallaxStrength: 28,
      bgColor: "#0E0E0C",
      frameStart,
      verticalOffset,
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
  const reduced = prefersReducedMotion();
  const mobile = isMobile();
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

  // Smooth-scroll helpers — registered FIRST, before the canvas early-return.
  // These are global navigation aids (scroll-to-top + side-dot-nav anchor
  // smoothing), independent of any canvas-frames scene. They MUST register even
  // when there are zero data-scrollytelling canvases (2026-06-16: the culinary
  // canvas was replaced by a <video> scrub, so the early-return below now fires
  // on every page — keeping these before it preserves smooth-scroll nav).

  // "Scroll to top" helpers — any [data-scroll-to-top] button uses GSAP if available.
  document.addEventListener("click", (e) => {
    const target = e.target.closest("[data-scroll-to-top]");
    if (!target) return;
    e.preventDefault();
    if (window.gamosSmoothScrollTo) {
      window.gamosSmoothScrollTo(0);                 // Lenis (desktop) — avoid GSAP↔Lenis fight
    } else if (window.gsap && window.ScrollToPlugin) {
      gsap.to(window, { duration: 1.0, scrollTo: 0, ease: "power3.inOut" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  });

  // Programmatic anchor scrolls (used by side-dot-nav). If GSAP is present,
  // smooth via ScrollToPlugin; otherwise let the browser do it.
  document.addEventListener("click", (e) => {
    // Need at least one smooth driver (Lenis on desktop, else GSAP).
    if (!window.gamosSmoothScrollTo && (!window.gsap || !window.ScrollToPlugin)) return;
    const a = e.target.closest('a[href^="#"]:not([data-no-smooth])');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    if (window.gamosSmoothScrollTo) {
      window.gamosSmoothScrollTo(el, { duration: 1.1 }); // Lenis — no GSAP↔Lenis fight
    } else {
      gsap.to(window, {
        duration: 1.1,
        scrollTo: { y: el, autoKill: true },
        ease: "power3.inOut",
      });
    }
    // Update URL hash without jump.
    history.pushState(null, "", "#" + id);
  });

  // Only canvases that opt in (data-scrollytelling). Hero canvas keeps its
  // own renderer (hero-video-scrub.js) because it has 4-stage logic that
  // would conflict with this module's pure scroll → frame mapping.
  // As of 2026-06-16 there are normally ZERO such canvases (culinary moved to
  // <video> scrub) — this pipeline is retained for §6 legacy / future scenes.
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
      // After preload, mark ready + draw the scene's START frame (== the
      // scrub's first frame; 0 for untrimmed scenes, the trim point for the
      // culinary clip) so a trimmed scene doesn't flash its dead intro before
      // the first scroll tick.
      scenes.forEach((s) => {
        s.canvas.classList.add("is-ready");
        s.renderer.drawFrame(s.renderer.startFrame || 0);
      });
    });
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
