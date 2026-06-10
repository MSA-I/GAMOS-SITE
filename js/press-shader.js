/**
 * press-shader.js — interactive aurora-hills background for the /press/ closer.
 *
 * Raw WebGL1 (GLSL ES 1.00) — NO Three.js, NO 3D model files, NO framework.
 * Permitted by CLAUDE.md §2 (self-contained shader, GSAP/Leaflet self-host
 * precedent). Ported from the user's reference spec
 * (GAMOS-DOCS/SHADER-1.txt — a Three.js "GLSL flowing hills" component):
 *   - the vertex shader (Perlin `cnoise` + the sin/noise hill displacement)
 *     is carried over almost verbatim;
 *   - ONE uniform `uMouse` is added so the cursor pushes the flow center;
 *   - the flat grey fragment shader is recolored to the brand aurora
 *     (cocoa → brass → rose → ivory, Constitution §5).
 *
 * Contract: ES2022 module. Exports init() / destroy(). Idempotent.
 * Reduced motion → one static frame, no RAF. Offscreen → RAF paused (IO).
 * Coarse pointer (touch) → no mouse listener; hills auto-flow.
 *
 * Constitution refs: §2 (raw-WebGL clause), §5 (palette), §8 (perf — IO pause,
 *                     DPR cap, reduced-motion), §10 (module-scoped init/destroy).
 */

const CANVAS_SELECTOR = "[data-press-shader]";
const SEGMENTS = 256;        // PlaneGeometry(256,256,256,256) → 257×257 verts
const PLANE_SIZE = 256;
const CAMERA_Z = 125;
const SPEED = 0.5;
const DPR_CAP = 1.75;

let canvas = null;
let gl = null;
let program = null;
let buffers = null;          // { position, index, indexCount }
let uniforms = null;         // cached uniform locations
let rafId = 0;
let running = false;
let lastTs = 0;
let uTime = 0;

// Mouse: target is set on mousemove, current eases toward it for inertia.
const mouse = { tx: 0, ty: 0, x: 0, y: 0 };

let io = null;
let mqlReduce = null;
let mqlListener = null;
let onResize = null;
let onMouseMove = null;
let reduceMotion = false;

/* ------------------------------------------------------------------ shaders */

// Vertex shader — ported from the reference spec. The only addition is the
// `uMouse` uniform, which offsets the noise sample so the cursor shifts the
// hills. projection/modelView are supplied as uniforms (computed in JS).
const VERT = `#define GLSLIFY 1
attribute vec3 position;
uniform mat4 projectionMatrix;
uniform mat4 modelViewMatrix;
uniform float time;
uniform vec2 uMouse;
varying vec3 vPosition;

mat4 rotateMatrixX(float radian) {
  return mat4(
    1.0, 0.0, 0.0, 0.0,
    0.0, cos(radian), -sin(radian), 0.0,
    0.0, sin(radian), cos(radian), 0.0,
    0.0, 0.0, 0.0, 1.0
  );
}

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
vec3 fade(vec3 t) { return t*t*t*(t*(t*6.0-15.0)+10.0); }

float cnoise(vec3 P) {
  vec3 Pi0 = floor(P);
  vec3 Pi1 = Pi0 + vec3(1.0);
  Pi0 = mod289(Pi0);
  Pi1 = mod289(Pi1);
  vec3 Pf0 = fract(P);
  vec3 Pf1 = Pf0 - vec3(1.0);
  vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
  vec4 iy = vec4(Pi0.yy, Pi1.yy);
  vec4 iz0 = Pi0.zzzz;
  vec4 iz1 = Pi1.zzzz;

  vec4 ixy = permute(permute(ix) + iy);
  vec4 ixy0 = permute(ixy + iz0);
  vec4 ixy1 = permute(ixy + iz1);

  vec4 gx0 = ixy0 * (1.0 / 7.0);
  vec4 gy0 = fract(floor(gx0) * (1.0 / 7.0)) - 0.5;
  gx0 = fract(gx0);
  vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
  vec4 sz0 = step(gz0, vec4(0.0));
  gx0 -= sz0 * (step(0.0, gx0) - 0.5);
  gy0 -= sz0 * (step(0.0, gy0) - 0.5);

  vec4 gx1 = ixy1 * (1.0 / 7.0);
  vec4 gy1 = fract(floor(gx1) * (1.0 / 7.0)) - 0.5;
  gx1 = fract(gx1);
  vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
  vec4 sz1 = step(gz1, vec4(0.0));
  gx1 -= sz1 * (step(0.0, gx1) - 0.5);
  gy1 -= sz1 * (step(0.0, gy1) - 0.5);

  vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
  vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
  vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
  vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
  vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
  vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
  vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);

  vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
  g000 *= norm0.x;
  g010 *= norm0.y;
  g100 *= norm0.z;
  g110 *= norm0.w;
  vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
  g001 *= norm1.x;
  g011 *= norm1.y;
  g101 *= norm1.z;
  g111 *= norm1.w;

  float n000 = dot(g000, Pf0);
  float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
  float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
  float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
  float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
  float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
  float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
  float n111 = dot(g111, Pf1);

  vec3 fade_xyz = fade(Pf0);
  vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
  vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
  float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x);
  return 2.2 * n_xyz;
}

void main(void) {
  vec3 updatePosition = (rotateMatrixX(radians(90.0)) * vec4(position, 1.0)).xyz;
  float sin1 = sin(radians(updatePosition.x / 128.0 * 90.0));
  // uMouse (−1..1) pushes the flow center — cursor shifts where the hills crest.
  vec3 noisePosition = updatePosition
    + vec3(uMouse.x * 36.0, 0.0, time * -30.0 + uMouse.y * 24.0);
  float noise1 = cnoise(noisePosition * 0.08);
  float noise2 = cnoise(noisePosition * 0.06);
  float noise3 = cnoise(noisePosition * 0.4);
  vec3 lastPosition = updatePosition + vec3(0.0,
    noise1 * sin1 * 8.0
    + noise2 * sin1 * 8.0
    + noise3 * (abs(sin1) * 2.0 + 0.5)
    + pow(sin1, 2.0) * 40.0, 0.0);

  vPosition = lastPosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(lastPosition, 1.0);
}`;

