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
  // Sliding-window decode (2026-06-16): only keep `window` frames decoded in
  // memory around the current scroll index; fetch-on-demand as the index
  // moves, evict (bitmap.close) frames outside the window. This replaced the
  // old eager "decode all N frames" preload that OOM-crashed the tab on the
  // 361×4K culinary scrub (~11GB of ImageBitmaps). null → auto-pick by tier.
  window: null,
};

// Sliding-window sizes. Desktop frames are bigger (more bytes/frame) so the
// window is smaller; mobile frames are tiny (960×540) so a wider window is
// cheap and smooths fast flicks. half = floor(window/2) frames each side.
const WINDOW_DESKTOP = 9;
const WINDOW_MOBILE = 17;

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

  /** Is idx within the live window around the current frame? */
  function inWindow(idx) {
    return idx >= state.currentFrame - half && idx <= state.currentFrame + half;
  }

  /** Ensure the [center-half … center+half] window is decoded; evict + cancel
      everything outside it. This is the heart of the memory fix — at most
      `windowSize` frames are ever held decoded, regardless of total count. */
  function ensureWindow(center) {
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

    let img = frames[i];
    // Fallback: walk backward to last decoded frame.
    if (!img) {
      for (let j = i; j >= 0; j--) {
        if (frames[j]) {
          img = frames[j];
          break;
        }
      }
    }

    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw === 0 || ch === 0) return;

    // Clear with solid bg (cinematic black).
    ctx.fillStyle = opts.bgColor;
    ctx.fillRect(0, 0, cw, ch);

    if (!img) return; // nothing decoded yet

    // Manual object-fit: cover (max ratio) + ZOOM_FACTOR overshoot.
    // ImageBitmap exposes width/height; HTMLImageElement uses naturalWidth/Height.
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const scale = Math.max(cw / iw, ch / ih) * opts.zoom;
    const dw = iw * scale;
    const dh = ih * scale;
    const dx = (cw - dw) / 2;
    const dy = (ch - dh) / 2;

    ctx.drawImage(img, dx, dy, dw, dh);
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
