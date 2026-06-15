import * as THREE from "three";
import { clamp } from "./utils";
import type { QualityProfile } from "./quality";
import type { RoomCard } from "../roomsData";
import { COLS_PER_ROW, CATEGORIES } from "../roomsData";

/**
 * Wall — the phantom.land "infinite pan grid through a concave lens".
 *
 * Faithful port of phantom-sphere-gallery/src/gallery.js (vanilla → TS, React-
 * agnostic). It is NOT a sphere you rotate and NOT a cylinder: it is a flat grid
 * of portrait cards that the viewer pans freely in X and Y. Both axes WRAP modulo
 * the pool span, so the catalogue repeats forever (drag up/down/left/right →
 * endless scroll). Depth is faked by a fixed "lens": each card sits on the concave
 * paraboloid  z = CURVE_X·x² + CURVE_Y·y²  and is oriented along that surface's
 * normal (via lookAt) — flat + closest + brightest at screen centre, rising toward
 * the camera and tilting inward at the edges, like the inside of a shallow dome.
 *
 * A POOL of meshes (poolCols × poolRows, bigger than the visible window + a wrap
 * margin) is reused: each frame every pooled mesh is placed at its slot shifted by
 * the pan, wrapped into the span window, then lensed. The CONTENT for each slot is
 * chosen by a 2D-periodic modulo over the CATALOGUE (CAT_COLS × CAT_ROWS unique
 * cells = the rooms), so only catalogue-many unique textures exist, shared across
 * the pool. Brightness dims toward the rim; the hovered card forces full brightness
 * and swaps to its "hot" texture (brighter metadata).
 *
 * HYBRID textures (vs. the source's procedural posters): each unique card is drawn
 * to a canvas = the room PHOTO (cover-fit) composited UNDER the editorial metadata
 * (index · title · tag · year), phantom-style. Two variants per card (normal +
 * hot) → 2 × catalogue CanvasTextures, capped at 512×640 to stay within the §8
 * texture-memory budget. The photo loads async: the canvas is painted with the
 * tone-bg + metadata immediately (never a blank rect), then redrawn with the photo
 * once it decodes (texture.needsUpdate). Fonts likewise trigger one late redraw.
 *
 * Engine owns the Scene/Camera/Renderer + the group; Wall owns the cards, their
 * textures, and the per-frame lens/brightness/intro transforms. Engine passes the
 * live pan (panX, panY) and the intro progress (introT 0→1) into update().
 */

// ---- grid / card geometry (world units; adopted from the source) ----
const CARD_W = 4.7;
const CARD_ASPECT = 1080 / 820; // portrait, the source cell ratio
const CARD_H = CARD_W * CARD_ASPECT; // ≈ 6.19
const GAP_X = 0.34;
const GAP_Y = 0.34;
const CELL_X = CARD_W + GAP_X; // ≈ 5.04
const CELL_Y = CARD_H + GAP_Y; // ≈ 6.53

// ---- concave lens (paraboloid). Horizontal curve stronger than vertical. ----
const CURVE_X = 0.016;
const CURVE_Y = 0.008;

// ---- brightness falloff ----
const BRIGHT_FLOOR = 0.32;
const BRIGHT_SPAN = 0.68;
const BRIGHT_RADIUS_FACTOR = 0.42; // dist normaliser × SPAN_X
const BRIGHT_LERP = 0.2;

// ---- canvas texture resolution (capped for the §8 GPU-memory budget) ----
const CELL_W = 512;
const CELL_H = 640;
const POSTER = {
  x: Math.round(CELL_W * 0.03),
  y: Math.round(CELL_H * 0.06),
  w: Math.round(CELL_W * 0.94),
  h: Math.round(CELL_H * 0.82),
};

// ---- intro bloom (no GSAP): per-card scale 0→1 staggered by distance ----
const INTRO_STAGGER = 0.4; // fraction of introT reserved for the centre→rim sweep

const mod = (n: number, m: number): number => ((n % m) + m) % m;

// §5 palette — tone background + a text colour that reads on it.
const TONE_BG: Record<string, string> = {
  brass: "#CFAE83",
  cocoa: "#534133",
  ivory: "#F5EFE6",
  mist: "#E8DFD3",
  rose: "#B8576F",
};
const INK_DEEP = "#1A1410";
const IVORY = "#F5EFE6";