// Fragment shader — warm, dark, NO rose, NO contour lines (removed 2026-06-10).
// A single filled hill body, depth-tested → no translucent-overlap flicker.
const FRAG = `precision highp float;
#define GLSLIFY 1
varying vec3 vPosition;
uniform float time;

const vec3 SILHO = vec3(0.205, 0.160, 0.124);  /* dark silhouette — far fill floor.
                                                  Sits CLEARLY above the ~0.10 bg so
                                                  the distant hills read as a solid
                                                  filled mass, not empty background. */
const vec3 FLOOR = vec3(0.225, 0.176, 0.136);  /* near valley fill base */
const vec3 COCOA = vec3(0.300, 0.236, 0.184);  /* mid hill body / crests */

void main(void) {
  float h = clamp(vPosition.y / 80.0 + 0.35, 0.0, 1.0);

  // Filled dark hill body: FLOOR (valleys) → COCOA (crests).
  vec3 color = mix(FLOOR, COCOA, smoothstep(0.0, 0.95, h));

  // Distance fade (xz only) toward SILHO, which stays ABOVE the background so
  // distant hills keep their solid body instead of dropping out.
  float fade = clamp(length(vPosition.xz) / 200.0, 0.0, 1.0);
  color = mix(color, SILHO, fade);
  gl_FragColor = vec4(color, 1.0);
}`;

/* ----------------------------------------------------------------- mat4 math
   Column-major 4x4 helpers (same memory layout WebGL expects). Just enough to
   replace Three.js's PerspectiveCamera + lookAt. */

function perspective(out, fovyRad, aspect, near, far) {
  const f = 1.0 / Math.tan(fovyRad / 2);
  const nf = 1 / (near - far);
  out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
  out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
  out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
  out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
  return out;
}

function lookAt(out, eye, center, up) {
  let z0 = eye[0] - center[0], z1 = eye[1] - center[1], z2 = eye[2] - center[2];
  let len = Math.hypot(z0, z1, z2) || 1;
  z0 /= len; z1 /= len; z2 /= len;
  let x0 = up[1] * z2 - up[2] * z1;
  let x1 = up[2] * z0 - up[0] * z2;
  let x2 = up[0] * z1 - up[1] * z0;
  len = Math.hypot(x0, x1, x2) || 1;
  x0 /= len; x1 /= len; x2 /= len;
  const y0 = z1 * x2 - z2 * x1;
  const y1 = z2 * x0 - z0 * x2;
  const y2 = z0 * x1 - z1 * x0;
  out[0] = x0; out[1] = y0; out[2] = z0; out[3] = 0;
  out[4] = x1; out[5] = y1; out[6] = z1; out[7] = 0;
  out[8] = x2; out[9] = y2; out[10] = z2; out[11] = 0;
  out[12] = -(x0 * eye[0] + x1 * eye[1] + x2 * eye[2]);
  out[13] = -(y0 * eye[0] + y1 * eye[1] + y2 * eye[2]);
  out[14] = -(z0 * eye[0] + z1 * eye[1] + z2 * eye[2]);
  out[15] = 1;
  return out;
}

