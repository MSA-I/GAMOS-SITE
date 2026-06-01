/**
 * scroll-orchestrator.js — Single-RAF scroll-scene registry
 *
 * Constitution refs:
 *   §2  vanilla ESM, no framework, no CDN
 *   §3  hero stays multi-stage; this orchestrator is the bridge for V2 scenes
 *   §10 module-scoped, init() / destroy(), tokens single-source
 *
 * Spec: architecture/scroll-orchestrator.md (THE SOURCE OF TRUTH).
 *
 * Mental model
 * ------------
 * One singleton owns:
 *   - the only window.scroll listener (passive: true)
 *   - the only requestAnimationFrame for scrub work
 *   - one IntersectionObserver to drive activation (which scene is "in view")
 *   - one IntersectionObserver to drive lazy mounting (preload near, release far)
 *
 * A scene = anything that wants `onProgress(p)` calls while the user scrolls
 * through its block-axis range. Hero is a scene with priority: 10 (long sticky,
 * 700vh, must stay active until its own --hero-progress reaches 1.0). Other
 * scenes (resort, culinary, venue) default priority: 1.
 *
 * Public API: window.gamosScroll = { register, unregister, getActive, onSceneChange }
 * Module API: init(), destroy()
 */

// ---------------------------------------------------------------------------
// Module-scoped state — captured by destroy()
// ---------------------------------------------------------------------------

const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const reducedMQ = matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = reducedMQ.matches;

let _initDone = false;
let _scrollHandler = null;
let _resizeHandler = null;
let _reducedListener = null;
let _rafPending = false;
let _viewportHeight = 0;

// Scenes registered with the orchestrator. Map preserves insertion order
// (used as DOM-order tie-breaker per spec §5).
const _scenes = new Map();   // id -> sceneRecord
const _sceneChangeListeners = new Set();

let _activeId = null;

// IntersectionObserver instances
let _activeObserver = null;
let _nearObserver = null;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Compute progress for a scene element: 0 at top of sticky range, 1 at end. */
function computeProgressForScene(scene) {
  const rect = scene.el.getBoundingClientRect();
  const total = rect.height - _viewportHeight;
  const scrolled = -rect.top;
  if (total <= 0) return 0;
  return Math.max(0, Math.min(1, scrolled / total));
}

/** Hero priority lock: stays active until --hero-progress reaches 1.0. */
function heroProgressIsTerminal() {
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue("--hero-progress")
    .trim();
  if (!raw) return false;
  const v = parseFloat(raw);
  return Number.isFinite(v) && v >= 0.999;
}

/** Whether the viewport center falls inside this scene's block-axis range. */
function centerInRect(rect) {
  const center = _viewportHeight / 2;
  return rect.top <= center && rect.bottom >= center;
}

/** Notify subscribers of an active-scene change. */
function emitSceneChange(prev, next) {
  for (const cb of _sceneChangeListeners) {
    try { cb(next, prev); }
    catch (e) { console.error("[scroll-orchestrator] onSceneChange listener:", e); }
  }
}

/** Mark a scene activated/deactivated and run its hooks (with try/catch). */
function setActiveScene(nextId) {
  if (_activeId === nextId) return;

  const prevId = _activeId;
  const prev = prevId != null ? _scenes.get(prevId) : null;
  const next = nextId != null ? _scenes.get(nextId) : null;

  _activeId = nextId;

  if (prev) {
    prev.isActive = false;
    // Compute terminal progress for the deactivating scene.
    const p = computeProgressForScene(prev);
    const edgeP = p < 0.5 ? 0 : 1;
    if (typeof prev.cfg.onDeactivate === "function") {
      try { prev.cfg.onDeactivate(edgeP); }
      catch (e) { console.error("[scroll-orchestrator] onDeactivate:", e); }
    }
    // Default behavior: if scene declared its videoEl, pause it.
    if (prev.cfg.videoEl && prev.id !== "hero") {
      try { prev.cfg.videoEl.pause(); } catch { /* ignore */ }
    }
  }

  if (next) {
    next.isActive = true;
    if (typeof next.cfg.onActivate === "function") {
      try { next.cfg.onActivate(); }
      catch (e) { console.error("[scroll-orchestrator] onActivate:", e); }
    }
    // Default: if a videoEl is attached, ensure preload is at least metadata.
    if (next.cfg.videoEl && next.id !== "hero") {
      const v = next.cfg.videoEl;
      if (v.preload === "none") v.preload = "metadata";
      // iOS: switch into autoplay-loop mode (no scrub).
      if (isIOS) {
        try {
          v.loop = true;
          v.muted = true;
          const p = v.play();
          if (p && typeof p.catch === "function") p.catch(() => {});
        } catch { /* ignore */ }
      }
    }
    // Schedule a tick so the new scene reflects current scroll immediately.
    requestTick();
  }

  emitSceneChange(prevId, nextId);
}

