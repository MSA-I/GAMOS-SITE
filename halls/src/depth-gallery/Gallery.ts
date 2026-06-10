import * as THREE from "three";
import type { ProjectWithColors } from "../types";
import { planeVert, planeFrag, createPlaneUniforms } from "./shaders";
import { lerp, clamp } from "./utils";

/**
 * Gallery — builds and animates the textured planes for the Codrops-style
 * Depth Gallery. Vanilla TS (no React). Engine.ts owns the scene/camera/
 * renderer; Gallery owns the planes and their per-frame opacity/desaturation.
 *
 * Per-frame contract:
 *   Engine._render() calls gallery.update(camera.position.z) before
 *   renderer.render(...). update() lerps each plane's opacity uniform
 *   toward a target derived from its distance to the camera, so receding
 *   planes fade + desaturate (matching the shader's mix toward gray).
 *
 * Mood-blend contract:
 *   Background.ts (Wave 4) calls gallery.getMoodBlendData(camera.position.z)
 *   each frame to get the (fromColor, toColor, blendFactor, activeIndex)
 *   tuple it uses to crossfade its blob colors. Gallery owns the math
 *   because it owns the plane positions.
 */

export interface MoodBlendData {
  fromColor: string;
  toColor: string;
  blendFactor: number;
  activeIndex: number;
  activeProject: ProjectWithColors | null;
}

const PLANE_GAP = 5;
const FIRST_VIEW_OFFSET = 5;
const LAST_VIEW_OFFSET = 5;
const PLANE_FADE_SMOOTHING = 0.14;
const PLANE_BASE_WIDTH = 4; // world units; 16:10 aspect
const PLANE_BASE_HEIGHT = 2.5;
const DESKTOP_PLANE_SCALE = 1.0;
const MOBILE_PLANE_SCALE = 0.65;
const MOBILE_BREAKPOINT = 768;
const MOBILE_X_SPREAD_FACTOR = 0.25;

// How many gap-units of separation before a plane is fully faded.
// 1.5 gaps ≈ planes one step away start to dim, planes two steps away
// are nearly invisible. Tuned to feel like the Codrops original.
const FADE_RANGE_GAPS = 1.5;

// Default texture anisotropy when the renderer's max-anisotropy is not
// available to us (Gallery doesn't hold a renderer reference). 4 is a
// safe baseline that every modern GPU supports.
const DEFAULT_ANISOTROPY = 4;

// Alternating ±x offset (world units) so planes don't sit perfectly on
// the camera's center line; gives the corridor a subtle zig-zag rhythm.
const X_OFFSET_MAGNITUDE = 0.6;

export default class Gallery {
  private scene: THREE.Scene;
  private projects: ProjectWithColors[];
  private planes: THREE.Mesh[] = [];
  private materials: THREE.ShaderMaterial[] = [];
  private textures: THREE.Texture[] = [];
  private targetOpacities: number[] = [];
  private currentOpacities: number[] = [];
  // Parallel to `planes` — flipped to true by the TextureLoader onError
  // callback when an image 404s (or otherwise fails to decode). update()
  // forces target opacity = 0 for failed planes so the user sees nothing
  // instead of a black/empty rectangle as the camera scrolls past.
  private failed: boolean[] = [];
  private isMobile: boolean;
  private reducedMotion: boolean;
  private frameCount = 0;

