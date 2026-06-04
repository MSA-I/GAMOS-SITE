/**
 * lounge-selector.js — #lounge 3D circular gallery (8-item ring)
 *
 * Owner : Lounge Section Engineer (rebuild — Agent C)
 * Spec  : CLAUDE.md §2 (vanilla ESM, no GSAP), §4 (RTL-first), §8 (reduced
 *         motion), §9 (a11y), §10 (init/destroy, module-scoped, idempotent,
 *         no globals).
 *
 * Concept
 * -------
 * A vanilla port of the React `CircularGallery` component. Eight `[data-lounge-item]`
 * elements sit on a Y-axis ring — each item placed via a per-item CSS custom
 * property `--lounge-item-transform = rotateY(itemAngle) translateZ(radius)`.
 * The parent ring `[data-lounge-ring]` reads `--lounge-rotation` and applies a
 * single `rotateY()` on top, which spins ALL items in unison.
 *
 * Drive model (rev. 2026-06-04 — pointer drag + inertia)
 * ------------------------------------------------------
 * - Horizontal POINTER drag on the stage rotates the ring. dx pixels →
 *   `dx * DRAG_DEG_PER_PX` degrees. PointerEvents unify mouse, touch, pen.
 * - On pointerup, the ring's last per-frame angular velocity becomes a
 *   fling: `rotation += v` each frame; `v *= FLING_FRICTION` until |v|
 *   falls below FLING_EPSILON_DPF, then it stops. Capped at
 *   FLING_MAX_DPF so pathological flicks don't whip indefinitely.
 * - When the user is idle for INPUT_IDLE_MS (after the fling lands), a
 *   slow drift kicks in (`+0.04°/frame`) so the gallery feels alive when
 *   nobody's dragging.
 * - Page scroll does NOT spin the ring — the user can scroll past the
 *   section freely. (Earlier scroll-coupled prototype caused the ring to
 *   keep spinning while the user scrolled past it; reverted by user.)
 * - An IntersectionObserver on the stage gates the RAF loop: while the
 *   stage is off-screen the loop ticks but immediately bails — no rect
 *   reads, no style writes.
 *
 * Per-item opacity
 * ----------------
 * Front-facing items get full opacity; sides + back photos float at 0.85
 * so the ring keeps a touch of depth without any photo looking dim
 * (floor raised iteratively per user: 0.3 → 0.65 → 0.85). Formula:
 *   `opacity = max(0.85, 1 - dist/180)` where `dist` is the angular
 *   distance from the front (0..180°).
 *
 * Reduced motion
 * --------------
 * If `prefers-reduced-motion: reduce`, init() short-circuits: no listeners,
 * no RAF, no IO. The CSS-only ≤768px fallback grid handles layout.
 *
 * Public API: init(), destroy()
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const N = 8;                              // ring item count (matches markup)
const IDLE_DRIFT_DEG_PER_FRAME = 0.04;    // slow drift when user is idle
const INPUT_IDLE_MS = 1500;               // ms after last drag → drift resumes
// Drag sensitivity: how many degrees of rotation per pixel of horizontal drag.
// 0.4°/px means a 360° spin needs ~900px of drag — comfortable across the full
// stage width on a 1440 desktop, and still feels responsive on smaller stages.
const DRAG_DEG_PER_PX = 0.4;

// Inertia / fling — when the user lets go after a drag, the ring keeps
// spinning in the gesture direction with this friction, decelerating until
// |velocity| drops below FLING_EPSILON_DPF and idle drift takes over.
//   FLING_FRICTION  closer to 1 = longer coast; 0.95 ≈ ~1.0s tail at 60fps.
//   FLING_MAX_DPF   safety cap on initial fling velocity (very fast flicks
//                   shouldn't whip the ring around 5 times in a second).
const FLING_FRICTION   = 0.95;
const FLING_MAX_DPF    = 8;     // degrees per frame
const FLING_EPSILON_DPF = 0.05; // velocity below which we stop flinging

// Radius envelope. min 280px (small viewports), max 480px (huge displays);
// otherwise scale with viewport width — matches the CSS `clamp(280, 38vw, 480)`
// the designer wanted but in JS we have to compute it ourselves so per-item
// transforms can use a numeric pixel value inside `translateZ()`.
const RADIUS_MIN = 280;
const RADIUS_MAX = 480;
const RADIUS_VW  = 0.38;

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised:   false,
  reducedMotion: false,
  section:       null,   // closest <section id="lounge"> ancestor of the stage
  stage:         null,   // [data-lounge-stage]
  ring:          null,   // [data-lounge-ring]
  items:         [],     // [data-lounge-item] elements (length === N)
  radius:        360,    // current ring radius, px
  rotation:      0,      // current ring rotation, degrees (unbounded)
  rafId:         0,      // active requestAnimationFrame id
  io:            null,   // IntersectionObserver on the stage
  inView:        false,  // mirrors the IO state — RAF bails when false
  reducedMQ:     null,   // matchMedia for prefers-reduced-motion
  // Pointer drag state
  isDragging:     false,
  dragPointerId:  null,
  dragLastX:      0,
  pendingDx:      0,     // accumulated dx waiting to be applied on next RAF
  lastDragVelDpf: 0,     // last applied "deg per frame" while dragging — seeds the fling
  flingVelocity:  0,     // active inertial spin, deg/frame (0 = no fling)
  lastInputTs:    0,     // performance.now() of last pointer input
  bound: {
    onPointerDown: null,
    onPointerMove: null,
    onPointerUp:   null,
    onDragStart:   null,
    onResize:      null,
    onMediaChange: null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function computeRadius() {
  const vw = window.innerWidth;
  return Math.min(RADIUS_MAX, Math.max(RADIUS_MIN, vw * RADIUS_VW));
}

/**
 * Place each item on the ring. Pure CSS-property write — call once on init
 * and again on resize (radius depends on viewport width). Sets only
 * `--lounge-item-transform`; `--lounge-opacity` is updated every RAF tick by
 * applyRotation().
 */
