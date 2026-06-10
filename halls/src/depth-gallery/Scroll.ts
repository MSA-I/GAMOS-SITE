/**
 * Scroll — input handler + damped follower for the Codrops Depth Gallery port.
 *
 * Owns wheel + touch + keyboard input, accumulates a `scrollTarget` in world
 * units, runs a per-frame lerp into `scrollCurrent`, and outputs a clamped
 * camera Z position via {@link Scroll.update}.
 *
 * Wired into {@link Engine} via `Engine.setScroll()`. Engine calls
 * `scroll.update()` every frame and applies the returned Z to the camera.
 *
 * Honours `prefers-reduced-motion: reduce` by short-circuiting the damping
 * (target snaps to current with zero velocity).
 */

import { lerp, clamp } from "./utils";

const SCROLL_SMOOTHING = 0.08;
const VELOCITY_DAMPING = 0.12;
const VELOCITY_MAX = 1.5;
const VELOCITY_STOP_THRESHOLD = 0.0001;
const WHEEL_SCROLL_SPEED = 1.0;
const TOUCH_SCROLL_SPEED = 1.8;
const SCROLL_TO_WORLD_FACTOR = 0.01; // scroll px → world units
const STEP_PER_PLANE = 5; // world units per plane (matches PLANE_GAP)

export interface ScrollOptions {
  cameraStartZ: number;
  cameraMinZ: number;
  cameraMaxZ: number;
  planeCount: number;
  getPlaneZ: (i: number) => number;
}

export default class Scroll {
  private cameraStartZ: number;
  private cameraMinZ: number;
  private cameraMaxZ: number;
  private planeCount: number;
  private getPlaneZ: (i: number) => number;

  // State
  private scrollTarget = 0; // accumulated input in world units (positive = forward, planes at lower Z)
  private scrollCurrent = 0; // damped follower
  private velocity = 0;
  private rawVelocity = 0;
  private touchY: number | null = null;

  private reducedMotion: boolean;
  private rmMql: MediaQueryList;
  private onRmChange: (e: MediaQueryListEvent) => void;
  private onWheel: (e: WheelEvent) => void;
  private onTouchStart: (e: TouchEvent) => void;
  private onTouchMove: (e: TouchEvent) => void;
  private onTouchEnd: () => void;
  private onKeyDown: (e: KeyboardEvent) => void;

  private target: HTMLElement; // element listeners attach to (the canvas wrapper)

  constructor(target: HTMLElement, opts: ScrollOptions) {
    this.target = target;
    this.cameraStartZ = opts.cameraStartZ;
    this.cameraMinZ = opts.cameraMinZ;
    this.cameraMaxZ = opts.cameraMaxZ;
    this.planeCount = opts.planeCount;
    this.getPlaneZ = opts.getPlaneZ;

    this.scrollCurrent = 0;
    this.scrollTarget = 0;

    this.rmMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.rmMql.matches;
    this.onRmChange = (e: MediaQueryListEvent): void => {
      this.reducedMotion = e.matches;
    };
    this.rmMql.addEventListener("change", this.onRmChange);

    this.onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const delta = normalizeWheelDelta(e); // pixels
      this.scrollTarget += delta * WHEEL_SCROLL_SPEED * SCROLL_TO_WORLD_FACTOR;
      this.scrollTarget = clamp(this.scrollTarget, 0, this.maxScroll());
    };
    this.target.addEventListener("wheel", this.onWheel, { passive: false });

    this.onTouchStart = (e: TouchEvent): void => {
      this.touchY = e.touches[0]?.clientY ?? null;
    };
    this.onTouchMove = (e: TouchEvent): void => {
      if (this.touchY == null) return;
      const cy = e.touches[0]?.clientY ?? this.touchY;
      const dy = this.touchY - cy; // swipe up = positive = forward
      this.touchY = cy;
      this.scrollTarget += dy * TOUCH_SCROLL_SPEED * SCROLL_TO_WORLD_FACTOR;
      this.scrollTarget = clamp(this.scrollTarget, 0, this.maxScroll());
      e.preventDefault();
    };
    this.onTouchEnd = (): void => {
      this.touchY = null;
    };
    this.target.addEventListener("touchstart", this.onTouchStart, { passive: true });
    this.target.addEventListener("touchmove", this.onTouchMove, { passive: false });
    this.target.addEventListener("touchend", this.onTouchEnd, { passive: true });
    this.target.addEventListener("touchcancel", this.onTouchEnd, { passive: true });

