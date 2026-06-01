/* ===========================================================================
   scroll-scene.js — generic per-scene driver for non-hero scroll-driven scenes
   ---------------------------------------------------------------------------
   Spec: architecture/scroll-orchestrator.md §3 (DOM contract), §10 (modules).

   Render modes (auto-detected from DOM / data-attrs):

   1) "video" (default — when a <video class="scroll-scene__video"> is present)
        → seeks video.currentTime = p * duration (RAF-throttled — Δt > 0.04s).

   2) "poster-ken-burns" (data-scrub-mode="poster-ken-burns")
        → sets CSS variable --scene-progress on the section root; CSS animates
          a slow scale + translateY on the <picture class="scroll-scene__poster">
          child. JS only writes the variable. Used for sections without source
          video (e.g. Agent 18 will use this for אולם / venue).

   3) "custom" (data-scrub-handler="<windowFnName>")
        → progress is forwarded to window[windowFnName]. The function is
          (p) => void; it may also receive (p, sectionEl) for convenience.
          Use this for sections that want bespoke behavior (image-stack
          crossfade, parallax stack, masked text, etc.).

   Architecture
   ------------
   This module is a **consumer** of `window.gamosScroll`. It does not own a
   scroll listener or RAF — the orchestrator does. We register each scene
   with `gamosScroll.register({ id, el, onProgress, videoEl?, ...})` and let
   the orchestrator decide who's active and dispatch onProgress() per frame.

   If `window.gamosScroll` is not yet present at init time (out-of-order
   bootstrap), we warn and skip — the page still works (no scrub), and the
   user gets a posted poster image instead.

   Constitution alignment
   ----------------------
   §2  vanilla ESM, no external deps.
   §3  hero is excluded; this is for scenes 2-N (resort, venue, culinary, ...).
   §10 module-scoped state, init()/destroy() exported, no globals.
   ========================================================================= */

const SCENE_SELECTOR = "section[data-scrub]";
const PROGRESS_THROTTLE_S = 0.04;
const DEFAULT_SPACER_VH = 300;

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

/** @type {Map<string, SceneRecord>} */
const _scenes = new Map();
let _initDone = false;

/**
 * @typedef {Object} SceneRecord
 * @property {string} id
 * @property {HTMLElement} el
 * @property {HTMLVideoElement|null} videoEl
 * @property {string} mode               "video" | "poster-ken-burns" | "custom"
 * @property {Function|null} customFn    when mode === "custom"
 * @property {number} duration           cached video duration when applicable
 * @property {Function|undefined} unregister   orchestrator handle.unregister
 */

/* --------------------------- helpers ---------------------------------- */

function resolveCustomHandler(name) {
  if (!name) return null;
  const fn = window[name];
  if (typeof fn !== "function") {
    console.warn(`[scroll-scene] custom handler window["${name}"] not found.`);
    return null;
  }
  return fn;
}

function applySpacerHeight(scene, vh) {
  const spacer = scene.el.querySelector(":scope > .scroll-scene__spacer");
  if (!spacer) return;
  spacer.style.setProperty("--scene-spacer", `${vh}vh`);
}

/** Default video-scrub onProgress for a given <video>. */
function makeVideoProgress(scene) {
  return function videoProgress(p) {
    // Lazy-cache duration once metadata is loaded.
    if (!scene.duration) {
      scene.duration = (scene.videoEl && scene.videoEl.duration) || 0;
      if (!scene.duration) return;
    }
    const t = p * scene.duration;
    if (Math.abs(scene.videoEl.currentTime - t) > PROGRESS_THROTTLE_S) {
      try { scene.videoEl.currentTime = t; } catch { /* ignore seek errors */ }
    }
  };
}

/** Ken-Burns onProgress: write --scene-progress as a CSS variable on the section. */
function makePosterKenBurnsProgress(scene) {
  return function kenBurnsProgress(p) {
    scene.el.style.setProperty("--scene-progress", p.toFixed(4));
  };
}

/** Custom-handler wrapper — pass scene root for convenience. */
function makeCustomProgress(scene, fn) {
  return function customProgress(p) {
    try { fn(p, scene.el); }
    catch (e) { console.error(`[scroll-scene] custom handler "${scene.id}":`, e); }
  };
}