  constructor(scene: THREE.Scene, projects: ProjectWithColors[]) {
    this.scene = scene;
    this.projects = projects;
    this.isMobile = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT}px)`,
    ).matches;
    this.reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    this.build();
  }

  private build(): void {
    const loader = new THREE.TextureLoader();
    const planeScale = this.isMobile
      ? MOBILE_PLANE_SCALE
      : DESKTOP_PLANE_SCALE;
    const xMagnitude = this.isMobile
      ? X_OFFSET_MAGNITUDE * MOBILE_X_SPREAD_FACTOR
      : X_OFFSET_MAGNITUDE;

    // Vite serves the `public/` folder at import.meta.env.BASE_URL
    // (configured to "/halls/dist/" in vite.config.ts). Each project.image
    // is "images/projects/oasis-NN.webp" — concatenating with BASE_URL
    // yields an absolute path that resolves the same way on every page
    // (oasis/ vs lumina/), independent of the current URL's depth.
    const base = import.meta.env.BASE_URL;

    for (let i = 0; i < this.projects.length; i++) {
      const project = this.projects[i];
      const url = base + project.image;

      // Capture i for the onError closure — `for (let i …)` already gives
      // each iteration its own binding, but explicit is clearer next to the
      // closure that depends on it.
      const planeIndex = i;
      const texture = loader.load(
        url,
        (loadedTex) => {
          console.info("[Gallery] texture loaded:", url, {
            width: loadedTex.image?.width,
            height: loadedTex.image?.height,
          });
        },
        undefined, // onProgress — not used
        (err) => {
          console.warn("[Gallery] texture load failed:", url, err);
          // Mark this plane as failed so update() can force opacity = 0
          // every frame. Without this guard, update() would still lerp
          // toward the distance-based target and the shader would sample
          // an undecoded texture (black/empty pixels) as the camera
          // approached the plane's Z.
          this.failed[planeIndex] = true;
        },
      );
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = DEFAULT_ANISOTROPY;
      // Smooth filtering when the camera glides past planes at varying
      // distances; default linear minFilter is fine since planes never
      // shrink to <half their texel density on screen.
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.generateMipmaps = false;

      const geometry = new THREE.PlaneGeometry(
        PLANE_BASE_WIDTH * planeScale,
        PLANE_BASE_HEIGHT * planeScale,
      );

      const uniforms = createPlaneUniforms(texture);
      // Start fully transparent — update() will lerp opacities up on the
      // first frame based on actual camera distance.
      uniforms.uOpacity.value = 0;
      uniforms.uDesaturate.value = 1;

      const material = new THREE.ShaderMaterial({
        vertexShader: planeVert,
        fragmentShader: planeFrag,
        // PlaneUniforms is intentionally a closed shape (per shaders.ts);
        // ShaderMaterial wants the open `{ [k: string]: IUniform }` type.
        // The shape is structurally compatible — cast just satisfies TS.
        uniforms: uniforms as unknown as Record<string, THREE.IUniform>,
        transparent: true,
        // Disable depth-write so transparent fades blend correctly when
        // a faded plane sits in front of a more opaque one (the typical
        // case as the camera moves through the corridor).
        depthWrite: false,
      });

      const mesh = new THREE.Mesh(geometry, material);

      // Alternate ±x so even-indexed planes nudge one direction, odd
      // the other. i=0 sits centered for a clean opening shot.
      const xOffset = i === 0 ? 0 : (i % 2 === 0 ? 1 : -1) * xMagnitude;
      mesh.position.set(xOffset, 0, this.getPlaneZ(i));

      this.scene.add(mesh);

      this.planes.push(mesh);
      this.materials.push(material);
      this.textures.push(texture);
      this.targetOpacities.push(0);
      this.currentOpacities.push(0);
      this.failed.push(false);
    }

    console.info("[Gallery] built", {
      count: this.planes.length,
      isMobile: this.isMobile,
      reducedMotion: this.reducedMotion,
      firstUrl: import.meta.env.BASE_URL + (this.projects[0]?.image ?? "(none)"),
    });
  }

  /**
   * Per-frame update. cameraZ comes from Engine.camera.position.z. Planes
   * sit at z = -i * PLANE_GAP (negative). The camera typically starts at
   * +6 and scrolls toward -((N-1) * PLANE_GAP + LAST_VIEW_OFFSET).
   */
  public update(cameraZ: number): void {
    if (this.frameCount++ === 0) {
      console.info("[Gallery] frame 0", {
        cameraZ,
        targetOpacities: this.targetOpacities.slice(),
        failed: this.failed.slice(),
        texturesLoaded: this.textures.map((t) => !!t.image),
      });
    }
    const fadeRange = PLANE_GAP * FADE_RANGE_GAPS;

    for (let i = 0; i < this.planes.length; i++) {
      const planeZ = this.getPlaneZ(i);
      const distance = Math.abs(cameraZ - planeZ);
      // Failed-load planes stay invisible — see `failed` field doc.
      const target = this.failed[i]
        ? 0
        : clamp(1 - distance / fadeRange, 0, 1);
      this.targetOpacities[i] = target;

      let next: number;
      if (this.reducedMotion) {
        next = target;
      } else {
        next = lerp(this.currentOpacities[i], target, PLANE_FADE_SMOOTHING);
      }
      this.currentOpacities[i] = next;

      const uniforms = this.materials[i].uniforms as {
        uOpacity: { value: number };
        uDesaturate: { value: number };
      };
      uniforms.uOpacity.value = next;
      uniforms.uDesaturate.value = 1 - next;
    }
  }

  /**
   * Compute the active/next plane indices and a 0..1 blendFactor between
   * them based on the current cameraZ. Used by Background.ts to crossfade
   * its mood color smoothly as the camera glides past each plane.
   */
  public getMoodBlendData(cameraZ: number): MoodBlendData {
    const count = this.projects.length;
    if (count === 0) {
      return {
        fromColor: "#1a1410",
        toColor: "#1a1410",
        blendFactor: 0,
        activeIndex: 0,
        activeProject: null,
      };
    }

    // Find the plane whose Z is closest to the camera.
    let activeIndex = 0;
    let smallestDistance = Infinity;
    for (let i = 0; i < count; i++) {
      const distance = Math.abs(cameraZ - this.getPlaneZ(i));
      if (distance < smallestDistance) {
        smallestDistance = distance;
        activeIndex = i;
      }
    }

    // Decide which direction to blend toward. Since plane Zs decrease as
    // i grows (z = -i * GAP), the camera moving toward more-negative Z
    // means it's heading toward HIGHER indices.
    const activeZ = this.getPlaneZ(activeIndex);
    const cameraIsBeyondActive = cameraZ < activeZ; // more negative => past it
    const direction = cameraIsBeyondActive ? 1 : -1;
    let nextIndex = activeIndex + direction;
    nextIndex = clamp(nextIndex, 0, count - 1);

    let blendFactor = 0;
    if (nextIndex !== activeIndex) {
      const nextZ = this.getPlaneZ(nextIndex);
      const span = Math.abs(nextZ - activeZ); // == PLANE_GAP for in-bounds neighbors
      if (span > 0) {
        blendFactor = clamp(Math.abs(cameraZ - activeZ) / span, 0, 1);
      }
    }

    const activeProject = this.projects[activeIndex];
    const nextProject = this.projects[nextIndex] ?? activeProject;

    return {
      fromColor: activeProject.colors.background,
      toColor: nextProject.colors.background,
      blendFactor,
      activeIndex,
      activeProject,
    };
  }

  public getCount(): number {
    return this.projects.length;
  }

  public getPlaneZ(i: number): number {
    return -i * PLANE_GAP;
  }

  public getCameraStartZ(): number {
    return FIRST_VIEW_OFFSET + 1; // = 6
  }

  public getCameraMinZ(): number {
    return -(this.projects.length - 1) * PLANE_GAP - LAST_VIEW_OFFSET;
  }

  public getCameraMaxZ(): number {
    return FIRST_VIEW_OFFSET + 1;
  }

  public dispose(): void {
    for (const tex of this.textures) tex.dispose();
    for (const mat of this.materials) mat.dispose();
    for (const mesh of this.planes) {
      mesh.geometry.dispose();
      this.scene.remove(mesh);
    }
    this.planes = [];
    this.materials = [];
    this.textures = [];
    this.targetOpacities = [];
    this.currentOpacities = [];
    this.failed = [];
  }
}