function layoutItems() {
  const step = 360 / N;
  const radius = state.radius;
  for (let i = 0; i < state.items.length; i++) {
    const item = state.items[i];
    const itemAngle = i * step;
    item.style.setProperty(
      "--lounge-item-transform",
      `rotateY(${itemAngle}deg) translateZ(${radius}px)`
    );
  }
}

/**
 * Single render pass.
 *  1. Write `--lounge-rotation` on the ring (CSS will apply rotateY()).
 *  2. Walk items, write per-item `--lounge-opacity` based on each item's
 *     angular distance from the "front" position (closest to the camera).
 *
 * Spec note: per-item transform stays at `rotateY(itemAngle) translateZ(R)`.
 * The parent ring's rotation is the only thing that animates, so the items'
 * own transforms must NOT factor in the rotation — that's the ring's job.
 */
function applyRotation() {
  if (state.ring) {
    state.ring.style.setProperty("--lounge-rotation", `${state.rotation}deg`);
  }

  const step = 360 / N;
  const rot = state.rotation;
  for (let i = 0; i < state.items.length; i++) {
    const itemAngle = i * step;
    // Angular position of this item, in 0..360.
    const relative = (itemAngle + rot) % 360;
    const positive = (relative + 360) % 360;
    // Convert to "distance from the front" in 0..180.
    const dist = positive > 180 ? 360 - positive : positive;
    // Floor raised iteratively per user — 0.3 → 0.65 → 0.85 (2026-06-04).
    // At 0.85, side photos (dist ≈ 90°, raw formula = 0.5) and back photos
    // (dist = 180°, raw formula = 0) all clamp to 0.85 — only the very
    // front item still gets a brightness lift toward 1.0. The ring keeps a
    // touch of depth without any photo looking dim.
    const opacity = Math.max(0.85, 1 - dist / 180);
    state.items[i].style.setProperty("--lounge-opacity", opacity.toFixed(3));
  }
}

