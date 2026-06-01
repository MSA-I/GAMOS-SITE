/* ===========================================================================
   hero-video-scrub.js — V2 multi-stage hero (4 stages, canvas-frame scrub)
   ---------------------------------------------------------------------------
   Spec : agent-plans/agent-12_hero-spec-v2.md (4 stages, 700vh spacer)
          §8.4–§8.5 backward-compatible API + new titleProgress / portalsVisible
          video-to-website.md §6c (canvas-frame renderer for scrub)
   ---------------------------------------------------------------------------
   Stages (driven by scroll progress p ∈ [0,1] over the 700vh spacer):
     A. "static-bg"     [0.00, 0.08)  ≈ 56vh   ≈ 0.8s read     (desert hold)
     B. "title-reveal"  [0.08, 0.22)  ≈ 98vh   ≈ 1.4s reveal   (GAMOS letters)
     C. "scrub"         [0.22, 0.88)  ≈ 462vh  ≈ 6.6s scrub    (canvas frames)
     D. "portals"       [0.88, 1.00]  ≈ 84vh   ≈ 1.2s          (last frame freeze)

   Scrub mapping inside Stage C (canvas-frame renderer, Agent 21 2026-06-01):
     scrubP = (p - 0.22) / (0.88 - 0.22)                    // 0..1
     idx    = floor(scrubP * (frameCount - 1))              // 0..N-1
     renderer.drawFrame(idx)                                // canvas paint

   Why canvas frames replace <video.currentTime>:
     iOS Safari is unreliable for currentTime scrubbing (jitter, decoder
     restarts, occasional black frames). Pre-extracted 30fps WebP frames
     drawn into a <canvas> give 60fps deterministic scrub on every browser.
     See video-to-website.md skill + assets/frames/hero/manifest.json.

   At Stage D the renderer is NOT torn down — we hold the last frame so
   portals appear OVER the frozen image (user mandate 2026-06-01, Agent 12 §9 Q4).

   Public API (backward-compatible + new):
     window.gamosHero.onProgress(cb)         — returns unsubscribe fn
     window.gamosHero.duration               — number, scrub-band duration in seconds
                                               (computed from frameCount/30 — 30fps extraction)
     window.gamosHero.progress               — 0..1
     window.gamosHero.stage                  — "static-bg" | "title-reveal" | "scrub" | "portals"
     window.gamosHero.titleProgress          — 0..1 within Stage B
     window.gamosHero.portalsVisible         — boolean (true at p ≥ 0.88)

   2026-06-01 — Agent 17 architecture: hero registers with window.gamosScroll
   instead of running its own scroll listener + RAF. Orchestrator drives
   onProgress; we own only the stage classification and canvas-frame mapping.
   Priority: 10 keeps hero active across full 700vh sticky range until
   --hero-progress reaches 1.0 (orchestrator spec §5/§8).
   ========================================================================= */

import { createRenderer } from "./canvas-frame-renderer.js";

const STATIC_END = 0.08;   // A → B
const TITLE_END  = 0.22;   // B → C
const SCRUB_END  = 0.88;   // C → D
const FRAME_LOAD_TRIGGER_PROGRESS = 0.06;  // start manifest fetch at this progress
const HERO_MANIFEST_URL = "/assets/frames/hero/manifest.json";

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

