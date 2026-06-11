/**
 * Drag — 2-axis pan input + damped follower with momentum for the rooms wall.
 *
 * Forked from halls/src/depth-gallery/Scroll.ts and generalized from ONE axis
 * (camera Z) to TWO (pan X/Y of the wallGroup). Reuses the reference's
 * velocity-follower structure (lerp + clamp + stop-threshold), the
 * reduced-motion snap path, and the LIVE `matchMedia('reduce')` change-listener
 * + its dispose contract. The input model changes from wheel-only to POINTER
 * EVENTS (unified mouse + touch + pen) for drag-to-pan, with the wheel kept as a
 * secondary 2-axis pan (trackpad).
 *
 * Bounds: CLAMP + rubber-band overscroll, NOT infinite-wrap (plan decision —
 * wrap is high-complexity/jitter-prone). While the pointer is down, input past a
 * bound is resisted (×RUBBER_RESISTANCE) for the iOS-style give; on release the
 * target is clamped to the bound so `current` springs back via the lerp. During
 * momentum the target is clamped each frame so a fling glides to the edge
 * without flinging past it.
 *
 * Screen-space, NOT RTL-negated: panning is in screen pixels, independent of
 * reading flow (same rationale as the Gallery pointer parallax). Dragging right
 * moves content right (+X); dragging down moves content down (−Y in three space).
 *
 * LIFECYCLE CONTRACT: `dispose()` MUST be called for every Drag instance — it
 * removes the pointer/wheel/keydown listeners AND the live matchMedia listener.
 * The owner (Engine) guards this in Engine.dispose().
 */

import { lerp, clamp } from "./utils";

const SMOOTHING = 0.12; // current → target follower
const FRICTION = 0.92; // momentum decay per frame after release
const VELOCITY_STOP = 0.00005; // world-units/frame below which momentum halts
const VELOCITY_MAX = 1.2; // clamp per-axis throw velocity (world units/frame)
const VELOCITY_SAMPLE = 0.5; // how fast the throw velocity tracks the pointer delta
const RUBBER_RESISTANCE = 0.4; // input multiplier when dragging past a bound
const WHEEL_SPEED = 1.0; // wheel px → same scale as pointer px
const KEY_STEP_PX = 120; // arrow-key pan step in input pixels

export interface DragMetrics {
  /** Max |pan X| in world units (half the over-pannable width). */
  maxX: number;
  /** Max |pan Y| in world units. */
  maxY: number;
  /** World units per input pixel (so a drag maps 1:1 to on-screen motion). */
  worldPerPixel: number;
}

export interface PanOffset {
  x: number;
  y: number;
}

export default class Drag {
  private target: HTMLElement;

  private maxX: number;
  private maxY: number;
  private worldPerPixel: number;

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