    this.onKeyDown = (e: KeyboardEvent): void => {
      let stepped = false;
      switch (e.key) {
        case "ArrowDown":
        case "ArrowRight":
        case "PageDown":
          this.scrollTarget = clamp(this.scrollTarget + STEP_PER_PLANE, 0, this.maxScroll());
          stepped = true;
          break;
        case "ArrowUp":
        case "ArrowLeft":
        case "PageUp":
          this.scrollTarget = clamp(this.scrollTarget - STEP_PER_PLANE, 0, this.maxScroll());
          stepped = true;
          break;
        case "Home":
          this.scrollTarget = 0;
          stepped = true;
          break;
        case "End":
          this.scrollTarget = this.maxScroll();
          stepped = true;
          break;
      }
      if (stepped) e.preventDefault();
    };
    this.target.addEventListener("keydown", this.onKeyDown);
  }

  private maxScroll(): number {
    return (this.planeCount - 1) * STEP_PER_PLANE + 1; // small buffer
  }

  /**
   * Called per frame by Engine. Returns the camera Z position to apply.
   */
  update(): number {
    if (this.reducedMotion) {
      this.scrollCurrent = this.scrollTarget;
      this.velocity = 0;
    } else {
      // Damped follower
      this.scrollCurrent = lerp(this.scrollCurrent, this.scrollTarget, SCROLL_SMOOTHING);
      // Velocity tracking (informational; could drive other effects later)
      this.rawVelocity = this.scrollTarget - this.scrollCurrent;
      this.velocity = lerp(
        this.velocity,
        clamp(this.rawVelocity, -VELOCITY_MAX, VELOCITY_MAX),
        VELOCITY_DAMPING,
      );
      if (Math.abs(this.velocity) < VELOCITY_STOP_THRESHOLD) this.velocity = 0;
    }
    // Map scrollCurrent (positive 0..max) to camera Z (cameraStartZ → cameraMinZ)
    const cameraZ = this.cameraStartZ - this.scrollCurrent;
    return clamp(cameraZ, this.cameraMinZ, this.cameraMaxZ);
  }

  /** Index of the plane closest to the current scroll position. */
  getActiveIndex(): number {
    return Math.round(this.scrollCurrent / STEP_PER_PLANE);
  }

  /** Current damped scroll value in world units. */
  getScrollCurrent(): number {
    return this.scrollCurrent;
  }

  /** Current scroll target in world units (pre-damping). */
  getScrollTarget(): number {
    return this.scrollTarget;
  }

  /** Current damped velocity (world units per frame). */
  getVelocity(): number {
    return this.velocity;
  }

  /** World-space Z of the plane at index `i` (delegates to Gallery). */
  getPlaneZAt(i: number): number {
    return this.getPlaneZ(i);
  }

  dispose(): void {
    this.rmMql.removeEventListener("change", this.onRmChange);
    this.target.removeEventListener("wheel", this.onWheel as EventListener);
    this.target.removeEventListener("touchstart", this.onTouchStart as EventListener);
    this.target.removeEventListener("touchmove", this.onTouchMove as EventListener);
    this.target.removeEventListener("touchend", this.onTouchEnd);
    this.target.removeEventListener("touchcancel", this.onTouchEnd);
    this.target.removeEventListener("keydown", this.onKeyDown);
  }
}

function normalizeWheelDelta(e: WheelEvent): number {
  // Roughly normalize across deltaMode 0=pixel, 1=line, 2=page
  const PIXEL_STEP = 10;
  const LINE_HEIGHT = 40;
  const PAGE_HEIGHT = 800;
  if (e.deltaMode === 1) return (e.deltaY * LINE_HEIGHT) / PIXEL_STEP;
  if (e.deltaMode === 2) return (e.deltaY * PAGE_HEIGHT) / PIXEL_STEP;
  return e.deltaY;
}