// ----------------------------------------------------------------------------
// Pointer drag → rotate
// ----------------------------------------------------------------------------
//
// The user scrolled the page to land on the lounge; once they're here, the
// ring rotates ONLY in response to horizontal pointer drag (left = backward,
// right = forward). No scroll-coupling — the page itself stays free to
// scroll past the section without spinning the ring along with it.
//
// `setPointerCapture` so a drag that wanders outside the stage (e.g. user
// flings past the right edge) keeps tracking until pointerup. RAF coalesces
// pointermove → render.

function onPointerDown(event) {
  // Only primary button (mouse left, single touch, pen tip).
  if (event.button !== undefined && event.button !== 0) return;
  if (state.isDragging) return;

  // Some browsers still fire native HTML5 dragstart on <img> children even
  // with user-select:none on the parent — preventDefault here too as a
  // belt-and-braces measure (the dedicated dragstart listener is the belt).
  event.preventDefault();

  // Cancel any active fling — the user is grabbing the ring; their hand
  // is now in charge.
  state.flingVelocity = 0;

  state.isDragging = true;
  state.dragPointerId = event.pointerId;
  state.dragLastX = event.clientX;
  state.pendingDx = 0;
  state.lastDragVelDpf = 0;
  state.lastInputTs = performance.now();

  state.stage.setAttribute("data-dragging", "");
  try {
    state.stage.setPointerCapture(event.pointerId);
  } catch { /* setPointerCapture not supported — fine, drag still works */ }
}

/**
 * Pointermove just ACCUMULATES delta; the RAF loop applies it.
 *
 * Why coalesce: pointermove fires more frequently than the framerate
 * (~120Hz on many trackpads, even more during fast drags). Painting on
 * every event causes layout thrash + the gesture feels "sticky" because
 * the browser dropped a frame mid-burst. RAF-batching pins the work to
 * one paint per displayed frame.
 */
function onPointerMove(event) {
  if (!state.isDragging) return;
  if (event.pointerId !== state.dragPointerId) return;

  const dx = event.clientX - state.dragLastX;
  state.dragLastX = event.clientX;
  state.pendingDx += dx;
  state.lastInputTs = performance.now();
}

function onPointerUp(event) {
  if (!state.isDragging) return;
  if (event.pointerId !== state.dragPointerId) return;

  // Flush any unconsumed delta into rotation so we don't lose the last
  // few pixels of the gesture (RAF might not have ticked between the
  // final pointermove and pointerup). Fold it into the velocity sample
  // too so a fast last-millisecond flick still flings.
  if (state.pendingDx !== 0) {
    const dDeg = state.pendingDx * DRAG_DEG_PER_PX;
    state.rotation += dDeg;
    state.lastDragVelDpf = dDeg;
    state.pendingDx = 0;
    applyRotation();
  }

  // Hand off the gesture's tail velocity to the fling state — clamped so
  // pathological flicks don't whip the ring around indefinitely.
  let v = state.lastDragVelDpf;
  if (v > FLING_MAX_DPF)  v =  FLING_MAX_DPF;
  if (v < -FLING_MAX_DPF) v = -FLING_MAX_DPF;
  state.flingVelocity = Math.abs(v) >= FLING_EPSILON_DPF ? v : 0;

  state.isDragging = false;
  state.dragPointerId = null;
  state.lastDragVelDpf = 0;
  state.lastInputTs = performance.now();

  state.stage.removeAttribute("data-dragging");
  try {
    state.stage.releasePointerCapture(event.pointerId);
  } catch { /* ignore */ }
}

/**
 * Suppress the browser's native HTML5 image-drag (the ghost preview that
 * appears when the user grabs an <img>). Without this, mid-drag the
 * gesture flips into a drag-and-drop of the image, the pointer is no
 * longer captured by us, and our handler stops receiving move events —
 * which is exactly the "stuck after a moment" symptom the user reported.
 */
function onDragStart(event) {
  event.preventDefault();
}

function onResize() {
  state.radius = computeRadius();
  layoutItems();
  // Re-paint immediately so opacity/rotation match the new geometry without
  // waiting for the next pointer event.
  if (state.inView) applyRotation();
}

