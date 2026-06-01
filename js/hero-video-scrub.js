/* ===========================================================================
   hero-video-scrub.js — V2 multi-stage hero (4 stages)
   ---------------------------------------------------------------------------
   Spec : agent-plans/agent-12_hero-spec-v2.md (4 stages, 700vh spacer)
          §8.4–§8.5 backward-compatible API + new titleProgress / portalsVisible
   ---------------------------------------------------------------------------
   Stages (driven by scroll progress p ∈ [0,1] over the 700vh spacer):
     A. "static-bg"     [0.00, 0.08)  ≈ 56vh   ≈ 0.8s read     (desert hold)
     B. "title-reveal"  [0.08, 0.22)  ≈ 98vh   ≈ 1.4s reveal   (GAMOS letters)
     C. "scrub"         [0.22, 0.88)  ≈ 462vh  ≈ 6.6s scrub    (video↔scroll)
     D. "portals"       [0.88, 1.00]  ≈ 84vh   ≈ 1.2s          (last frame freeze)

   Scrub mapping inside Stage C:
     scrubP = (p - 0.22) / (0.88 - 0.22)             // 0..1
     video.currentTime = scrubP * video.duration     // linear (no easing)

   At Stage D the video does NOT fade out — we pause it on the last frame so
   portals appear OVER the frozen frame (user mandate 2026-06-01, Agent 12 §9 Q4).

   Public API (backward-compatible + new):
     window.gamosHero.onProgress(cb)         — returns unsubscribe fn
     window.gamosHero.duration               — number, video.duration
     window.gamosHero.progress               — 0..1
     window.gamosHero.stage                  — "static-bg" | "title-reveal" | "scrub" | "portals"
     window.gamosHero.titleProgress          — NEW, 0..1 within Stage B
     window.gamosHero.portalsVisible         — NEW, boolean (true at p ≥ 0.88)

   2026-06-01 — Agent 17 architecture: hero registers with window.gamosScroll
   instead of running its own scroll listener + RAF. Orchestrator drives
   onProgress; we own only the stage classification and video.currentTime
   mapping. Priority: 10 keeps hero active across full 700vh sticky range
   until --hero-progress reaches 1.0 (orchestrator spec §5/§8).
   ========================================================================= */

const STATIC_END = 0.08;   // A → B
const TITLE_END  = 0.22;   // B → C
const SCRUB_END  = 0.88;   // C → D
const VIDEO_LOAD_TRIGGER_PROGRESS = 0.06;  // explicit .load() at this progress
const PROGRESS_THROTTLE_S = 0.04;

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let _initDone = false;
let _sceneHandle = null;     // gamosScroll handle for unregister on destroy
let _hero = null;
let _sticky = null;
let _video = null;
let _videoLoadTriggered = false;
const _listeners = new Set();
const _state = {
  progress: 0,
  duration: 0,
  stage: "static-bg",
  titleProgress: 0,
  portalsVisible: false
};

function setStage(next) {
  if (_state.stage === next) return;
  _state.stage = next;
  if (_sticky) _sticky.dataset.stage = next;

  // When entering Stage D (portals), freeze the scrub video on its last frame.
  // Portals (position:fixed, z-index:var(--z-overlay)=1000) appear OVER the
  // frozen frame — no separate portal-loop background (user mandate, Agent 12 §9 Q4).
  if (next === "portals" && _video && _state.duration) {
    try {
      _video.pause();
      // Subtract a small epsilon — some browsers loop or stall at exact end.
      const epsilon = 0.05;
      const target = Math.max(0, _state.duration - epsilon);
      if (Math.abs(_video.currentTime - target) > PROGRESS_THROTTLE_S) {
        _video.currentTime = target;
      }
    } catch (e) { /* ignore */ }
  }
}

