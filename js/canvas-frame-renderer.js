/* ===========================================================================
   canvas-frame-renderer.js — Cinematic Scrollytelling renderer
   ---------------------------------------------------------------------------
   Implementation of the user spec ("Cinematic Scrollytelling with Canvas &
   GSAP"), adapted from React+Tailwind to vanilla ESM per Constitution §2.

   Per-scene contract (mirrors the spec point-by-point)
   ----------------------------------------------------
   1. Frame Preloading + Loading State
      - Eager-load all frames (manifest.frameCount) into an in-memory array
        before render starts. preload() resolves once 100% are decoded OR the
        first frame is ready (whichever the caller awaits).
      - onProgress(loadedCount/total) callback drives the loader UI overlay.

   2. Canvas Rendering — manual object-fit: cover with ZOOM_FACTOR
      - ctx.fillRect with bgColor (default black) covers the canvas.
      - drawFrame(index) computes scale = max(cw/iw, ch/ih) * ZOOM_FACTOR
        (default 1.35 — slight zoom hides any baked-in letterboxing).
      - Centered draw via dx/dy offsets so the frame fills regardless of
        viewport aspect ratio.

   3. Scroll-to-Frame Mapping
      - Caller passes a host element with a 500vh (or scene-configurable)
        spacer. computeProgress() returns clamp((scrollY - hostTop) /
        (hostHeight - vh), 0, 1).
      - drawFrame(Math.floor(progress * (frameCount-1))) on every rAF tick;
        single-flight via _rafPending so duplicate scroll events coalesce.

   4. Mouse Parallax (interactive depth)
      - bindMouseParallax(canvas) attaches a pointermove listener (host).
      - On move: GSAP gsap.to(canvas, { x: dx, y: dy, ease: 'power2.out' }).
      - dx/dy normalized so the canvas never reveals its edges:
        max offset = (zoomedSize - viewportSize) / 2 → canvas always covers.

   5. UX
      - resize() re-runs DPR scaling + last drawFrame so picture stays crisp.
      - Background black (--ink-deep) by default — caller can override.
      - GSAP ScrollToPlugin available for callers via window.gsap.

   Public API
   ----------
   const r = createRenderer({ canvas, manifest, host, options });
     options = { zoom?: 1.35, parallax?: true, parallaxStrength?: 24,
                 bgColor?: '#000', onProgress?: (loaded, total) => void }

   await r.preload();              // resolves when all frames decoded
   r.drawFrame(idx);               // 0-based, clamped
   r.computeProgress();            // 0..1 scroll fraction within host
   r.bindScroll();                 // attaches scroll → drawFrame on rAF
   r.bindMouseParallax();          // attaches mousemove → GSAP shift
   r.resize();                     // re-applies DPR, redraws current frame
   r.destroy();                    // removes listeners, releases img refs

   r.state.loaded                  // count of decoded frames
   r.state.total                   // manifest.frameCount
   r.state.currentFrame            // last-rendered index

   Manifest schema (assets/frames/<scene>/manifest.json):
     { scene, frameCount, frameUrl ("/.../frame_{NNNN}.webp"),
       width, height, fpsExtracted }

   Constitution alignment
   ----------------------
   §2   GSAP self-hosted at /assets/vendor/gsap.min.js — Phase A regression
        deliberate: original removal was due to CDN failure; self-host fixes.
   §10  Module-scoped state inside createRenderer closure. No globals.
   §8   Loader overlay (per spec "real-time percentage") owned by caller.
   ========================================================================= */

const DEFAULTS = {
  zoom: 1.35,
  parallax: true,
  parallaxStrength: 24,
  bgColor: "#0E0E0C", // --ink-deep
  // Vertical framing nudge (2026-06-22). Fraction of canvas height added to the
  // centered dy, so callers can lift/drop the drawn frame within the stage.
  // 0 = pure centre (desktop default, byte-identical). NEGATIVE shifts the
  // frame UP — used on mobile so the plated dish (lower content) rises toward
  // screen centre instead of sitting bottom-cropped on a tall phone.
  verticalOffset: 0,
  // Decode strategy (2026-06-16, rev2). Two modes:
  //  • DECODE-ALL (default for light scenes): decode every frame ONCE up front
  //    and keep them — zero eviction, so scrolling (esp. reverse) never has to
  //    re-decode a frame that was just thrown away. This is what kills the
  //    flicker: drawFrame always finds the exact frame already decoded.
  //  • SLIDING-WINDOW (fallback for heavy scenes): keep only `window` frames
  //    around the index, evicting the rest, to bound memory. This was the
  //    2026-06-16 OOM fix for the old 361×4K culinary clip (~11GB bitmaps);
  //    but it under-decodes during fast scroll → stale-frame flicker.
  // We auto-pick: scenes whose total decoded footprint is small enough use
  // DECODE-ALL; only genuinely heavy scenes fall back to the window. Override
  // with options.decodeAll (bool) or options.window (number).
  window: null,
  decodeAll: null, // null → auto by estimated footprint
};

