import * as THREE from "three";
import { lerp, clamp } from "./utils";
import type { QualityProfile } from "./quality";
import type { RoomCard } from "../roomsData";

/**
 * Wall — builds and animates the phantom-style curved grid of textured cards.
 * Vanilla TS (no React). Engine owns the scene/camera/renderer + the wallGroup
 * pan; Wall owns the cards and their per-frame transforms.
 *
 * Layout: cards on a `cols × rows` grid with a half-cell BRICK stagger on
 * alternate columns (the recognizable phantom rhythm). Cards are children of a
 * `wallGroup` that Engine pans in X/Y; Wall positions each card at its fixed
 * grid (baseX, baseY) and only drives the per-card CURVE (z + yaw) + the hover
 * lift each frame.
 *
 * Barrel curve: applied relative to the LIVE pan center, so cards flatten as
 * they reach screen center and bow + toe-in toward the screen edges (a subtle
 * cylinder about a vertical axis, plus a gentler horizontal-axis bow):
 *   nx = (baseX + panX) / visibleHalfWidth        (≈ ±1 at the viewport edges)
 *   z  = -CURVE_DEPTH·(1 - cos(clamp(nx·ARC)))     (+ ~half of that for Y)
 *   rotation.y = -nx · CURVE_YAW                   (+ slight X)
 *
 * Texture loading mirrors halls/Gallery: TextureLoader with onLoad (capture real
 * aspect → correct width) + onError (mark failed → hold opacity at 0 so a 404
 * shows nothing instead of an untextured rectangle). decoded[] gates a card
 * invisible until its texture lands (no squashed first frame).
 *
 * Reduced motion: the per-card trig still runs (it's cheap, and Engine's idle
 * short-circuit skips the whole frame when the pan is unchanged — so under
 * reduce, with pan snapped, the GPU stays idle). No breath/continuous animation
 * exists here to disable; hover-lift is gated off by Hover when coarsePointer.
 */

const FADE_SMOOTHING = 0.16;
const HOVER_SMOOTHING = 0.18;
const HOVER_LIFT = 0.45; // world-units the hovered card lifts toward the camera
const HOVER_SCALE = 1.04; // matches the site's --card-zoom token
const DIM_OPACITY = 0.62; // non-hovered cards dim slightly when one is hovered

// Card sizing (world units). Portrait cards; width derived from texture aspect.
const CARD_HEIGHT = 2.3;
const CARD_GUTTER_X = 0.6;
const CARD_GUTTER_Y = 0.55;
const FALLBACK_ASPECT = 0.78; // 1200×1543 placeholder portrait

// Cylindrical (panoramic-room) curve. The wall wraps around the viewer on the
// INSIDE of a vertical cylinder: horizontal arc-length (baseX + panX) maps to an
// angle θ about the cylinder axis, the card sits on the cylinder surface
// (x = R·sinθ, z = R·(cosθ−1)) and yaws −θ to FACE the centre — so you feel you
// stand inside a curved room of pictures, not in front of a flat wall. Smaller R
// = stronger wrap. A gentle independent vertical barrel keeps top/bottom alive.
const CYLINDER_RADIUS = 5.5; // world units; ÷curveScale on mobile = flatter
const MAX_THETA = 1.35; // clamp so far-off cards never fold past ~77°
const CURVE_DEPTH_Y = 1.0; // vertical barrel: z recede at top/bottom
const CURVE_ARC_Y = 0.5;
const CURVE_YAW_X = 0.16; // slight up/down toe-in
const ANGLE_CLAMP = Math.PI / 2; // never let cos() roll past the apex

const DEFAULT_ANISOTROPY = 4;

interface CardUserData {
  index: number;
  baseX: number;
  baseY: number;
  aspect: number;
}

export interface WallBounds {
  maxX: number;
  maxY: number;
  worldPerPixel: number;
}

export default class Wall {
  private scene: THREE.Scene;
  private group: THREE.Group;
  private cards: RoomCard[];
  private quality: QualityProfile;

  private meshes: THREE.Mesh[] = [];
  private materials: THREE.MeshBasicMaterial[] = [];
  private textures: THREE.Texture[] = [];
  private currentOpacities: number[] = [];
  private liftCurrent: number[] = [];
  private failed: boolean[] = [];
  private decoded: boolean[] = [];

  private cols: number;
  private rows: number;
  private cellW: number;
  private cellH: number;
  private totalWidth = 0;
  private totalHeight = 0;
  private visibleHalfWidth = 4; // updated by computeBounds()
  private visibleHalfHeight = 2.2;

  private hoveredIndex = -1;
  private disposed = false;

