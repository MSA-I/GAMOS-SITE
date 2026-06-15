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

   3) "canvas-frames" (data-scrub-mode="canvas-frames")  [Agent 21, 2026-06-01]
        → driven by a <canvas class="scroll-scene__canvas"
            data-manifest-url="..."> element. We fetch the manifest, build a
          renderer via canvas-frame-renderer.js, kick off two-phase preload,
          and on each onProgress(p) call drawFrame(floor(p*(N-1))). Migrated
          from <video> for iOS scrub smoothness.

   4) "custom" (data-scrub-handler="<windowFnName>")
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

import { createRenderer } from "./canvas-frame-renderer.js";
import { prefersReducedMotion } from "./utils/media-query.js";

const SCENE_SELECTOR = "section[data-scrub]";
const PROGRESS_THROTTLE_S = 0.04;
const DEFAULT_SPACER_VH = 300;

const reduceMotion = prefersReducedMotion();
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
 * @property {HTMLCanvasElement|null} canvasEl   when mode === "canvas-frames"
 * @property {object|null} renderer              canvas-frame-renderer instance
 * @property {number} canvasFrameCount           cached after manifest fetch
 * @property {number} lastDrawnFrame             dedupe drawFrame calls
 * @property {string} mode  "video" | "poster-ken-burns" | "canvas-frames" | "custom"
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

/** Canvas-frames onProgress: drawFrame(floor(p*(N-1))) — only on index change.
 *  Optional rotation: data-scrub-frame-offset="0..1" rotates the frame
 *  mapping so the scrub starts mid-clip and wraps around. (Used by
 *  culinary so the clip opens on its money-shot, not the boring intro.)
 *  Optional reverse: data-scrub-reverse on the section flips playback
 *  direction (last frame first → first frame last). Composes with offset:
 *  the offset is applied first, then the result is reversed. */
function makeCanvasFramesProgress(scene) {
  // Cache the offset as a normalized [0, 1) fraction.
  const raw = parseFloat(scene.el.dataset.scrubFrameOffset || "0");
  const offset = Number.isFinite(raw) ? ((raw % 1) + 1) % 1 : 0;
  const reverse = scene.el.dataset.scrubReverse !== undefined
               && scene.el.dataset.scrubReverse !== "false";
  return function canvasFramesProgress(p) {
    if (!scene.renderer || !scene.canvasFrameCount) return;
    const N = scene.canvasFrameCount;
    let idx = Math.floor(p * (N - 1));
    if (offset > 0) {
      idx = (idx + Math.floor(offset * N)) % N;
    }
    if (reverse) idx = (N - 1) - idx;
    if (idx < 0) idx = 0;
    if (idx > N - 1) idx = N - 1;
    if (idx === scene.lastDrawnFrame) return;
    scene.lastDrawnFrame = idx;
    scene.renderer.drawFrame(idx);
  };
}

/* --------------------------- mode detection --------------------------- */