  private reducedMotion: boolean;
  private rmMql: MediaQueryList;
  private onRmChange: (e: MediaQueryListEvent) => void;
  private onPointerDown: (e: PointerEvent) => void;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerUp: (e: PointerEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onKeyDown: (e: KeyboardEvent) => void;

  constructor(target: HTMLElement, metrics: DragMetrics) {
    this.target = target;
    this.maxX = metrics.maxX;
    this.maxY = metrics.maxY;
    this.worldPerPixel = metrics.worldPerPixel;

    this.rmMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.rmMql.matches;
    this.onRmChange = (e: MediaQueryListEvent): void => {
      this.reducedMotion = e.matches;
    };
    this.rmMql.addEventListener("change", this.onRmChange);

    // --- Pointer drag (unified mouse + touch + pen) ---
    this.onPointerDown = (e: PointerEvent): void => {
      this.dragging = true;
      this.activePointerId = e.pointerId;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      this.velX = 0;
      this.velY = 0;
      try {
        this.target.setPointerCapture(e.pointerId);
      } catch {
        /* capture is best-effort */
      }
      this.target.style.cursor = "grabbing";
    };

    this.onPointerMove = (e: PointerEvent): void => {
      if (!this.dragging || e.pointerId !== this.activePointerId) return;
      const dxPx = e.clientX - this.lastPointerX;
      const dyPx = e.clientY - this.lastPointerY;
      this.lastPointerX = e.clientX;
      this.lastPointerY = e.clientY;
      // Screen px → world units. Y flips (screen-down = world −Y).
      const dx = dxPx * this.worldPerPixel;
      const dy = -dyPx * this.worldPerPixel;
      this.addPanInput(dx, dy);
      // Track throw velocity (lerped sample of the live delta).
      this.velX = lerp(this.velX, clamp(dx, -VELOCITY_MAX, VELOCITY_MAX), VELOCITY_SAMPLE);
      this.velY = lerp(this.velY, clamp(dy, -VELOCITY_MAX, VELOCITY_MAX), VELOCITY_SAMPLE);
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
      this.target.style.cursor = "grab";
      // Hard-clamp target on release so any rubber-band overshoot springs back.
      this.targetX = clamp(this.targetX, -this.maxX, this.maxX);
      this.targetY = clamp(this.targetY, -this.maxY, this.maxY);
    };

    this.target.addEventListener("pointerdown", this.onPointerDown);
    this.target.addEventListener("pointermove", this.onPointerMove, {
      passive: false,
    });
    this.target.addEventListener("pointerup", this.onPointerUp);
    this.target.addEventListener("pointercancel", this.onPointerUp);

    // --- Wheel (trackpad two-finger) as a secondary 2-axis pan ---
    this.onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const dx = -normalizeWheelDelta(e.deltaX) * WHEEL_SPEED * this.worldPerPixel;
      const dy = normalizeWheelDelta(e.deltaY) * WHEEL_SPEED * this.worldPerPixel;
      this.addPanInput(dx, dy);
    };
    this.target.addEventListener("wheel", this.onWheel, { passive: false });

    // --- Keyboard pan (accessibility) ---
    this.onKeyDown = (e: KeyboardEvent): void => {
      const step = KEY_STEP_PX * this.worldPerPixel;
      let stepped = false;
      switch (e.key) {
        case "ArrowLeft":
          this.addPanInput(step, 0);
          stepped = true;
          break;
        case "ArrowRight":
          this.addPanInput(-step, 0);
          stepped = true;
          break;
        case "ArrowUp":
          this.addPanInput(0, -step);
          stepped = true;
          break;
        case "ArrowDown":
          this.addPanInput(0, step);
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

    this.target.style.cursor = "grab";
  }

  /** Update the pan bounds + scale (called on resize by Engine). */
  public setMetrics(metrics: DragMetrics): void {
    this.maxX = metrics.maxX;
    this.maxY = metrics.maxY;
    this.worldPerPixel = metrics.worldPerPixel;
  }

  /** True while a pointer drag is active (Hover skips raycast then). */
  public isDragging(): boolean {
    return this.dragging;
  }

  /** Current pan speed magnitude (world units/frame) — for any motion response. */
  public getSpeed(): number {
    return Math.hypot(this.currentX - this.targetX, this.currentY - this.targetY);
  }

  /**
   * Accumulate raw input. Past a bound (while dragging), resist the overshoot
   * for the rubber-band give. During momentum the target is clamped in update().
   */
  private addPanInput(dx: number, dy: number): void {
    this.targetX += this.resist(this.targetX, dx, this.maxX);
    this.targetY += this.resist(this.targetY, dy, this.maxY);
  }

  /** Resist input that pushes `value` further past ±max (rubber-band). */
  private resist(value: number, delta: number, max: number): number {
    const next = value + delta;
    const overshooting =
      (value > max && delta > 0) || (value < -max && delta < 0);
    return overshooting ? delta * RUBBER_RESISTANCE : delta;
  }

  /** Called per frame by Engine. Returns the pan offset to apply to wallGroup. */
  public update(): PanOffset {
    if (this.reducedMotion) {
      // Reduced motion: snap (no inertia, no spring).
      this.targetX = clamp(this.targetX, -this.maxX, this.maxX);
      this.targetY = clamp(this.targetY, -this.maxY, this.maxY);
      this.currentX = this.targetX;
      this.currentY = this.targetY;
      this.velX = 0;
      this.velY = 0;
      return { x: this.currentX, y: this.currentY };
    }

    if (!this.dragging) {
      // Momentum glide after release.
      this.targetX += this.velX;
      this.targetY += this.velY;
      this.velX *= FRICTION;
      this.velY *= FRICTION;
      if (Math.abs(this.velX) < VELOCITY_STOP) this.velX = 0;
      if (Math.abs(this.velY) < VELOCITY_STOP) this.velY = 0;
      // Clamp target while gliding so a fling stops at the edge (no fling-past).
      this.targetX = clamp(this.targetX, -this.maxX, this.maxX);
      this.targetY = clamp(this.targetY, -this.maxY, this.maxY);
    }

    // Damped follower (springs back from any drag-time overshoot).
    this.currentX = lerp(this.currentX, this.targetX, SMOOTHING);
    this.currentY = lerp(this.currentY, this.targetY, SMOOTHING);

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
    this.target.style.cursor = "";
  }
}

function normalizeWheelDelta(delta: number): number {
  // We only receive deltaX/deltaY scalars; deltaMode handling is folded into the
  // caller's typical pixel-mode trackpad input. Kept simple — wheel is secondary.
  return delta;
}