let _initDone = false;
let _sceneHandle = null;     // gamosScroll handle for unregister on destroy
let _hero = null;
let _sticky = null;
let _canvas = null;          // <canvas class="hero__canvas"> — replaces <video>
let _renderer = null;        // canvas-frame-renderer instance
let _frameCount = 0;         // populated after manifest fetch
let _lastDrawnFrame = -1;    // dedupe drawFrame calls
let _manifestLoadKicked = false;
let _onResize = null;
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

  // When entering Stage D (portals), freeze the scrub on its last frame.
  // Portals (position:fixed, z-index:var(--z-overlay)=1000) appear OVER the
  // frozen frame — no separate portal-loop background (user mandate, Agent 12 §9 Q4).
  if (next === "portals" && _renderer && _frameCount) {
    try {
      const lastIdx = _frameCount - 1;
      if (lastIdx !== _lastDrawnFrame) {
        _lastDrawnFrame = lastIdx;
        _renderer.drawFrame(lastIdx);
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

function maybeKickoffManifestLoad(p) {
  // Frame manifest fetch + Phase-1 preload starts at p >= 0.06 so the first
  // 10 frames are decoded by the time the user reaches Stage C (gives ~1s
  // headroom on 4G). The full manifest stream continues asynchronously.
  if (_manifestLoadKicked || !_canvas) return;
  if (p < FRAME_LOAD_TRIGGER_PROGRESS) return;
  _manifestLoadKicked = true;
  loadManifestAndPreload();
}

async function loadManifestAndPreload() {
  if (_renderer || !_canvas) return;
  try {
    const res = await fetch(HERO_MANIFEST_URL, { credentials: "same-origin" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const manifest = await res.json();
    _frameCount = manifest.frameCount | 0;
    // Compute logical duration from frame count + assumed 30fps extraction
    // (matches encoded fps stored in the manifest). Keeps gamosHero.duration
    // semantically equivalent to the old <video>.duration value in seconds.
    const fps = manifest.fpsExtracted || 30;
    _state.duration = _frameCount / fps;

    _renderer = createRenderer({ canvas: _canvas, manifest });
    await _renderer.preload();
    _canvas.classList.add("is-ready");
    // Initial paint of frame 0 ensures the canvas reflects scrub start
    // even before the user reaches Stage C.
    _renderer.drawFrame(0);
    _lastDrawnFrame = 0;

    // Resize observer for DPR adjustments (only one listener — keep it simple).
    _onResize = () => { if (_renderer) _renderer.resize(); };
    window.addEventListener("resize", _onResize, { passive: true });
  } catch (e) {
    console.error("[hero-video-scrub] manifest/preload failed:", e);
  }
}

/**
 * Progress handler — called by the scroll-orchestrator on each RAF tick
 * while hero is the active scene.
 */
function handleProgress(p) {
  maybeKickoffManifestLoad(p);
  setStage(classifyStage(p));

  if (_state.stage === "scrub" && _renderer && _frameCount) {
    const scrubP = (p - TITLE_END) / (SCRUB_END - TITLE_END);
    const idx = Math.max(0, Math.min(_frameCount - 1, Math.floor(scrubP * (_frameCount - 1))));
    if (idx !== _lastDrawnFrame) {
      _lastDrawnFrame = idx;
      _renderer.drawFrame(idx);
    }
  }

  setProgress(p);
}

function setupReduced() {
  // Spec §4.5: spacer collapses, jump straight to Stage D. Skip canvas
  // preload; the static poster (Stage A image) covers the visual hold.
  _hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage("portals");
  setProgress(1);
}

function setupIOS() {
  // Spec §4.4 (legacy): scrub disabled on iOS. Show static-bg → title-reveal →
  // portals as time-based beats (no scroll binding). Skip Stage C entirely.
  // 2026-06-01 (Agent 21): canvas-frame scrub WORKS smoothly on iOS — that's
  // the whole point of the migration. We keep this path only for the case
  // where the manifest/canvas isn't present (e.g., asset pipeline missing).
  _hero.querySelector(".hero__spacer").style.height = "100vh";
  setStage("static-bg");
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
  _canvas = _hero.querySelector(".hero__canvas");
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

  // No <canvas> in the DOM — degrade gracefully to the time-based iOS beat
  // sequence (looks the same on every device). This shouldn't happen in
  // production (the markup is checked into index.html) but keeps the page
  // usable during scaffold tinkering.
  if (!_canvas) {
    console.warn("[hero-video-scrub] .hero__canvas missing — degrading to time-based stage transitions.");
    setupIOS();
    return;
  }

  // Canvas-frame scrub works on iOS too — no special-case branch needed.
  // The orchestrator's iOS suppress for non-hero scenes does NOT apply to
  // hero (it explicitly excludes hero). Hero gets onProgress on iOS.

  // Register with the scroll orchestrator. It owns the scroll listener +
  // RAF + active-scene decision. We just react to progress callbacks.
  // priority: 10 so hero stays active across its full 700vh sticky range
  // (spec §5: hero releases active only when --hero-progress reaches 1.0).
  if (window.gamosScroll && typeof window.gamosScroll.register === "function") {
    try {
      _sceneHandle = window.gamosScroll.register({
        id: "hero",
        el: _hero,
        // No videoEl: orchestrator's near-observer only acts on <video>.
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
  if (_renderer && typeof _renderer.destroy === "function") {
    try { _renderer.destroy(); } catch (e) {}
    _renderer = null;
  }
  if (_onResize) {
    window.removeEventListener("resize", _onResize);
    _onResize = null;
  }
  _listeners.clear();
  _initDone = false;
}
