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
  uniform sampler2D uTextureText;
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

    vec3 imgRgb = mix(baseRgb, topRgb, reveal);

    // 2026-06-04: text labels are pre-coloured (texture-filled) on the canvas
    // side. Sample RGBA directly, drop the chromatic-aberration pass on the
    // text (no more colour fringing), and gate alpha by (1 - reveal) so the
    // label fades out when the lens distortion overlaps it.
    vec4 textTex = texture2D(uTextureText, vTextureCoord);
    float textAlpha = textTex.a * (1.0 - reveal);
    vec3 final = mix(imgRgb, textTex.rgb, textAlpha);

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

// 2026-06-04: Labels are now pre-rendered <img> wordmarks (same brand
// typography as logo-central.webp). Each line carries a `src` whose aspect
// ratio is captured below. The id / target / galleryId are internal
// identifiers — kept stable so navigateToTarget() routes correctly to
// /halls/dist/{oasis,lumina}/.
const TEXT_LINES = [
  {
    label: "Events", id: "venue",  target: "#hall-venue",  galleryId: "a",
    src: "/assets/images/brand/hero-label-events.webp",
    aspect: 315 / 130,   // src PNG dimensions, matches WebP output ratio
  },
  {
    label: "Resort", id: "resort", target: "#hall-resort", galleryId: "b",
    src: "/assets/images/brand/hero-label-resort.webp",
    aspect: 342 / 120,
  },
];


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
  texText:     null,
  textCanvas:  null,
  textZones:   [],
  target:      null,                  // THREE.Vector2
  rafId:       0,
  ro:          null,                  // ResizeObserver
  io:          null,                  // IntersectionObserver (battery saver)
  isVisible:   true,
  reducedMotion: false,
  bound: {
    onPointerMove:  null,
    onPointerLeave: null,
    onPointerDown:  null,
    onClickFallback: null,
  },
  hookSubs: new Set(),
};


// ---------------------------------------------------------------------------
// Helpers — text canvas + hit zones
// ---------------------------------------------------------------------------

// 2026-06-04: Labels are pre-rendered wordmark images (same brand typography
// as the central GAMOS logo). Each TEXT_LINES entry has a `src` that we load
// once at module init; buildTextCanvas() draws them at the desired pixel
// height. While images are pending the canvas is empty — they pop in once
// loaded via the labelImageSubs callback (rebuilds the text canvas).
const labelImages = new Map(); // src → { img, ready }
const labelImageSubs = new Set();

(function loadLabelImages() {
  for (const line of TEXT_LINES) {
    const entry = { img: new Image(), ready: false };
    entry.img.crossOrigin = "anonymous";
    entry.img.decoding = "async";
    entry.img.onload = () => {
      entry.ready = true;
      for (const cb of labelImageSubs) {
        try { cb(); } catch { /* ignore */ }
      }
    };
    entry.img.onerror = () => { /* leave .ready=false; fallback handled in builder */ };
    entry.img.src = line.src;
    labelImages.set(line.src, entry);
  }
})();

// hoveredZoneId tracks which label the cursor is currently over so we can
// scale it up. Drives a rebuildText() trigger only on STATE CHANGE — not on
// every mouse-move — so this is cheap.
let hoveredZoneId = null;

function buildTextCanvas(width, height, dpr) {
  const c = document.createElement("canvas");
  c.width  = Math.max(1, Math.floor(width  * dpr));
  c.height = Math.max(1, Math.floor(height * dpr));
  const ctx = c.getContext("2d");
  if (!ctx) return { canvas: c, zones: [] };

  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  // Base label height — slightly larger than the previous `labelSize * 0.07`
  // because wordmark images hint a more compact glyph than rendered text.
  const baseHeight = Math.max(46, Math.min(width, height) * 0.085);
  const lineGap    = baseHeight * 0.42;
  const HOVER_SCALE = 1.18;   // ← "the hovered label pops" — 18% scale-up

  // 2026-06-04 (user mandate): position the labels HIGHER on the canvas.
  // Was 0.78 (≈ 78% down). Moved up to 0.66 so they sit just below center.
  const baseY = height * 0.66 + baseHeight;

  const cx = width / 2;
  const zones = [];

  // First pass — compute zones (positions + sizes) for hit-testing AND
  // eventual draw. We do this regardless of image-load state so click works
  // immediately, even before the wordmarks finish loading.
  let y = baseY;
  for (const line of TEXT_LINES) {
    const isHover = hoveredZoneId === line.id;
    const lineHeight = baseHeight * (isHover ? HOVER_SCALE : 1.0);
    const lineWidth  = lineHeight * line.aspect;

    zones.push({
      id: line.id,
      target: line.target,
      galleryId: line.galleryId,
      src: line.src,
      x: cx - lineWidth / 2,
      y: y - lineHeight,
      w: lineWidth,
      h: lineHeight,
    });

    y += lineHeight + lineGap;
  }

  // Second pass — paint. drawImage() draws nothing until the image loads.
  for (const z of zones) {
    const entry = labelImages.get(z.src);
    if (!entry || !entry.ready) continue;
    ctx.drawImage(entry.img, z.x, z.y, z.w, z.h);
  }

  return { canvas: c, zones };
}


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
// Click → navigate
// ---------------------------------------------------------------------------

