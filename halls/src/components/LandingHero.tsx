import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Compass, Volume2, VolumeX, Moon, Sun, Sparkles } from "lucide-react";
import { playClick, playWhoosh } from "../utils/audio";

interface LandingHeroProps {
  onEnterGallery: (hall: "oasis" | "lumina") => void;
  isLightMode: boolean;
  onToggleLightMode: () => void;
  isSoundOn: boolean;
  onToggleSound: () => void;
}

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
  uniform vec3  uTextColor;

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

  vec3 chromAbAlpha(sampler2D tex, vec2 st, float angle, float amount) {
    float aspect = uResolution.x / uResolution.y;
    float rot = angle * 360.0 * PI / 180.0;
    vec2 aber = amount * vec2(0.1 * sin(rot) * aspect, 0.1 * cos(rot));
    aber *= distance(st, vec2(0.5)) * 2.0;

    float rA = 0.0;
    float gA = 0.0;
    float bA = 0.0;
    float iStep = 1.0 / STEPS;

    for (float i = 1.0; i <= STEPS; i++) {
      vec2 off = aber * (i * iStep);
      rA += texture2D(tex, st - off).a * iStep;
      bA += texture2D(tex, st + off).a * iStep;
    }
    for (float i = 1.0; i <= STEPS; i++) {
      vec2 off = aber * ((i * iStep) - 0.5);
      gA += texture2D(tex, st + off).a * iStep;
    }
    return vec3(rA, gA, bA);
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

    vec2 textUv = vTextureCoord;

    vec3 textRgbAlpha;
    if (reveal < 0.999) {
      textRgbAlpha = chromAbAlpha(
        uTextureText, textUv,
        atan(textUv.y - uMouse.y, textUv.x - uMouse.x),
        dPos * 0.10
      );
    } else {
      float a = texture2D(uTextureText, textUv).a;
      textRgbAlpha = vec3(a);
    }

    float textAlpha = max(max(textRgbAlpha.r, textRgbAlpha.g), textRgbAlpha.b);
    vec3 fringe = mix(imgRgb, uTextColor, textRgbAlpha);
    vec3 final = mix(imgRgb, fringe, textAlpha);

    gl_FragColor = vec4(final, 1.0);
  }
