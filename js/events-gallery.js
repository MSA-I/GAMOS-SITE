/**
 * events-gallery.js — #events "סוגי אירועים" mouse-image-distortion gallery.
 *
 * 2026-07-13 v2: 1:1 vanilla port of olivierlarose/mouse-image-distortion
 * (user-chosen reference; original is Next.js + React-Three-Fiber, which §2
 * forbids in the main site). One textured WebGL plane (15×15 segments)
 * follows the pointer with a lerp(0.1) smooth-mouse; the raw−smooth delta
 * feeds the VERBATIM template shaders:
 *
 *     newPosition.x += sin(uv.y * PI) * uDelta.x * uAmplitude;   // 0.0005
 *     newPosition.y += sin(uv.x * PI) * uDelta.y * uAmplitude;
 *
 * Hovering a row swaps the plane texture and fades uAlpha to 1 over 0.2s
 * (leave → 0), exactly like the reference. Plane size replicates drei's
 * useAspect(imgW, imgH, 0.225): image cover-fitted to the canvas × 0.225.
 *
 * Rendering is RAW WebGL1 — zero deps, no Three.js (§2 shader clause,
 * path א: "raw WebGL1/WebGL2 vanilla דרך WebGLRenderingContext").
 *
 * Coarse pointers / ≤768px (§13 rule 8 — equivalent experience): rows are
 * scroll-activated via a center-band IntersectionObserver and the plane
 * tracks the ACTIVE ROW's center through the same lerp pipeline, so row
 * changes produce the same jelly distortion. A matchMedia change listener
 * re-wires the branch on rotation/resize. A tap always navigates (#contact).
 *
 * Perf (§8): textures lazy-load one viewport ahead (one-shot IO), coarse
 * viewports fetch .half.webp variants, and the RAF loop runs only while the
 * section is on screen (visibility IO). prefers-reduced-motion (live
 * subscription): uAmplitude 0 (no jelly), plane centered, fade only.
 *
 * Contract: ES2022 module, init()/destroy(), self-no-ops without
 * [data-events-stage]. No globals. §9: rows are native links with stable
 * aria-labels; the canvas is aria-hidden decoration.
 */

import { prefersReducedMotion, isMobile, onReducedMotionChange } from "./utils/media-query.js";

const COARSE_QUERY = "(max-width: 768px)";
const NO_HOVER_QUERY = "(hover: none)";
const SEGMENTS = 15;        // template: planeGeometry(1, 1, 15, 15)
const AMPLITUDE = 0.0005;   // template: uAmplitude
const LERP = 0.1;           // template: lerp(smooth, raw, 0.1)
const SCALE_FACTOR = 0.225; // template: useAspect(w, h, 0.225)
const FADE_SECONDS = 0.2;   // template: animate(opacity, {duration: 0.2})

/* Verbatim template shaders (Shader.js), plus the pixel→clip mapping that
   replaces the R3F camera + motion.mesh position/scale. */
const VERTEX_SRC = `
attribute vec3 position;
attribute vec2 uv;
uniform vec2 uDelta;
uniform float uAmplitude;
uniform vec2 uTranslate;   /* plane center, canvas px (top-left origin) */
uniform vec2 uScale;       /* plane size, canvas px */
uniform vec2 uResolution;  /* canvas px */
varying vec2 vUv;
float PI = 3.141592653589793238;
void main() {
  vUv = uv;
  vec3 newPosition = position;
  newPosition.x += sin(uv.y * PI) * uDelta.x * uAmplitude;
  newPosition.y += sin(uv.x * PI) * uDelta.y * uAmplitude;
  vec2 px = uTranslate + newPosition.xy * uScale;
  vec2 clip = (px / uResolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`;