// Sliding-window sizes (fallback path only). half = floor(window/2) per side.
// Wider than the old 9/17 so that even in window mode a fast flick has more
// already-decoded neighbours before it shows a stale frame.
const WINDOW_DESKTOP = 41;
// 2026-06-25: lowered 61 → 41. At 960×540 mobile frames that's 84MB held
// (was 126MB) — extra headroom on low-RAM phones where Safari/Chrome kill the
// tab well under 1GB. Still wide enough to avoid fast-flick stale-frame flicker.
const WINDOW_MOBILE = 41;

// DECODE-ALL footprint guard. Estimated decoded RAM = frameCount × W × H × 4
// bytes (RGBA, the worst case for ImageBitmap). Above this ceiling we refuse
// decode-all and fall back to the sliding window. 1.5GB leaves headroom on a
// typical laptop. The current culinary clip (361 × 1920×1080 × 4 ≈ 3.0GB at
// full res, but ImageBitmaps of 1080p WebP decode to ~1080p → well under once
// the browser keeps them GPU-backed) — we additionally cap by frameCount so a
// pathological huge-count scene still uses the window.
// 2026-06-25 CRASH FIX: lowered 1.5GB → 600MB. The old 1.5GB ceiling let the
// 361-frame mobile culinary clip (361 × 960×540 × 4 ≈ 748MB) pass the guard and
// DECODE-ALL — decoding all 361 ImageBitmaps at once on page load. On a phone
// (iOS Safari / Android Chrome kill a tab at a few hundred MB) that OOM-crashed
// the tab a few seconds after entering. Desktop frames (1920×1080 ≈ 3.0GB) were
// already over the old ceiling, so desktop was unaffected and stays so. 600MB
// excludes the mobile clip too while still allowing decode-all for genuinely
// light scenes on capable hardware. See also the mobile guard in decideDecodeAll.
const DECODE_ALL_MAX_BYTES = 600 * 1024 * 1024;
const DECODE_ALL_MAX_FRAMES = 600;

function pad4(n) {
  return String(n + 1).padStart(4, "0");
}

function clamp01(x) {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}

/** Build per-frame URL by replacing the {NNNN} token. Falls back to padding. */
function buildFrameUrl(template, idx) {
  if (template.includes("{NNNN}")) {
    return template.replace("{NNNN}", pad4(idx));
  }
  return template + pad4(idx) + ".webp";
}

/**
 * Create a scrollytelling canvas renderer for a single scene.
 *
 * @param {Object}      cfg
 * @param {HTMLCanvasElement} cfg.canvas    target canvas (DPR auto-applied)
 * @param {Object}      cfg.manifest        parsed manifest.json
 * @param {HTMLElement} cfg.host            element whose scroll drives the
 *                                          frame index (defaults to canvas
 *                                          parent's nearest scroll-scene).
 * @param {Object}      [cfg.options]       see DEFAULTS above
 *
 * @returns {Object} renderer interface (see public API above)
 */