  constructor(
    scene: THREE.Scene,
    group: THREE.Group,
    cards: RoomCard[],
    quality: QualityProfile,
  ) {
    this.scene = scene;
    this.group = group;
    this.cards = cards;
    this.quality = quality;

    this.cols = Math.max(1, quality.columns);
    this.rows = Math.ceil(cards.length / this.cols);
    // Widest possible card = CARD_HEIGHT × widest aspect (~1). Cell width caps to
    // a portrait card + gutter; placeholder/real photos that are wider just sit
    // a touch tighter — acceptable for the wall read.
    this.cellW = CARD_HEIGHT * 1.0 + CARD_GUTTER_X;
    this.cellH = CARD_HEIGHT + CARD_GUTTER_Y;
    this.totalWidth = this.cols * this.cellW;
    this.totalHeight = this.rows * this.cellH;

    this.build();
  }

  private build(): void {
    const loader = new THREE.TextureLoader();
    const base = import.meta.env.BASE_URL;
    const geometry = new THREE.PlaneGeometry(1, 1);

    for (let i = 0; i < this.cards.length; i++) {
      const card = this.cards[i];
      const url = base + card.image;
      const idx = i;

      const col = i % this.cols;
      const row = Math.floor(i / this.cols);
      // Centre the grid on the origin. Brick stagger: shift alternate columns
      // down by half a cell (the phantom editorial offset).
      const baseX = (col - (this.cols - 1) / 2) * this.cellW;
      const brick = (col % 2) * (this.cellH * 0.5);
      const baseY = -(row - (this.rows - 1) / 2) * this.cellH - brick;

      const userData: CardUserData = {
        index: idx,
        baseX,
        baseY,
        aspect: FALLBACK_ASPECT,
      };

      const texture = loader.load(
        url,
        (loadedTex) => {
          const img = loadedTex.image as
            | { width?: number; height?: number }
            | undefined;
          if (img && img.width && img.height) {
            userData.aspect = img.width / img.height;
            mesh.scale.x = CARD_HEIGHT * userData.aspect;
            mesh.scale.y = CARD_HEIGHT;
          }
          this.decoded[idx] = true;
        },
        undefined,
        (err) => {
          console.warn("[Wall] texture load failed:", url, err);
          this.failed[idx] = true;
        },
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = DEFAULT_ANISOTROPY;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        map: texture,
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.userData = userData;
      mesh.position.set(baseX, baseY, 0);
      mesh.scale.set(CARD_HEIGHT * FALLBACK_ASPECT, CARD_HEIGHT, 1);

      this.group.add(mesh);
      this.meshes.push(mesh);
      this.materials.push(material);
      this.textures.push(texture);
      this.currentOpacities.push(0);
      this.liftCurrent.push(0);
      this.failed.push(false);
      this.decoded.push(false);
    }
  }

  /**
   * Recompute pan bounds + the input→world scale from the camera + viewport.
   * Called once after construction and on every resize by Engine.
   */
  public computeBounds(
    camera: THREE.PerspectiveCamera,
    clientWidth: number,
    clientHeight: number,
  ): WallBounds {
    // Visible world height at z=0 for a perspective camera at camera.position.z.
    const dist = camera.position.z;
    const vFov = (camera.fov * Math.PI) / 180;
    const visibleHeight = 2 * Math.tan(vFov / 2) * dist;
    const visibleWidth = visibleHeight * camera.aspect;
    this.visibleHalfWidth = Math.max(visibleWidth / 2, 0.001);
    this.visibleHalfHeight = Math.max(visibleHeight / 2, 0.001);

    // Horizontal pan = cylinder rotation; the range must let the OUTERMOST card
    // rotate all the way to front-centre (panX = ±totalWidth/2), minus half a
    // cell so you can't spin past the last card into empty cylinder.
    const maxX = Math.max(0, this.totalWidth / 2 - this.cellW * 0.5);
    // Vertical is a flat slide → bound by the off-screen overflow + a small margin.
    const margin = this.cellH * 0.25;
    const maxY = Math.max(0, this.totalHeight / 2 - this.visibleHalfHeight + margin);

    // 1:1 drag: moving the pointer the viewport width pans one viewport width.
    const worldPerPixel = visibleWidth / Math.max(clientWidth, 1);

    return { maxX, maxY, worldPerPixel };
  }

  /** Tell the wall which card index is hovered (-1 = none). Hover.ts drives this. */
  public setHovered(index: number): void {
    this.hoveredIndex = index;
  }

  /** The meshes — Hover's raycaster targets these. */
  public getMeshes(): THREE.Mesh[] {
    return this.meshes;
  }

  /** Per-frame update. `panX/panY` is the wallGroup offset Engine already set. */
  public update(panX: number, panY: number): void {
    const scale = this.quality.curveScale;
    for (let i = 0; i < this.meshes.length; i++) {
      const mesh = this.meshes[i];
      const data = mesh.userData as CardUserData;

      // --- Opacity fade-in (gated on decode/failure) ---
      let targetOpacity = 1;
      if (this.failed[i] || !this.decoded[i]) targetOpacity = 0;
      else if (this.hoveredIndex >= 0 && this.hoveredIndex !== i) {
        targetOpacity = DIM_OPACITY;
      }
      const prevOpacity = Number.isFinite(this.currentOpacities[i])
        ? this.currentOpacities[i]
        : 0;
      const nextOpacity = this.quality.reducedMotion
        ? targetOpacity
        : lerp(prevOpacity, targetOpacity, FADE_SMOOTHING);
      this.currentOpacities[i] = nextOpacity;
      this.materials[i].opacity = nextOpacity;

      // --- Cylindrical (panoramic-room) curve relative to the live pan centre ---
      // Horizontal arc-length → angle θ about the cylinder axis. The card sits ON
      // the cylinder surface and faces the centre, so the viewer feels enclosed by
      // a curved room of pictures (not a flat wall). A bigger radius on mobile is
      // produced by dividing by curveScale (<1) → flatter, gentler wrap.
      const radius = CYLINDER_RADIUS / Math.max(scale, 0.0001);
      const worldX = data.baseX + panX;
      const worldY = data.baseY + panY;
      const theta = clamp(worldX / radius, -MAX_THETA, MAX_THETA);
      const ny = worldY / this.visibleHalfHeight;
      const ay = clamp(ny * CURVE_ARC_Y, -ANGLE_CLAMP, ANGLE_CLAMP);

      // --- Hover lift (lerped) — pushes the card toward the viewer along its
      // own facing normal, so a hovered card pops off the cylinder surface ---
      const targetLift = this.hoveredIndex === i ? HOVER_LIFT : 0;
      const lift = this.quality.reducedMotion
        ? targetLift
        : lerp(this.liftCurrent[i], targetLift, HOVER_SMOOTHING);
      this.liftCurrent[i] = lift;

      // Position on the inside of the cylinder: x = R·sinθ (the card keeps its
      // horizontal place), z = R·(cosθ − 1) (recedes as it wraps away). The lift
      // moves it inward along the radial normal (toward the axis = toward viewer).
      const surfaceX = radius * Math.sin(theta);
      const surfaceZ = radius * (Math.cos(theta) - 1);
      const nxHat = Math.sin(theta); // radial normal x-component
      const nzHat = Math.cos(theta); // radial normal z-component
      const cylZ = surfaceZ - CURVE_DEPTH_Y * scale * (1 - Math.cos(ay));
      mesh.position.x = surfaceX + nxHat * lift;
      mesh.position.z = cylZ + nzHat * lift;

      // Yaw −θ so the card faces the cylinder axis (the viewer); slight X toe-in.
      mesh.rotation.y = -theta;
      mesh.rotation.x = ny * CURVE_YAW_X;

      // --- Hover scale pulse ---
      const liftRatio = HOVER_LIFT > 0 ? lift / HOVER_LIFT : 0;
      const pulse = 1 + (HOVER_SCALE - 1) * liftRatio;
      mesh.scale.x = CARD_HEIGHT * data.aspect * pulse;
      mesh.scale.y = CARD_HEIGHT * pulse;
    }
  }

  /**
   * Index of the card nearest the viewport centre (smallest |worldX|+|worldY|),
   * for the active-label feed. panX/panY are the current pan offset.
   */
  public getActiveIndex(panX: number, panY: number): number {
    let best = -1;
    let bestDist = Infinity;
    for (let i = 0; i < this.meshes.length; i++) {
      const data = this.meshes[i].userData as CardUserData;
      const dx = data.baseX + panX;
      const dy = data.baseY + panY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    return best;
  }

  /** World position of card `i` (group pan already applied by Engine). */
  public getCardWorldPosition(i: number, out: THREE.Vector3): THREE.Vector3 {
    return this.meshes[i].getWorldPosition(out);
  }

  /**
   * World position of card `i`'s TOP edge (centre + half the scaled height along
   * world-up). Cards yaw in Y (+ slight X), so up stays close to world-up — good
   * enough to float a label just above the image. Group pan is included.
   */
  public getCardTopWorldPosition(i: number, out: THREE.Vector3): THREE.Vector3 {
    const mesh = this.meshes[i];
    mesh.getWorldPosition(out);
    out.y += mesh.scale.y * 0.5 + 0.18;
    return out;
  }

  public getCount(): number {
    return this.meshes.length;
  }

  public dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const mesh of this.meshes) this.group.remove(mesh);
    for (const tex of this.textures) tex.dispose();
    for (const mat of this.materials) mat.dispose();
    for (const mesh of this.meshes) mesh.geometry.dispose();
    this.meshes = [];
    this.materials = [];
    this.textures = [];
    this.currentOpacities = [];
    this.liftCurrent = [];
    this.failed = [];
    this.decoded = [];
  }
}