/** Pick the active scene per the §5 algorithm. */
function recomputeActive() {
  if (_scenes.size === 0) {
    if (_activeId !== null) setActiveScene(null);
    return;
  }

  // Hero priority lock: if hero is registered and its --hero-progress < 1, hero wins.
  const hero = _scenes.get("hero");
  if (hero && !heroProgressIsTerminal()) {
    // But only if hero is at least partially in viewport (rect.bottom > 0 and rect.top < vh).
    const r = hero.el.getBoundingClientRect();
    if (r.bottom > 0 && r.top < _viewportHeight) {
      if (_activeId !== "hero") setActiveScene("hero");
      return;
    }
  }

  // Standard candidate set: intersectionRatio >= 0.5 AND viewport-center in rect.
  // We use direct rect math here (not stored ratios) since IO ratios can be stale
  // mid-scroll and we already pay for getBoundingClientRect on the active scene.
  let best = null;
  let bestPriority = -1;
  for (const scene of _scenes.values()) {
    if (scene.id === "hero") continue;  // handled above
    const r = scene.el.getBoundingClientRect();
    if (r.height <= 0) continue;
    const visible = Math.max(0, Math.min(_viewportHeight, r.bottom) - Math.max(0, r.top));
    const ratio = visible / Math.min(_viewportHeight, r.height);
    if (ratio < 0.5) continue;
    if (!centerInRect(r)) continue;
    const prio = scene.cfg.priority || 0;
    if (prio > bestPriority) {
      best = scene;
      bestPriority = prio;
    }
  }

  // No candidate — but hero might still be in view trailing. If hero is in view
  // (any portion) and progress is terminal, no scene is "active": let the next
  // scene (if any) win on its own merit (handled above). Otherwise null.
  if (!best) {
    // Fallback: if hero is in view (post-terminal), just deactivate.
    if (_activeId !== null) setActiveScene(null);
    return;
  }

  if (_activeId !== best.id) setActiveScene(best.id);
}

/** Per-frame: feed onProgress to the active scene only. */
function tickActive() {
  _rafPending = false;
  if (_activeId == null) return;
  const scene = _scenes.get(_activeId);
  if (!scene) return;

  // Reduced-motion: never dispatch scrub. (Initial onProgress(0) already fired.)
  if (reduceMotion) return;

  // iOS suppresses progress events for non-hero scenes (autoplay-loop mode).
  if (isIOS && scene.id !== "hero") return;

  let p;
  try { p = computeProgressForScene(scene); }
  catch { return; }

  try { scene.cfg.onProgress(p); }
  catch (e) { console.error("[scroll-orchestrator] onProgress:", e); }
}

function requestTick() {
  if (_rafPending) return;
  _rafPending = true;
  requestAnimationFrame(tickActive);
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

function onScroll() {
  // Active recomputation is cheap (one rect per scene); always re-decide before tick.
  recomputeActive();
  requestTick();
}

function onResize() {
  _viewportHeight = window.innerHeight;
  recomputeActive();
  requestTick();
}

function onReducedChange(e) {
  reduceMotion = e.matches;
  // When toggling reduced motion ON, fire onProgress(0) once for active scene,
  // pause its video. When toggling OFF, kick a tick.
  if (reduceMotion && _activeId != null) {
    const scene = _scenes.get(_activeId);
    if (scene) {
      try { scene.cfg.onProgress(0); } catch { /* ignore */ }
      if (scene.cfg.videoEl && scene.id !== "hero") {
        try { scene.cfg.videoEl.pause(); } catch { /* ignore */ }
      }
    }
  } else {
    requestTick();
  }
}

// ---------------------------------------------------------------------------
// IntersectionObserver setup
// ---------------------------------------------------------------------------

/** _activeObserver: trigger active-scene recomputation on threshold crossings. */
function setupActiveObserver() {
  if (_activeObserver) return;
  _activeObserver = new IntersectionObserver(
    () => {
      // We don't read entry data; we recompute from scratch using rect math.
      recomputeActive();
      requestTick();
    },
    {
      threshold: [0, 0.25, 0.5, 0.75, 1],
      rootMargin: "0px",
    }
  );
}

/** _nearObserver: when a scene is within 1 viewport, raise preload; when far, drop. */
function setupNearObserver() {
  if (_nearObserver) return;
  _nearObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const scene = findSceneByEl(entry.target);
        if (!scene) continue;
        if (scene.id === "hero") continue;  // hero stays preload="auto" always

        const v = scene.cfg.videoEl;
        if (!v) continue;

        if (entry.isIntersecting) {
          scene.isNear = true;
          if (v.preload === "none") {
            v.preload = "metadata";
          }
        } else {
          scene.isNear = false;
          // Released: stop and drop bytes if not active.
          if (entry.intersectionRatio === 0 && !scene.isActive) {
            try { v.pause(); } catch { /* ignore */ }
            v.preload = "none";
          }
        }
      }
    },
    {
      rootMargin: "100% 0px",
      threshold: [0, 0.01],
    }
  );
}

