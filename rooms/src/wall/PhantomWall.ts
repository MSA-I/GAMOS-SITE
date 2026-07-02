// PhantomWall.ts — a 1:1 port of phantom-rebuild/src/webgl/wall.ts (the "work
// grid") into the GAMOS rooms sub-app. The effect is copied verbatim:
//   • flat plane grid, PerspectiveCamera fov 85 @ z 3.43, wall at z 1.45
//     → cell pitch of 1.0 world unit
//   • fisheye = full-screen POST-PASS barrel UV distortion
//     ((0.88 + distortion·dot(uv,uv))·uv, distortion = -0.07·aspect) + vignette
//   • visible grid lines (the ink-deep clear colour shows through the gaps + a
//     thin warm lattice), contain-fit media, baked text labels
//   • hover = per-card backdrop plate + label alpha 0.8→1 (no scale)
//   • press pulls the camera back +0.4; inertia decays with lerp(4·dt)
//
// Adaptations from the source (documented in the plan d-glowing-wreath.md), ALL
// other logic verbatim:
//   1. cells fed from RoomCard (roomsData) instead of projects.json
//   2. §5 palette (ink-deep field, warm grid lines, tone hover plates)
//   3. bakeLabel → RTL Hebrew (category / title / tag) via i18n t(), Rubik/Heebo
//   4. NO phantom intro (mosaic / dude.glb / logo) — boots settled; the existing
//      IntroGate veil is the only entrance. drift/hover/fling stay live.
//   5. integration hooks the rooms shell needs: onActiveChange (centre card),
//      freeze(), cardScreenRect(mesh) for the FLIP detail morph, onCellClick(i)
//   6. keyboard arrow pan (a11y §9) + a mobile camera pull-back for readability
import {
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  Group,
  LinearFilter,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { COLS_PER_ROW } from "../roomsData";
import type { RoomCard } from "../roomsData";
import { t } from "../i18n";
import type { CardScreenRect } from "./Engine";

// live-site constants (extracted from the original bundle) — verbatim except COLS.
// COLS is the wall's column count; the catalogue (COLS_PER_ROW = 5) is tiled
// horizontally to this width so the wrap span (COLS·PITCH) exceeds the viewport →
// the sides LOOP (repeat the rooms) instead of running out into a grey frame.
const COLS = 10; // 5 catalogue cols × 2 → spanX 10 > viewport width, seamless side loop
const FOV = 85;
const CAM_Z = 3.43;
const WALL_Z = 1.45;
const PRESS_PULLBACK = 0.4;
const PITCH = 1.0;
const PLANE = 0.998;
const MEDIA_ZOOM = 0.82; // label caption hugs this box
const MEDIA_FILL = 0.86; // media cover-fills this fraction of the cell; the rest is the dark CELL_BG frame
const DISTORTION_FACTOR = -0.07;
const VIGNETTE_OFFSET = 0.7;
const VIGNETTE_DARKNESS = 0.42;
const INERTIA_DECAY = 4; // lerp-to-zero rate per second
const DRIFT = 0.07; // ambient pointer drift, world units
const PRESS_STILL_MS = 90; // pointer stationary this long → no fling on release
const KEY_STEP = 0.6; // arrow-key pan step (world units)

// Full-fidelity to the source (wall.ts) — near-black field, near-invisible grid
// lines, pure-black cell plates. This is what makes the media the star and the
// wall read as the source's cool editorial grid (not a warm boxed tile-wall).
const GRID_LINE_COLOR = 0x2a2a2a; // barely reads on the 0x121212 field (source-exact)
const BG = 0x121212; // source clear colour (near-black, neutral)
const CELL_BG = 0x000000; // pure-black plate; the 0x121212 field shows the thin gaps

// §5 tone → hover-plate colour (mirrors roomsData CATEGORY_TONE).
// NOTE: the suite ("סוויטת חתן כלה") is the only card on tone "rose"; per the
// user (2026-07-03) its hover plate is a deep bordeaux/wine, not the §5 pink-rose.
const TONE_BG: Record<string, string> = {
  brass: "#CFAE83",
  cocoa: "#534133",
  ivory: "#F5EFE6",
  mist: "#E8DFD3",
  rose: "#6B2737", // bordeaux / wine (suite hover plate) — was §5 rose #B8576F
};

const DistortionShader = {
  uniforms: {
    tDiffuse: { value: null as Texture | null },
    uDistortion: { value: new Vector2(0, 0) },
    uPixelGrid: { value: new Vector2(0, 0) },
    uVignetteOffset: { value: VIGNETTE_OFFSET },
    uVignetteDarkness: { value: VIGNETTE_DARKNESS },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uDistortion;
    uniform vec2 uPixelGrid;
    uniform float uVignetteOffset;
    uniform float uVignetteDarkness;
    varying vec2 vUv;
    vec2 barrel(vec2 uv) {
      vec2 m = 2.0 * (uv - 0.5);
      vec2 d = (0.88 + uDistortion * dot(m, m)) * m;
      return d * 0.5 + 0.5;
    }
    void main() {
      vec2 uv = barrel(vUv);
      if (uPixelGrid.y > 1.0) uv = (floor(uv * uPixelGrid) + 0.5) / uPixelGrid;
      vec4 c = (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0)
        ? vec4(0.0, 0.0, 0.0, 1.0)
        : texture2D(tDiffuse, uv);
      c.rgb *= smoothstep(0.8, uVignetteOffset * 0.799,
        (uVignetteDarkness + uVignetteOffset) * distance(vUv, vec2(0.5)));
      gl_FragColor = c;
    }`,
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export interface PhantomWallHooks {
  /** Fired when the centre-most card changes (bottom aria-live title). */
  onActiveChange?: (card: RoomCard | null) => void;
  /** Fired on a card tap (click) — index into the cards array. */
  onCellClick?: (index: number) => void;
  onFling?: () => void;
}

export class PhantomWall {
  private renderer!: WebGLRenderer;
  private composer!: EffectComposer;
  private distortPass!: ShaderPass;
  private scene = new Scene();
  private camera!: PerspectiveCamera;
  private wallGroup = new Group();
  private mediaMesh: (Mesh | null)[] = [];
  private labelMesh: (Mesh | null)[] = [];
  private backMesh: (Mesh | null)[] = [];
  private hoverMesh: (Mesh | null)[] = [];
  private textures: Texture[] = [];
  private loader = new TextureLoader();
  private raf = 0;
  private w = 0;
  private h = 0;
  private rows: number;
  private spanX: number;
  private spanY: number;
  private destroyed = false;
  private frozen = false;
  private lastT = 0;
  private camBase: number; // rest camera distance (mobile pulls back for readability)

  private offset = { x: 0, y: 0 };
  private velocity = { x: 0, y: 0 };
  private drift = { x: 0, y: 0 };
  private pointerUv = { x: 0.5, y: 0.5 };
  private pointerPx = { x: -1, y: -1 };
  private dragging = false;
  private lastDrag = { x: 0, y: 0 };
  private lastMoveT = 0;
  private downAt = { x: 0, y: 0, t: 0 };
  private hovered = -1;
  private activeIndex = -1;
  private camZ: number;
  private gridLines!: Mesh;
  private readonly _v = new Vector3();

  constructor(
    private canvas: HTMLCanvasElement,
    private cards: RoomCard[],
    private hooks: PhantomWallHooks = {},
    private reducedMotion = false,
  ) {
    // Tile the catalogue (COLS_PER_ROW cols × N rows) horizontally to COLS so the
    // grid is wider than the viewport → the sides loop (repeat rooms) with no grey
    // gap. Each placed cell references the same RoomCard object, so click/active/
    // FLIP resolve to the real room regardless of which copy was tapped.
    const catCols = COLS_PER_ROW;
    const catRows = Math.max(1, Math.round(cards.length / catCols));
    const placed: RoomCard[] = [];
    for (let r = 0; r < catRows; r++) {
      for (let c = 0; c < COLS; c++) {
        placed.push(cards[(r % catRows) * catCols + (c % catCols)]);
      }
    }
    this.cards = placed;
    this.rows = catRows;
    this.spanX = COLS * PITCH;
    this.spanY = this.rows * PITCH;
    // mobile: pull the camera back so more cells fit the width → the barrel reads
    const isMobile = typeof matchMedia !== "undefined" && matchMedia("(max-width: 768px)").matches;
    this.camBase = isMobile ? CAM_Z * 1.35 : CAM_Z;
    this.camZ = this.camBase;
    this.init();
  }

  private init() {
    this.renderer = new WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setClearColor(BG, 1);
    this.renderer.outputColorSpace = SRGBColorSpace;
    this.camera = new PerspectiveCamera(FOV, 1, 0.1, 20);
    this.camera.position.z = this.camBase;
    // NO phantom intro — boot the wall settled at its resting distance.
    this.wallGroup.position.z = WALL_Z;
    this.scene.add(this.wallGroup);
    this.buildGridLines();

    this.composer = new EffectComposer(this.renderer);
    this.composer.renderTarget1.samples = 4;
    this.composer.renderTarget2.samples = 4;
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.distortPass = new ShaderPass(DistortionShader);
    this.composer.addPass(this.distortPass);
    this.composer.addPass(new OutputPass());

    this.resize();
    window.addEventListener("resize", this.resize);
    const host = this.canvas.parentElement!;
    host.addEventListener("pointerdown", this.onDown);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    host.addEventListener("wheel", this.onWheel, { passive: false });
    host.addEventListener("keydown", this.onKey);

    this.lastT = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  /** initial pan, in world (cell) units — used to open on a chosen region */
  setInitialOffset(x: number, y: number) {
    this.offset.x = x;
    this.offset.y = y;
  }

  /** Pause pan/hover while the FLIP detail page is open (freeze the frame). */
  freeze(on: boolean) {
    this.frozen = on;
    if (on) {
      this.dragging = false;
      this.velocity.x = this.velocity.y = 0;
      this.canvas.parentElement!.classList.remove("is-dragging");
    }
  }

  /** cell-boundary lattice — one over-sized set of thin quads, slid by
   *  (offset mod PITCH) each frame so lines always sit on the boundaries. */
  private buildGridLines() {
    const HALF_W = 6;
    const HALF_H = 4;
    const W = 0.006;
    const pos: number[] = [];
    const idx: number[] = [];
    const quad = (x0: number, y0: number, x1: number, y1: number) => {
      const b = pos.length / 3;
      pos.push(x0, y0, 0, x1, y0, 0, x1, y1, 0, x0, y1, 0);
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    // Grid lines must sit at cell BOUNDARIES. Cells centre on base = (col - COLS/2
    // + 0.5): when COLS (or rows) is odd the centres land on integers and the
    // boundaries on half-integers, so the plain integer lattice would draw a line
    // straight through each cell's centre. Shift it half a pitch to land on the
    // boundaries. (Even COLS → shift 0, i.e. source-exact for the original COLS=12.)
    const xShift = COLS % 2 === 1 ? PITCH / 2 : 0;
    const yShift = this.rows % 2 === 1 ? PITCH / 2 : 0;
    for (let i = -HALF_W; i <= HALF_W; i += PITCH) quad(i + xShift - W / 2, -HALF_H, i + xShift + W / 2, HALF_H);
    for (let j = -HALF_H; j <= HALF_H; j += PITCH) quad(-HALF_W, j + yShift - W / 2, HALF_W, j + yShift + W / 2);
    const geo = new BufferGeometry();
    geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    this.gridLines = new Mesh(geo, new MeshBasicMaterial({ color: GRID_LINE_COLOR }));
    this.gridLines.position.z = 0.0008;
    this.wallGroup.add(this.gridLines);
  }

  // ---------- geometry ----------
  private basePos(i: number) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    return {
      x: (col - COLS / 2 + 0.5) * PITCH,
      y: -(row - this.rows / 2 + 0.5) * PITCH,
    };
  }

  private wrap(v: number, span: number) {
    let r = (v + span / 2) % span;
    if (r < 0) r += span;
    return r - span / 2;
  }

  /** px per world unit at the wall plane, at the REST camera distance */
  private pxPerWorld() {
    return this.h / (2 * (this.camBase - WALL_Z) * Math.tan((FOV * Math.PI) / 360));
  }

  private ensureCell(i: number) {
    const card = this.cards[i];
    if (this.backMesh[i] !== undefined && this.backMesh[i] !== null) return;
    // cell backing panel — ink plate; the grid lines + gaps read against it
    const back = new Mesh(new PlaneGeometry(PLANE, PLANE), new MeshBasicMaterial({ color: CELL_BG }));
    back.position.z = 0.0005;
    this.backMesh[i] = back;
    this.wallGroup.add(back);
    if (!card) {
      this.mediaMesh[i] = null;
      this.labelMesh[i] = null;
      this.hoverMesh[i] = null;
      return;
    }

    // hover backdrop plate — flat §5 tone colour
    const hoverMat = new MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      color: TONE_BG[card.tone] ?? TONE_BG.brass,
    });
    const hover = new Mesh(new PlaneGeometry(PLANE, PLANE), hoverMat);
    hover.position.z = 0.001;
    this.hoverMesh[i] = hover;
    this.wallGroup.add(hover);

    // media plane — COVER-fit filling the cell up to the grid lines. The room
    // photo fills its whole rectangle (overflow cropped via the texture UV) so
    // every cell reads as one filled tile and the boundary line sits exactly at
    // the photo edge — a clean warp/weft, with no floating photo border making a
    // second, inner line.
    const mat = new MeshBasicMaterial({ color: 0x101010 });
    const media = new Mesh(new PlaneGeometry(1, 1), mat);
    media.scale.set(MEDIA_FILL, MEDIA_FILL, 1);
    media.position.z = 0.002;
    this.mediaMesh[i] = media;
    this.wallGroup.add(media);
    const url = (import.meta.env.BASE_URL ?? "/") + card.image;
    this.loader.load(url, (tex) => {
      if (this.destroyed) {
        tex.dispose();
        return;
      }
      tex.colorSpace = SRGBColorSpace;
      tex.minFilter = LinearFilter;
      // cover-fit: crop the photo to the square media plane (fill, no letterbox)
      const img = tex.image as { width: number; height: number };
      const a = img.width / img.height; // >1 landscape, <1 portrait
      if (a > 1) {
        tex.repeat.set(1 / a, 1);
        tex.offset.set((1 - 1 / a) / 2, 0);
      } else {
        tex.repeat.set(1, a);
        tex.offset.set(0, (1 - a) / 2);
      }
      mat.map = tex;
      mat.color.set(0xffffff);
      mat.needsUpdate = true;
      this.textures.push(tex);
    });

    // label plane — text baked to a canvas so it distorts with the wall
    const labelTex = bakeLabel(card);
    if (labelTex) {
      const lmat = new MeshBasicMaterial({ map: labelTex, transparent: true, opacity: 0.8 });
      const label = new Mesh(new PlaneGeometry(PLANE, PLANE), lmat);
      label.position.z = 0.003;
      this.labelMesh[i] = label;
      this.wallGroup.add(label);
      this.textures.push(labelTex);
    } else {
      this.labelMesh[i] = null;
    }
  }

  private resize = () => {
    const host = this.canvas.parentElement!;
    this.w = host.clientWidth;
    this.h = host.clientHeight;
    const dpr = Math.min(devicePixelRatio, 2);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.composer.setPixelRatio(dpr);
    this.composer.setSize(this.w, this.h);
    this.camera.aspect = this.w / this.h;
    this.camera.updateProjectionMatrix();
  };

  forceResize() {
    this.resize();
  }

  // ---------- interaction ----------
  private onDown = (e: PointerEvent) => {
    if (this.frozen) return;
    if ((e.target as HTMLElement).closest("[data-wall-ignore]")) return;
    this.dragging = true;
    this.lastDrag = { x: e.clientX, y: e.clientY };
    this.lastMoveT = performance.now();
    this.downAt = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.velocity.x = this.velocity.y = 0;
    this.canvas.parentElement!.classList.add("is-dragging");
  };

  private onMove = (e: PointerEvent) => {
    if (this.frozen) return;
    this.pointerUv = { x: e.clientX / this.w, y: e.clientY / this.h };
    this.pointerPx = { x: e.clientX, y: e.clientY };
    if (!this.dragging) return;
    const ppw = this.pxPerWorld();
    const dx = (e.clientX - this.lastDrag.x) / ppw;
    const dy = (e.clientY - this.lastDrag.y) / ppw;
    this.offset.x -= dx;
    this.offset.y += dy;
    this.velocity.x = -dx;
    this.velocity.y = dy;
    this.lastDrag = { x: e.clientX, y: e.clientY };
    this.lastMoveT = performance.now();
  };

  private onUp = (e: PointerEvent) => {
    if (this.frozen || !this.dragging) return;
    this.dragging = false;
    this.canvas.parentElement!.classList.remove("is-dragging");
    if (performance.now() - this.lastMoveT > PRESS_STILL_MS) {
      this.velocity.x = this.velocity.y = 0;
    }
    const dist = Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y);
    const dt = performance.now() - this.downAt.t;
    if (dist < 6 && dt < 400) {
      if (this.hovered >= 0 && this.cards[this.hovered]) {
        this.hooks.onCellClick?.(this.hovered);
      }
    } else if (Math.hypot(this.velocity.x, this.velocity.y) > 0.004) {
      this.hooks.onFling?.();
    }
  };

  private onWheel = (e: WheelEvent) => {
    if (this.frozen) return;
    e.preventDefault();
    const ppw = this.pxPerWorld();
    this.offset.x += e.deltaX / ppw;
    this.offset.y += e.deltaY / ppw;
  };

  private onKey = (e: KeyboardEvent) => {
    if (this.frozen) return;
    let dx = 0;
    let dy = 0;
    if (e.key === "ArrowLeft") dx = -KEY_STEP;
    else if (e.key === "ArrowRight") dx = KEY_STEP;
    else if (e.key === "ArrowUp") dy = -KEY_STEP;
    else if (e.key === "ArrowDown") dy = KEY_STEP;
    else if (e.key === "Enter" || e.key === " ") {
      if (this.activeIndex >= 0) this.hooks.onCellClick?.(this.activeIndex);
      return;
    } else return;
    e.preventDefault();
    this.offset.x += dx;
    this.offset.y += dy;
  };

  /** which cell is under a given screen px point (px → world → grid index) */
  private indexAtPx(px: number, py: number): number {
    if (px < 0) return -1;
    const ppw = this.pxPerWorld();
    const wx = (px - this.w / 2) / ppw + this.offset.x + this.drift.x;
    const wy = -(py - this.h / 2) / ppw - this.offset.y - this.drift.y;
    let col = Math.round(wx / PITCH + COLS / 2 - 0.5) % COLS;
    let row = Math.round(-wy / PITCH + this.rows / 2 - 0.5) % this.rows;
    if (col < 0) col += COLS;
    if (row < 0) row += this.rows;
    const idx = row * COLS + col;
    return idx < this.cards.length ? idx : -1;
  }

  // ---------- frame loop ----------
  private tick = () => {
    if (this.destroyed) return;
    const now = performance.now();
    const dt = Math.min((now - this.lastT) / 1000, 0.05);
    this.lastT = now;

    if (!this.frozen) {
      if (this.dragging && now - this.lastMoveT > 80) {
        const k = Math.min(10 * dt, 1);
        this.velocity.x = lerp(this.velocity.x, 0, k);
        this.velocity.y = lerp(this.velocity.y, 0, k);
      }
      if (!this.dragging) {
        this.offset.x += this.velocity.x * dt * 60;
        this.offset.y += this.velocity.y * dt * 60;
        const k = Math.min(INERTIA_DECAY * dt, 1);
        this.velocity.x = lerp(this.velocity.x, 0, k);
        this.velocity.y = lerp(this.velocity.y, 0, k);
      }
      if (!this.reducedMotion) {
        this.drift.x = lerp(this.drift.x, (this.pointerUv.x - 0.5) * DRIFT, Math.min(3 * dt, 1));
        this.drift.y = lerp(this.drift.y, -(this.pointerUv.y - 0.5) * DRIFT, Math.min(3 * dt, 1));
      }
    }

    const aspect = this.w / this.h;
    // NO intro — barrel distortion sits at full strength.
    (this.distortPass.uniforms.uDistortion.value as Vector2).set(
      DISTORTION_FACTOR * aspect,
      DISTORTION_FACTOR * aspect,
    );

    // press feedback: camera pulls back while dragging
    this.camZ = lerp(
      this.camZ,
      this.dragging ? this.camBase + PRESS_PULLBACK : this.camBase,
      Math.min(8 * dt, 1),
    );
    this.camera.position.z = this.camZ;

    // hover
    this.hovered = this.frozen ? -1 : this.indexAtPx(this.pointerPx.x, this.pointerPx.y);
    this.canvas.parentElement!.style.cursor = this.dragging
      ? "grabbing"
      : this.hovered >= 0
        ? "pointer"
        : "default";

    // active card feed — the HOVERED cell (what the mouse is over) drives the
    // bottom title, updating as the pointer moves across cells; falls back to the
    // centre-most cell when nothing is hovered (mobile has no hover, and the mobile
    // chrome hides this title anyway).
    const active = this.hovered >= 0 ? this.hovered : this.indexAtPx(this.w / 2, this.h / 2);
    if (active !== this.activeIndex) {
      this.activeIndex = active;
      this.hooks.onActiveChange?.(active >= 0 ? this.cards[active] : null);
    }

    // slide the line lattice so it always sits on the cell boundaries
    const mx = (((this.offset.x + this.drift.x) % PITCH) + PITCH) % PITCH;
    const my = (((this.offset.y + this.drift.y) % PITCH) + PITCH) % PITCH;
    this.gridLines.position.x = -mx;
    this.gridLines.position.y = my;

    // place cells (wrapped), lazily building whatever enters the viewport
    const dist = this.camZ - WALL_Z;
    const halfW = dist * Math.tan((FOV * Math.PI) / 360) * aspect + PITCH;
    const halfH = dist * Math.tan((FOV * Math.PI) / 360) + PITCH;
    for (let i = 0; i < this.cards.length; i++) {
      const base = this.basePos(i);
      const x = this.wrap(base.x - this.offset.x - this.drift.x, this.spanX);
      const y = this.wrap(base.y + this.offset.y + this.drift.y, this.spanY);
      const visible = Math.abs(x) < halfW && Math.abs(y) < halfH;
      if (visible) this.ensureCell(i);
      const back = this.backMesh[i];
      if (!back) continue;
      back.visible = visible;
      back.position.x = x;
      back.position.y = y;
      const media = this.mediaMesh[i];
      if (media) {
        media.visible = visible;
        media.position.x = x;
        media.position.y = y;
      }
      const label = this.labelMesh[i];
      if (label) {
        label.visible = visible;
        label.position.x = x;
        label.position.y = y;
        const m = label.material as MeshBasicMaterial;
        m.opacity = lerp(m.opacity, this.hovered === i ? 1 : 0.8, Math.min(5 * dt, 1));
      }
      const hov = this.hoverMesh[i];
      if (hov) {
        hov.visible = visible;
        hov.position.x = x;
        hov.position.y = y;
        const m = hov.material as MeshBasicMaterial;
        m.opacity = lerp(m.opacity, this.hovered === i ? 0.7 : 0, Math.min(5 * dt, 1));
      }
    }

    this.composer.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  // ---------- FLIP support ----------
  /** Invert the barrel shader (fixed-point) so a projected point maps to its
   *  on-screen position. barrel(uv)=f ⇒ uv; k is the current per-axis factor. */
  private barrelInverse(fx: number, fy: number): { x: number; y: number } {
    const k = (this.distortPass.uniforms.uDistortion.value as Vector2).x;
    const Fx = 2 * (fx - 0.5);
    const Fy = 2 * (fy - 0.5);
    const F2 = Fx * Fx + Fy * Fy;
    let s = 0.88;
    for (let n = 0; n < 5; n++) s = 0.88 + (k * F2) / (s * s);
    return { x: (Fx / s) * 0.5 + 0.5, y: (Fy / s) * 0.5 + 0.5 };
  }

  private worldToScreen(world: Vector3): { x: number; y: number } {
    this._v.copy(world).project(this.camera);
    const fx = this._v.x * 0.5 + 0.5;
    const fy = this._v.y * 0.5 + 0.5;
    const s = this.barrelInverse(fx, fy);
    return { x: s.x * this.w, y: (1 - s.y) * this.h };
  }

  /** Screen-space rect (CSS px) of the tapped card's media plane — for the FLIP. */
  cardScreenRect(mesh: Mesh): CardScreenRect {
    mesh.updateWorldMatrix(true, false);
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const corners = [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ];
    for (const [cx, cy] of corners) {
      const p = mesh.localToWorld(this._v.set(cx, cy, 0));
      const s = this.worldToScreen(p.clone());
      minX = Math.min(minX, s.x);
      minY = Math.min(minY, s.y);
      maxX = Math.max(maxX, s.x);
      maxY = Math.max(maxY, s.y);
    }
    return { left: minX, top: minY, width: maxX - minX, height: maxY - minY };
  }

  /** The media mesh for a placed-cell index (for the FLIP source). */
  meshForIndex(i: number): Mesh | null {
    return this.mediaMesh[i] ?? this.backMesh[i] ?? null;
  }

  /** The RoomCard shown at a placed-cell index (placed cells tile the catalogue). */
  cardForIndex(i: number): RoomCard | null {
    return this.cards[i] ?? null;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    this.canvas.parentElement?.removeEventListener("pointerdown", this.onDown);
    this.canvas.parentElement?.removeEventListener("wheel", this.onWheel);
    this.canvas.parentElement?.removeEventListener("keydown", this.onKey);
    this.gridLines.geometry.dispose();
    (this.gridLines.material as MeshBasicMaterial).dispose();
    this.textures.forEach((t) => t.dispose());
    [...this.backMesh, ...this.mediaMesh, ...this.labelMesh, ...this.hoverMesh].forEach((m) => {
      m?.geometry.dispose();
      (m?.material as MeshBasicMaterial)?.dispose();
    });
    this.composer.dispose();
    this.renderer.dispose();
  }
}

// ---------- label baking — quiet bottom caption over a scrim ----------
// The media now cover-fills the whole cell, so labels can't sit in gutters. Draw a
// small, hushed caption over a soft bottom scrim: category (light grey) + specific
// title (grey) at the bottom-start (right edge in RTL) and a faint outlined tag
// pill. Legible on any photo, still quiet so the image stays the star.
const LABEL_SIZE = 512;

function bakeLabel(card: RoomCard): CanvasTexture | null {
  const c = document.createElement("canvas");
  c.width = c.height = LABEL_SIZE;
  const ctx = c.getContext("2d")!;
  const pad = Math.round(LABEL_SIZE * 0.06);
  const tex = new CanvasTexture(c);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;

  const category = t(card.category);
  const title = t(card.titleHe);
  const tag = t(card.tag);

  const draw = () => {
    ctx.clearRect(0, 0, LABEL_SIZE, LABEL_SIZE);

    // soft bottom scrim so the caption stays legible over any photo
    const top = Math.round(LABEL_SIZE * 0.6);
    const grad = ctx.createLinearGradient(0, top, 0, LABEL_SIZE);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, "rgba(0,0,0,0.7)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, top, LABEL_SIZE, LABEL_SIZE - top);

    const right = LABEL_SIZE - pad;
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";

    // category — small, near-white (the quiet heading). Site display font (§4:
    // Rubik → Heebo), so he / en / fr all render in the same family (no monospace).
    ctx.fillStyle = "#e8e4dd";
    ctx.font = `600 ${Math.round(LABEL_SIZE * 0.05)}px "Rubik", "Heebo", Arial, sans-serif`;
    ctx.fillText(category, right, LABEL_SIZE - pad - Math.round(LABEL_SIZE * 0.05));
    // specific title — smaller, muted grey
    ctx.fillStyle = "rgba(232,228,221,0.66)";
    ctx.font = `400 ${Math.round(LABEL_SIZE * 0.036)}px "Heebo", Arial, sans-serif`;
    ctx.fillText(title, right, LABEL_SIZE - pad - Math.round(LABEL_SIZE * 0.012));

    // tag pill — small, faint outlined, at the start (left)
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = `500 ${Math.round(LABEL_SIZE * 0.03)}px "Heebo", Arial, sans-serif`;
    const tw = ctx.measureText(tag).width;
    const chipPadX = Math.round(LABEL_SIZE * 0.02);
    const chipH = Math.round(LABEL_SIZE * 0.05);
    const chipY = LABEL_SIZE - pad - chipH;
    ctx.beginPath();
    ctx.roundRect(pad, chipY, tw + chipPadX * 2, chipH, chipH / 2);
    ctx.strokeStyle = "rgba(207,174,131,0.65)"; // faint brass ring
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.fillStyle = "rgba(232,228,221,0.82)";
    ctx.fillText(tag, pad + chipPadX, chipY + chipH / 2 + 1);

    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    tex.needsUpdate = true;
  };

  draw();
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(() => draw());
  }
  return tex;
}
