/* ===========================================================================
   hero-video-scrub.js — multi-stage hero (intro → scrub → outro)
   ---------------------------------------------------------------------------
   Stages:
     intro  [0     .. 0.143)   ≈ first 100vh of 700vh spacer  → title animation
     scrub  [0.143 .. 0.857)   ≈ next 500vh                    → video scrub
     outro  [0.857 .. 1.0]     ≈ last 100vh                    → portal-loop play
   API: window.gamosHero.onProgress(cb), .duration, .progress, .stage
   CSS: --hero-progress (overall), --hero-scrub-progress (0..1 within scrub stage)
   ========================================================================= */

import gsap from "https://cdn.skypack.dev/gsap@3.12.5";
import ScrollTrigger from "https://cdn.skypack.dev/gsap@3.12.5/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const INTRO_END = 0.143;
const SCRUB_END = 0.857;
const PROGRESS_THROTTLE_S = 0.04;

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let _initDone = false;
let _scrollTrigger = null;
const _listeners = new Set();
const _state = { progress: 0, duration: 0, stage: "intro" };

function setStage(sticky, next) {
  if (_state.stage === next) return;
  _state.stage = next;
  sticky.dataset.stage = next;
  const outro = sticky.querySelector(".hero__outro-loop");
  if (outro) {
    if (next === "outro") outro.play().catch(() => {});
    else outro.pause();
  }
}

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
    get progress() { return _state.progress; },
    get stage() { return _state.stage; }
  };
}

function bindScrub(hero, sticky, video) {
  _scrollTrigger = ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate(self) {
      const p = self.progress;

      // Decide stage
      let stage;
      if (p < INTRO_END) stage = "intro";
      else if (p < SCRUB_END) stage = "scrub";
      else stage = "outro";
      setStage(sticky, stage);

      // Drive video time within scrub stage
      if (stage === "scrub" && _state.duration) {
        const scrubP = (p - INTRO_END) / (SCRUB_END - INTRO_END);
        document.documentElement.style.setProperty("--hero-scrub-progress", scrubP.toFixed(4));
        const t = scrubP * _state.duration;
        if (Math.abs(video.currentTime - t) > PROGRESS_THROTTLE_S) {
          try { video.currentTime = t; } catch (e) {}
        }
      } else if (stage === "intro") {
        document.documentElement.style.setProperty("--hero-scrub-progress", "0");
      } else {
        document.documentElement.style.setProperty("--hero-scrub-progress", "1");
      }

      setProgress(p);
    }
  });
}

function setupReduced(hero, sticky) {
  hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage(sticky, "intro");
  setProgress(1);
}

function setupIOS(hero, sticky, video) {
  hero.querySelector(".hero__spacer").style.height = "100vh";
  // simple fallback: show intro for 4s, then video autoplay loop for 6s, then outro
  setStage(sticky, "intro");
  video.setAttribute("loop", "");
  video.muted = true;
  setTimeout(() => {
    setStage(sticky, "scrub");
    video.play().catch(() => {});
  }, 4000);
  setTimeout(() => {
    setStage(sticky, "outro");
    setProgress(1);
  }, 10000);
}

export async function init({ heroEl } = {}) {
  if (_initDone) return;
  const hero = heroEl || document.querySelector("#hero");
  if (!hero) {
    console.warn("hero-video-scrub: #hero not found");
    return;
  }
  const sticky = hero.querySelector(".hero__sticky");
  const video = hero.querySelector(".hero__video");
  if (!sticky || !video) {
    console.warn("hero-video-scrub: required elements missing");
    return;
  }

  // Initialize stage attribute
  sticky.dataset.stage = "intro";

  exposeApi();
  _initDone = true;

  if (reduceMotion) {
    setupReduced(hero, sticky);
    return;
  }

  if (video.readyState < 1) {
    await new Promise(r => {
      video.addEventListener("loadedmetadata", r, { once: true });
      video.addEventListener("error", r, { once: true });
      // Force load — for some browsers preload="auto" isn't enough
      try { video.load(); } catch (e) {}
    });
  }
  _state.duration = video.duration || 0;

  if (isIOS || !_state.duration) {
    setupIOS(hero, sticky, video);
    return;
  }

  video.pause();
  bindScrub(hero, sticky, video);
}

export function destroy() {
  if (_scrollTrigger) { _scrollTrigger.kill(); _scrollTrigger = null; }
  _listeners.clear();
  _initDone = false;
}