function findSceneByEl(el) {
  for (const scene of _scenes.values()) {
    if (scene.el === el) return scene;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Public API (window.gamosScroll)
// ---------------------------------------------------------------------------

function publicRegister(cfg) {
  if (!cfg || typeof cfg !== "object") {
    throw new TypeError("[gamosScroll.register] cfg required");
  }
  if (!cfg.id || typeof cfg.id !== "string") {
    throw new TypeError("[gamosScroll.register] cfg.id (string) required");
  }
  if (!(cfg.el instanceof HTMLElement)) {
    throw new TypeError("[gamosScroll.register] cfg.el (HTMLElement) required");
  }
  if (typeof cfg.onProgress !== "function") {
    throw new TypeError("[gamosScroll.register] cfg.onProgress (function) required");
  }

  // Idempotent on duplicate id (warn + replace, per spec §4).
  if (_scenes.has(cfg.id)) {
    console.warn(`[gamosScroll] duplicate scene id "${cfg.id}" — replacing.`);
    publicUnregister(cfg.id);
  }

  const scene = {
    id: cfg.id,
    el: cfg.el,
    cfg: cfg,
    isActive: false,
    isNear: false,
  };
  _scenes.set(cfg.id, scene);

  // Observers
  if (_activeObserver) _activeObserver.observe(cfg.el);
  if (_nearObserver && cfg.id !== "hero") _nearObserver.observe(cfg.el);

  // Reduced motion: fire onProgress(0) once so the scene reaches its initial state.
  if (reduceMotion) {
    try { cfg.onProgress(0); }
    catch (e) { console.error("[scroll-orchestrator] reduce init onProgress:", e); }
  }

  // Trigger an immediate recompute so first-paint reflects scroll position.
  recomputeActive();
  requestTick();

  // Return a SceneHandle.
  return {
    id: cfg.id,
    unregister() { publicUnregister(cfg.id); },
  };
}

function publicUnregister(id) {
  const scene = _scenes.get(id);
  if (!scene) return;
  if (_activeObserver) _activeObserver.unobserve(scene.el);
  if (_nearObserver) _nearObserver.unobserve(scene.el);
  _scenes.delete(id);

  if (_activeId === id) {
    _activeId = null;
    emitSceneChange(id, null);
  }
}

function publicGetActive() {
  return _activeId;
}

function publicOnSceneChange(cb) {
  if (typeof cb !== "function") return () => {};
  _sceneChangeListeners.add(cb);
  return () => _sceneChangeListeners.delete(cb);
}

function exposeApi() {
  window.gamosScroll = {
    register:       publicRegister,
    unregister:     publicUnregister,
    getActive:      publicGetActive,
    onSceneChange:  publicOnSceneChange,
  };
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

export function init() {
  if (_initDone) return;
  _initDone = true;

  _viewportHeight = window.innerHeight;

  setupActiveObserver();
  setupNearObserver();

  _scrollHandler = onScroll;
  _resizeHandler = onResize;
  window.addEventListener("scroll", _scrollHandler, { passive: true });
  window.addEventListener("resize", _resizeHandler, { passive: true });

  // Reduced-motion live listener.
  _reducedListener = onReducedChange;
  if (typeof reducedMQ.addEventListener === "function") {
    reducedMQ.addEventListener("change", _reducedListener);
  } else if (typeof reducedMQ.addListener === "function") {
    reducedMQ.addListener(_reducedListener);
  }

  exposeApi();
}

export function destroy() {
  if (!_initDone) return;
  _initDone = false;

  if (_scrollHandler) {
    window.removeEventListener("scroll", _scrollHandler);
    _scrollHandler = null;
  }
  if (_resizeHandler) {
    window.removeEventListener("resize", _resizeHandler);
    _resizeHandler = null;
  }

  if (_reducedListener) {
    if (typeof reducedMQ.removeEventListener === "function") {
      reducedMQ.removeEventListener("change", _reducedListener);
    } else if (typeof reducedMQ.removeListener === "function") {
      reducedMQ.removeListener(_reducedListener);
    }
    _reducedListener = null;
  }

  if (_activeObserver) { _activeObserver.disconnect(); _activeObserver = null; }
  if (_nearObserver)   { _nearObserver.disconnect();   _nearObserver = null; }

  _scenes.clear();
  _sceneChangeListeners.clear();
  _activeId = null;
  _rafPending = false;

  // Clean public API
  if (typeof window !== "undefined" && window.gamosScroll) {
    delete window.gamosScroll;
  }
}
