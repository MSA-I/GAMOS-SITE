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
 * elements: a solid base + a fainter overlay at ~0.55 opacity for depth.
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

const HOST_SELECTOR = "[data-press-shader]";

// Brand palette (§5 — css/tokens.css), weighted DARK so the closer stays moody
// and the cream title keeps contrast. Mostly ink/cocoa with brass only as the
// brightest accent (no ivory, no full-bright brass spot — those washed it out).
const BASE_COLORS = ["#120D0A", "#1A1410", "#3A2C20", "#534133", "#8B6F46"];
const OVERLAY_COLORS = ["#120D0A", "#534133", "#8B6F46", "#CFAE83"];
const BASE_SPEED = 0.3;
const OVERLAY_SPEED = 0.2;
const OVERLAY_OPACITY = 0.4;

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
    baseLayer = makeLayer(BASE_COLORS, BASE_SPEED, 1);
    overlayLayer = makeLayer(OVERLAY_COLORS, OVERLAY_SPEED, OVERLAY_OPACITY);
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