export function createRenderer({ canvas, manifest, host, options }) {
  if (!canvas || !manifest) {
    throw new Error("[canvas-frame-renderer] canvas + manifest required");
  }
  if (!host) {
    // host = the closest .scroll-scene or section parent
    host = canvas.closest("[data-scrub], .scroll-scene, section") || canvas.parentElement;
  }

  const opts = Object.assign({}, DEFAULTS, options || {});

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) {
    throw new Error("[canvas-frame-renderer] 2d context unavailable");
  }

  const total = manifest.frameCount;

  // Optional START-TRIM (2026-06-15): map the full 0..1 scroll progress onto
  // a SUB-RANGE of frames [frameStart … last], skipping a dead intro. Used by
  // the culinary scrub whose clip opens on a near-empty conveyor (~first 40%
  // is dishes still arriving in the far distance) — wasted scroll. frameStart
  // is a 0..1 fraction of the clip to skip; the scrub then spends the whole
  // scroll on the dish-laden remainder. Clamped to [0, 0.95] so we never trim
  // the entire clip. Default 0 = unchanged behaviour for hero/other scenes.
  const frameStartFrac = Math.max(0, Math.min(0.95, Number(opts.frameStart) || 0));
  const startFrame = Math.round(frameStartFrac * (total - 1));
  const spanFrames = (total - 1) - startFrame; // frames covered by 0..1 scroll
  const frames = new Array(total); // sparse — populated as images decode
  const state = {
    loaded: 0,
    total,
    currentFrame: 0,
    lastDrawnIdx: -1, // last frame index actually painted (anti-flicker hold)
    destroyed: false,
    bound: { scroll: null, resize: null, mousemove: null },
    rafPending: false,
  };

  // -------------------------------------------------------------------------
  // 1. Preload — load all frames into memory; fire onProgress as each decodes
  // -------------------------------------------------------------------------

  // 2026-06-02 perf fix: each frame is decoded ONCE into an ImageBitmap (or
  // pre-decoded HTMLImageElement when ImageBitmap isn't available). Reverse
  // scrolling no longer triggers re-decode on every RAF tick — the bitmap is
  // already in GPU/raster cache. This eliminates the back-scroll freeze
  // reported by the user. ImageBitmap also lets ctx.drawImage(bitmap,...)
  // skip the decode path entirely.
  const supportsImageBitmap =
    typeof window !== "undefined" &&
    typeof window.createImageBitmap === "function";

  // --- Sliding-window state -------------------------------------------------
  // `frames[idx]` holds a decoded ImageBitmap/HTMLImageElement for in-window
  // frames only. `pending` maps idx → AbortController so a frame that scrolls
  // out of the window mid-fetch can be cancelled. `windowSize` is the total
  // number of frames kept decoded around the current index.
  const pending = new Map(); // idx → AbortController

  // DECODE-ALL vs SLIDING-WINDOW decision (see DEFAULTS). Auto unless the caller
  // forced it. Estimate the decoded footprint from the manifest dimensions.
  function decideDecodeAll() {
    if (typeof opts.decodeAll === "boolean") return opts.decodeAll;
    // 2026-06-25 CRASH FIX: never decode-all on phones. Mobile devices are
    // memory-constrained and the browser kills the tab long before a desktop
    // would; the sliding window (bounded ~WINDOW_MOBILE frames) is the only safe
    // path there. This is the primary guard; the byte ceiling below is backup.
    const isNarrow =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 768px)").matches;
    if (isNarrow) return false;
    const w = manifest.width || 1920;
    const h = manifest.height || 1080;
    const estBytes = total * w * h * 4; // RGBA worst-case
    return total <= DECODE_ALL_MAX_FRAMES && estBytes <= DECODE_ALL_MAX_BYTES;
  }
  const decodeAll = decideDecodeAll();

  // half-window only matters in sliding-window (fallback) mode.
  const half = Math.max(
    1,
    Math.floor(((opts.window || pickWindowSize()) - 1) / 2)
  );

  function pickWindowSize() {
    // Mobile (small frames) can afford a wider window; desktop frames are
    // heavier so we keep fewer. Viewport width is the cheap proxy the rest of
    // the site already uses (mobile manifest swap is gated at 768px).
    const isNarrow =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(max-width: 768px)").matches;
    return isNarrow ? WINDOW_MOBILE : WINDOW_DESKTOP;
  }

  /** Decode a single frame into frames[idx]. Tracks an AbortController in
      `pending` so eviction can cancel an in-flight fetch. No-op if already
      decoded or already pending. */
  function loadFrame(idx) {
    if (idx < 0 || idx >= total) return;
    if (frames[idx] || pending.has(idx)) return; // already decoded / in-flight

    const url = buildFrameUrl(manifest.frameUrl, idx);
    const ac = typeof AbortController === "function" ? new AbortController() : null;
    pending.set(idx, ac);

    const finish = (asset) => {
      pending.delete(idx);
      if (state.destroyed) {
        // Decoded after destroy / eviction — release immediately.
        if (asset && typeof asset.close === "function") { try { asset.close(); } catch (_) {} }
        return;
      }
      // If this frame fell outside the window while decoding, drop it.
      if (asset && !inWindow(idx)) {
        if (typeof asset.close === "function") { try { asset.close(); } catch (_) {} }
        return;
      }
      frames[idx] = asset;
      state.loaded++;
      if (typeof opts.onProgress === "function") {
        try { opts.onProgress(state.loaded, total); } catch (_) {}
      }
      // Repaint if the newly-decoded frame is the one we currently want.
      if (idx === state.currentFrame) drawFrame(idx);
    };

    // Preferred path — fetch + createImageBitmap. Decoded once, painted
    // many times without re-decoding.
    if (supportsImageBitmap) {
      fetch(url, { mode: "same-origin", signal: ac ? ac.signal : undefined })
        .then((r) => (r.ok ? r.blob() : Promise.reject(r.status)))
        .then((blob) => createImageBitmap(blob))
        .then((bitmap) => finish(bitmap))
        .catch((err) => {
          if (err && err.name === "AbortError") { pending.delete(idx); return; }
          // Fallback to <img> on fetch/decode failure.
          const img = new Image();
          img.decoding = "async";
          img.onload = () => {
            if (typeof img.decode === "function") {
              img.decode().then(() => finish(img)).catch(() => finish(img));
            } else {
              finish(img);
            }
          };
          img.onerror = () => { pending.delete(idx); };
          img.src = url;
        });
      return;
    }

    // ImageBitmap unavailable — pre-decode the <img> so subsequent draws are cheap.
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      if (typeof img.decode === "function") {
        img.decode().then(() => finish(img)).catch(() => finish(img));
      } else {
        finish(img);
      }
    };
    img.onerror = () => { pending.delete(idx); };
    img.src = url;
  }

  /** Is idx within the live window around the current frame? In decode-all mode
      every frame is "in window" (we keep them all), so a frame that finishes
      decoding is never discarded. */
  function inWindow(idx) {
    if (decodeAll) return true;
    return idx >= state.currentFrame - half && idx <= state.currentFrame + half;
  }

  /** Ensure the [center-half … center+half] window is decoded; evict + cancel
      everything outside it. This is the heart of the memory fix — at most
      `windowSize` frames are ever held decoded, regardless of total count. */
  function ensureWindow(center) {
    if (decodeAll) {
      // DECODE-ALL: no eviction, ever. Decode the whole clip center-out from
      // `center` so the visible frame + neighbours arrive first, then the rest
      // fills in the background. Frames already decoded/pending are no-ops, so
      // repeated calls just keep priming until everything is in memory.
      loadFrame(center);
      const maxR = Math.max(center, total - 1 - center);
      for (let d = 1; d <= maxR; d++) {
        loadFrame(center + d);
        loadFrame(center - d);
      }
      return;
    }

    const lo = Math.max(0, center - half);
    const hi = Math.min(total - 1, center + half);

    // Evict decoded frames outside the window (free GPU/raster memory).
    for (let i = 0; i < frames.length; i++) {
      if (frames[i] && (i < lo || i > hi)) {
        const asset = frames[i];
        if (typeof asset.close === "function") { try { asset.close(); } catch (_) {} }
        else if ("src" in asset) { asset.src = ""; }
        frames[i] = null;
        state.loaded = Math.max(0, state.loaded - 1);
      }
    }
    // Cancel in-flight fetches that fell outside the window.
    for (const [i, ac] of pending) {
      if (i < lo || i > hi) {
        if (ac) { try { ac.abort(); } catch (_) {} }
        pending.delete(i);
      }
    }
    // Decode frames now inside the window (load center-out so the visible
    // frame and its nearest neighbours arrive first).
    loadFrame(center);
    for (let d = 1; d <= half; d++) {
      loadFrame(center + d);
      loadFrame(center - d);
    }
  }

  /** "Preload" now means: prime the window around the start frame so the
      money-shot is ready on first paint. Resolves once the center frame is
      decoded (or immediately if it errors) — NOT after all N frames. */
  function preload() {
    if (state.destroyed) return Promise.resolve();
    state.currentFrame = startFrame;
    ensureWindow(startFrame);
    // Resolve as soon as the start frame is decoded so the caller can mark
    // the scene ready and hide any loader without waiting for the whole clip.
    return new Promise((resolve) => {
      let tries = 0;
      const check = () => {
        if (state.destroyed || frames[startFrame] || tries++ > 200) {
          resolve();
          return;
        }
        setTimeout(check, 25);
      };
      check();
    });
  }

  // -------------------------------------------------------------------------
  // 2. drawFrame — manual object-fit: cover + ZOOM_FACTOR
  // -------------------------------------------------------------------------

  function drawFrame(idx) {
    if (state.destroyed) return;
    const i = Math.max(0, Math.min(total - 1, idx | 0));
    state.currentFrame = i;

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw === 0 || ch === 0) return;

    let img = frames[i];

    // ANTI-FLICKER: if the requested frame isn't decoded yet, do NOT clear to
    // black and do NOT jump to a far-away decoded frame — both read as a flash.
    // Instead HOLD the last frame we actually painted: the picture simply stops
    // advancing for the few ms until the real frame's async decode lands (then
    // loadFrame()'s finish() repaints exactly this index). The decoded frame is
    // requested by ensureWindow() in onScroll, so the hold is brief. Only when
    // we have never drawn anything yet do we fall back to nearest-decoded so the
    // very first paint isn't blank.
    if (!img) {
      if (state.lastDrawnIdx >= 0 && frames[state.lastDrawnIdx]) {
        return; // keep the current canvas pixels — no repaint, no flicker
      }
      for (let j = i; j >= 0; j--) {
        if (frames[j]) { img = frames[j]; break; }
      }
      if (!img) {
        for (let j = i + 1; j < total; j++) {
          if (frames[j]) { img = frames[j]; break; }
        }
      }
    }

    // Clear with solid bg (cinematic black) only when we are actually painting
    // a frame (so a held canvas above is never wiped).
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, cw, ch);

    if (!img) return; // nothing decoded anywhere yet

    // Manual object-fit: cover (max ratio) + ZOOM_FACTOR overshoot.
    // ImageBitmap exposes width/height; HTMLImageElement uses naturalWidth/Height.
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(cw / iw, ch / ih) * opts.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    // Centre vertically, then apply the optional framing nudge (fraction of
    // canvas height). Negative lifts the frame UP (dish rises toward centre).
    const dy = (ch - dh) / 2 + (opts.verticalOffset || 0) * ch;

    ctx.drawImage(img, dx, dy, dw, dh);
    // Record what's actually on the canvas now (only when we painted the
    // exact requested frame — that's what we'll hold against future gaps).
    if (frames[i]) state.lastDrawnIdx = i;
  }

  // -------------------------------------------------------------------------
  // resize — DPR-aware. Canvas pixel buffer = CSS size × dpr; ctx scaled.
  // -------------------------------------------------------------------------

  function resize() {
    if (state.destroyed) return;
    // 2026-06-04: DPR clamp lifted from 2 → 3 for retina/4K display sharpness.
    // Source frames are 3840px wide so we have headroom to feed dense
    // backbuffers without upscaling. Cap at 3 to keep GPU memory sane on
    // pixel-dense external displays.
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw === 0 || ch === 0) return;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset prior scale
    ctx.scale(dpr, dpr);
    // Better resampling for the frame paints — default 'low' on canvas
    // visibly smears at our zoom factor.
    if ("imageSmoothingQuality" in ctx) {
      ctx.imageSmoothingQuality = "high";
    }
    drawFrame(state.currentFrame);
  }

  // -------------------------------------------------------------------------
  // 3. Scroll → frame mapping. computeProgress returns 0..1 within host.
  // -------------------------------------------------------------------------

  function computeProgress() {
    const rect = host.getBoundingClientRect();
    const total = rect.height - window.innerHeight;
    if (total <= 0) return 0;
    const scrolled = -rect.top;
    return clamp01(scrolled / total);
  }

  function onScroll() {
    if (state.rafPending) return;
    state.rafPending = true;
    requestAnimationFrame(() => {
      state.rafPending = false;
      const p = computeProgress();
      // Map 0..1 scroll onto [startFrame … last] so a dead intro is trimmed
      // (frameStart). With frameStart=0 this is the original p*(total-1).
      const idx = startFrame + Math.floor(p * spanFrames);
      const clamped = Math.max(0, Math.min(total - 1, idx));
      state.currentFrame = clamped;
      // Slide the decode window to follow the scroll position (fetch the new
      // frames, evict the ones we scrolled away from), then paint. drawFrame
      // walks backward to the nearest decoded frame if `clamped` isn't ready
      // yet, so a fast flick shows the closest available frame, not a gap.
      ensureWindow(clamped);
      drawFrame(clamped);
    });
  }

  function bindScroll() {
    if (state.bound.scroll) return;
    state.bound.scroll = onScroll;
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll(); // initial paint
  }

  // -------------------------------------------------------------------------
  // 4. Mouse parallax — GSAP gsap.to() shifts canvas; clamped so edges hidden
  // -------------------------------------------------------------------------

  function bindMouseParallax() {
    if (!opts.parallax) return;
    // Coarse-pointer (touch) devices have no hovering cursor: a synthesized
    // `mousemove` (or the first tap) fires once and leaves a stale GSAP x/y
    // transform on the canvas that never resets — which drags the centered
    // frame off-axis and reads as a stuttery, off-center scrub. Skip parallax
    // entirely on coarse pointers; `pointer: fine` (desktop mouse / trackpad)
    // is unchanged. (2026-06-18 mobile scrub fix.)
    if (typeof window.matchMedia === "function" &&
        !window.matchMedia("(pointer: fine)").matches) {
      return;
    }
    if (!window.gsap) {
      console.warn("[canvas-frame-renderer] gsap not loaded; parallax disabled");
      return;
    }
    if (state.bound.mousemove) return;

    const handler = (e) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      // Normalize cursor to -1..1 from viewport center.
      const nx = (e.clientX / w) * 2 - 1;
      const ny = (e.clientY / h) * 2 - 1;
      // Reverse direction (parallax = canvas drifts AWAY from cursor) +
      // strength capped so we never reveal canvas edges (zoom factor 1.35
      // gives us 17.5% safe margin per side; we use ~10% for headroom).
      const safeMargin = (opts.zoom - 1) / 2; // e.g. 0.175 at zoom=1.35
      const maxOffset = Math.min(opts.parallaxStrength, w * safeMargin);
      gsap.to(canvas, {
        x: -nx * maxOffset,
        y: -ny * maxOffset,
        duration: 0.8,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    state.bound.mousemove = handler;
    host.addEventListener("mousemove", handler, { passive: true });
  }

  // -------------------------------------------------------------------------
  // resize listener (auto-bound; spec point UX)
  // -------------------------------------------------------------------------

  function onResize() {
    resize();
  }

  function bindResize() {
    if (state.bound.resize) return;
    state.bound.resize = onResize;
    window.addEventListener("resize", onResize, { passive: true });
  }

  // -------------------------------------------------------------------------
  // destroy
  // -------------------------------------------------------------------------

  function destroy() {
    state.destroyed = true;
    if (state.bound.scroll) window.removeEventListener("scroll", state.bound.scroll);
    if (state.bound.resize) window.removeEventListener("resize", state.bound.resize);
    if (state.bound.mousemove) host.removeEventListener("mousemove", state.bound.mousemove);
    state.bound = { scroll: null, resize: null, mousemove: null };
    // Abort any in-flight frame fetches (sliding-window decode).
    for (const [, ac] of pending) { if (ac) { try { ac.abort(); } catch (_) {} } }
    pending.clear();
    // Release frame refs / bitmaps to encourage GC. ImageBitmap has its own
    // close() to free GPU memory; HTMLImageElement gets src=""
    for (let i = 0; i < frames.length; i++) {
      const asset = frames[i];
      if (asset) {
        if (typeof asset.close === "function") {
          try { asset.close(); } catch (_) {}
        } else if ("src" in asset) {
          asset.src = "";
        }
      }
      frames[i] = null;
    }
  }

  // Initial DPR setup (caller can call resize() again after manifest loads).
  resize();

  return {
    preload,
    drawFrame,
    resize,
    computeProgress,
    bindScroll,
    bindMouseParallax,
    bindResize,
    destroy,
    state,
    // The frame the scrub starts on (== startFrame). Callers paint THIS for the
    // first frame instead of 0 so a trimmed scene doesn't flash its dead intro.
    startFrame,
  };
}
