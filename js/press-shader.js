/**
 * press-shader.js — animated MeshGradient background for the /press/ closer.
 *
 * Replaces the earlier hand-written WebGL terrain shader with the Paper Shaders
 * "MeshGradient" effect (per the user's GAMOS-DOCS/SHADER-2.txt spec), recolored
 * to the brand palette (§5) instead of the file's neon cyan/orange.
 *
 * Runs the REAL Paper shader via the self-hosted vanilla core bundle
 * (assets/vendor/paper-shaders.module.js — zero-dependency, tree-shaken). No
 * React. Permitted by CLAUDE.md §2 (self-hosted, zero-runtime-dep library —
 * the GSAP/Leaflet precedent).
 *
 * Two stacked MeshGradient layers mirror the source file's two <MeshGradient>
 * elements: a solid base + a faint overlay for depth. Toned down 2026-06-10
 * (UI-unification): slow ambient drift + a quieter overlay so the closer reads
 * as a calm backdrop, not an eye-catching effect (see BASE_SPEED/OVERLAY_*).
 *
 * Contract: ES2022 module. Exports init() / destroy(). Idempotent.
 *   - Reduced motion → speed 0 (one static frame, no RAF).
 *   - Offscreen → both mounts setSpeed(0) (RAF stops — battery).
 *   - The source file's mouse handler only toggled unused state; MeshGradient is
 *     not mouse-driven, so this version has no mouse interaction (by design).
 *
 * Constitution refs: §2 (self-hosted shader library), §5 (palette), §8 (perf —
 *                     IO pause, reduced-motion), §10 (module-scoped init/destroy).
 */

import {
  ShaderMount,
  meshGradientFragmentShader,
  getShaderColorFromString,
  defaultObjectSizing,
  ShaderFitOptions,
} from "/assets/vendor/paper-shaders.module.js";
import { brandPalette } from "./utils/colors.js";

const HOST_SELECTOR = "[data-press-shader]";

// Two shader-only dark steps that sit BELOW --ink-deep on the brand ramp — they
// are gradient-composition values, not part of the §5 5-color palette, so they
// stay as documented local constants (adding them to tokens.css would breach
// §5's "max 5 active colors"). Everything else is read live from css/tokens.css
// via brandPalette() (§10.2 single-source) at init time.
const SHADER_BLACK = "#120D0A"; // darkest gradient anchor
const SHADER_UMBER = "#3A2C20"; // mid step between ink-deep and cocoa

// Palette builders (§5 — read from tokens at init), weighted DARK so the closer
// stays moody and the cream title keeps contrast. Mostly ink/cocoa with brass
// only as the brightest accent (no ivory, no full-bright brass spot).
function baseColors() {
  const p = brandPalette();
  return [SHADER_BLACK, p.inkDeep, SHADER_UMBER, p.cocoa, p.brassDeep];
}
function overlayColors() {
  const p = brandPalette();
  return [SHADER_BLACK, p.cocoa, p.brassDeep, p.brass];
}
// toned down 2026-06-10: calmer ambient drift per UI-unification pass.
// Speeds roughly halved (0.3→0.13, 0.2→0.09) so the motion reads as a slow,
// barely-perceptible drift rather than active flowing; overlay contribution
// dropped (0.4→0.22) so the composite is softer and far less busy. Palette
// (§5 brand hues) is intentionally unchanged — only motion + busyness calmed.
const BASE_SPEED = 0.13;
const OVERLAY_SPEED = 0.09;
const OVERLAY_OPACITY = 0.22;

let host = null;
let baseLayer = null;   // { el, mount }
let overlayLayer = null;
let io = null;
let mqlReduce = null;
let mqlListener = null;
let reduceMotion = false;
let onVisible = null;

// Build the full MeshGradient uniform set (mirrors the React wrapper's mapping:
// own uniforms + sizing uniforms). Colors are strings → vec4 via the helper.
function meshUniforms(colors) {
  const s = defaultObjectSizing;
  return {
    u_colors: colors.map(getShaderColorFromString),
    u_colorsCount: colors.length,
    u_distortion: 0.8,
    u_swirl: 0.1,
    u_grainMixer: 0,
    u_grainOverlay: 0,
    u_fit: ShaderFitOptions[s.fit],
    u_rotation: s.rotation,
    u_scale: s.scale,
    u_offsetX: s.offsetX,
    u_offsetY: s.offsetY,
    u_originX: s.originX,
    u_originY: s.originY,
    u_worldWidth: s.worldWidth,
    u_worldHeight: s.worldHeight,
  };
}

function makeLayer(colors, speed, opacity) {
  const el = document.createElement("div");
  el.className = "press-closer__layer";
  el.setAttribute("aria-hidden", "true");
  el.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;" +
    `opacity:${opacity};`;
  host.appendChild(el);
  // ShaderMount(parent, fragmentShader, uniforms, webGlContextAttributes, speed).
  // speed 0 when reduced motion → one static frame, no RAF.
  const mount = new ShaderMount(
    el,
    meshGradientFragmentShader,
    meshUniforms(colors),
    { alpha: true, antialias: true },
    reduceMotion ? 0 : speed
  );
  return { el, mount, speed };
}

function setRunning(run) {
  if (reduceMotion) return; // stays static
  if (baseLayer) baseLayer.mount.setSpeed(run ? baseLayer.speed : 0);
  if (overlayLayer) overlayLayer.mount.setSpeed(run ? overlayLayer.speed : 0);
}

export function init() {
  if (typeof document === "undefined") return;
  if (host) return; // idempotent

  host = document.querySelector(HOST_SELECTOR);
  if (!host) return;

  mqlReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduceMotion = mqlReduce.matches;

  try {
    baseLayer = makeLayer(baseColors(), BASE_SPEED, 1);
    overlayLayer = makeLayer(overlayColors(), OVERLAY_SPEED, OVERLAY_OPACITY);
  } catch (err) {
    // WebGL2 unavailable, etc. — leave the ink-deep CSS background.
    console.warn("[press-shader] MeshGradient init failed:", err);
    destroy();
    return;
  }

  // Reduced-motion flips: start/stop the animation live.
  mqlListener = (e) => {
    reduceMotion = e.matches;
    if (reduceMotion) {
      if (baseLayer) baseLayer.mount.setSpeed(0);
      if (overlayLayer) overlayLayer.mount.setSpeed(0);
    } else {
      setRunning(true);
    }
  };
  if (mqlReduce.addEventListener) mqlReduce.addEventListener("change", mqlListener);

  // Pause both mounts when the closer is offscreen (battery).
  const section = host.closest(".press-closer") || host;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      setRunning(entries.some((en) => en.isIntersecting));
    }, { threshold: 0.01 });
    io.observe(section);
  } else {
    setRunning(true);
  }
}

export function destroy() {
  if (io) { io.disconnect(); io = null; }
  if (mqlReduce && mqlListener && mqlReduce.removeEventListener) {
    mqlReduce.removeEventListener("change", mqlListener);
  }
  mqlReduce = null;
  mqlListener = null;
  onVisible = null;

  for (const layer of [baseLayer, overlayLayer]) {
    if (layer) {
      try { layer.mount.dispose(); } catch { /* already gone */ }
      if (layer.el && layer.el.parentNode) layer.el.parentNode.removeChild(layer.el);
    }
  }
  baseLayer = null;
  overlayLayer = null;
  host = null;
}

export default { init, destroy };