const projMatrix = new Float32Array(16);
const viewMatrix = new Float32Array(16);

/* ------------------------------------------------------------------ gl setup */

function compile(type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("[press-shader] shader compile error:", gl.getShaderInfoLog(sh));
    gl.deleteShader(sh);
    return null;
  }
  return sh;
}

function buildProgram() {
  const vs = compile(gl.VERTEX_SHADER, VERT);
  const fs = compile(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("[press-shader] program link error:", gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

// Build the 257×257 plane grid (XY plane, centered) + triangle indices.
function buildGeometry() {
  const v = SEGMENTS + 1;
  const positions = new Float32Array(v * v * 3);
  const half = PLANE_SIZE / 2;
  let p = 0;
  for (let iy = 0; iy < v; iy++) {
    const y = (iy / SEGMENTS) * PLANE_SIZE - half;
    for (let ix = 0; ix < v; ix++) {
      const x = (ix / SEGMENTS) * PLANE_SIZE - half;
      positions[p++] = x;
      positions[p++] = y;
      positions[p++] = 0;
    }
  }
  // Filled hills only (contour ridgelines removed 2026-06-10). TRIANGLES form
  // the solid terrain mesh, drawn OPAQUE with depth testing → near hills
  // occlude far, no translucent-overlap flicker. 32-bit indices (257² verts).
  const triIndices = new Uint32Array(SEGMENTS * SEGMENTS * 6);
  let t = 0;
  for (let iy = 0; iy < SEGMENTS; iy++) {
    for (let ix = 0; ix < SEGMENTS; ix++) {
      const a = iy * v + ix;
      const b = a + 1;
      const c = a + v;
      const d = c + 1;
      triIndices[t++] = a; triIndices[t++] = c; triIndices[t++] = b;
      triIndices[t++] = b; triIndices[t++] = c; triIndices[t++] = d;
    }
  }

  const position = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, position);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

  const triIndex = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triIndex);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, triIndices, gl.STATIC_DRAW);

  return {
    position,
    triIndex, triCount: triIndices.length,
  };
}

function resize() {
  if (!gl || !canvas) return;
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
  const w = Math.max(1, Math.round(rect.width * dpr));
  const h = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  gl.viewport(0, 0, canvas.width, canvas.height);
  const aspect = canvas.width / canvas.height;
  perspective(projMatrix, (45 * Math.PI) / 180, aspect, 1, 10000);
}

function drawFrame() {
  // Ease mouse toward target for inertia.
  mouse.x += (mouse.tx - mouse.x) * 0.06;
  mouse.y += (mouse.ty - mouse.y) * 0.06;

  // Clear to ink-deep (#1A1410) — the far field fades into this exact color,
  // so the horizon is seamless. Depth buffer cleared so near ridges occlude
  // far ones (kills the translucent-overlap colour bleed + per-frame flicker).
  gl.clearColor(0.102, 0.078, 0.063, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.useProgram(program);
  gl.uniformMatrix4fv(uniforms.projectionMatrix, false, projMatrix);
  gl.uniformMatrix4fv(uniforms.modelViewMatrix, false, viewMatrix);
  gl.uniform1f(uniforms.time, uTime);
  gl.uniform2f(uniforms.uMouse, mouse.x, mouse.y);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.enableVertexAttribArray(uniforms.aPosition);
  gl.vertexAttribPointer(uniforms.aPosition, 3, gl.FLOAT, false, 0, 0);

  // Filled hills only — the contour ridgelines were removed per user request
  // (2026-06-10). Single triangle pass, no wireframe overlay.
  gl.uniform1f(uniforms.uLine, 0.0);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.triIndex);
  gl.drawElements(gl.TRIANGLES, buffers.triCount, gl.UNSIGNED_INT, 0);
}

function loop(ts) {
  if (!running) return;
  const delta = lastTs ? (ts - lastTs) / 1000 : 0;
  lastTs = ts;
  uTime += delta * SPEED;
  drawFrame();
  rafId = requestAnimationFrame(loop);
}

