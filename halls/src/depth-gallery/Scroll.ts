/**
 * Scroll — input handler + damped follower for the Codrops Depth Gallery port.
 *
 * Owns wheel + touch + keyboard input bound to the canvas WRAPPER element
 * (not window — a deliberate addition over the reference so the gallery only
 * captures input while focused/hovered, keeping the rest of the page scrollable
 * if it ever embeds), accumulates a `scrollTarget` in RAW INPUT UNITS (pixels),
 * runs a per-frame lerp into `scrollCurrent`, derives a clamped per-frame
 * `velocity`, and outputs a clamped camera Z position via {@link Scroll.update}.
 *
 * Wired into {@link Engine} via `Engine.setScroll()`. Engine calls
 * `scroll.update()` every frame and applies the returned Z to the camera, then
 * Experience reads `scroll.velocity` / `scroll.velocityMax` to drive the
 * Gallery breath/drift and the Background motion response.
 *
 * Velocity fidelity (WAVE 2): identical structure to the reference Scroll.js so
 * the magnitude lands in the same numeric range the breath/blob math expects —
 *   rawVelocity = scrollCurrent - previousScrollCurrent   (per-frame, RAW units)
 *   velocity    = lerp(velocity, rawVelocity, 0.12)
 *   velocity    = clamp(velocity, ±1.5)
 * The camera-Z mapping applies `scrollToWorldFactor` (0.01) only at the end, so
 * `scrollCurrent` stays in raw-pixel space (where a sustained wheel gesture
 * pushes |velocity| toward the 1.5 clamp), exactly like the reference.
 *
 * Bounds (WAVE 2): derived from the gallery depth like the reference —
 *   maxCameraZ = nearestZ + 5   (FIRST_PLANE_VIEW_OFFSET)
 *   minCameraZ = deepestZ + 5   (LAST_PLANE_VIEW_OFFSET)
 * `cameraStartZ` is pinned to `maxCameraZ` so scroll 0 sits the camera in front
 * of the first plane. `scrollTarget` + `scrollCurrent` are clamped to the scroll
 * range that maps onto [minCameraZ, maxCameraZ].
 *
 * RTL note: under `dir="rtl"` the depth axis is vertical/forward, NOT the
 * horizontal reading axis — so ArrowLeft / ArrowRight are NO-OPs here (they're
 * reserved for left/right reading flow and must not hijack depth). Depth is
 * driven by ArrowUp / ArrowDown / PageUp / PageDown / Home / End only.
 *
 * Honours `prefers-reduced-motion: reduce` by short-circuiting the damping
 * (target snaps to current with zero velocity) — another addition over the
 * reference, required by the Constitution.
 *
 * WAVE 6 — coherent gate: Scroll is the one module that keeps a LIVE
 * `matchMedia('reduce')` change-listener (the trail / background / gallery are
 * gated once at construction, sampled from the SAME media query via
 * detectQuality()). The live listener is deliberate and cheap here — it only
 * flips snap ⇄ lerp on the scroll axis, the single place where reacting to an
 * in-session OS toggle is worth the listener. With velocity pinned to 0 under
 * reduce, the breath / drift / blob response downstream all read 0 too, so the
 * whole atmosphere stays static — one coherent switch, sourced once.
 *
 * LIFECYCLE CONTRACT: `dispose()` MUST be called for every Scroll instance
 * (it removes the wheel/touch/keydown listeners AND the live matchMedia
 * change-listener). If a new Scroll is constructed without disposing the prior
 * one, BOTH matchMedia listeners accumulate in the media-query list. The owner
 * (Engine) guards this: `Engine.dispose()` always calls `scroll?.dispose()`
 * before dropping the reference, and DepthGallery never constructs a second
 * Scroll without first disposing the Engine that holds the first. Any future
 * caller that constructs Scroll directly inherits the same obligation.
 */

import { lerp, clamp } from "./utils";

const SCROLL_SMOOTHING = 0.08;
const VELOCITY_DAMPING = 0.12;
const VELOCITY_MAX = 1.5;
const VELOCITY_STOP_THRESHOLD = 0.0001;
const WHEEL_SCROLL_SPEED = 1.0;
const TOUCH_SCROLL_SPEED = 1.8;
const SCROLL_TO_WORLD_FACTOR = 0.01; // raw scroll units → world Z units
// Reference firstPlaneViewOffset = lastPlaneViewOffset = 5. These MUST match
// Gallery's PLANE_VIEW_OFFSET (= 5): the near bound puts plane 0 at its hero
// depth (camera 5 in front of z=0), the far bound puts the last plane there.
// With the reference cross-dissolve (sampling one PLANE_GAP=5 ahead) each plane
// reaches full opacity exactly at its gap and the last plane fills at the deep
// bound — so scrolling sweeps every plane through view once, nothing blank at
// either extreme. (The trail progress reads Gallery.getCameraMaxZ/MinZ, which
// also return ±5, so progress maps onto this exact camera range.)
const FIRST_PLANE_VIEW_OFFSET = 5; // maxCameraZ = nearestZ + this
const LAST_PLANE_VIEW_OFFSET = 5; // minCameraZ = deepestZ + this