function pickMode(el, videoEl, canvasEl, customName) {
  if (customName) return "custom";
  const declared = el.dataset.scrubMode || "";
  if (declared === "canvas-frames") return "canvas-frames";
  if (declared === "poster-ken-burns") return "poster-ken-burns";
  if (canvasEl) return "canvas-frames";
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
    const canvasEl = el.querySelector("canvas.scroll-scene__canvas") || null;
    const customName = el.dataset.scrubHandler || "";
    const mode = pickMode(el, videoEl, canvasEl, customName);

    const scene = /** @type {SceneRecord} */ ({
      id, el, videoEl, canvasEl, mode,
      renderer: null,
      canvasFrameCount: 0,
      lastDrawnFrame: -1,
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
    } else if (mode === "canvas-frames") {
      if (!canvasEl) {
        console.warn(`[scroll-scene] section[data-scrub="${id}"] mode=canvas-frames but no <canvas.scroll-scene__canvas> found — skipping.`);
        continue;
      }
      // Cinematic scrollytelling owner — js/scrollytelling.js takes over.
      // Skip here so we don't double-bind the canvas.
      if (canvasEl.hasAttribute("data-scrollytelling")) {
        continue;
      }
      const manifestUrl = canvasEl.dataset.manifestUrl;
      if (!manifestUrl) {
        console.warn(`[scroll-scene] canvas-frames scene "${id}" missing data-manifest-url — skipping.`);
        continue;
      }
      onProgress = makeCanvasFramesProgress(scene);
      // Async: fetch manifest -> build renderer -> preload -> mark ready.
      // The orchestrator calls onProgress(0) on register (reduce-motion) or
      // on first scroll. Until renderer.drawFrame works, calls are no-ops
      // (handled inside makeCanvasFramesProgress via canvasFrameCount === 0).
      (async () => {
        try {
          const res = await fetch(manifestUrl, { credentials: "same-origin" });
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const manifest = await res.json();
          scene.canvasFrameCount = manifest.frameCount | 0;
          scene.renderer = createRenderer({ canvas: canvasEl, manifest });
          await scene.renderer.preload();
          canvasEl.classList.add("is-ready");
          // Force first paint. If the scene rotates the scrub via
          // data-scrub-frame-offset (e.g. culinary starts at 50%), paint
          // the rotated frame index so the user doesn't see frame 0 flash
          // before the first scroll tick.
          const offsetRaw = parseFloat(scene.el.dataset.scrubFrameOffset || "0");
          const offset = Number.isFinite(offsetRaw) ? ((offsetRaw % 1) + 1) % 1 : 0;
          const firstFrame = offset > 0
            ? Math.floor(offset * scene.canvasFrameCount) % scene.canvasFrameCount
            : 0;
          scene.renderer.drawFrame(firstFrame);
        } catch (e) {
          console.error(`[scroll-scene] canvas-frames "${id}" manifest/preload failed:`, e);
        }
      })();
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
    // reduced-motion. Also collapsed on iOS for video-mode scenes (their
    // orchestrator suppresses progress) but NOT canvas-frames scenes — those
    // scrub smoothly on iOS, so they keep the full spacer.
    const declaredVh = parseFloat(el.dataset.scrubSpacerVh);
    const spacerVh = Number.isFinite(declaredVh) ? declaredVh : DEFAULT_SPACER_VH;
    const collapseOnIOS = (mode === "video");  // canvas-frames + ken-burns work on iOS
    const effectiveVh = reduceMotion ? 100
                      : (isIOS && collapseOnIOS) ? 100
                      : spacerVh;
    applySpacerHeight(scene, effectiveVh);

    // Initial CSS variable so styles have a value before the first frame.
    if (mode === "poster-ken-burns") {
      el.style.setProperty("--scene-progress", "0");
    }

    // canvas-frames: hook resize so DPR scaling adjusts on viewport change.
    if (mode === "canvas-frames" && canvasEl) {
      const onResize = () => { if (scene.renderer) scene.renderer.resize(); };
      window.addEventListener("resize", onResize, { passive: true });
      // Stash the listener on the scene record for destroy().
      scene._cleanups = scene._cleanups || [];
      scene._cleanups.push(() => window.removeEventListener("resize", onResize));
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
          // The orchestrator already pauses the video on deactivate. We don't
          // snap currentTime back to 0 here — that would cause a visible flash
          // when the user scrolls past quickly enough that the scene briefly
          // deactivates and reactivates within a few frames.
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
    if (scene.renderer && typeof scene.renderer.destroy === "function") {
      try { scene.renderer.destroy(); } catch { /* ignore */ }
    }
    if (Array.isArray(scene._cleanups)) {
      for (const fn of scene._cleanups) {
        try { fn(); } catch { /* ignore */ }
      }
    }
  }
  _scenes.clear();
  _initDone = false;
}
