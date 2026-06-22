/**
 * Drag — 2-axis INFINITE inertial pan for the phantom-style lens wall.
 *
 * Faithful port of phantom-sphere-gallery/src/controls.js (PanControls): a drag
 * writes a TARGET pan; each frame the ACTUAL pan eases toward the target (the
 * "lenis" lag); on release the target keeps drifting under stored momentum,
 * decaying with friction — a flick glides to a stop. There is NO clamp on either
 * axis: both X and Y pan infinitely (Wall wraps the grid modulo the span, so a
 * pan never hits an edge). This replaces the earlier clamp + rubber-band model.
 *
 * Input: unified Pointer Events (mouse + touch + pen) for drag-to-pan, the wheel
 * as a secondary 2-axis pan (trackpad), and keyboard arrows + Home for a11y.
 *
 * TAP: a press that moves < TAP_MOVE_PX and lasts < TAP_TIME_MS fires onTap(e)
 * (the FLIP selection — Engine raycasts the pooled meshes from the tap point).
 *
 * The ease is frame-rate-independent (k = 1−(1−ease)^(dt/16.67)); dt is measured
 * in update() and clamped ≤ 50 ms so a stalled tab can't fling the pan.
 *
 * Reduced motion: snaps (current = target, no inertia). A LIVE
 * `matchMedia('reduce')` change-listener keeps that honest mid-session. `enabled`
 * is toggled false while the detail page is open (freeze).
 *
 * LIFECYCLE CONTRACT: dispose() MUST be called — it removes the pointer/wheel/
 * keydown listeners AND the live matchMedia listener. Engine guards this.
 */

const EASE = 0.09; // actual → target follower (per 16.67 ms)
const FRICTION = 0.945; // momentum decay per frame after release
const VELOCITY_STOP = 1e-5; // world-units/frame below which momentum halts
const WHEEL_SPEED = 0.012; // wheel px → world units (source wheelSpeed)
const KEY_STEP_PX = 120; // arrow-key pan step in input pixels
const TAP_MOVE_PX = 6; // < this px travelled → a tap, not a drag
const TAP_TIME_MS = 350; // < this duration → a tap

export interface DragMetrics {
  /** World units per input pixel (so a drag maps 1:1 to on-screen motion). */
  worldPerPixel: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export interface DragOptions {
  /** Fired on a tap (short, still press) — the FLIP selection hook. */
  onTap?: (e: PointerEvent) => void;
}

export default class Drag {
  private target: HTMLElement;
  private worldPerPixel: number;
  private onTap: (e: PointerEvent) => void;

  /** While false (detail page open), all input is ignored. */
  public enabled = true;

  // State — WORLD UNITS.
  private targetX = 0;
  private targetY = 0;
  private currentX = 0;
  private currentY = 0;
  private velX = 0;
  private velY = 0;

  // Pointer-drag bookkeeping.
  private dragging = false;
  private activePointerId: number | null = null;
  private lastPointerX = 0;
  private lastPointerY = 0;
  private movedPx = 0;
  private downTime = 0;

  // Frame timing for the rate-independent ease.
  private lastT = 0;

