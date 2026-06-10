import type Gallery from "./Gallery";
import { lerp, hexToRgb, type RGB } from "./utils";

/**
 * Background — owns a CSS-styled DOM element (a sibling div behind the
 * Three.js canvas) and updates its background-color per frame to match
 * the active mood color from Gallery.getMoodBlendData(cameraZ).
 *
 * Why a DOM element instead of THREE.Scene.background or renderer clear
 * color: the renderer is created with `alpha:true` + `clearAlpha:0`, so
 * the canvas is intentionally transparent. Painting via CSS keeps color
 * interpolation in sRGB (no color-space drama with Three.js linear math),
 * lets the user inspect / tweak via DevTools, and decouples the bg from
 * GPU state.
 *
 * Per-frame contract:
 *   Engine._render() calls background.update(camera.position.z) AFTER
 *   scroll.update() and BEFORE gallery.update() (mood data depends only
 *   on cameraZ, not on Gallery's per-plane uniforms, so this ordering
 *   is safe and keeps Background visually in lockstep with the camera).
 */

const BLEND_SMOOTHING = 0.10; // current → target lerp per frame

export default class Background {
  private el: HTMLDivElement;
  private gallery: Gallery;
  private currentRgb: RGB = { r: 26, g: 20, b: 16 }; // ink-deep default
  private reducedMotion: boolean;
  private rmMql: MediaQueryList;
  private onRmChange: (e: MediaQueryListEvent) => void;

  constructor(host: HTMLElement, gallery: Gallery) {
    this.gallery = gallery;
    this.el = document.createElement("div");
    this.el.setAttribute("data-depth-gallery-bg", "");
    this.el.style.cssText =
      "position:fixed;inset:0;z-index:0;background-color:rgb(26,20,16);transition:none;pointer-events:none;";
    // Insert BEHIND the canvas. Canvas is expected to sit at z-index 10
    // (or any positive z-index above 0) within the same stacking context.
    host.insertBefore(this.el, host.firstChild);

    this.rmMql = window.matchMedia("(prefers-reduced-motion: reduce)");
    this.reducedMotion = this.rmMql.matches;
    this.onRmChange = (e: MediaQueryListEvent): void => {
      this.reducedMotion = e.matches;
    };
    this.rmMql.addEventListener("change", this.onRmChange);
  }

  /** Called per frame by Engine. */
  public update(cameraZ: number): void {
    const mood = this.gallery.getMoodBlendData(cameraZ);
    const from = hexToRgb(mood.fromColor);
    const to = hexToRgb(mood.toColor);
    const target: RGB = {
      r: lerp(from.r, to.r, mood.blendFactor),
      g: lerp(from.g, to.g, mood.blendFactor),
      b: lerp(from.b, to.b, mood.blendFactor),
    };

    if (this.reducedMotion) {
      this.currentRgb = target;
    } else {
      this.currentRgb = {
        r: lerp(this.currentRgb.r, target.r, BLEND_SMOOTHING),
        g: lerp(this.currentRgb.g, target.g, BLEND_SMOOTHING),
        b: lerp(this.currentRgb.b, target.b, BLEND_SMOOTHING),
      };
    }

    const r = Math.round(this.currentRgb.r);
    const g = Math.round(this.currentRgb.g);
    const b = Math.round(this.currentRgb.b);
    this.el.style.backgroundColor = `rgb(${r},${g},${b})`;
  }

  public dispose(): void {
    this.rmMql.removeEventListener("change", this.onRmChange);
    this.el.parentElement?.removeChild(this.el);
  }
}
