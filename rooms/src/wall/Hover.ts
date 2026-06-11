import * as THREE from "three";
import type Wall from "./Wall";
import type Drag from "./Drag";
import type { QualityProfile } from "./quality";

/**
 * Hover — raycasts the pointer against the wall cards (when idle) and feeds the
 * hovered index to Wall (lift + scale + neighbour dim). Disabled on coarse
 * pointers (touch taps, doesn't hover) via the quality gate.
 *
 * Raycast is skipped while a drag is in progress (Drag.isDragging()) so a card
 * never lifts mid-fling. The pointer NDC is tracked on pointermove; the actual
 * cast happens once per frame in update() (cheap, ~20 meshes).
 *
 * Lifecycle: dispose() removes the pointer listener.
 */
export default class Hover {
  private wall: Wall;
  private drag: Drag;
  private camera: THREE.PerspectiveCamera;
  private enabled: boolean;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2); // off-screen until first move
  private hasPointer = false;
  private onPointerMove: (e: PointerEvent) => void;
  private onPointerLeave: () => void;
  private target: HTMLElement;

  constructor(
    target: HTMLElement,
    wall: Wall,
    drag: Drag,
    camera: THREE.PerspectiveCamera,
    quality: QualityProfile,
  ) {
    this.target = target;
    this.wall = wall;
    this.drag = drag;
    this.camera = camera;
    this.enabled = !quality.coarsePointer && !quality.reducedMotion;

    this.onPointerMove = (e: PointerEvent): void => {
      this.pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      this.hasPointer = true;
    };
    this.onPointerLeave = (): void => {
      this.hasPointer = false;
      this.wall.setHovered(-1);
    };

    if (this.enabled) {
      this.target.addEventListener("pointermove", this.onPointerMove, {
        passive: true,
      });
      this.target.addEventListener("pointerleave", this.onPointerLeave, {
        passive: true,
      });
    }
  }

  /** Per-frame: cast when idle + pointer present; feed the hovered index. */
  public update(): void {
    if (!this.enabled) return;
    if (this.drag.isDragging() || !this.hasPointer) {
      // While dragging, hold whatever the wall last had (don't re-cast).
      if (this.drag.isDragging()) this.wall.setHovered(-1);
      return;
    }
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.wall.getMeshes(), false);
    if (hits.length > 0) {
      const data = hits[0].object.userData as { index?: number };
      this.wall.setHovered(typeof data.index === "number" ? data.index : -1);
    } else {
      this.wall.setHovered(-1);
    }
  }

  public dispose(): void {
    this.target.removeEventListener(
      "pointermove",
      this.onPointerMove as EventListener,
    );
    this.target.removeEventListener("pointerleave", this.onPointerLeave);
  }
}