const FRAGMENT_SRC = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTexture;
uniform float uAlpha;
void main() {
  vec3 tex = texture2D(uTexture, vUv).rgb;
  gl_FragColor = vec4(tex, uAlpha);
}`;

let _stage = null;
let _list = null;
let _canvas = null;
let _rows = [];
let _active = null;
let _reduced = false;
let _coarse = false;

let _gl = null;
let _program = null;
let _uni = null;          // uniform locations
let _indexCount = 0;
let _textures = new Map(); // row -> { tex, w, h, ready }
let _current = null;       // currently bound row texture entry

let _raf = 0;
let _running = false;
let _lastT = 0;
let _alpha = 0;
let _alphaTarget = 0;
let _mouse = { x: 0, y: 0 };        // raw target (canvas px)
let _smooth = { x: 0, y: 0 };
let _delta = { x: 0, y: 0 };
let _sectionVisible = false;
let _visIO = null;
let _preIO = null;
let _rowIO = null;
let _listeners = [];
let _mqlWidth = null;
let _mqlHover = null;
let _rmUnsub = null;
let _loaded = false;

function on(target, type, handler, opts) {
  target.addEventListener(type, handler, opts);
  _listeners.push([target, type, handler, opts]);
}

/* Coarse viewports get the .half variant (mobile/loader.js convention). */
function imageUrl(row) {
  const src = row.dataset.image || "";
  return _coarse ? src.replace(".full.", ".half.") : src;
}

/* ---- WebGL setup ---- */

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh);
    gl.deleteShader(sh);
    throw new Error("events-gallery shader: " + log);
  }
  return sh;
}

function initGL() {
  _gl = _canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false });
  if (!_gl) return false;
  const gl = _gl;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  _program = gl.createProgram();
  gl.attachShader(_program, vs);
  gl.attachShader(_program, fs);
  gl.linkProgram(_program);
  if (!gl.getProgramParameter(_program, gl.LINK_STATUS)) return false;
  gl.useProgram(_program);

  // Plane grid: SEGMENTS×SEGMENTS quads, positions -0.5..0.5, uv 0..1.
  const n = SEGMENTS + 1;
  const pos = new Float32Array(n * n * 2);
  const uv = new Float32Array(n * n * 2);
  let p = 0;
  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      const u = ix / SEGMENTS, v = iy / SEGMENTS;
      pos[p] = u - 0.5; uv[p++] = u;
      pos[p] = 0.5 - v; uv[p++] = 1 - v; // top row = +y, uv v like three's plane
    }
  }
  const idx = new Uint16Array(SEGMENTS * SEGMENTS * 6);
  let q = 0;
  for (let iy = 0; iy < SEGMENTS; iy++) {
    for (let ix = 0; ix < SEGMENTS; ix++) {
      const a = iy * n + ix, b = a + 1, c = a + n, d = c + 1;
      idx[q++] = a; idx[q++] = c; idx[q++] = b;
      idx[q++] = b; idx[q++] = c; idx[q++] = d;
    }
  }
  _indexCount = idx.length;

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, pos, gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(_program, "position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  const aUv = gl.getAttribLocation(_program, "uv");
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 0, 0);

  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

  _uni = {
    delta: gl.getUniformLocation(_program, "uDelta"),
    amplitude: gl.getUniformLocation(_program, "uAmplitude"),
    translate: gl.getUniformLocation(_program, "uTranslate"),
    scale: gl.getUniformLocation(_program, "uScale"),
    resolution: gl.getUniformLocation(_program, "uResolution"),
    alpha: gl.getUniformLocation(_program, "uAlpha"),
    texture: gl.getUniformLocation(_program, "uTexture"),
  };
  gl.uniform1f(_uni.amplitude, AMPLITUDE);
  gl.uniform1i(_uni.texture, 0);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  return true;
}

function resizeCanvas() {
  if (!_canvas || !_gl) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = _canvas.clientWidth, h = _canvas.clientHeight;
  if (!w || !h) return;
  if (_canvas.width !== Math.round(w * dpr) || _canvas.height !== Math.round(h * dpr)) {
    _canvas.width = Math.round(w * dpr);
    _canvas.height = Math.round(h * dpr);
    _gl.viewport(0, 0, _canvas.width, _canvas.height);
  }
}

/* Texture HANDLES are created for every row at init (cheap, no network) so
   setActive always finds an entry regardless of IO callback ordering; the
   actual image fetches are deferred to loadTextures (one viewport ahead). */
function createTextureEntries() {
  for (const row of _rows) {
    if (imageUrl(row)) _textures.set(row, { tex: _gl.createTexture(), w: 1, h: 1, ready: false });
  }
}

function loadTextures() {
  if (_loaded || !_gl) return;
  _loaded = true;
  for (const row of _rows) {
    const src = imageUrl(row);
    const entry = _textures.get(row);
    if (!src || !entry) continue;
    const img = new Image();
    img.onload = () => {
      if (!_gl) return;
      const gl = _gl;
      gl.bindTexture(gl.TEXTURE_2D, entry.tex);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      entry.w = img.naturalWidth;
      entry.h = img.naturalHeight;
      entry.ready = true;
    };
    img.src = src;
  }
}

/* drei useAspect equivalent: cover-fit the image into the canvas, × factor.
   Returns plane size in CSS px. On coarse viewports the template's desktop
   0.225 reads tiny (the stage is short and narrow), so the factor rises —
   an adaptation, the reference is desktop-only. */
function planeSize(entry) {
  const W = _canvas.clientWidth, H = _canvas.clientHeight;
  const imgAspect = entry.w / entry.h;
  let w, h;
  if (imgAspect > W / H) { h = H; w = H * imgAspect; }
  else { w = W; h = W / imgAspect; }
  const factor = _coarse ? 0.45 : SCALE_FACTOR;
  return [w * factor, h * factor];
}

/* ---- Activation ---- */

function setActive(row) {
  if (row === _active) return;
  _active = row;
  for (const r of _rows) r.classList.toggle("is-active", r === row);
  const entry = _textures.get(row);
  if (entry) { _current = entry; _alphaTarget = 1; }
  if (_coarse) retargetToRow(row);
}

function clearActive() {
  _active = null;
  for (const r of _rows) r.classList.remove("is-active");
  _alphaTarget = 0; // template: menu leave → alpha 0 (texture stays bound)
}

function activateFrom(e) {
  const row = e.target.closest(".events__row");
  if (row && row !== _active && _list.contains(row)) setActive(row);
}

/* Coarse pointers: the plane tracks the active row's center. */
function retargetToRow(row) {
  const stageRect = _stage.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  _mouse.x = rowRect.left + rowRect.width / 2 - stageRect.left;
  _mouse.y = rowRect.top + rowRect.height / 2 - stageRect.top;
}

/* ---- Render loop (runs only while the section is on screen) ---- */

function frame(t) {
  _raf = _running ? requestAnimationFrame(frame) : 0;
  if (!_gl || !_current) return;
  const dt = Math.min((t - _lastT) / 1000 || 0, 0.1);
  _lastT = t;

  // Template useFrame: lerp(0.1) with the >1px guard; delta = raw − smooth.
  const dx = _mouse.x - _smooth.x;
  const dy = _mouse.y - _smooth.y;
  if (Math.abs(dx) > 1) {
    _smooth.x += dx * LERP;
    _smooth.y += dy * LERP;
    _delta.x = dx;
    _delta.y = -dy; // template: -1 * (y - smoothY)
  }

  // Template fade: 0.2s toward target.
  const step = dt / FADE_SECONDS;
  _alpha += Math.max(-step, Math.min(step, _alphaTarget - _alpha));

  resizeCanvas();
  const gl = _gl;
  gl.clear(gl.COLOR_BUFFER_BIT);
  if (_alpha <= 0.001 || !_current.ready) return;

  const [pw, ph] = planeSize(_current);
  const dpr = _canvas.width / _canvas.clientWidth;
  gl.bindTexture(gl.TEXTURE_2D, _current.tex);
  gl.uniform2f(_uni.resolution, _canvas.width, _canvas.height);
  gl.uniform2f(_uni.translate, _smooth.x * dpr, _smooth.y * dpr);
  gl.uniform2f(_uni.scale, pw * dpr, ph * dpr);
  gl.uniform2f(_uni.delta, _reduced ? 0 : _delta.x, _reduced ? 0 : _delta.y);
  gl.uniform1f(_uni.alpha, _alpha);
  gl.drawElements(gl.TRIANGLES, _indexCount, gl.UNSIGNED_SHORT, 0);
}

function setRunning(run) {
  if (run === _running) return;
  _running = run;
  if (run && !_raf) { _lastT = performance.now(); _raf = requestAnimationFrame(frame); }
  if (!run && _raf) { cancelAnimationFrame(_raf); _raf = 0; }
}

/* ---- init / destroy ---- */

function onBreakpointChange() {
  destroy();
  init();
}

export function init() {
  _stage = document.querySelector("#events [data-events-stage]");
  if (!_stage) return;
  _list = _stage.querySelector("[data-events-list]");
  _canvas = _stage.querySelector("[data-events-canvas]");
  _rows = Array.from(_stage.querySelectorAll(".events__row"));
  if (!_list || !_canvas || _rows.length === 0) return;

  _reduced = prefersReducedMotion();
  _mqlWidth = window.matchMedia(COARSE_QUERY);
  _mqlHover = window.matchMedia(NO_HOVER_QUERY);
  _coarse = _mqlWidth.matches || _mqlHover.matches;
  _mqlWidth.addEventListener("change", onBreakpointChange);
  _mqlHover.addEventListener("change", onBreakpointChange);
  _rmUnsub = onReducedMotionChange((m) => { _reduced = m; });

  try {
    if (!initGL()) { _gl = null; return; } // no WebGL → rows stay plain links
  } catch (_) {
    _gl = null;
    return;
  }
  resizeCanvas();
  createTextureEntries();
  _smooth.x = _mouse.x = _canvas.clientWidth / 2;
  _smooth.y = _mouse.y = _canvas.clientHeight / 2;

  on(window, "resize", resizeCanvas, { passive: true });
  on(_canvas, "webglcontextlost", (e) => { e.preventDefault(); setRunning(false); }, false);

  // Textures one viewport ahead (§8 — nothing at boot).
  _preIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      loadTextures();
      _preIO.disconnect();
      _preIO = null;
    }
  }, { rootMargin: "100% 0px" });
  _preIO.observe(_stage);

  // RAF only while on screen (§8).
  _visIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      _sectionVisible = entry.isIntersecting;
      setRunning(_sectionVisible);
    }
  }, { threshold: 0 });
  _visIO.observe(_stage);

  if (_coarse) {
    _rowIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target);
      }
    }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    for (const row of _rows) _rowIO.observe(row);
    on(window, "scroll", () => { if (_active) retargetToRow(_active); }, { passive: true });
  } else {
    // Template: li mouseover → activeMenu, ul mouseleave → null.
    on(_list, "pointerover", activateFrom);
    on(_list, "focusin", activateFrom);
    on(_list, "pointerleave", clearActive);
    on(_list, "focusout", (e) => {
      if (!e.relatedTarget || !_list.contains(e.relatedTarget)) clearActive();
    });
    on(_stage, "pointermove", (e) => {
      const rect = _canvas.getBoundingClientRect();
      _mouse.x = e.clientX - rect.left;
      _mouse.y = e.clientY - rect.top;
    }, { passive: true });
  }
}

export function destroy() {
  for (const [t, type, h, o] of _listeners) t.removeEventListener(type, h, o);
  _listeners = [];
  if (_mqlWidth) { _mqlWidth.removeEventListener("change", onBreakpointChange); _mqlWidth = null; }
  if (_mqlHover) { _mqlHover.removeEventListener("change", onBreakpointChange); _mqlHover = null; }
  if (_rmUnsub) { _rmUnsub(); _rmUnsub = null; }
  if (_visIO) { _visIO.disconnect(); _visIO = null; }
  if (_preIO) { _preIO.disconnect(); _preIO = null; }
  if (_rowIO) { _rowIO.disconnect(); _rowIO = null; }
  setRunning(false);
  if (_gl) {
    for (const { tex } of _textures.values()) _gl.deleteTexture(tex);
    const lose = _gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  }
  _textures = new Map();
  _current = null;
  _gl = _program = _uni = null;
  for (const r of _rows) r.classList.remove("is-active");
  _stage = _list = _canvas = _active = null;
  _rows = [];
  _alpha = 0;
  _alphaTarget = 0;
  _sectionVisible = false;
  _loaded = false; // textures were deleted with the context — reload on re-init
}