  private reducedMotion: boolean;
  private rmMql: MediaQueryList;
  private onRmChange: (e: MediaQueryListEvent) => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(target: HTMLElement, metrics: DragMetrics, opts: DragOptions = {}) {
    this.target = target;
    this.worldPerPixel = metrics.worldPerPixel;
    this.onTap = opts.onTap ?? (() => {});

    this.rmMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.rmMql.matches;
    this.onRmChange = (e: MediaQueryListEvent): void => {
      this.reducedMotion = e.matches;
    };
    this.rmMql.addEventListener("change", this.onRmChange);

    // --- Pointer drag (unified mouse + touch + pen) ---
    this.onPointerDown = (e: PointerEvent): void => {
      if (!this.enabled || e.button !== 0) return;
      this.dragging = true;
      this.activePointerId = e.pointerId;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.movedPx = 0;
      this.downTime = e.timeStamp;
      this.velX = 0;
      this.velY = 0;
      try {
        this.target.setPointerCapture(e.pointerId);
      } catch {
        /* best-effort */
      }
      this.target.classList.add("grabbing");
    };

    this.onPointerMove = (e: PointerEvent): void => {
      if (!this.dragging || e.pointerId !== this.activePointerId) return;
      const dxPx = e.clientX - this.lastPointerX;
      const dyPx = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.movedPx += Math.hypot(dxPx, dyPx);

      // Screen px → world units. Pulling right moves content right (the grid pan
      // DECREASES as you drag +x — matches the source's `-dx`). Y flips
      // (screen-down = world −Y → pan +Y, so dragging down reveals content above).
      const wx = -dxPx * this.worldPerPixel;
      const wy = dyPx * this.worldPerPixel;
      this.targetX += wx;
      this.targetY += wy;
      // Remember the live delta as the release-flick velocity (faithful: direct,
      // not a lerped sample).
      this.velX = wx;
      this.velY = wy;
      e.preventDefault();
    };

    this.onPointerUp = (e: PointerEvent): void => {
      if (e.pointerId !== this.activePointerId) return;
      this.dragging = false;
      this.activePointerId = null;
      try {
        this.target.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      this.target.classList.remove("grabbing");
      // Tap detection → FLIP selection.
      if (
        this.enabled &&
        this.movedPx < TAP_MOVE_PX &&
        e.timeStamp - this.downTime < TAP_TIME_MS
      ) {
        this.velX = 0;
        this.velY = 0;
        this.onTap(e);
      }
    };

    this.target.addEventListener("pointerdown", this.onPointerDown);
    this.target.addEventListener("pointermove", this.onPointerMove, {
      passive: false,
    });
    this.target.addEventListener("pointerup", this.onPointerUp);
    this.target.addEventListener("pointercancel", this.onPointerUp);

    // --- Wheel (trackpad two-finger) as a secondary 2-axis pan ---
    this.onWheel = (e: WheelEvent): void => {
      if (!this.enabled) return;
      e.preventDefault();
      this.targetY -= e.deltaY * WHEEL_SPEED;
      this.targetX += e.deltaX * WHEEL_SPEED;
    };
    this.target.addEventListener("wheel", this.onWheel, { passive: false });

    // --- Keyboard pan (accessibility) ---
    this.onKeyDown = (e: KeyboardEvent): void => {
      if (!this.enabled) return;
      const step = KEY_STEP_PX * this.worldPerPixel;
      let stepped = false;
      switch (e.key) {
        case "ArrowLeft":
          this.targetX += step;
          stepped = true;
          break;
        case "ArrowRight":
          this.targetX -= step;
          stepped = true;
          break;
        case "ArrowUp":
          this.targetY -= step;
          stepped = true;
          break;
        case "ArrowDown":
          this.targetY += step;
          stepped = true;
          break;
        case "Home":
          this.targetX = 0;
          this.targetY = 0;
          stepped = true;
          break;
      }
      if (stepped) e.preventDefault();
    };
    this.target.addEventListener("keydown", this.onKeyDown);

    this.target.classList.add("rooms-grab");
  }

  /** Update the input→world scale (called on resize by Engine). */
  public setMetrics(metrics: DragMetrics): void {
    this.worldPerPixel = metrics.worldPerPixel;
  }

  /** True while a pointer drag is active (Hover skips raycast then). */
  public isDragging(): boolean {
    return this.dragging;
  }

  /** Called per frame by Engine. Returns the pan offset to apply. */
  public update(): PanOffset {
    // dt for the rate-independent ease (clamped so a stall can't fling).
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    let dt = this.lastT ? now - this.lastT : 16.67;
    this.lastT = now;
    if (dt > 50) dt = 50;

    if (this.reducedMotion) {
      // Reduced motion: snap (no inertia, no spring). Still pans (no clamp).
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.velX = 0;
      this.velY = 0;
      return { x: this.currentX, y: this.currentY };
    }

    if (!this.dragging) {
      // Momentum coast (infinite — never clamped).
      this.targetX += this.velX;
      this.targetY += this.velY;
      this.velX *= FRICTION;
      this.velY *= FRICTION;
      if (Math.abs(this.velX) < VELOCITY_STOP) this.velX = 0;
      if (Math.abs(this.velY) < VELOCITY_STOP) this.velY = 0;
    }

    // Frame-rate-independent easing toward the target (the lenis lag).
    const k = 1 - Math.pow(1 - EASE, dt / 16.67);
    this.currentX += (this.targetX - this.currentX) * k;
    this.currentY += (this.targetY - this.currentY) * k;

    return { x: this.currentX, y: this.currentY };
  }

  public dispose(): void {
    this.rmMql.removeEventListener("change", this.onRmChange);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener(
      "pointermove",
      this.onPointerMove as EventListener,
    );
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerUp);
    this.target.removeEventListener("wheel", this.onWheel as EventListener);
    this.target.removeEventListener("keydown", this.onKeyDown);
    this.target.classList.remove("grabbing", "rooms-grab");
  }
}
