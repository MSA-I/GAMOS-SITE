/* ===========================================================================
   door-scrub.js — rooms-lab experiment.
   Scrubs the Seedance door-opening clip on scroll (culinary canvas-frames
   technique, reusing the site's /js/canvas-frame-renderer.js read-only), then
   at the end of the scroll floods the LIT doorway colour and auto-navigates to
   the gallery copy — no black flash.
   Models js/scrollytelling.js registerScene().
   ========================================================================= */
import { createRenderer } from "/js/canvas-frame-renderer.js";

const MANIFEST_URL = "/rooms-lab/assets/frames/door/manifest.json";
const GALLERY_URL = "/rooms-lab/gallery/dist/";
const NAV_AT = 0.985;   // scroll progress that triggers the lit handoff
const VEIL_MS = 540;    // must match .lit-veil transition + a hair
// Ease-IN on scroll→frame: slow open at the start, ACCELERATING toward the end
// (user request 2026-06-22 — "faster near the end"). frame = p^END_ACCEL.
// >1 accelerates the finish; 1 = linear; raise for a sharper late burst.
const END_ACCEL = 1.9;

const reduced =
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.documentElement.classList.remove("no-js");

function goGallery() { window.location.href = GALLERY_URL; }

async function init() {
  const canvas = document.querySelector(".door-scene__canvas");
  const scene = document.querySelector(".door-scene");
  const veil = document.querySelector(".lit-veil");
  if (!canvas || !scene) return;

  let manifest;
  try {
    const res = await fetch(MANIFEST_URL, { cache: "force-cache" });
    if (!res.ok) throw new Error("manifest http " + res.status);
    manifest = await res.json();
  } catch (e) {
    console.warn("[door-scrub] manifest fetch failed — falling back to plain link", e);
    return; // the cue is a real <a>; plain navigation still works
  }

  const lit = manifest.litColor || "#dda86b";
  document.documentElement.style.setProperty("--lit", lit);

  const renderer = createRenderer({
    canvas,
    manifest,
    host: scene,
    options: {
      // zoom 1.0 = fit the frame exactly (no magnification). The previous 1.08
      // overshoot read as "the video is scaled up / zoomed in" on ~16:9 screens.
      // Parallax needs a zoom margin to hide edges, so it's off at zoom 1.0.
      zoom: 1.0,
      parallax: false,
      frameStart: 0,         // door opens from frame 0, no dead intro to trim
      bgColor: lit,          // any letterbox edge = the lit doorway tone
      // We drive drawFrame ourselves (non-linear ease-in mapping), so we can't
      // rely on bindScroll's sliding window following a LINEAR centre. decodeAll
      // keeps every frame decoded (193×1080p — fine on desktop) so any eased
      // index is paint-ready. preload() kicks off the full center-out decode.
      decodeAll: true,
    },
  });

  await renderer.preload();
  canvas.classList.add("is-ready");

  if (reduced) {
    // Reduced motion: show the door fully open (last frame), no scrub, no
    // auto-nav. The cue link is visible and navigates on click.
    renderer.drawFrame(manifest.frameCount - 1);
    renderer.bindResize();
    return;
  }

  // We drive the frames ourselves so the scroll→frame mapping can EASE-IN
  // (accelerate toward the end) instead of bindScroll's linear map.
  renderer.bindResize();
  const lastFrame = manifest.frameCount - 1;

  let navigated = false;
  let rafPending = false;
  function onScroll() {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const p = renderer.computeProgress();      // 0..1 linear scroll position
      scene.style.setProperty("--p", p.toFixed(3)); // fades the cue out
      const eased = Math.pow(p, END_ACCEL);      // slow start → fast finish
      renderer.drawFrame(Math.round(eased * lastFrame));
      if (!navigated && p >= NAV_AT) {
        navigated = true;
        if (veil) veil.classList.add("is-on");
        window.setTimeout(goGallery, VEIL_MS);
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll(); // initial paint at frame 0
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
