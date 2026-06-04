/**
 * hero-shader.js — WebGL hero (Three.js, self-hosted ESM)
 *
 * Spec   : C:\Users\art1\.claude\plans\quizzical-stirring-castle.md (4b)
 * Source : arch-corridor-gallery/src/components/LandingHero.tsx
 *
 * Renders a full-viewport ShaderMaterial with FBM noise distortion + a
 * spherical lens reveal around the cursor + chromatic aberration.
 * Two clickable Hebrew labels ("אולם" / "ריזורט") are baked into a
 * CanvasTexture and hit-tested in JS — click → 1.1s loading-overlay →
 * smooth scroll to the matching hall section.
 *
 * Public API
 * ----------
 *   init()          — install canvas + RAF loop (idempotent)
 *   destroy()       — full teardown (renderer.dispose, RAF cancel)
 *   window.gamosHero — { onProgress(cb), duration, progress, stage }
 *                      Stub that fires cb(0) then cb(1) so side-dot-nav
 *                      and portals.js exit their hero-dominance gates.
 *
 * Three.js is loaded as ESM from /assets/vendor/three.module.min.js.
 * On WebGL failure (or ?nogl=1), falls back to a static <picture> with
 * two transparent <a> hotspots — same scroll targets, no shader.
 *
 * Constitution
 *   §2 Three.js is allowed self-hosted (2026-06-04 amendment).
 *   §10.3 module-scoped state, init/destroy contract.
 */

import * as THREE from "/assets/vendor/three.module.min.js";

import { playWhoosh } from "./audio.js";


// ---------------------------------------------------------------------------
// GLSL — verbatim from LandingHero.tsx
// ---------------------------------------------------------------------------