// One keyboard "step" advances the camera by one plane gap of world depth.
// In raw-input space that is PLANE_GAP / SCROLL_TO_WORLD_FACTOR. PLANE_GAP is 5
// (Gallery), so a step is 5 / 0.01 = 500 raw units.
const STEP_PER_PLANE_RAW = 5 / SCROLL_TO_WORLD_FACTOR;

export interface ScrollOptions {
  cameraStartZ: number;
  cameraMinZ: number;
  cameraMaxZ: number;
  planeCount: number;
  getPlaneZ: (i: number) => number;
}

export default class Scroll {
  // Injected gallery geometry (kept for signature stability + bound recompute).
  private planeCount: number;
  private getPlaneZ: (i: number) => number;

  // Derived camera bounds (reference: nearestZ+5 / deepestZ+5).
  private cameraStartZ: number;
  private minCameraZ: number;
  private maxCameraZ: number;

  // State — RAW INPUT UNITS (pixels), NOT pre-multiplied by scrollToWorldFactor.
  private scrollTarget = 0; // accumulated input (positive = forward, toward deeper planes)
  private scrollCurrent = 0; // damped follower
  private previousScrollCurrent = 0;
  private rawVelocity = 0;

  // Public so Experience / Gallery / Background can read scroll.velocity and
  // scroll.velocityMax directly (matches the reference). `getVelocity()` is kept
  // for callers that prefer the accessor.
  public velocity = 0;
  public readonly velocityMax = VELOCITY_MAX;

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
    this.planeCount = opts.planeCount;
    this.getPlaneZ = opts.getPlaneZ;

    // Derive reference bounds from the gallery depth. We recompute here (rather
    // than trusting opts.cameraMinZ/MaxZ) so the start/clamp math matches the
    // reference exactly: maxCameraZ = nearestZ + 5, minCameraZ = deepestZ + 5.
    // (opts.* are still accepted to keep the Wave-1 ScrollOptions contract.)
    this.maxCameraZ = 0;
    this.minCameraZ = 0;
    this.cameraStartZ = 0;
    this.recomputeBounds();

    this.scrollCurrent = 0;
    this.scrollTarget = 0;
    this.previousScrollCurrent = 0;

    this.rmMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.rmMql.matches;
    this.onRmChange = (e: MediaQueryListEvent): void => {
      this.reducedMotion = e.matches;
    };
    this.rmMql.addEventListener("change", this.onRmChange);

    this.onWheel = (e: WheelEvent): void => {
      e.preventDefault();
      const delta = normalizeWheelDelta(e); // raw pixels
      this.addScrollInput(delta * WHEEL_SCROLL_SPEED);
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
      this.addScrollInput(dy * TOUCH_SCROLL_SPEED);
      e.preventDefault();
    };
    this.onTouchEnd = (): void => {
      this.touchY = null;
    };
    this.target.addEventListener("touchstart", this.onTouchStart, {
      passive: true,
    });
    this.target.addEventListener("touchmove", this.onTouchMove, {
      passive: false,
    });
    this.target.addEventListener("touchend", this.onTouchEnd, {
      passive: true,
    });
    this.target.addEventListener("touchcancel", this.onTouchEnd, {
      passive: true,
    });