// ----------------------------------------------------------------------------
// RAF idle-drift loop
// ----------------------------------------------------------------------------
//
// Always running once init() finishes, but bails immediately while the stage
// is off-screen (state.inView === false) OR while the user is actively
// dragging (the pointer-move handler owns rotation in that window). Drift
// kicks in after INPUT_IDLE_MS of pointer silence so the gallery feels alive
// when nobody's interacting.

function rafLoop() {
  state.rafId = window.requestAnimationFrame(rafLoop);
  if (!state.inView) return;

  // ---- Active drag: consume accumulated dx, record velocity sample. ----
  if (state.isDragging) {
    if (state.pendingDx !== 0) {
      const dDeg = state.pendingDx * DRAG_DEG_PER_PX;
      state.rotation += dDeg;
      // Track the most recent per-frame angular velocity so pointerup can
      // hand it off to the fling state with no latency mismatch.
      state.lastDragVelDpf = dDeg;
      state.pendingDx = 0;
      applyRotation();
    } else {
      // No movement this frame — velocity decays toward zero so a "drag,
      // pause, lift" gesture doesn't fling. Lighter decay than fling
      // friction; mirrors how a finger held still stops the ring.
      state.lastDragVelDpf *= 0.7;
      if (Math.abs(state.lastDragVelDpf) < 0.01) state.lastDragVelDpf = 0;
    }
    return;
  }

  // ---- Fling / inertia: spin keeps decelerating until it dies out. ----
  if (state.flingVelocity !== 0) {
    state.rotation += state.flingVelocity;
    state.flingVelocity *= FLING_FRICTION;
    if (Math.abs(state.flingVelocity) < FLING_EPSILON_DPF) {
      state.flingVelocity = 0;
      // Reset the idle clock so drift doesn't immediately resume — give
      // the user a beat of stillness after the fling lands.
      state.lastInputTs = performance.now();
    }
    applyRotation();
    return;
  }

  // ---- Idle drift: slow rotation when nothing's been touched in a while. ----
  const idleMs = performance.now() - state.lastInputTs;
  if (idleMs <= INPUT_IDLE_MS) return;
  state.rotation += IDLE_DRIFT_DEG_PER_FRAME;
  applyRotation();
}

// ----------------------------------------------------------------------------
// IntersectionObserver — RAF gating
// ----------------------------------------------------------------------------

function installObserver() {
  state.io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.target === state.stage) {
          state.inView = e.isIntersecting;
        }
      }
    },
    { threshold: 0 }
  );
  state.io.observe(state.stage);
}

// ----------------------------------------------------------------------------
// Reduced-motion tracking (mirrors side-dot-nav.js)
// ----------------------------------------------------------------------------

function watchReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  state.reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  state.reducedMotion = state.reducedMQ.matches;

  state.bound.onMediaChange = (e) => {
    state.reducedMotion = e.matches;
    // No teardown / boot on flip: re-running init/destroy on every media
    // change would be churny. The CSS fallback already covers reduce mode;
    // if the user toggles preferences mid-session a reload is acceptable.
  };
  if (typeof state.reducedMQ.addEventListener === "function") {
    state.reducedMQ.addEventListener("change", state.bound.onMediaChange);
  } else if (typeof state.reducedMQ.addListener === "function") {
    state.reducedMQ.addListener(state.bound.onMediaChange);
  }
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.stage = document.querySelector("[data-lounge-stage]");
  if (!state.stage) return;

  state.ring = state.stage.querySelector("[data-lounge-ring]");
  state.section = state.stage.closest("section");
  state.items = Array.from(state.stage.querySelectorAll("[data-lounge-item]"));

  if (state.items.length !== N) {
    // eslint-disable-next-line no-console
    console.warn(
      `[lounge] expected ${N} items, got ${state.items.length}`
    );
  }

  watchReducedMotion();
  if (state.reducedMotion) {
    // CSS-only fallback grid handles layout. Mark initialised so destroy()
    // can still cleanly tear down the reduced-motion media listener.
    state.initialised = true;
    return;
  }

  // Initial geometry + paint.
  state.radius = computeRadius();
  layoutItems();
  applyRotation();

  // Wire pointer drag on the stage. PointerEvents unify mouse + touch + pen.
  state.bound.onPointerDown = onPointerDown;
  state.bound.onPointerMove = onPointerMove;
  state.bound.onPointerUp   = onPointerUp;
  state.bound.onDragStart   = onDragStart;
  state.bound.onResize      = onResize;
  state.stage.addEventListener("pointerdown", state.bound.onPointerDown);
  state.stage.addEventListener("pointermove", state.bound.onPointerMove);
  state.stage.addEventListener("pointerup",     state.bound.onPointerUp);
  state.stage.addEventListener("pointercancel", state.bound.onPointerUp);
  // Native HTML5 dragstart suppression — see onDragStart() rationale.
  state.stage.addEventListener("dragstart", state.bound.onDragStart);
  window.addEventListener("resize", state.bound.onResize);

  // Gate the RAF loop on stage visibility.
  installObserver();

  // Seed the input timestamp so drift kicks in after INPUT_IDLE_MS once the
  // ring is visible — gives the gallery a gentle "alive" feel without
  // immediately rotating the moment the user lands.
  state.lastInputTs = performance.now();
  state.rafId = window.requestAnimationFrame(rafLoop);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  // Cancel RAF.
  if (state.rafId) {
    try { window.cancelAnimationFrame(state.rafId); } catch { /* ignore */ }
    state.rafId = 0;
  }

  // Disconnect IO.
  if (state.io) {
    try { state.io.disconnect(); } catch { /* ignore */ }
  }

  // Remove pointer listeners.
  if (state.stage) {
    if (state.bound.onPointerDown) {
      state.stage.removeEventListener("pointerdown", state.bound.onPointerDown);
    }
    if (state.bound.onPointerMove) {
      state.stage.removeEventListener("pointermove", state.bound.onPointerMove);
    }
    if (state.bound.onPointerUp) {
      state.stage.removeEventListener("pointerup",     state.bound.onPointerUp);
      state.stage.removeEventListener("pointercancel", state.bound.onPointerUp);
    }
    if (state.bound.onDragStart) {
      state.stage.removeEventListener("dragstart", state.bound.onDragStart);
    }
    state.stage.removeAttribute("data-dragging");
  }
  if (state.bound.onResize) {
    window.removeEventListener("resize", state.bound.onResize);
  }
  if (state.reducedMQ && state.bound.onMediaChange) {
    if (typeof state.reducedMQ.removeEventListener === "function") {
      state.reducedMQ.removeEventListener("change", state.bound.onMediaChange);
    } else if (typeof state.reducedMQ.removeListener === "function") {
      state.reducedMQ.removeListener(state.bound.onMediaChange);
    }
  }

  // Wipe inline custom properties so a subsequent init() starts clean.
  for (const item of state.items) {
    item.style.removeProperty("--lounge-item-transform");
    item.style.removeProperty("--lounge-opacity");
  }
  if (state.ring) {
    state.ring.style.removeProperty("--lounge-rotation");
  }

  // Reset every field. Keep the shape stable so subsequent inits don't trip
  // over missing keys (esp. state.bound.*).
  state.initialised   = false;
  state.reducedMotion = false;
  state.section       = null;
  state.stage         = null;
  state.ring          = null;
  state.items         = [];
  state.radius        = 360;
  state.rotation      = 0;
  state.io            = null;
  state.inView        = false;
  state.reducedMQ     = null;
  state.isDragging    = false;
  state.dragPointerId = null;
  state.dragLastX     = 0;
  state.pendingDx     = 0;
  state.lastDragVelDpf = 0;
  state.flingVelocity  = 0;
  state.lastInputTs   = 0;
  state.bound.onPointerDown = null;
  state.bound.onPointerMove = null;
  state.bound.onPointerUp   = null;
  state.bound.onDragStart   = null;
  state.bound.onResize      = null;
  state.bound.onMediaChange = null;
}