const VERT = `
  varying vec2 vTextureCoord;
  void main() {
    vTextureCoord = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAG = `
  precision highp float;

  varying vec2 vTextureCoord;

  uniform sampler2D uTextureBase;
  uniform sampler2D uTextureTop;
  uniform vec2  uResolution;
  uniform float uBaseAspect;
  uniform float uTopAspect;
  uniform vec2  uMouse;
  uniform float uTime;
  uniform float uLensRadius;
  uniform float uLensFalloff;
  const float STEPS = 16.0;
  const float PI = 3.14159265359;

  vec2 cover_uv(vec2 uv, float imgAspect, float screenAspect) {
    vec2 fitted = uv;
    if (screenAspect > imgAspect) {
      float scale = imgAspect / screenAspect;
      fitted.y = (uv.y - 0.5) * scale + 0.5;
    } else {
      float scale = screenAspect / imgAspect;
      fitted.x = (uv.x - 0.5) * scale + 0.5;
    }
    return fitted;
  }

  vec3 hash33(vec3 p3) {
    p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yxz + 19.19);
    return -1.0 + 2.0 * fract(vec3(
      (p3.x + p3.y) * p3.z,
      (p3.x + p3.z) * p3.y,
      (p3.y + p3.z) * p3.x
    ));
  }

  float perlin_noise(vec3 p) {
    vec3 pi = floor(p);
    vec3 pf = p - pi;
    vec3 w = pf * pf * (3.0 - 2.0 * pf);
    float n000 = dot(pf - vec3(0.0, 0.0, 0.0), hash33(pi + vec3(0.0, 0.0, 0.0)));
    float n100 = dot(pf - vec3(1.0, 0.0, 0.0), hash33(pi + vec3(1.0, 0.0, 0.0)));
    float n010 = dot(pf - vec3(0.0, 1.0, 0.0), hash33(pi + vec3(0.0, 1.0, 0.0)));
    float n110 = dot(pf - vec3(1.0, 1.0, 0.0), hash33(pi + vec3(1.0, 1.0, 0.0)));
    float n001 = dot(pf - vec3(0.0, 0.0, 1.0), hash33(pi + vec3(0.0, 0.0, 1.0)));
    float n101 = dot(pf - vec3(1.0, 0.0, 1.0), hash33(pi + vec3(1.0, 0.0, 1.0)));
    float n011 = dot(pf - vec3(0.0, 1.0, 1.0), hash33(pi + vec3(0.0, 1.0, 1.0)));
    float n111 = dot(pf - vec3(1.0, 1.0, 1.0), hash33(pi + vec3(1.0, 1.0, 1.0)));
    float nx00 = mix(n000, n100, w.x);
    float nx01 = mix(n001, n101, w.x);
    float nx10 = mix(n010, n110, w.x);
    float nx11 = mix(n011, n111, w.x);
    float nxy0 = mix(nx00, nx10, w.y);
    float nxy1 = mix(nx01, nx11, w.y);
    return mix(nxy0, nxy1, w.z);
  }

  float fbm(vec3 st) {
    mat2 rotHalf = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    float value = 0.0;
    float amp = 0.45;
    vec2 shift = vec2(100.0);
    for (int i = 0; i < 8; i++) {
      value += amp * perlin_noise(st);
      st.xy *= rotHalf * 2.5;
      st.xy += shift;
      amp *= 0.65;
    }
    return value;
  }

  vec2 distortUV_fbm(vec2 uv) {
    float aspectRatio = uResolution.x / uResolution.y;
    vec2 pos = vec2(0.5, 0.5);
    vec2 st = ((uv - pos) * vec2(aspectRatio, 1.0)) * 1.62 * aspectRatio;
    vec2 drift = vec2(0.0, uTime * 0.005);
    float time = uTime * 0.025;
    vec2 r = vec2(
      fbm(vec3(st - drift + vec2(1.7, 9.2), 14.5 + time)),
      fbm(vec3(st - drift + vec2(8.2, 1.3), 14.5 + time))
    );
    float f = fbm(vec3(st + r - drift, 14.5 + time)) * 0.24;
    vec2 offset = (f * 2.0 + (r * 0.24)) * 0.5;
    return uv + offset;
  }

  vec2 sphereTx(float u, float v, float cx, float cy, float r, float tau) {
    float aspect = uResolution.x / uResolution.y;
    u -= cx;
    v -= cy;
    float s = sqrt(u * u + v * v);
    if (s > r) {
      return vec2((u + cx) / aspect, v + cy);
    }
    float z = sqrt(r * r - s * s);
    float ua = (1.0 - (1.0 / tau)) * asin(u / r);
    float va = (1.0 - (1.0 / tau)) * asin(v / r);
    u = cx + z * sin(ua);
    v = cy + z * sin(va);
    return vec2(u / aspect, v);
  }

  vec3 chromAb(sampler2D tex, vec2 st, float angle, float amount) {
    float aspect = uResolution.x / uResolution.y;
    float rot = angle * 360.0 * PI / 180.0;
    vec2 aber = amount * vec2(0.1 * sin(rot) * aspect, 0.1 * cos(rot));
    aber *= distance(st, vec2(0.5)) * 2.0;

    vec4 rCol = vec4(0.0);
    vec4 bCol = vec4(0.0);
    vec4 gCol = vec4(0.0);
    float iStep = 1.0 / STEPS;

    for (float i = 1.0; i <= STEPS; i++) {
      vec2 off = aber * (i * iStep);
      rCol += texture2D(tex, st - off) * iStep;
      bCol += texture2D(tex, st + off) * iStep;
    }
    for (float i = 1.0; i <= STEPS; i++) {
      vec2 off = aber * ((i * iStep) - 0.5);
      gCol += texture2D(tex, st + off) * iStep;
    }
    return vec3(rCol.r, gCol.g, bCol.b);
  }

  void main() {
    float aspect = uResolution.x / uResolution.y;
    vec2 uv = vTextureCoord;

    vec3 baseRgb = texture2D(uTextureBase, cover_uv(uv, uBaseAspect, aspect)).rgb;

    vec2 wuv = distortUV_fbm(uv);

    vec2 wuvA = vec2(wuv.x * aspect, wuv.y);
    vec2 mA   = vec2(uMouse.x * aspect, uMouse.y);
    float dPos = distance(wuvA, mA);

    vec2 sc = sphereTx(wuvA.x, wuvA.y, mA.x, mA.y, uLensRadius, 5.5);
    sc = clamp((sc - 0.5) + 0.5, 0.0, 1.0);

    float reveal = smoothstep(uLensRadius - uLensFalloff, uLensRadius, dPos);

    vec3 topRgb;
    if (reveal > 0.001) {
      topRgb = chromAb(uTextureTop, cover_uv(sc, uTopAspect, aspect),
                       atan(sc.y - uMouse.y, sc.x - uMouse.x),
                       dPos * 0.5);
    } else {
      topRgb = vec3(0.0);
    }

    vec3 final = mix(baseRgb, topRgb, reveal);
    gl_FragColor = vec4(final, 1.0);
  }