`;

const TEX_BASE_URL = "/images/hero-distort.webp";
const TEX_TOP_URL  = "/images/hero-distort-top.webp";

const BASE_ASPECT = 6688 / 3764;
const TOP_ASPECT  = 6688 / 3764;
const LENS_RADIUS  = 0.55;
const LENS_FALLOFF = 0.12;
const MOUSE_LERP = 0.10;
const TEXT_COLOR = "#f5efe6";

type TextLine = {
  label: string;
  lang?: "he" | "en";
  link?: "oasis" | "lumina";
};

const TEXT_LINES: TextLine[] = [
  { label: "אולם", lang: "he", link: "oasis" },
  { label: "ריזורט", lang: "he", link: "lumina" },
];

type ClickZone = { id: "oasis" | "lumina"; x: number; y: number; w: number; h: number };

function buildTextCanvas(
  width: number,
  height: number,
  dpr: number
): { canvas: HTMLCanvasElement; zones: ClickZone[] } {
  const c = document.createElement("canvas");
  c.width  = Math.floor(width  * dpr);
  c.height = Math.floor(height * dpr);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const labelSize = Math.max(40, Math.min(width, height) * 0.07);
  const lineGap   = labelSize * 0.4;

  let y = height * 0.78 + labelSize;
  ctx.fillStyle = TEXT_COLOR;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "center";

  const cx = width / 2;
  const zones: ClickZone[] = [];

  for (const line of TEXT_LINES) {
    const family = `700 ${labelSize}px "Heebo", "Arial Hebrew", "Arial", sans-serif`;
    ctx.font = family;
    (ctx as any).direction = "rtl";

    ctx.fillText(line.label, cx, y);

    if (line.link) {
      const m = ctx.measureText(line.label);
      const w = m.width;
      zones.push({
        id: line.link,
        x: cx - w / 2,
        y: y - labelSize,
        w,
        h: labelSize * 1.25,
      });
    }

    y += labelSize + lineGap;
  }

  return { canvas: c, zones };
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  onEnterGallery,
  isLightMode,
  onToggleLightMode,
  isSoundOn,
  onToggleSound,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isNavigating, setIsNavigating] = useState<"oasis" | "lumina" | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = containerRef.current;
    if (!canvas || !host) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    camera.position.z = 0.5;

    const loader = new THREE.TextureLoader();
    function makeImageTex(url: string) {
      const t = loader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.minFilter = THREE.LinearFilter;
      t.magFilter = THREE.LinearFilter;
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      return t;
    }

    const texBase = makeImageTex(TEX_BASE_URL);
    const texTop  = makeImageTex(TEX_TOP_URL);

    let textZones: ClickZone[] = [];
    const initialDpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const built = buildTextCanvas(host.clientWidth || 1, host.clientHeight || 1, initialDpr);
    const textCanvas = built.canvas;
    textZones = built.zones;

    const texText = new THREE.CanvasTexture(textCanvas);
    texText.minFilter = THREE.LinearFilter;
    texText.magFilter = THREE.LinearFilter;
    texText.colorSpace = THREE.NoColorSpace;
    texText.flipY = true;

    const uniforms = {
      uTextureBase: { value: texBase },
      uTextureTop:  { value: texTop },
      uTextureText: { value: texText },
      uResolution:  { value: new THREE.Vector2(1, 1) },
      uBaseAspect:  { value: BASE_ASPECT },
      uTopAspect:   { value: TOP_ASPECT },
      uMouse:       { value: new THREE.Vector2(0.5, 0.5) },
      uTime:        { value: 0 },
      uLensRadius:  { value: LENS_RADIUS },
      uLensFalloff: { value: LENS_FALLOFF },
      uTextColor:   { value: new THREE.Color(TEXT_COLOR) },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });

    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    function rebuildText() {
      const r = host!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const fresh = buildTextCanvas(r.width, r.height, dpr);
      texText.image = fresh.canvas;
      texText.needsUpdate = true;
      textZones = fresh.zones;
    }

    function resize() {
      const r = host!.getBoundingClientRect();
      const w = Math.max(1, Math.floor(r.width));
      const h = Math.max(1, Math.floor(r.height));
      renderer.setSize(w, h, false);
      uniforms.uResolution.value.set(w, h);
      rebuildText();
    }
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(host);

    const target = new THREE.Vector2(0.5, 0.5);

    function onPointerMove(e: PointerEvent) {
      const r = host!.getBoundingClientRect();
      const localX = e.clientX - r.left;
      const localY = e.clientY - r.top;
      target.set(localX / r.width, 1.0 - localY / r.height);

      const overLink = textZones.some(
        (z) => localX >= z.x && localX <= z.x + z.w
            && localY >= z.y && localY <= z.y + z.h
      );
      canvas!.style.cursor = overLink ? "pointer" : "";
    }

    function onPointerLeave() {
      target.set(0.5, 0.5);
      canvas!.style.cursor = "";
    }

    function onPointerDown(e: PointerEvent) {
      const r = host!.getBoundingClientRect();
      const localX = e.clientX - r.left;
      const localY = e.clientY - r.top;
      for (const z of textZones) {
        if (localX >= z.x && localX <= z.x + z.w
         && localY >= z.y && localY <= z.y + z.h) {
          playWhoosh(z.id === "lumina");
          setIsNavigating(z.id);
          setTimeout(() => {
            onEnterGallery(z.id);
          }, 1100);
          return;
        }
      }
    }

    host.addEventListener("pointermove", onPointerMove);
    host.addEventListener("pointerleave", onPointerLeave);
    host.addEventListener("pointerdown", onPointerDown);

    const clock = new THREE.Clock();
    let rafId = 0;
    function tick() {
      rafId = requestAnimationFrame(tick);
      uniforms.uTime.value = clock.getElapsedTime();
      uniforms.uMouse.value.lerp(target, MOUSE_LERP);
      renderer.render(scene, camera);
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      host.removeEventListener("pointermove", onPointerMove);
      host.removeEventListener("pointerleave", onPointerLeave);
      host.removeEventListener("pointerdown", onPointerDown);
      quad.geometry.dispose();
      material.dispose();
      texBase.dispose();
      texTop.dispose();
      texText.dispose();
      renderer.dispose();
    };
  }, [onEnterGallery]);

  return (
    <div
      ref={containerRef}
      id="landing-hero-container"
      className="relative w-full h-screen overflow-hidden bg-[#1a120e] select-none"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full block z-10"
        style={{ touchAction: "none" }}
      />

      {isNavigating && (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center transition-all duration-1000 bg-[#f5efe6]"
        >
          <div className="text-center flex flex-col items-center gap-4">
            <div className="relative w-20 h-20 flex items-center justify-center rounded-full border border-stone-200/50">
              <span className="absolute inset-0 rounded-full border-t-2 border-stone-800 animate-spin" style={{ animationDuration: '1s' }} />
              <Compass size={28} className="animate-pulse text-stone-800" />
            </div>
            <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-stone-500 mt-2">
              {isNavigating === "oasis" ? "ניווט לקומפלקס האולם..." : "ניווט למתחם הריזורט..."}
            </p>
            <h4 className="font-display text-base font-black tracking-[0.2em] text-stone-900 uppercase">
              GAMOS {isNavigating === "oasis" ? "OASIS" : "RESORT"}
            </h4>
          </div>
        </div>
      )}

      {/* --- UPPER HUD: Luxurious Glass Header Overlaid --- */}
      <header id="header-hud" className="absolute top-0 left-0 right-0 z-30 px-6 md:px-12 py-8 flex items-center justify-between w-full pointer-events-auto">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full animate-pulse bg-[#f5efe6]" />
          <h1 className="font-display font-black text-lg md:text-xl tracking-[0.25em] uppercase text-[#f5efe6] select-none">
            GAMOS<span className="font-light font-serif lowercase italic text-[#f5efe6]/70">.oasis</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="sound-opt-toggle"
            onClick={() => {
              onToggleSound();
              playClick();
            }}
            className="p-2.5 rounded-full border border-[#f5efe6]/20 bg-black/40 text-stone-200 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md focus:outline-none cursor-pointer"
            title={isSoundOn ? "Mute Synthesizers" : "Enable Sound Effects"}
          >
            {isSoundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
          
          <button
            id="mood-opt-toggle"
            onClick={() => {
              onToggleLightMode();
              playClick();
            }}
            className="p-2.5 rounded-full border border-[#f5efe6]/20 bg-black/40 text-stone-200 hover:text-white hover:bg-white/10 transition-all backdrop-blur-md focus:outline-none cursor-pointer"
            title={isLightMode ? "Switch to Cinematic Dark" : "Switch to Misty daylight"}
          >
            {isLightMode ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </header>
    </div>
  );
};
