import * as THREE from "three";

/**
 * TrailHeadParticles — pool of small emissive spheres that sparkle around the
 * trail head. Faithful port of the Codrops reference `TrailHeadParticles.js`.
 *
 * A fixed pool of (desktop) 18 meshes sharing ONE `SphereGeometry(1,5,4)` (each
 * carries its own `MeshBasicMaterial` so opacity can fade independently). Spawned
 * ~20/sec within a 0.52 radius of the head, they drift with per-frame drag 0.94,
 * fade over a 0.25–0.6s life, and recycle round-robin through the pool. NORMAL
 * alpha blending (warm skin — see Trail.ts risk #2). `setEnabled(false)` clears +
 * hides the group.
 *
 * WAVE 6 downscale (plan §7 gl-6): the pool size is constructor-injected. The
 * trail's head particles are DISABLED entirely on coarse pointer (TrailController
 * sets `showHeadParticles=false` from the ladder), but where they DO run on a
 * smaller viewport the pool is trimmed (8 vs 18) to lighten fill cost. Defaults
 * to 18 so a bare `new TrailHeadParticles()` is unchanged (full fidelity).
 *
 * Public surface (matches the Wave-1 stub TrailController compiles against):
 *   - `object` getter → the THREE.Group added to the scene
 *   - `particles` → pool array (TrailController tints each mesh)
 *   - `setEnabled(b)` / `update(dt, headPos, opacity, shouldSpawn)` / `dispose()`
 */

export interface TrailParticle {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  velocity: THREE.Vector3;
  lifeRemaining: number;
  totalLife: number;
}

/** Wave-6 head-particle construction options (pool downscale). */
export interface TrailHeadParticlesOptions {
  /** Pool size. Desktop 18 → mobile 8. */
  maxParticles?: number;
}

const DEFAULT_MAX_PARTICLES = 18;

export default class TrailHeadParticles {
  private group: THREE.Group;

  // --- Reference pool/behaviour constants (TrailHeadParticles.js). ---
  private isEnabled = true; // master on/off switch
  private readonly maxParticles: number; // pool size (Wave-6: injected)
  private readonly spawnPerSecond = 20; // spawn rate when active
  private readonly spawnRadius = 0.52; // spawn radius around the head
  private readonly speedMin = 0.05; // min drift speed
  private readonly speedMax = 0.22; // max drift speed
  private readonly lifeMin = 0.25; // min life (seconds)
  private readonly lifeMax = 0.6; // max life (seconds)
  private readonly sizeMin = 0.007; // min particle size
  private readonly sizeMax = 0.02; // max particle size
  private readonly dragPerFrame = 0.94; // velocity damping (per 1/60s)

  private spawnAccumulator = 0; // fractional spawn remainder
  private nextSpawnIndex = 0; // round-robin index into the pool
  private readonly sharedGeometry: THREE.SphereGeometry;

  public readonly particles: TrailParticle[] = [];

  constructor(opts: TrailHeadParticlesOptions = {}) {
    this.maxParticles = Math.max(
      1,
      Math.round(opts.maxParticles ?? DEFAULT_MAX_PARTICLES),
    );

    this.group = new THREE.Group();
    this.group.renderOrder = 1300;

    this.sharedGeometry = new THREE.SphereGeometry(1, 5, 4);

    for (let index = 0; index < this.maxParticles; index += 1) {
      // Warm-luxury skin (Wave 5): brass sparkles around the trail head.
      // NormalBlending (NOT additive) so the head does not bloom to white over
      // the ivory ground (plan risk #2). NOTE: the per-particle color is RE-SET
      // by TrailController.applyVisualSettings() from its `visualSettings
      // .trailColor` (brass #CFAE83 — the live source of truth); this leaf
      // default is kept in sync so the file is truthful. Blending + the
      // opacity/lifecycle math are NOT touched by TrailController and render
      // as set here.
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#CFAE83"), // brass (warm skin)
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.NormalBlending,
      });