function navigateToTarget(targetSelector, pitchDown, galleryId) {
  try { playWhoosh(pitchDown); } catch { /* ignore */ }

  // 2026-06-04 — Click on hero label "אולם" / "ריזורט" navigates to the
  // dedicated React/Vite immersive sub-app under /halls/dist/ (Constitution §2.1).
  // pitchDown=true marks the "ריזורט" label (lumina), false marks "אולם" (oasis).
  if (galleryId) {
    const hallPath = pitchDown ? "/halls/dist/lumina/" : "/halls/dist/oasis/";
    // Show loading overlay briefly before page transition (matches whoosh duration).
    if (window.gamosLoading && typeof window.gamosLoading.show === "function") {
      try { window.gamosLoading.show(); } catch { /* ignore */ }
    }
    setTimeout(() => { window.location.href = hallPath; }, state.reducedMotion ? 0 : 700);
    return;
  }

  // Vertical-scroll fallback (no galleryId — used for nav-link style targets).
  const target = document.querySelector(targetSelector);
  if (target) {
    if (window.gsap && typeof window.gsap.to === "function" && window.ScrollToPlugin) {
      window.gsap.to(window, {
        duration: state.reducedMotion ? 0 : 1.0,
        ease: "power3.inOut",
        scrollTo: { y: target, autoKill: false },
      });
    } else {
      target.scrollIntoView({ behavior: state.reducedMotion ? "auto" : "smooth", block: "start" });
    }
  }
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

  for (const line of TEXT_LINES) {
    const a = document.createElement("a");
    a.className = "hero-shader__fallback-link";
    a.href = line.target;
    a.textContent = line.label;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      navigateToTarget(line.target, line.id === "resort", line.galleryId);
    });
    wrap.appendChild(a);
  }

  host.appendChild(wrap);
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

    const initialDpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const built = buildTextCanvas(host.clientWidth || 1, host.clientHeight || 1, initialDpr);
    state.textCanvas = built.canvas;
    state.textZones = built.zones;

    const texText = new THREE.CanvasTexture(state.textCanvas);
    texText.minFilter = THREE.LinearFilter;
    texText.magFilter = THREE.LinearFilter;
    // 2026-06-04: text canvas now carries the texture-filled glyphs (cream +
    // gold flecks). Sample as sRGB so the colours land linearly in the FRAG
    // shader's mix().
    texText.colorSpace = THREE.SRGBColorSpace;
    texText.flipY = true;
    state.texText = texText;

    state.uniforms = {
      uTextureBase: { value: state.texBase },
      uTextureTop:  { value: state.texTop },
      uTextureText: { value: state.texText },
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
    function rebuildText() {
      const r = host.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      const fresh = buildTextCanvas(r.width || 1, r.height || 1, dpr);
      state.texText.image = fresh.canvas;
      state.texText.needsUpdate = true;
      state.textZones = fresh.zones;
      state.textCanvas = fresh.canvas;
    }

    function resize() {
      const r = host.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      state.renderer.setSize(w, h, false);
      state.uniforms.uResolution.value.set(w, h);
      rebuildText();
    }
    resize();

    // Wordmark images may still be loading on first paint — when each one
    // resolves, rebuild the text canvas so it pops in.
    const onLabelLoaded = () => { try { rebuildText(); } catch { /* ignore */ } };
    labelImageSubs.add(onLabelLoaded);

    state.ro = new ResizeObserver(resize);
    state.ro.observe(host);

    state.target = new THREE.Vector2(0.5, 0.5);

    // ---- pointer + click handlers -----------------------------------------
    state.bound.onPointerMove = (e) => {
      const r = host.getBoundingClientRect();
      const localX = e.clientX - r.left;
      const localY = e.clientY - r.top;
      state.target.set(localX / r.width, 1.0 - localY / r.height);

      // Detect which label the cursor is over (if any) and rebuild only when
      // the hovered ID actually changes — keeps mouse-move cheap.
      let nextHoverId = null;
      for (const z of state.textZones) {
        if (localX >= z.x && localX <= z.x + z.w &&
            localY >= z.y && localY <= z.y + z.h) {
          nextHoverId = z.id;
          break;
        }
      }
      if (nextHoverId !== hoveredZoneId) {
        hoveredZoneId = nextHoverId;
        try { rebuildText(); } catch { /* ignore */ }
      }
      canvas.style.cursor = nextHoverId ? "pointer" : "";
    };
    state.bound.onPointerLeave = () => {
      state.target.set(0.5, 0.5);
      if (hoveredZoneId !== null) {
        hoveredZoneId = null;
        try { rebuildText(); } catch { /* ignore */ }
      }
      canvas.style.cursor = "";
    };
    state.bound.onPointerDown = (e) => {
      const r = host.getBoundingClientRect();
      const localX = e.clientX - r.left;
      const localY = e.clientY - r.top;
      for (const z of state.textZones) {
        if (localX >= z.x && localX <= z.x + z.w &&
            localY >= z.y && localY <= z.y + z.h) {
          navigateToTarget(z.target, z.id === "resort", z.galleryId);
          return;
        }
      }
    };

    host.addEventListener("pointermove", state.bound.onPointerMove);
    host.addEventListener("pointerleave", state.bound.onPointerLeave);
    host.addEventListener("pointerdown", state.bound.onPointerDown);

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
    if (state.bound.onPointerDown) {
      state.host.removeEventListener("pointerdown", state.bound.onPointerDown);
    }
  }

  if (state.material) state.material.dispose();
  if (state.texBase) state.texBase.dispose();
  if (state.texTop) state.texTop.dispose();
  if (state.texText) state.texText.dispose();
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
  state.texText = null;
  state.textCanvas = null;
  state.textZones = [];
  state.target = null;
  state.bound.onPointerMove = null;
  state.bound.onPointerLeave = null;
  state.bound.onPointerDown = null;
  state.hookSubs.clear();
}