    this.onKeyDown = (e: KeyboardEvent): void => {
      let stepped = false;
      switch (e.key) {
        // Forward (deeper) — ArrowDown / PageDown.
        case "ArrowDown":
        case "PageDown":
          this.addScrollInput(STEP_PER_PLANE_RAW);
          stepped = true;
          break;
        // Backward (shallower) — ArrowUp / PageUp.
        case "ArrowUp":
        case "PageUp":
          this.addScrollInput(-STEP_PER_PLANE_RAW);
          stepped = true;
          break;
        // RTL: horizontal arrows are reserved for reading flow — no-op the
        // depth axis (see file header). Listed explicitly so intent is clear.
        case "ArrowLeft":
        case "ArrowRight":
          break;
        case "Home":
          this.scrollTarget = this.minScroll();
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

  /**
   * Recompute camera bounds from the gallery depth (reference math).
   * Called once at construction; cheap enough to re-run if the layout ever
   * changes. nearestZ = plane 0's Z (largest), deepestZ = last plane's Z.
   */
  private recomputeBounds(): void {
    const count = Math.max(this.planeCount, 1);
    const nearestZ = this.getPlaneZ(0);
    const deepestZ = this.getPlaneZ(count - 1);
    this.maxCameraZ = nearestZ + FIRST_PLANE_VIEW_OFFSET;
    this.minCameraZ = deepestZ + LAST_PLANE_VIEW_OFFSET;
    if (this.minCameraZ > this.maxCameraZ) {
      this.minCameraZ = this.maxCameraZ;
    }
    this.cameraStartZ = this.maxCameraZ;
  }

  /** Accumulate raw input and immediately clamp to the scroll range. */
  private addScrollInput(deltaRaw: number): void {
    this.scrollTarget = clamp(
      this.scrollTarget + deltaRaw,
      this.minScroll(),
      this.maxScroll(),
    );
  }

  /** Camera Z for a given raw scroll amount (reference cameraZFromScroll). */
  private cameraZFromScroll(scrollAmount: number): number {
    return this.cameraStartZ - scrollAmount * SCROLL_TO_WORLD_FACTOR;
  }

  /** Inverse: raw scroll amount that lands the camera at a given Z.
   * (SCROLL_TO_WORLD_FACTOR is a non-zero compile-time constant, so no
   * divide-by-zero guard is needed.) */
  private scrollFromCameraZ(cameraZ: number): number {
    return (this.cameraStartZ - cameraZ) / SCROLL_TO_WORLD_FACTOR;
  }

  /** Raw scroll value that maps to maxCameraZ (= cameraStartZ) → 0. */
  private minScroll(): number {
    return this.scrollFromCameraZ(this.maxCameraZ);
  }

  /** Raw scroll value that maps to the deepest allowed camera Z. */
  private maxScroll(): number {
    return this.scrollFromCameraZ(this.minCameraZ);
  }

  /**
   * Called per frame by Engine. Returns the camera Z position to apply.
   *
   * Sequence mirrors the reference Scroll.update(): lerp scrollCurrent toward
   * scrollTarget, clamp both into the scroll range, update velocity from the
   * per-frame scrollCurrent delta, then map to camera Z.
   */
  update(): number {
    if (this.reducedMotion) {
      // Reduced motion: snap (no damping, no velocity-driven atmosphere).
      this.scrollTarget = clamp(
        this.scrollTarget,
        this.minScroll(),
        this.maxScroll(),
      );
      this.scrollCurrent = this.scrollTarget;
      this.previousScrollCurrent = this.scrollCurrent;
      this.velocity = 0;
      const z = this.cameraZFromScroll(this.scrollCurrent);
      return clamp(z, this.minCameraZ, this.maxCameraZ);
    }

    // Damped follower.
    this.scrollCurrent = lerp(
      this.scrollCurrent,
      this.scrollTarget,
      SCROLL_SMOOTHING,
    );

    // Clamp both into the valid scroll range.
    const min = this.minScroll();
    const max = this.maxScroll();
    this.scrollTarget = clamp(this.scrollTarget, min, max);
    this.scrollCurrent = clamp(this.scrollCurrent, min, max);

    // Velocity: per-frame delta of the damped follower (reference), lerped +
    // clamped so a sustained gesture pushes |velocity| toward the 1.5 ceiling.
    this.rawVelocity = this.scrollCurrent - this.previousScrollCurrent;
    this.velocity = lerp(
      this.velocity,
      clamp(this.rawVelocity, -VELOCITY_MAX, VELOCITY_MAX),
      VELOCITY_DAMPING,
    );
    if (Math.abs(this.velocity) < VELOCITY_STOP_THRESHOLD) this.velocity = 0;
    this.previousScrollCurrent = this.scrollCurrent;

    // Map raw scrollCurrent to camera Z, clamped to the depth bounds.
    const nextCameraZ = this.cameraZFromScroll(this.scrollCurrent);
    return clamp(nextCameraZ, this.minCameraZ, this.maxCameraZ);
  }

  /** Index of the plane closest to the current scroll position. */
  getActiveIndex(): number {
    // scrollCurrent in raw units → world depth → plane index (gap = 5 world).
    const worldDepth = this.scrollCurrent * SCROLL_TO_WORLD_FACTOR;
    return clamp(Math.round(worldDepth / 5), 0, this.planeCount - 1);
  }

  /** Current damped scroll value in RAW input units. */
  getScrollCurrent(): number {
    return this.scrollCurrent;
  }

  /** Current scroll target in RAW input units (pre-damping). */
  getScrollTarget(): number {
    return this.scrollTarget;
  }

  /** Current damped velocity (RAW units per frame, clamped ±velocityMax). */
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
    this.target.removeEventListener(
      "touchstart",
      this.onTouchStart as EventListener,
    );
    this.target.removeEventListener(
      "touchmove",
      this.onTouchMove as EventListener,
    );
    this.target.removeEventListener("touchend", this.onTouchEnd);
    this.target.removeEventListener("touchcancel", this.onTouchEnd);
    this.target.removeEventListener("keydown", this.onKeyDown);
  }
}

function normalizeWheelDelta(e: WheelEvent): number {
  // Normalize across deltaMode 0=pixel, 1=line, 2=page (reference values).
  if (e.deltaMode === 1) return e.deltaY * 16;
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight;
  return e.deltaY;
}