function start() {
  if (running || reduceMotion) return;
  running = true;
  lastTs = 0;
  rafId = requestAnimationFrame(loop);
}

function stop() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

/* ------------------------------------------------------------------- lifecycle */

export function init() {
  if (typeof document === "undefined") return;
  if (gl) return; // idempotent

  canvas = document.querySelector(CANVAS_SELECTOR);
  if (!canvas) return;

  const glOpts = { alpha: false, antialias: true, depth: true, premultipliedAlpha: false };
  gl = canvas.getContext("webgl", glOpts)
    || canvas.getContext("experimental-webgl", glOpts);
  if (!gl) {
    console.warn("[press-shader] WebGL unavailable — leaving ink-deep background.");
    canvas = null;
    return;
  }

  // 32-bit indices are required (257² verts). Bail gracefully if unsupported.
  if (!gl.getExtension("OES_element_index_uint")) {
    console.warn("[press-shader] OES_element_index_uint unavailable — skipping shader.");
    gl = null;
    canvas = null;
    return;
  }

  program = buildProgram();
  if (!program) { gl = null; canvas = null; return; }

  buffers = buildGeometry();
  uniforms = {
    aPosition: gl.getAttribLocation(program, "position"),
    projectionMatrix: gl.getUniformLocation(program, "projectionMatrix"),
    modelViewMatrix: gl.getUniformLocation(program, "modelViewMatrix"),
    time: gl.getUniformLocation(program, "time"),
    uMouse: gl.getUniformLocation(program, "uMouse"),
    uLine: gl.getUniformLocation(program, "uLine"),
  };

  // Opaque depth-tested mesh — near ridges occlude far ones. No alpha blend,
  // so there is no draw-order colour bleed and no per-frame flicker.
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // Fixed camera (eye 0,16,125 → center 0,28,0) — mouse moves the flow, not
  // the camera. Constant for the session.
  lookAt(viewMatrix, [0, 16, CAMERA_Z], [0, 28, 0], [0, 1, 0]);

  resize();

  // Reduced motion → render one static frame, no loop.
  mqlReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduceMotion = mqlReduce.matches;
  mqlListener = (e) => {
    reduceMotion = e.matches;
    if (reduceMotion) { stop(); drawFrame(); }
    else { start(); }
  };
  if (mqlReduce.addEventListener) mqlReduce.addEventListener("change", mqlListener);

  // Resize handling.
  onResize = () => { resize(); if (!running) drawFrame(); };
  window.addEventListener("resize", onResize, { passive: true });

  // Mouse interaction — fine pointers only (skip touch).
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (finePointer) {
    onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      mouse.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
    };
    const section = canvas.closest(".press-closer") || canvas;
    section.addEventListener("mousemove", onMouseMove, { passive: true });
    onMouseMove._section = section;
  }

  // Pause the RAF when the closer is offscreen (battery).
  const section = canvas.closest(".press-closer") || canvas;
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver((entries) => {
      const visible = entries.some((en) => en.isIntersecting);
      if (visible && !reduceMotion) start();
      else stop();
    }, { threshold: 0.01 });
    io.observe(section);
  }

  // First paint (static if reduced motion or not yet started).
  drawFrame();
  if (reduceMotion) stop();
}

export function destroy() {
  stop();
  if (io) { io.disconnect(); io = null; }
  if (onResize) { window.removeEventListener("resize", onResize); onResize = null; }
  if (onMouseMove && onMouseMove._section) {
    onMouseMove._section.removeEventListener("mousemove", onMouseMove);
  }
  onMouseMove = null;
  if (mqlReduce && mqlListener && mqlReduce.removeEventListener) {
    mqlReduce.removeEventListener("change", mqlListener);
  }
  mqlReduce = null;
  mqlListener = null;

  if (gl) {
    if (buffers) {
      gl.deleteBuffer(buffers.position);
      gl.deleteBuffer(buffers.triIndex);
    }
    if (program) gl.deleteProgram(program);
    const lose = gl.getExtension("WEBGL_lose_context");
    if (lose) lose.loseContext();
  }
  gl = null;
  program = null;
  buffers = null;
  uniforms = null;
  canvas = null;
  uTime = 0;
  mouse.tx = mouse.ty = mouse.x = mouse.y = 0;
}

export default { init, destroy };