/* --------------------------- mode detection --------------------------- */

function pickMode(el, videoEl, customName) {
  if (customName) return "custom";
  const declared = el.dataset.scrubMode || "";
  if (declared === "poster-ken-burns") return "poster-ken-burns";
  if (videoEl) return "video";
  if (el.querySelector(".scroll-scene__poster img")) return "poster-ken-burns";
  return "video";  // default; will warn if no video present
}

/* --------------------------- init / destroy --------------------------- */

export function init() {
  if (_initDone) return;
  _initDone = true;

  const orch = window.gamosScroll;
  if (!orch || typeof orch.register !== "function") {
    console.warn("[scroll-scene] window.gamosScroll missing — orchestrator must init first.");
    return;
  }

  const nodes = document.querySelectorAll(SCENE_SELECTOR);
  for (const el of nodes) {
    const id = el.dataset.scrub;
    if (!id) continue;
    if (id === "hero") continue;
    if (_scenes.has(id)) continue;        // dedupe

    const videoEl = el.querySelector("video.scroll-scene__video") || null;
    const customName = el.dataset.scrubHandler || "";
    const mode = pickMode(el, videoEl, customName);

    const scene = /** @type {SceneRecord} */ ({
      id, el, videoEl, mode,
      customFn: null,
      duration: 0,
      unregister: undefined,
    });

    // Resolve onProgress per mode.
    let onProgress;
    if (mode === "custom") {
      const fn = resolveCustomHandler(customName);
      if (!fn) continue;            // can't bind; skip
      scene.customFn = fn;
      onProgress = makeCustomProgress(scene, fn);
    } else if (mode === "poster-ken-burns") {
      onProgress = makePosterKenBurnsProgress(scene);
    } else {
      // video
      if (!videoEl) {
        console.warn(`[scroll-scene] section[data-scrub="${id}"] mode=video but no <video.scroll-scene__video> found — skipping.`);
        continue;
      }
      onProgress = makeVideoProgress(scene);

      // Pre-warm duration if metadata already cached.
      if (videoEl.readyState >= 1 && Number.isFinite(videoEl.duration)) {
        scene.duration = videoEl.duration || 0;
      } else {
        videoEl.addEventListener("loadedmetadata", () => {
          scene.duration = videoEl.duration || 0;
        }, { once: true });
      }
    }

    // Spacer height: per-section override (vh), default 300, collapsed to 100 on
    // reduced-motion / iOS (the orchestrator handles the dispatch suppression).
    const declaredVh = parseFloat(el.dataset.scrubSpacerVh);
    const spacerVh = Number.isFinite(declaredVh) ? declaredVh : DEFAULT_SPACER_VH;
    const effectiveVh = (reduceMotion || isIOS) ? 100 : spacerVh;
    applySpacerHeight(scene, effectiveVh);

    // Initial CSS variable so styles have a value before the first frame.
    if (mode === "poster-ken-burns") {
      el.style.setProperty("--scene-progress", "0");
    }

    // Register with orchestrator.
    let handle = null;
    try {
      handle = orch.register({
        id,
        el,
        videoEl: videoEl || undefined,
        spacerVh: effectiveVh,
        priority: 1,
        onProgress,
        onActivate() { el.setAttribute("data-active", ""); },
        onDeactivate() {
          el.removeAttribute("data-active");
          // Snap video back to 0 so re-entry feels fresh (desktop only — iOS loops anyway).
          if (videoEl && !isIOS) {
            try { if (videoEl.currentTime > 0.05) videoEl.currentTime = 0; }
            catch { /* ignore */ }
          }
        },
      });
    } catch (e) {
      console.error(`[scroll-scene] orchestrator.register failed for "${id}":`, e);
      continue;
    }

    if (handle && typeof handle.unregister === "function") {
      scene.unregister = handle.unregister;
    }
    _scenes.set(id, scene);
  }
}

export function destroy() {
  if (!_initDone) return;
  for (const scene of _scenes.values()) {
    if (typeof scene.unregister === "function") {
      try { scene.unregister(); } catch { /* ignore */ }
    }
  }
  _scenes.clear();
  _initDone = false;
}
