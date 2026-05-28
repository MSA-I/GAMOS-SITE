/* ===========================================================================
   hero-video-scrub.js — multi-stage hero (intro → scrub → outro)
   ---------------------------------------------------------------------------
   Stages:
     intro  [0     .. 0.143)   ≈ first 100vh of 700vh spacer  → title animation
     scrub  [0.143 .. 0.857)   ≈ next 500vh                    → video scrub
     outro  [0.857 .. 1.0]     ≈ last 100vh                    → portal-loop play
   API: window.gamosHero.onProgress(cb), .duration, .progress, .stage
   ========================================================================= */

const INTRO_END = 0.143;
const SCRUB_END = 0.857;
const PROGRESS_THROTTLE_S = 0.04;

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let _initDone = false;
let _scrollHandler = null;
let _rafPending = false;
let _hero = null;
let _sticky = null;
let _video = null;
const _listeners = new Set();
const _state = { progress: 0, duration: 0, stage: "intro" };

function setStage(next) {
  if (_state.stage === next) return;
  _state.stage = next;
  if (_sticky) _sticky.dataset.stage = next;
  const outro = _sticky?.querySelector(".hero__outro-loop");
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

function computeProgress() {
  const rect = _hero.getBoundingClientRect();
  const total = rect.height - window.innerHeight;
  const scrolled = -rect.top;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, scrolled / total));
}

function onScroll() {
  if (_rafPending) return;
  _rafPending = true;
  requestAnimationFrame(() => {
    _rafPending = false;
    const p = computeProgress();

    let stage;
    if (p < INTRO_END) stage = "intro";
    else if (p < SCRUB_END) stage = "scrub";
    else stage = "outro";
    setStage(stage);

    if (stage === "scrub" && _state.duration && _video) {
      const scrubP = (p - INTRO_END) / (SCRUB_END - INTRO_END);
      const t = scrubP * _state.duration;
      if (Math.abs(_video.currentTime - t) > PROGRESS_THROTTLE_S) {
        try { _video.currentTime = t; } catch (e) {}
      }
    }

    setProgress(p);
  });
}

function setupReduced() {
  _hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage("intro");
  setProgress(0);
}

function setupIOS() {
  _hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage("intro");
  if (_video) {
    _video.setAttribute("loop", "");
    _video.muted = true;
  }
  // Cycle: intro → (4s) scrub → (10s total) outro
  setTimeout(() => {
    setStage("scrub");
    if (_video) _video.play().catch(() => {});
  }, 4000);
  setTimeout(() => setStage("outro"), 10000);
}

export async function init({ heroEl } = {}) {
  if (_initDone) return;
  _hero = heroEl || document.querySelector("#hero");
  if (!_hero) {
    console.warn("hero-video-scrub: #hero not found");
    return;
  }
  _sticky = _hero.querySelector(".hero__sticky");
  _video = _hero.querySelector(".hero__video");
  if (!_sticky) {
    console.warn("hero-video-scrub: .hero__sticky missing");
    return;
  }

  _sticky.dataset.stage = "intro";
  exposeApi();
  _initDone = true;

  if (reduceMotion) {
    setupReduced();
    return;
  }

  if (_video && _video.readyState < 1) {
    await new Promise(r => {
      const done = () => r();
      _video.addEventListener("loadedmetadata", done, { once: true });
      _video.addEventListener("error", done, { once: true });
      try { _video.load(); } catch (e) {}
      // safety timeout — proceed with assumed duration so UX isn't blocked
      setTimeout(done, 4000);
    });
  }
  _state.duration = _video?.duration || 0;

  if (isIOS || !_state.duration) {
    setupIOS();
    return;
  }

  if (_video) _video.pause();

  _scrollHandler = onScroll;
  window.addEventListener("scroll", _scrollHandler, { passive: true });
  window.addEventListener("resize", _scrollHandler, { passive: true });
  // initial computation
  onScroll();
}

export function destroy() {
  if (_scrollHandler) {
    window.removeEventListener("scroll", _scrollHandler);
    window.removeEventListener("resize", _scrollHandler);
    _scrollHandler = null;
  }
  _listeners.clear();
  _initDone = false;
}
