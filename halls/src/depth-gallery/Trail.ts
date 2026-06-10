import * as THREE from "three";

/**
 * Trail — the glowing Catmull-Rom tube that winds through the depth corridor.
 *
 * Faithful port of the Codrops reference `Trail.js`, with the ONE mandatory
 * performance change the plan calls out (risk #1): the reference rebuilt a brand
 * new `BufferGeometry` every single frame inside `addPoint()` (`createTaperedTube`
 * → `new THREE.BufferGeometry()` + `setAttribute` + `setIndex` + a fresh
 * `dispose()` of the previous one). That leaks/churns a geometry per frame and
 * GCs hard. Here we PRE-ALLOCATE one BufferGeometry at construction sized for the
 * maximum possible tube (curveSegments+1 rings × radialSegments+1 verts/ring),
 * rewrite the `position` + `normal` Float32 attributes in place each frame, build
 * the index ONCE for the full ring grid, and expose only the active triangle span
 * via `setDrawRange`. No allocation in the hot path.
 *
 * Skin (warm-luxury, plan §5 / risk #2): brass color + brass emissive, NORMAL
 * (not additive) alpha blending so the tube does not blow out to white over the
 * ivory/warm background. TrailController tints the material via {@link applySkin}
 * + tunes `curveTension` / `pointSmoothing` at construction.
 *
 * WAVE 6 downscale (plan §7 gl-6 / risk #5): the constructor takes an options
 * bag so the mobile ladder can shrink the tube at build time —
 *   - `radialSegments` (desktop 8 → mobile 4): fewer sides around the tube.
 *   - `maxPathPointCap` (desktop 220 → mobile 80): smaller pre-allocated buffers
 *      AND a lower ceiling for the per-frame `maxPoints` TrailController writes.
 *   - `useBasicMaterial` (coarse pointer): swap MeshStandardMaterial →
 *      MeshBasicMaterial. The scene has NO lights, so the tube is emissive-only
 *      anyway; Basic skips the (empty) PBR light loop — cheaper on mobile GPUs.
 *      {@link applySkin} guards the emissive writes so either material works.
 * Both fields default to the desktop values, so a no-arg `new Trail()` is
 * unchanged (full fidelity).
 *
 * Public surface (matches the Wave-1 stub TrailController compiles against,
 * with the Wave-6 material-type widening to the Standard|Basic union):
 *   - `object` getter → the THREE.Group added to the scene
 *   - `material` → the tube material (union; TrailController skins it via applySkin)
 *   - `maxPoints` / `maxTrimPerFrame` → length controls written per frame
 *   - `curveTension` / `pointSmoothing` → spline tuning
 *   - `addPoint(v)` / `reset()` / `dispose()` / `applySkin(...)`
 */

/** Wave-6 trail construction options (mobile downscale ladder). */
export interface TrailOptions {
  /** Sides around the tube. Desktop 8 → mobile 4. Sizes the pre-alloc buffers. */
  radialSegments?: number;
  /** Max accumulated path points. Desktop 220 → mobile 80. Caps the buffers. */
  maxPathPointCap?: number;
  /** Use the cheaper unlit MeshBasicMaterial (coarse-pointer GPUs). */
  useBasicMaterial?: boolean;
}

/** Skin parameters applied by TrailController (color + glow + opacity). */
export interface TrailSkin {
  color: string;
  glowColor: string;
  glowIntensity: number;
  opacity: number;
}

/** The tube material is a Standard|Basic union (Wave-6 mobile swap). */
type TrailMaterial = THREE.MeshStandardMaterial | THREE.MeshBasicMaterial;

const DEFAULT_RADIAL_SEGMENTS = 8;
const DEFAULT_MAX_PATH_POINT_CAP = 220;

export default class Trail {
  private group: THREE.Group;
  private mesh: THREE.Mesh<THREE.BufferGeometry, TrailMaterial>;
  private geometry: THREE.BufferGeometry;
  private positionAttribute: THREE.BufferAttribute;
  private normalAttribute: THREE.BufferAttribute;