`;


// ---------------------------------------------------------------------------
// Constants — tuned in arch-corridor-gallery prototype
// ---------------------------------------------------------------------------

const TEX_BASE_URL = "/assets/images/brand/hero-distort.full.webp";
const TEX_TOP_URL  = "/assets/images/brand/hero-distort-top.full.webp";

const BASE_ASPECT  = 6688 / 3764;
const TOP_ASPECT   = 6688 / 3764;
const LENS_RADIUS  = 0.55;
const LENS_FALLOFF = 0.12;
const MOUSE_LERP   = 0.10;
const DPR_CAP      = 1.75;

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state = {
  initialised: false,
  host:        null,
  canvas:      null,
  renderer:    null,
  scene:       null,
  camera:      null,
  material:    null,
  uniforms:    null,
  texBase:     null,
  texTop:      null,
  target:      null,                  // THREE.Vector2
  rafId:       0,
  ro:          null,                  // ResizeObserver
  io:          null,                  // IntersectionObserver (battery saver)
  isVisible:   true,
  reducedMotion: false,
  bound: {
    onPointerMove:  null,
    onPointerLeave: null,
    onClickFallback: null,
  },
  hookSubs: new Set(),
};


// ---------------------------------------------------------------------------
// gamosHero stub — releases side-dot-nav and portals.js hero-dominance gates
// ---------------------------------------------------------------------------

function installGamosHeroStub() {
  // Don't replace if a real hero module already published one.
  if (window.gamosHero && typeof window.gamosHero.onProgress === "function") return;

  const subs = state.hookSubs;
  const stub = {
    onProgress(cb) {
      if (typeof cb !== "function") return () => {};
      subs.add(cb);
      // Fire 0 immediately so listeners initialise.
      try { cb(0); } catch { /* swallow */ }
      // Fire 1 next tick so HERO_DOMINANCE_END (0.85) is exceeded — the
      // side-dot picker switches to IO/RAF mode and the portals.js reveal
      // hysteresis (which checks p < 0.88 to hide) becomes a no-op against
      // the missing .portals DOM.
      setTimeout(() => {
        try { cb(1); } catch { /* swallow */ }
      }, 0);
      return () => { subs.delete(cb); };
    },
    get duration()       { return 0; },
    get progress()       { return 1; },
    get stage()          { return "portals"; },
    get titleProgress()  { return 1; },
    get portalsVisible() { return false; },
  };
  window.gamosHero = stub;
}


// ---------------------------------------------------------------------------
// Static fallback (no WebGL or ?nogl=1)
// ---------------------------------------------------------------------------

function installFallback(host, canvas) {
  if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);

  const wrap = document.createElement("div");
  wrap.className = "hero-shader__fallback";
  wrap.innerHTML = `
    <picture>
      <source type="image/webp" srcset="${TEX_BASE_URL}">
      <img src="${TEX_BASE_URL}" alt="" decoding="async" loading="eager">
    </picture>
  `;

  host.appendChild(wrap);
  // Hero links are DOM-rendered (.hero-shader__links a) and live in the
  // sticky alongside the canvas; they remain visible in fallback mode too.
}


// ---------------------------------------------------------------------------
// Init / destroy
// ---------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  const host = document.querySelector("#hero.hero-shader .hero-shader__sticky");
  const canvas = host && host.querySelector("canvas[data-hero-shader]");
  if (!host || !canvas) {
    // No new hero in DOM. Install the gamosHero stub so other modules unblock.
    installGamosHeroStub();
    return;
  }
  state.host = host;
  state.canvas = canvas;

  state.reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Force fallback if user opted out.
  const url = new URL(window.location.href);
  const forceFallback = url.searchParams.get("nogl") === "1";

  if (forceFallback || !THREE) {
    installFallback(host, canvas);
    installGamosHeroStub();
    state.initialised = true;
    return;
  }

  // Try Three.js init; on any failure, fall back gracefully.
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, DPR_CAP));
    state.renderer = renderer;

    state.scene = new THREE.Scene();
    state.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    state.camera.position.z = 0.5;

    const loader = new THREE.TextureLoader();
    function makeImageTex(url) {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    }
    state.texBase = makeImageTex(TEX_BASE_URL);
    state.texTop  = makeImageTex(TEX_TOP_URL);

    state.uniforms = {
      uTextureBase: { value: state.texBase },
      uTextureTop:  { value: state.texTop },
      uResolution:  { value: new THREE.Vector2(1, 1) },
      uBaseAspect:  { value: BASE_ASPECT },
      uTopAspect:   { value: TOP_ASPECT },
      uMouse:       { value: new THREE.Vector2(0.5, 0.5) },
      uTime:        { value: 0 },
      uLensRadius:  { value: LENS_RADIUS },
      uLensFalloff: { value: LENS_FALLOFF },
    };

    state.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: state.uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), state.material);
    state.scene.add(quad);

    // ---- resize ------------------------------------------------------------
    function resize() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      state.renderer.setSize(w, h, false);
      state.uniforms.uResolution.value.set(w, h);
    }
    resize();

    state.ro = new ResizeObserver(resize);
    state.ro.observe(host);

    state.target = new THREE.Vector2(0.5, 0.5);

    // ---- pointer move drives the lens position ----------------------------
    state.bound.onPointerMove = (e) => {
      const r = host.getBoundingClientRect();
      const localX = e.clientX - r.left;
      const localY = e.clientY - r.top;
      state.target.set(localX / r.width, 1.0 - localY / r.height);
    };
    state.bound.onPointerLeave = () => {
      state.target.set(0.5, 0.5);
    };

    host.addEventListener("pointermove", state.bound.onPointerMove);
    host.addEventListener("pointerleave", state.bound.onPointerLeave);

    // 2026-06-04: Hero labels are now DOM nodes (.hero-shader__link). They
    // navigate via standard <a href> — no JS handler needed for the basic
    // route. The whoosh sound is a luxury — wire it on click without
    // preventing default so the browser handles the navigation itself.
    const links = host.querySelectorAll(".hero-shader__link");
    state.bound.onClickFallback = (e) => {
      const id = e.currentTarget.getAttribute("data-hero-link");
      try { playWhoosh(id === "resort"); } catch { /* ignore */ }
      if (window.gamosLoading && typeof window.gamosLoading.show === "function") {
        try { window.gamosLoading.show(); } catch { /* ignore */ }
      }
    };
    links.forEach((a) => a.addEventListener("click", state.bound.onClickFallback));

    // ---- battery-saver: pause when offscreen -------------------------------
    state.io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        state.isVisible = entry.isIntersecting;
      }
    }, { threshold: 0.01 });
    state.io.observe(state.host.parentElement || state.host);

    // ---- RAF loop ----------------------------------------------------------
    const clock = new THREE.Clock();
    const lerpAmount = state.reducedMotion ? 1 : MOUSE_LERP;

    function tick() {
      state.rafId = requestAnimationFrame(tick);
      if (!state.isVisible) return; // skip GPU work when hero is offscreen
      state.uniforms.uTime.value = clock.getElapsedTime();
      state.uniforms.uMouse.value.lerp(state.target, lerpAmount);
      state.renderer.render(state.scene, state.camera);
    }
    state.rafId = requestAnimationFrame(tick);
  } catch (err) {
    console.error("[hero-shader] WebGL init failed, falling back to <picture>:", err);
    installFallback(host, canvas);
  }

  installGamosHeroStub();
  state.initialised = true;
}


export function destroy() {
  if (!state.initialised) return;

  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = 0;

  if (state.ro) { state.ro.disconnect(); state.ro = null; }
  if (state.io) { state.io.disconnect(); state.io = null; }

  if (state.host) {
    if (state.bound.onPointerMove) {
      state.host.removeEventListener("pointermove", state.bound.onPointerMove);
    }
    if (state.bound.onPointerLeave) {
      state.host.removeEventListener("pointerleave", state.bound.onPointerLeave);
    }
    if (state.bound.onClickFallback) {
      state.host.querySelectorAll(".hero-shader__link").forEach((a) =>
        a.removeEventListener("click", state.bound.onClickFallback)
      );
    }
  }

  if (state.material) state.material.dispose();
  if (state.texBase) state.texBase.dispose();
  if (state.texTop) state.texTop.dispose();
  if (state.renderer) state.renderer.dispose();

  state.initialised = false;
  state.host = null;
  state.canvas = null;
  state.renderer = null;
  state.scene = null;
  state.camera = null;
  state.material = null;
  state.uniforms = null;
  state.texBase = null;
  state.texTop = null;
  state.target = null;
  state.bound.onPointerMove = null;
  state.bound.onPointerLeave = null;
  state.bound.onClickFallback = null;
  state.hookSubs.clear();
}
