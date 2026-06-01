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
};

const PHASE1_COUNT = 10; // first frames eager-decoded for fast first paint

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

  function loadFrame(idx) {
    return new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        frames[idx] = img;
        state.loaded++;
        if (typeof opts.onProgress === "function") {
          try {
            opts.onProgress(state.loaded, total);
          } catch (_) {}
        }
        resolve(img);
      };
      img.onerror = () => {
        // Swallow — drawFrame will fall back to last good frame.
        state.loaded++;
        if (typeof opts.onProgress === "function") {
          try {
            opts.onProgress(state.loaded, total);
          } catch (_) {}
        }
        resolve(null);
      };
      img.src = buildFrameUrl(manifest.frameUrl, idx);
    });
  }

  /** Preload all frames. Resolves when all are decoded (or errored).
      The two-phase split is implicit: first 10 launched first, kicks paint;
      remaining are fired in parallel right after, and the awaited promise
      yields when ALL settle. */
  async function preload() {
    if (state.destroyed) return;
    const phase1 = [];
    for (let i = 0; i < Math.min(PHASE1_COUNT, total); i++) {
      phase1.push(loadFrame(i));
    }
    await Promise.all(phase1); // first paint can happen now
    if (state.destroyed) return;

    // Phase 2: remaining frames in parallel
    const phase2 = [];
    for (let i = PHASE1_COUNT; i < total; i++) {
      phase2.push(loadFrame(i));
    }
    await Promise.all(phase2);
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
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
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
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth;
    const ch = canvas.clientHeight;
    if (cw === 0 || ch === 0) return;
    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // reset prior scale
    ctx.scale(dpr, dpr);
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
      const idx = Math.floor(p * (total - 1));
      drawFrame(idx);
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
    // Release img refs to encourage GC.
    for (let i = 0; i < frames.length; i++) {
      if (frames[i]) frames[i].src = "";
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
  };
}