interface PoolUserData {
  col: number;
  row: number;
  cellId: number; // current catalogue cell shown in this slot (-1 = unassigned)
  brightness: number;
}

/** One unique catalogue cell's two canvas textures + their source canvases. */
interface CellTextures {
  normal: THREE.CanvasTexture;
  hot: THREE.CanvasTexture;
  normalCanvas: HTMLCanvasElement;
  hotCanvas: HTMLCanvasElement;
  img: HTMLImageElement | null; // decoded photo (null until loaded / on error)
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export default class Wall {
  private group: THREE.Group;
  private cards: RoomCard[];
  private quality: QualityProfile;

  // The unique catalogue (== the room cards) and its 2D period.
  private catCols: number;
  private catRows: number;
  private catN: number;

  // The reused pool.
  private poolCols: number;
  private poolRows: number;
  private spanX: number;
  private spanY: number;

  private meshes: THREE.Mesh[] = [];
  private materials: THREE.MeshBasicMaterial[] = [];
  private geometry: THREE.PlaneGeometry;
  private cellTex: CellTextures[] = []; // one per unique catalogue cell

  private hovered: THREE.Mesh | null = null;
  private disposed = false;
  private readonly maxDist: number; // for intro stagger normalisation

  private readonly _normalTarget = new THREE.Vector3();

  constructor(
    _scene: THREE.Scene,
    group: THREE.Group,
    cards: RoomCard[],
    quality: QualityProfile,
  ) {
    this.group = group;
    this.cards = cards;
    this.quality = quality;

    // Catalogue period: ONE ROW PER CATEGORY (2026-06-15). The card array is a
    // balanced grid of CATEGORIES.length rows × COLS_PER_ROW cols (roomsData pads
    // each row with placeholders), so catN === cards.length and the catalogue
    // cell id maps 1:1 to a card. Row r of the wall = category r, every row the
    // same width → rooms read horizontally, category by category.
    this.catCols = COLS_PER_ROW;
    this.catRows = CATEGORIES.length;
    this.catN = this.catCols * this.catRows;

    // Pool sized to cover the viewport + a wrap margin; smaller on mobile. Each
    // dimension must be ≥ the catalogue's so the wrap fully covers the period.
    this.poolCols = quality.isMobile ? 6 : 9;
    this.poolRows = quality.isMobile ? 6 : 7;
    this.spanX = this.poolCols * CELL_X;
    this.spanY = this.poolRows * CELL_Y;
    this.maxDist = Math.hypot(this.spanX / 2, this.spanY / 2);

    this.geometry = new THREE.PlaneGeometry(CARD_W, CARD_H, 1, 1);

    this.buildTextures();
    this.buildPool();
  }

  // ---- texture pipeline ---------------------------------------------------

  private makeCanvas(): {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
  } {
    const canvas = document.createElement("canvas");
    canvas.width = CELL_W;
    canvas.height = CELL_H;
    const ctx = canvas.getContext("2d")!;
    return { canvas, ctx };
  }

  /** Draw one card: tone bg → photo (cover-fit, if decoded) → metadata overlay. */
  private drawCard(
    ctx: CanvasRenderingContext2D,
    card: RoomCard,
    hot: boolean,
    img: HTMLImageElement | null,
  ): void {
    const bg = TONE_BG[card.tone] ?? TONE_BG.brass;

    ctx.clearRect(0, 0, CELL_W, CELL_H);
    // Cell ground = ink-deep so a card melts into the dark field at the rim.
    ctx.fillStyle = INK_DEEP;
    ctx.fillRect(0, 0, CELL_W, CELL_H);

    // ---- poster region (clipped, rounded) ----
    ctx.save();
    roundRect(ctx, POSTER.x, POSTER.y, POSTER.w, POSTER.h, 8);
    ctx.clip();

    // tone wash (always — under the photo, and the whole poster if no photo yet)
    ctx.fillStyle = bg;
    ctx.fillRect(POSTER.x, POSTER.y, POSTER.w, POSTER.h);

    if (img && img.width && img.height) {
      // cover-fit the photo into the poster rect
      const ir = img.width / img.height;
      const pr = POSTER.w / POSTER.h;
      let dw: number;
      let dh: number;
      if (ir > pr) {
        dh = POSTER.h;
        dw = dh * ir;
      } else {
        dw = POSTER.w;
        dh = dw / ir;
      }
      const dx = POSTER.x + (POSTER.w - dw) / 2;
      const dy = POSTER.y + (POSTER.h - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    }

    // legibility scrim along the bottom for the title/tag over a photo
    const grad = ctx.createLinearGradient(0, POSTER.y + POSTER.h * 0.55, 0, POSTER.y + POSTER.h);
    grad.addColorStop(0, "rgba(26,20,16,0)");
    grad.addColorStop(1, hot ? "rgba(26,20,16,0.72)" : "rgba(26,20,16,0.58)");
    ctx.fillStyle = grad;
    ctx.fillRect(POSTER.x, POSTER.y, POSTER.w, POSTER.h);
    ctx.restore();

    // (no grid lattice / no per-image frame — reverted 2026-06-15 per request)

    // text colour: cream over the photo body works regardless of tone; the
    // top index uses the on-tone colour only when there's no photo, but cream
    // reads on the dark cell ground above the poster — keep cream for consistency.
    const meta = hot ? "#FFFFFF" : "rgba(245,239,230,0.78)";
    const dim = hot ? "rgba(245,239,230,0.92)" : "rgba(245,239,230,0.55)";

    // ---- index marker (in the gutter above the poster, end-aligned = right) ----
    ctx.textBaseline = "alphabetic";
    ctx.font = `600 ${Math.round(CELL_W * 0.05)}px "Rubik", "Heebo", Arial, sans-serif`;
    ctx.textAlign = "right";
    ctx.fillStyle = dim;
    const total = String(this.cards.length).padStart(2, "0");
    ctx.fillText(`${card.number} / ${total}`, POSTER.x + POSTER.w - 4, POSTER.y - 12);

    // ---- MAIN heading = room category (top-start = right edge in RTL) ----
    // The category (room type) is the prominent heading per the rooms taxonomy;
    // the specific room title sits beneath it as a quieter subtitle.
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 8;
    // category — large, bold, ivory/white
    ctx.fillStyle = hot ? "#FFFFFF" : IVORY;
    ctx.font = `700 ${Math.round(CELL_W * 0.075)}px "Rubik", "Heebo", Arial, sans-serif`;
    ctx.fillText(card.category, POSTER.x + POSTER.w - 22, POSTER.y + 18);
    // specific title — smaller, muted, just below the category
    ctx.fillStyle = hot ? "rgba(245,239,230,0.92)" : "rgba(245,239,230,0.74)";
    ctx.font = `500 ${Math.round(CELL_W * 0.05)}px "Heebo", Arial, sans-serif`;
    ctx.fillText(card.titleHe, POSTER.x + POSTER.w - 22, POSTER.y + 18 + Math.round(CELL_W * 0.095));
    ctx.shadowBlur = 0;

    // ---- tag pill (bottom-start = right) ----
    // (year removed 2026-06-15 — not relevant for room cards)
    const by = POSTER.y + POSTER.h - 44;
    ctx.font = `600 ${Math.round(CELL_W * 0.045)}px "Heebo", Arial, sans-serif`;
    ctx.textBaseline = "middle";
    // tag pill
    const padX = 16;
    const tagW = ctx.measureText(card.tag).width + padX * 2;
    const tagX = POSTER.x + POSTER.w - 22 - tagW;
    ctx.fillStyle = card.isReal
      ? `rgba(207,174,131,${hot ? 0.95 : 0.82})`
      : `rgba(245,239,230,${hot ? 0.2 : 0.12})`;
    roundRect(ctx, tagX, by, tagW, 34, 17);
    ctx.fill();
    ctx.fillStyle = card.isReal ? INK_DEEP : IVORY;
    ctx.textAlign = "right";
    ctx.fillText(card.tag, POSTER.x + POSTER.w - 22 - padX, by + 18);

    // reset alignment defaults
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  /** Build the 2 × catalogue CanvasTextures and kick the photo loads. */
  private buildTextures(): void {
    const maxAniso = 8;
    const base = import.meta.env.BASE_URL;

    for (let id = 0; id < this.catN; id++) {
      const card = this.cards[id] ?? this.cards[id % this.cards.length];

      const n = this.makeCanvas();
      const h = this.makeCanvas();
      // initial paint: tone bg + metadata (no photo yet)
      this.drawCard(n.ctx, card, false, null);
      this.drawCard(h.ctx, card, true, null);

      const mk = (canvas: HTMLCanvasElement): THREE.CanvasTexture => {
        const tex = new THREE.CanvasTexture(canvas);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = maxAniso;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.magFilter = THREE.LinearFilter;
        tex.generateMipmaps = true;
        return tex;
      };

      const entry: CellTextures = {
        normal: mk(n.canvas),
        hot: mk(h.canvas),
        normalCanvas: n.canvas,
        hotCanvas: h.canvas,
        img: null,
      };
      this.cellTex.push(entry);

      // async photo load → redraw both variants with the image
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (this.disposed) return;
        entry.img = img;
        this.redrawCell(id);
      };
      img.onerror = () => {
        // keep the tone+metadata paint (never a blank rect); leave img null
        if (this.disposed) return;
      };
      img.src = base + card.image;
    }

    // One late redraw once webfonts are ready, so the metadata isn't stuck on a
    // fallback face. Guarded against disposal.
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (this.disposed) return;
        for (let id = 0; id < this.catN; id++) this.redrawCell(id);
      });
    }
  }

  /** Redraw one catalogue cell's two canvases + flag the textures for upload. */
  private redrawCell(id: number): void {
    const entry = this.cellTex[id];
    if (!entry) return;
    const card = this.cards[id] ?? this.cards[id % this.cards.length];
    const nctx = entry.normalCanvas.getContext("2d")!;
    const hctx = entry.hotCanvas.getContext("2d")!;
    this.drawCard(nctx, card, false, entry.img);
    this.drawCard(hctx, card, true, entry.img);
    entry.normal.needsUpdate = true;
    entry.hot.needsUpdate = true;
  }

  // ---- pool ---------------------------------------------------------------

  private buildPool(): void {
    for (let r = 0; r < this.poolRows; r++) {
      for (let c = 0; c < this.poolCols; c++) {
        const material = new THREE.MeshBasicMaterial({
          transparent: true,
          depthWrite: false,
          color: 0xffffff,
        });
        const mesh = new THREE.Mesh(this.geometry, material);
        const userData: PoolUserData = {
          col: c,
          row: r,
          cellId: -1,
          brightness: 0,
        };
        mesh.userData = userData;
        // start tiny for the intro bloom (overwritten each frame by update)
        mesh.scale.setScalar(this.quality.reducedMotion ? 1 : 0.001);
        this.group.add(mesh);
        this.meshes.push(mesh);
        this.materials.push(material);
      }
    }
  }

  // ---- per-frame ----------------------------------------------------------

  /**
   * Position every pooled mesh for the current pan: shift by pan, wrap into the
   * span window, place on the lens paraboloid + orient inward, assign content
   * (2D-periodic over the catalogue), set brightness, and apply the intro bloom.
   */
  public update(panX: number, panY: number, introT: number): void {
    const introEased = introT >= 1 ? 1 : 1 - Math.pow(2, -10 * introT);

    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      const u = mesh.userData as PoolUserData;

      // slot position shifted by pan, wrapped into the span window
      const relX = u.col * CELL_X - panX;
      const relY = u.row * CELL_Y - panY;
      const x = mod(relX + this.spanX / 2, this.spanX) - this.spanX / 2;
      const y = mod(relY + this.spanY / 2, this.spanY) - this.spanY / 2;

      // concave lens: z rises toward the rim; orient along the inward normal
      const z = CURVE_X * x * x + CURVE_Y * y * y;
      mesh.position.set(x, y, z);
      const nx = -2 * CURVE_X * x;
      const ny = -2 * CURVE_Y * y;
      this._normalTarget.set(x + nx, y + ny, z + 1);
      mesh.lookAt(this._normalTarget);

      // content: which catalogue cell sits in this slot now (2D periodic)
      const lc = Math.round((panX + x) / CELL_X);
      const lr = Math.round((panY + y) / CELL_Y);
      const id = mod(lr, this.catRows) * this.catCols + mod(lc, this.catCols);
      if (id !== u.cellId) {
        u.cellId = id;
        const tex = this.cellTex[id];
        mesh.material = this.materials[i];
        this.materials[i].map =
          mesh === this.hovered ? tex.hot : tex.normal;
        this.materials[i].needsUpdate = true;
      }

      // brightness: bright at centre, dimming toward the rim; hovered = full
      const dist = Math.hypot(x, y);
      let b = clamp(1 - dist / (this.spanX * BRIGHT_RADIUS_FACTOR), 0, 1);
      b = BRIGHT_FLOOR + Math.pow(b, 1.4) * BRIGHT_SPAN;
      if (mesh === this.hovered) b = 1;
      if (this.quality.reducedMotion) u.brightness = b;
      else u.brightness += (b - u.brightness) * BRIGHT_LERP;
      this.materials[i].color.setScalar(u.brightness);

      // intro bloom: scale 0→1, staggered centre→rim
      if (introEased >= 1) {
        mesh.scale.setScalar(1);
      } else {
        const dNorm = this.maxDist > 0 ? dist / this.maxDist : 0;
        const lp = clamp(
          (introEased - dNorm * INTRO_STAGGER) / (1 - INTRO_STAGGER),
          0,
          1,
        );
        // expo-out on the local progress for a soft settle
        const s = lp <= 0 ? 0.001 : 1 - Math.pow(2, -10 * lp);
        mesh.scale.setScalar(Math.max(0.001, s));
      }
    }
  }

  // ---- hover / picking ----------------------------------------------------

  /** Tell the wall which pooled mesh is hovered (null = none). Hover.ts drives this. */
  public setHovered(mesh: THREE.Mesh | null): void {
    if (this.hovered === mesh) return;
    // restore the previously-hovered mesh to its normal texture
    if (this.hovered) {
      const pi = this.meshes.indexOf(this.hovered);
      const pu = this.hovered.userData as PoolUserData;
      if (pi >= 0 && pu.cellId >= 0) {
        this.materials[pi].map = this.cellTex[pu.cellId].normal;
        this.materials[pi].needsUpdate = true;
      }
    }
    this.hovered = mesh;
    if (mesh) {
      const ni = this.meshes.indexOf(mesh);
      const nu = mesh.userData as PoolUserData;
      if (ni >= 0 && nu.cellId >= 0) {
        this.materials[ni].map = this.cellTex[nu.cellId].hot;
        this.materials[ni].needsUpdate = true;
      }
    }
  }

  /** The pooled meshes — Hover's + pickAt's raycaster targets these. */
  public getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  /** The room card currently shown by a given pooled mesh (for tap → detail). */
  public getCardForMesh(mesh: THREE.Mesh): RoomCard | null {
    const u = mesh.userData as PoolUserData | undefined;
    if (!u || u.cellId < 0) return null;
    return this.cards[u.cellId] ?? this.cards[u.cellId % this.cards.length] ?? null;
  }

  /** The card nearest the viewport centre (smallest |x|+|y|), for the active feed. */
  public getActiveCard(panX: number, panY: number): RoomCard | null {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.meshes.length; i++) {
      const u = this.meshes[i].userData as PoolUserData;
      // recompute the wrapped slot centre for this mesh (cheap)
      const relX = u.col * CELL_X - panX;
      const relY = u.row * CELL_Y - panY;
      const x = mod(relX + this.spanX / 2, this.spanX) - this.spanX / 2;
      const y = mod(relY + this.spanY / 2, this.spanY) - this.spanY / 2;
      const d = x * x + y * y;
      if (d < bestDist) {
        bestDist = d;
        best = u.cellId;
      }
    }
    if (best < 0) return null;
    return this.cards[best] ?? this.cards[best % this.cards.length] ?? null;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.meshes) this.group.remove(mesh);
    for (const entry of this.cellTex) {
      entry.normal.dispose();
      entry.hot.dispose();
      entry.img = null;
    }
    for (const mat of this.materials) mat.dispose();
    this.geometry.dispose();
    this.meshes = [];
    this.materials = [];
    this.cellTex = [];
    this.hovered = null;
  }
}
