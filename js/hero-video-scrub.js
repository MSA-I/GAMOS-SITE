/* ===========================================================================
   hero-video-scrub.js — GSAP ScrollTrigger-driven hero video
   ---------------------------------------------------------------------------
   Spec:        architecture/video-scrub-spec.md
   Constitution: CLAUDE.md §3 (Hybrid), §8 (Performance), §9 (A11y)
   Owner:       Agent 06 — Hero Video-Scrub Engineer
   ---------------------------------------------------------------------------
   Public API after init():
   - window.gamosHero.onProgress(cb)  → register a progress listener
   - window.gamosHero.duration         → number, seconds
   - window.gamosHero.progress         → number, 0..1
   - CSS variable --hero-progress on <html>, also 0..1
   ========================================================================= */

import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import ScrollTrigger from "https://cdn.skypack.dev/gsap@3.12.5/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const PROGRESS_THROTTLE_S = 0.04;
const PORTAL_REVEAL_AT = 0.92;
const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let _initDone = false;
let _scrollTrigger = null;
const _listeners = new Set();
const _state = { progress: 0, duration: 0 };

function setProgress(p) {
  _state.progress = p;
  document.documentElement.style.setProperty("--hero-progress", p.toFixed(4));
  for (const cb of _listeners) {
    try { cb(p); } catch (e) { console.error("hero progress listener:", e); }
  }
}

function exposeApi() {
  window.gamosHero = {
    onProgress(cb) {
      if (typeof cb !== "function") return () => {};
      _listeners.add(cb);
      cb(_state.progress);
      return () => _listeners.delete(cb);
    },
    get duration() { return _state.duration; },
    get progress() { return _state.progress; }
  };
}

function bindScrub(hero, video) {
  _scrollTrigger = ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate(self) {
      const p = self.progress;
      const t = p * _state.duration;
      if (Math.abs(video.currentTime - t) > PROGRESS_THROTTLE_S) {
        try { video.currentTime = t; } catch (e) { /* seek racing during decode */ }
      }
      setProgress(p);
    }
  });
}

function setupReduced(hero, video) {
  const spacer = hero.querySelector(".hero__spacer");
  if (spacer) spacer.style.height = "100vh";
  video.removeAttribute("autoplay");
  video.pause();
  setProgress(1);
}

function setupIOS(hero, video) {
  const spacer = hero.querySelector(".hero__spacer");
  if (spacer) spacer.style.height = "100vh";
  video.setAttribute("loop", "");
  video.setAttribute("autoplay", "");
  video.muted = true;
  video.playsInline = true;
  video.play().catch(() => {});
  setProgress(1);
}

export async function init({ heroEl, videoEl } = {}) {
  if (_initDone) return;
  const hero = heroEl || document.querySelector("#hero");
  const video = videoEl || hero?.querySelector(".hero__video");
  if (!hero || !video) {
    console.warn("hero-video-scrub: #hero or .hero__video not found");
    return;
  }

  exposeApi();
  _initDone = true;

  if (reduceMotion) {
    setupReduced(hero, video);
    return;
  }

  if (video.readyState < 1) {
    await new Promise(r => {
      video.addEventListener("loadedmetadata", r, { once: true });
      video.addEventListener("error", r, { once: true });
    });
  }
  _state.duration = video.duration || 0;

  if (isIOS || !_state.duration) {
    setupIOS(hero, video);
    return;
  }

  video.pause();
  bindScrub(hero, video);
}

export function destroy() {
  if (_scrollTrigger) { _scrollTrigger.kill(); _scrollTrigger = null; }
  _listeners.clear();
  _initDone = false;
}

export const PORTAL_REVEAL_THRESHOLD = PORTAL_REVEAL_AT;