function setProgress(p) {
  _state.progress = p;

  // Title-reveal sub-progress (0..1 within Stage B band [0.08, 0.22]).
  const titleP = p < STATIC_END ? 0
               : p > TITLE_END  ? 1
               : (p - STATIC_END) / (TITLE_END - STATIC_END);
  _state.titleProgress = titleP;
  _state.portalsVisible = p >= SCRUB_END;

  const root = document.documentElement;
  root.style.setProperty("--hero-progress", p.toFixed(4));
  root.style.setProperty("--hero-letter-progress", titleP.toFixed(4));
  root.style.setProperty("--hero-portals-visible", _state.portalsVisible ? "1" : "0");

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
    get duration()       { return _state.duration; },
    get progress()       { return _state.progress; },
    get stage()          { return _state.stage; },
    get titleProgress()  { return _state.titleProgress; },
    get portalsVisible() { return _state.portalsVisible; }
  };
}

function classifyStage(p) {
  if (p < STATIC_END) return "static-bg";
  if (p < TITLE_END)  return "title-reveal";
  if (p < SCRUB_END)  return "scrub";
  return "portals";
}

function maybeTriggerVideoLoad(p) {
  // Per Agent 12 §4.1: video is preload="metadata" for LCP. We call .load()
  // explicitly once we cross 0.06 (≈ 25% into Stage A) so it's ready by the
  // time the user reaches Stage C — gives ≈ 1s headroom on 4G.
  if (_videoLoadTriggered || !_video) return;
  if (p < VIDEO_LOAD_TRIGGER_PROGRESS) return;
  _videoLoadTriggered = true;
  try { _video.load(); } catch (e) { /* ignore */ }
}

/**
 * Progress handler — called by the scroll-orchestrator on each RAF tick
 * while hero is the active scene.
 */
function handleProgress(p) {
  maybeTriggerVideoLoad(p);
  setStage(classifyStage(p));

  if (_state.stage === "scrub" && _state.duration && _video) {
    const scrubP = (p - TITLE_END) / (SCRUB_END - TITLE_END);
    const t = scrubP * _state.duration;
    if (Math.abs(_video.currentTime - t) > PROGRESS_THROTTLE_S) {
      try { _video.currentTime = t; } catch (e) {}
    }
  }

  setProgress(p);
}

function setupReduced() {
  // Spec §4.5: spacer collapses, jump straight to Stage D.
  _hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage("portals");
  setProgress(1);
}

function setupIOS() {
  // Spec §4.4: scrub disabled on iOS. Show static-bg → title-reveal → portals
  // as time-based beats (no scroll binding). Skip Stage C entirely.
  _hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage("static-bg");
  if (_video) {
    _video.setAttribute("loop", "");
    _video.muted = true;
  }
  setTimeout(() => setStage("title-reveal"), 600);
  setTimeout(() => {
    setStage("portals");
    setProgress(1);
  }, 2400);
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

  _sticky.dataset.stage = "static-bg";
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
      _videoLoadTriggered = true;
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

  // Register with the scroll orchestrator. It owns the scroll listener +
  // RAF + active-scene decision. We just react to progress callbacks.
  // priority: 10 so hero stays active across its full 700vh sticky range
  // (spec §5: hero releases active only when --hero-progress reaches 1.0).
  if (window.gamosScroll && typeof window.gamosScroll.register === "function") {
    try {
      _sceneHandle = window.gamosScroll.register({
        id: "hero",
        el: _hero,
        videoEl: _video || undefined,
        spacerVh: 700,
        priority: 10,
        onProgress: handleProgress,
      });
    } catch (e) {
      console.error("[hero-video-scrub] gamosScroll.register failed:", e);
    }
  } else {
    console.warn("[hero-video-scrub] window.gamosScroll missing — hero will stay at progress=0.");
  }
}

export function destroy() {
  if (_sceneHandle && typeof _sceneHandle.unregister === "function") {
    try { _sceneHandle.unregister(); } catch (e) {}
    _sceneHandle = null;
  }
  _listeners.clear();
  _initDone = false;
}
