/* ===========================================================================
   canvas-frame-renderer.js — generic WebP frame-sequence canvas renderer
   ---------------------------------------------------------------------------
   Spec : video-to-website.md §6c (padded cover mode + DPR scaling).
   Used by: js/hero-video-scrub.js (Stage C scrub) and js/scroll-scene.js
            (mode "canvas-frames") — Hero + Culinary 2026-06-01.

   Why canvas frames instead of <video>?
   -------------------------------------
   <video.currentTime = ...> scrubbing is unreliable on iOS Safari (jitter,
   black frames, decoder restarts) and unevenly smooth on desktop browsers
   under heavy load. Pre-extracting 30fps WebP frames and drawing each frame
   into a <canvas> on demand gives 60fps deterministic scrub on every
   platform, at the cost of a larger initial download (frames stream in via
   two-phase preloader).

   Public API
   ----------
   const r = createRenderer({ canvas, manifest });
   await r.preload();             // resolves once Phase 1 (first 10 frames) ready
   r.drawFrame(idx);              // 0-based clamped to [0, frameCount-1]
   r.resize();                    // re-applies DPR scaling on container size change
   r.destroy();                   // aborts in-flight loads, releases image refs
   r.state.loaded                 // 0..1 — fraction of frames currently loaded
   r.state.phase1Ready            // boolean — first-10 frames decoded

   Manifest schema (matches assets/frames/<scene>/manifest.json):
     { scene, frameCount, frameUrl ("/.../frame_{NNNN}.webp"), width, height, ... }

   Implementation notes
   --------------------
   - DPR scaling: canvas.width = clientWidth*dpr; ctx.scale(dpr, dpr).
     drawFrame uses CSS-pixel coords (canvas.clientWidth/clientHeight) so the
     padded-cover math is the same on retina + non-retina.
   - Padded cover: scale = max(cw/iw, ch/ih) * IMAGE_SCALE (0.85). Background
     fill colour sampled from the 4 corner pixels of the first available frame
     (cached). Lets the page background blend into the frame edge.
   - Two-phase preloader:
       Phase 1: frames [0..PHASE1_COUNT) loaded in parallel; preload() resolves.
       Phase 2: frames [PHASE1_COUNT..frameCount) loaded async, no blocking.
   - Error tolerance: any frame's load() failure logs a warn and is skipped;
     drawFrame falls back to last successfully-decoded frame.
   - destroy(): abort flight, null out img.src to encourage GC.

   Constitution alignment
   ----------------------
   §2  vanilla ESM, no deps.
   §10 module-scoped state lives only in the closures returned by
        createRenderer(). No globals beyond the function export.
   ========================================================================= */

const IMAGE_SCALE = 0.85;        // padded cover sweet spot per skill Step 6c
const PHASE1_COUNT = 10;         // frames awaited by preload() Phase 1
const PHASE2_CONCURRENCY = 4;    // parallel image decodes for Phase 2


/**
 * Sample 4 corner pixels of an HTMLImageElement and return their average
 * as a CSS color string ('rgb(R,G,B)'). Falls back to 'transparent' on
 * any error (CORS, taint, no canvas2d, etc.) so we never throw mid-render.
 */
function sampleBgColor(img) {
  try {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return "transparent";
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d", { willReadFrequently: false });
    ctx.drawImage(img, 0, 0);
    const corners = [
      ctx.getImageData(0, 0, 1, 1).data,
      ctx.getImageData(w - 1, 0, 1, 1).data,
      ctx.getImageData(0, h - 1, 1, 1).data,
      ctx.getImageData(w - 1, h - 1, 1, 1).data,
    ];
    let r = 0, g = 0, b = 0;
    for (const px of corners) { r += px[0]; g += px[1]; b += px[2]; }
    return `rgb(${(r >> 2)}, ${(g >> 2)}, ${(b >> 2)})`;
  } catch { return "transparent"; }
}


/**
 * Build a frame URL: replaces "{NNNN}" with the 1-based 4-digit frame index.
 */
function buildFrameUrl(template, oneBasedIdx) {
  return template.replace("{NNNN}", String(oneBasedIdx).padStart(4, "0"));
}


/**
 * Load a single image. Returns a Promise<HTMLImageElement> that resolves
 * with the (possibly errored) Image so the caller can still keep going.
 * The 'errored' state is signalled via the .complete && !.naturalWidth pair.
 */
function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    img.fetchPriority = "low"; // Phase 2 runs at low priority
    const done = () => resolve(img);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    img.src = src;
  });
}


/**
 * Create a frame renderer bound to a <canvas> + manifest descriptor.
 *
 * @param {{ canvas: HTMLCanvasElement, manifest: { frameCount, frameUrl, width, height } }} opts
 * @returns {{ preload(): Promise<void>, drawFrame(i:number): void,
 *             resize(): void, destroy(): void,
 *             state: { loaded:number, phase1Ready:boolean } }}
 */