  // Accumulated path points (world space). Capped at `maxPoints` by trimming.
  private points: THREE.Vector3[] = [];

  // --- Reference tuning fields (TrailController writes maxPoints/maxTrimPerFrame
  // each frame, and curveTension/pointSmoothing once at construction). ---
  public maxPoints = 220;
  public maxTrimPerFrame = 4;
  public curveTension = 0.5;
  public pointSmoothing = 0.3;

  // Reference geometry constants (Trail.js). radialSegments + maxCurveSegments
  // become Wave-6 instance fields driven by the downscale ladder (see ctor).
  private readonly minDistance = 0.006; // min movement before a new point is kept
  private readonly maxCurveSegments: number; // max tube segments along the curve
  private readonly radialSegments: number; // ring roundness (sides around the tube)
  private readonly radiusHead = 0.012; // radius near the latest point
  private readonly radiusTail = 0.003; // radius near the oldest point
  private readonly jumpResetDistance = 999; // hard reset threshold for huge jumps

  // Capacity of the pre-allocated buffers. getSpacedPoints(n) returns n+1
  // points, so the most path points we can ever produce is maxCurveSegments+1.
  // (Assigned in the constructor — they depend on the injected radialSegments /
  // maxCurveSegments, which TS field initializers can't reference pre-ctor.)
  private readonly maxPathPoints: number;
  private readonly ringPoints: number; // closed ring needs +1
  private readonly maxVertices: number;

  // How many triangles' worth of index the geometry is currently drawing.
  // 6 indices per quad × radialSegments quads × (pathPoints - 1) rings.
  private drawIndexCount = 0;

  // Scratch vectors reused every frame so the hot path allocates nothing.
  private readonly _up = new THREE.Vector3(0, 0, 1);
  private readonly _tangent = new THREE.Vector3();
  private readonly _normal = new THREE.Vector3();
  private readonly _binormal = new THREE.Vector3();
  private readonly _radialOffset = new THREE.Vector3();
  private readonly _vertex = new THREE.Vector3();

  public readonly material: TrailMaterial;

  constructor(opts: TrailOptions = {}) {
    this.group = new THREE.Group();

    // --- Wave-6 downscale ladder (defaults = desktop full fidelity). ---
    this.radialSegments = Math.max(
      3,
      Math.round(opts.radialSegments ?? DEFAULT_RADIAL_SEGMENTS),
    );
    this.maxCurveSegments = Math.max(
      24,
      Math.round(opts.maxPathPointCap ?? DEFAULT_MAX_PATH_POINT_CAP),
    );
    // Keep the per-frame point cap from exceeding the buffer capacity on mobile.
    this.maxPoints = Math.min(this.maxPoints, this.maxCurveSegments);
    this.maxPathPoints = this.maxCurveSegments + 1;
    this.ringPoints = this.radialSegments + 1;
    this.maxVertices = this.maxPathPoints * this.ringPoints;

    // Warm-luxury skin (Wave 5): brass ribbon over the ivory ground. The
    // reference's icy cyan (#7fd5ff emissive / #f6f9ff color) is replaced with
    // brass (#CFAE83). Blending stays NORMAL (NOT additive) so the glow does
    // not blow out to white over the bright ivory background (plan risk #2) —
    // additive over ~0.92-luma ivory clips instantly to white. NOTE: these
    // color/emissive/opacity values are the leaf-level defaults; TrailController
    // .applySkin() RE-SETS color/emissive/opacity from its own
    // `configuration.visualSettings` at construction (the live source of truth
    // for the trail skin). They are kept in sync here (brass / brass / 0.51) so
    // this file does not carry contradictory values. Blending, however, is NOT
    // touched by TrailController, so the NormalBlending set here is the one that
    // renders — confirmed correct (plan risk #2).
    //
    // Wave-6: on coarse-pointer GPUs the tube uses the cheaper unlit
    // MeshBasicMaterial (the scene has no lights, so the Standard PBR path is
    // emissive-only overhead). MeshBasicMaterial carries no emissive/roughness/
    // metalness — applySkin() guards those writes via an instanceof check.
    const sharedMatProps = {
      color: new THREE.Color("#CFAE83"), // brass
      transparent: true,
      opacity: 0.51,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending, // NOT additive (plan risk #2)
    };
    this.material = opts.useBasicMaterial
      ? new THREE.MeshBasicMaterial(sharedMatProps)
      : new THREE.MeshStandardMaterial({
          ...sharedMatProps,
          emissive: new THREE.Color("#CFAE83"), // brass glow
          emissiveIntensity: 1.0,
          roughness: 0.2,
          metalness: 0.05,
        });

    // --- Pre-allocate the buffers ONCE. ---
    this.geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.maxVertices * 3);
    const normals = new Float32Array(this.maxVertices * 3);
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.normalAttribute = new THREE.BufferAttribute(normals, 3);
    this.positionAttribute.setUsage(THREE.DynamicDrawUsage);
    this.normalAttribute.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute("position", this.positionAttribute);
    this.geometry.setAttribute("normal", this.normalAttribute);