      const mesh = new THREE.Mesh(this.sharedGeometry, material);
      mesh.visible = false;
      mesh.renderOrder = 1300;
      mesh.frustumCulled = false;
      this.group.add(mesh);

      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(),
        lifeRemaining: 0,
        totalLife: 0,
      });
    }
  }

  public get object(): THREE.Group {
    return this.group;
  }

  public setEnabled(isEnabled: boolean): void {
    if (this.isEnabled && !isEnabled) {
      this.clear();
    }
    this.isEnabled = Boolean(isEnabled);
    this.group.visible = this.isEnabled;
  }

  public update(
    deltaSeconds: number,
    headPosition: THREE.Vector3,
    opacity = 1,
    shouldSpawn = true,
  ): void {
    // Clamp unstable frame deltas (tab-switch, GC pause) to a sane ceiling.
    const safeDelta = Math.min(Math.max(deltaSeconds || 0, 0), 0.1);

    if (this.isEnabled && shouldSpawn && safeDelta > 0) {
      this.spawnAccumulator += safeDelta * this.spawnPerSecond;
      const spawnCount = Math.floor(this.spawnAccumulator);
      this.spawnAccumulator -= spawnCount;

      for (let index = 0; index < spawnCount; index += 1) {
        this.spawnParticle(headPosition);
      }
    } else {
      this.spawnAccumulator = 0;
    }

    const clampedOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    // Frame-rate independent drag (reference): pow(0.94, deltaScaledTo60fps).
    const drag = Math.pow(this.dragPerFrame, safeDelta * 60);

    for (const particle of this.particles) {
      if (particle.lifeRemaining <= 0) continue;

      particle.lifeRemaining -= safeDelta;
      if (particle.lifeRemaining <= 0) {
        particle.lifeRemaining = 0;
        particle.mesh.visible = false;
        particle.mesh.material.opacity = 0;
        continue;
      }

      particle.velocity.multiplyScalar(drag);
      particle.mesh.position.addScaledVector(particle.velocity, safeDelta);

      const lifeRatio = particle.lifeRemaining / particle.totalLife; // 1→0
      particle.mesh.material.opacity = lifeRatio * clampedOpacity * 0.75;
    }
  }

  private spawnParticle(headPosition: THREE.Vector3): void {
    const particle = this.particles[this.nextSpawnIndex];
    this.nextSpawnIndex = (this.nextSpawnIndex + 1) % this.particles.length;

    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * this.spawnRadius;

    particle.mesh.position.set(
      headPosition.x + Math.cos(angle) * radius,
      headPosition.y + (Math.random() - 0.5) * this.spawnRadius * 0.6,
      headPosition.z + Math.sin(angle) * radius,
    );

    const size = THREE.MathUtils.lerp(this.sizeMin, this.sizeMax, Math.random());
    particle.mesh.scale.setScalar(size);
    particle.mesh.visible = true;

    const speed = THREE.MathUtils.lerp(this.speedMin, this.speedMax, Math.random());
    particle.velocity.set(
      (Math.random() - 0.5) * speed,
      (Math.random() - 0.5) * speed * 0.6,
      (Math.random() - 0.5) * speed,
    );

    particle.totalLife = THREE.MathUtils.lerp(
      this.lifeMin,
      this.lifeMax,
      Math.random(),
    );
    particle.lifeRemaining = particle.totalLife;
    particle.mesh.material.opacity = 0.4;
  }

  public dispose(): void {
    this.clear();
    for (const particle of this.particles) {
      particle.mesh.material.dispose();
    }
    this.sharedGeometry.dispose();
    this.group.clear();
    this.particles.length = 0;
  }

  private clear(): void {
    this.spawnAccumulator = 0;
    for (const particle of this.particles) {
      particle.lifeRemaining = 0;
      particle.totalLife = 0;
      particle.mesh.visible = false;
      particle.mesh.material.opacity = 0;
    }
  }
}