export function createRenderer({ canvas, manifest }) {
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new TypeError("[canvas-frame-renderer] canvas: HTMLCanvasElement required");
  }
  if (!manifest || !Number.isFinite(manifest.frameCount) || !manifest.frameUrl) {
    throw new TypeError("[canvas-frame-renderer] manifest with frameCount + frameUrl required");
  }

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  if (!ctx) throw new Error("[canvas-frame-renderer] 2D context unavailable");

  const N = manifest.frameCount | 0;
  /** @type {(HTMLImageElement|null)[]} */
  const frames = new Array(N).fill(null);
  let loadedCount = 0;
  let phase1Ready = false;
  let bgColor = "rgb(20, 18, 16)";   // fallback until first frame samples
  let bgSampled = false;
  let lastDrawnIdx = -1;
  let destroyed = false;
  let dpr = 1;
  let cssW = 0, cssH = 0;

  // ---------------------------------------------------------------------
  // Sizing — DPR-aware. Uses the canvas client box (set by CSS).
  // ---------------------------------------------------------------------
  function resize() {
    if (destroyed) return;
    dpr = Math.min(window.devicePixelRatio || 1, 2);  // cap at 2x — diminishing returns above
    cssW = canvas.clientWidth || canvas.width || 1;
    cssH = canvas.clientHeight || canvas.height || 1;
    const physW = Math.max(1, Math.round(cssW * dpr));
    const physH = Math.max(1, Math.round(cssH * dpr));
    if (canvas.width !== physW)  canvas.width = physW;
    if (canvas.height !== physH) canvas.height = physH;
    // Reset transform after width/height set (which clears the matrix).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Force a redraw of the last frame (or fill with bg if none drawn yet).
    if (lastDrawnIdx >= 0) {
      drawFrame(lastDrawnIdx);
    } else {
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, cssW, cssH);
    }
  }

  // ---------------------------------------------------------------------
  // Draw — padded cover, with background fill so the inset edge blends.
  // ---------------------------------------------------------------------
  function drawFrame(idx) {
    if (destroyed) return;
    const i = Math.max(0, Math.min(N - 1, idx | 0));
    let img = frames[i];
    // Fallback: last successfully drawn frame
    if (!img || !img.complete || !img.naturalWidth) {
      // Walk backwards to find a loaded frame.
      for (let j = i - 1; j >= 0; j--) {
        if (frames[j] && frames[j].complete && frames[j].naturalWidth) {
          img = frames[j]; break;
        }
      }
      if (!img) {
        // Nothing yet: just fill background.
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, cssW, cssH);
        return;
      }
    }

    const cw = cssW, ch = cssH;
    const iw = img.naturalWidth, ih = img.naturalHeight;
    const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
    const dw = iw * scale, dh = ih * scale;
    const dx = (cw - dw) / 2, dy = (ch - dh) / 2;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, cw, ch);
    ctx.drawImage(img, dx, dy, dw, dh);
    lastDrawnIdx = i;
  }

  // ---------------------------------------------------------------------
  // Loading — phase 1 awaited, phase 2 streamed in background.
  // ---------------------------------------------------------------------
  async function loadOne(idx) {
    if (destroyed || frames[idx]) return;
    const url = buildFrameUrl(manifest.frameUrl, idx + 1);
    const img = await loadImage(url);
    if (destroyed) { return; }
    if (!img.complete || !img.naturalWidth) {
      // Errored — leave slot null, but count it as 'attempted' so loaded fraction progresses.
      console.warn(`[canvas-frame-renderer] frame ${idx + 1} failed to load: ${url}`);
      loadedCount++;
      return;
    }
    frames[idx] = img;
    loadedCount++;
    // Sample bg color from the first successful frame.
    if (!bgSampled) {
      bgColor = sampleBgColor(img);
      bgSampled = true;
    }
  }

  async function preloadPhase2() {
    // Concurrency-limited streaming: a worker pool of N parallel loaders.
    let nextIdx = PHASE1_COUNT;
    async function worker() {
      while (!destroyed && nextIdx < N) {
        const i = nextIdx++;
        await loadOne(i);
      }
    }
    const workers = [];
    for (let k = 0; k < PHASE2_CONCURRENCY; k++) {
      workers.push(worker());
    }
    await Promise.all(workers);
  }

  /** Phase 1 + spawn Phase 2 (returns when Phase 1 is ready). */
  async function preload() {
    // Phase 1: parallel-await frames 0 .. min(PHASE1_COUNT, N) - 1
    const p1Count = Math.min(PHASE1_COUNT, N);
    const p1 = [];
    for (let i = 0; i < p1Count; i++) p1.push(loadOne(i));
    await Promise.all(p1);
    if (destroyed) return;
    phase1Ready = true;
    // Initial size + first paint
    resize();
    drawFrame(0);
    // Phase 2 streams asynchronously.
    if (N > PHASE1_COUNT) {
      // Don't await — let it run in background.
      preloadPhase2().catch(() => {});
    }
  }

  function destroy() {
    destroyed = true;
    for (let i = 0; i < N; i++) {
      const img = frames[i];
      if (img) {
        try { img.src = ""; } catch { /* ignore */ }
        frames[i] = null;
      }
    }
  }

  return {
    preload,
    drawFrame,
    resize,
    destroy,
    state: {
      get loaded() { return N === 0 ? 1 : loadedCount / N; },
      get phase1Ready() { return phase1Ready; },
    },
  };
}
