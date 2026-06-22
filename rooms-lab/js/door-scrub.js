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

  renderer.bindScroll();
  renderer.bindResize();
  renderer.drawFrame(renderer.startFrame || 0);

  // Auto-nav: when the door is fully open (scroll ~complete), flood the lit
  // colour and hand off to the gallery. Fire once.
  let navigated = false;
  function onScroll() {
    if (navigated) return;
    const p = renderer.computeProgress();
    scene.style.setProperty("--p", p.toFixed(3)); // fades the cue out
    if (p >= NAV_AT) {
      navigated = true;
      if (veil) veil.classList.add("is-on");
      window.setTimeout(goGallery, VEIL_MS);
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