    // The index topology depends only on the ring grid (radialSegments +
    // ringPoints), never on the point data — so build it once for the FULL
    // grid. Per frame we only move `drawRange` to expose the active triangles.
    const index = this.buildFullIndex();
    this.geometry.setIndex(index);
    this.geometry.setDrawRange(0, 0); // nothing drawn until we have >= 2 points

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.renderOrder = 1200;
    this.mesh.frustumCulled = false; // tube reaches well beyond its (empty) bbox
    this.mesh.visible = false; // hidden until the first ring is written
    this.group.add(this.mesh);
  }

  public get object(): THREE.Group {
    return this.group;
  }

  /**
   * Append a world-space point to the trail (reference Trail.addPoint).
   * Dedupes points closer than `minDistance`, hard-resets on huge jumps,
   * eases new points toward the previous via `pointSmoothing`, trims the head
   * down to `maxPoints` (budgeted by `maxTrimPerFrame`), then rebuilds the tube
   * IN PLACE into the pre-allocated buffers.
   */
  public addPoint(position: THREE.Vector3): void {
    if (!(position instanceof THREE.Vector3)) return;

    const lastPoint = this.points[this.points.length - 1] ?? null;

    // Skip points that barely moved (reference uses squared distance).
    if (
      lastPoint &&
      position.distanceToSquared(lastPoint) < this.minDistance * this.minDistance
    ) {
      return;
    }

    const nextPoint = position.clone();

    // On a large jump, restart the trail so it snaps cleanly.
    if (lastPoint && nextPoint.distanceTo(lastPoint) > this.jumpResetDistance) {
      this.points = [nextPoint];
      this.drawIndexCount = 0;
      this.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }

    const easedPoint = lastPoint
      ? lastPoint.clone().lerp(nextPoint, this.pointSmoothing)
      : nextPoint;
    this.points.push(easedPoint);

    // Trim the oldest points down toward maxPoints, budgeted per frame.
    let trimBudget = this.maxTrimPerFrame;
    while (this.points.length > this.maxPoints && trimBudget > 0) {
      this.points.shift();
      trimBudget -= 1;
    }

    if (this.points.length < 2) {
      this.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }

    this.rebuildTube();
  }

  /**
   * Recompute the tapered tube into the EXISTING buffers (reference
   * createTaperedTube, but writing in place instead of allocating). Samples the
   * Catmull-Rom curve, lays a ring of `radialSegments+1` verts at each sample,
   * writes positions + (re)computes normals, and sets `drawRange` to the active
   * triangle span. Never allocates a geometry/attribute.
   */
  private rebuildTube(): void {
    // Curve through the current points (reference: centripetal Catmull-Rom).
    const curve = new THREE.CatmullRomCurve3(
      this.points,
      false,
      "centripetal",
      this.curveTension,
    );
    const segments = Math.max(
      24,
      Math.min(this.maxCurveSegments, this.points.length * 4),
    );
    const pathPoints = curve.getSpacedPoints(segments); // segments + 1 points
    const pathCount = Math.min(pathPoints.length, this.maxPathPoints);
    if (pathCount < 2) {
      this.geometry.setDrawRange(0, 0);
      this.mesh.visible = false;
      return;
    }

    const positions = this.positionAttribute.array as Float32Array;
    let writeOffset = 0;

    for (let i = 0; i < pathCount; i += 1) {
      const t = i / Math.max(pathCount - 1, 1); // 0..1 along the path
      // Taper head → tail via pow(t, 1.5) (reference).
      const radius =
        this.radiusHead +
        (this.radiusTail - this.radiusHead) * Math.pow(t, 1.5);

      // Reference samples the curve by parameter t for the tangent (matches the
      // taper's t), independent of the spaced-point index.
      curve.getTangent(t, this._tangent).normalize();
      this._normal.crossVectors(this._up, this._tangent).normalize();
      if (this._normal.lengthSq() === 0) {
        this._normal.set(1, 0, 0); // fallback when tangent ∥ up
      }
      this._binormal.crossVectors(this._tangent, this._normal).normalize();

      const center = pathPoints[i];

      for (let j = 0; j <= this.radialSegments; j += 1) {
        const angle = (j / this.radialSegments) * Math.PI * 2;
        const cx = -Math.cos(angle) * radius;
        const cy = Math.sin(angle) * radius;

        this._radialOffset
          .copy(this._normal)
          .multiplyScalar(cx)
          .addScaledVector(this._binormal, cy);
        this._vertex.copy(center).add(this._radialOffset);

        positions[writeOffset] = this._vertex.x;
        positions[writeOffset + 1] = this._vertex.y;
        positions[writeOffset + 2] = this._vertex.z;
        writeOffset += 3;
      }
    }

    // Active index span: 6 indices per quad × radialSegments × (rings - 1).
    this.drawIndexCount = (pathCount - 1) * this.radialSegments * 6;

    this.positionAttribute.needsUpdate = true;
    // Recompute normals only over the active span; computeVertexNormals walks
    // the whole index, so we must trim the index range first (done above) — but
    // computeVertexNormals ignores drawRange. Instead we recompute manually over
    // the active vertices to keep normals correct without touching stale rings.
    this.recomputeNormals(pathCount);
    this.geometry.setDrawRange(0, this.drawIndexCount);
    this.mesh.visible = true;
  }

  /**
   * Recompute smooth vertex normals over only the active ring span, writing into
   * the pre-allocated normal attribute. (THREE's computeVertexNormals walks the
   * entire index and would read stale rings beyond the active path, so we do it
   * ourselves across [0, activeVertexCount).)
   */
  private recomputeNormals(pathCount: number): void {
    const positions = this.positionAttribute.array as Float32Array;
    const normals = this.normalAttribute.array as Float32Array;
    const activeVertices = pathCount * this.ringPoints;

    // Zero the active normals.
    for (let v = 0; v < activeVertices * 3; v += 1) normals[v] = 0;

    const pA = new THREE.Vector3();
    const pB = new THREE.Vector3();
    const pC = new THREE.Vector3();
    const cb = new THREE.Vector3();
    const ab = new THREE.Vector3();

    // Accumulate face normals across each quad (two triangles) in the active
    // span — same winding as buildFullIndex.
    for (let i = 0; i < pathCount - 1; i += 1) {
      for (let j = 0; j < this.radialSegments; j += 1) {
        const base = i * this.ringPoints + j;
        const a = base;
        const b = base + this.ringPoints;
        const c = base + 1;
        const d = base + this.ringPoints + 1;

        // Triangle 1: a, b, c
        accumulateFaceNormal(positions, normals, a, b, c, pA, pB, pC, cb, ab);
        // Triangle 2: b, d, c
        accumulateFaceNormal(positions, normals, b, d, c, pA, pB, pC, cb, ab);
      }
    }

    // Normalize the active normals.
    for (let v = 0; v < activeVertices; v += 1) {
      const o = v * 3;
      const nx = normals[o];
      const ny = normals[o + 1];
      const nz = normals[o + 2];
      const len = Math.hypot(nx, ny, nz) || 1;
      normals[o] = nx / len;
      normals[o + 1] = ny / len;
      normals[o + 2] = nz / len;
    }

    this.normalAttribute.needsUpdate = true;
  }

  /**
   * Build the full triangle index for the maximum ring grid (reference winding).
   * Topology never changes frame to frame, so this runs once at construction.
   */
  private buildFullIndex(): THREE.BufferAttribute {
    const indices: number[] = [];
    for (let i = 0; i < this.maxPathPoints - 1; i += 1) {
      for (let j = 0; j < this.radialSegments; j += 1) {
        const base = i * this.ringPoints + j;
        indices.push(base, base + this.ringPoints, base + 1);
        indices.push(base + this.ringPoints, base + this.ringPoints + 1, base + 1);
      }
    }
    const TypedIndex =
      this.maxVertices > 65535 ? Uint32Array : Uint16Array;
    return new THREE.BufferAttribute(new TypedIndex(indices), 1);
  }

  /** Clear all points and hide the tube (reference Trail.reset). */
  public reset(): void {
    this.points = [];
    this.drawIndexCount = 0;
    this.geometry.setDrawRange(0, 0);
    this.mesh.visible = false;
  }

  /**
   * Apply the warm-luxury skin (TrailController owns the live values). Guards the
   * emissive writes with an instanceof check so it works whether the material is
   * MeshStandardMaterial (desktop) or MeshBasicMaterial (Wave-6 coarse-pointer
   * swap — Basic has no emissive/intensity, the glow is carried by `color`).
   */
  public applySkin(skin: TrailSkin): void {
    this.material.color.set(skin.color);
    this.material.opacity = skin.opacity;
    if (this.material instanceof THREE.MeshStandardMaterial) {
      this.material.emissive.set(skin.glowColor);
      this.material.emissiveIntensity = skin.glowIntensity;
    }
    this.material.needsUpdate = true;
  }

  /** Live opacity setter (TrailController eases this per frame via updateOpacity). */
  public setOpacity(opacity: number): void {
    this.material.opacity = opacity;
  }

  /** Free GPU resources (called by TrailController.dispose → Experience). */
  public dispose(): void {
    this.points = [];
    this.geometry.dispose();
    this.material.dispose();
    this.group.remove(this.mesh);
    this.group.clear();
  }
}

/**
 * Accumulate a single triangle's face normal into the three vertex normal slots
 * (cross of two edges, un-normalized so area-weighted), reusing scratch vectors.
 */
function accumulateFaceNormal(
  positions: Float32Array,
  normals: Float32Array,
  ia: number,
  ib: number,
  ic: number,
  pA: THREE.Vector3,
  pB: THREE.Vector3,
  pC: THREE.Vector3,
  cb: THREE.Vector3,
  ab: THREE.Vector3,
): void {
  pA.fromArray(positions, ia * 3);
  pB.fromArray(positions, ib * 3);
  pC.fromArray(positions, ic * 3);
  cb.subVectors(pC, pB);
  ab.subVectors(pA, pB);
  cb.cross(ab); // face normal (area-weighted)

  normals[ia * 3] += cb.x;
  normals[ia * 3 + 1] += cb.y;
  normals[ia * 3 + 2] += cb.z;
  normals[ib * 3] += cb.x;
  normals[ib * 3 + 1] += cb.y;
  normals[ib * 3 + 2] += cb.z;
  normals[ic * 3] += cb.x;
  normals[ic * 3 + 1] += cb.y;
  normals[ic * 3 + 2] += cb.z;
}
