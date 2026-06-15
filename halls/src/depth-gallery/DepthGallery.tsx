import { useEffect, useRef } from "react";
import Engine from "./Engine";
import Scroll from "./Scroll";
import { getProjectsByHall } from "../projectsData";
import type { ProjectWithColors } from "../types";

interface Props {
  hallId: "events" | "resort";
  /** Fired with the blend-aware active project (or null) when it changes. */
  onActiveChange?: (project: ProjectWithColors | null) => void;
  /**
   * Fired when the frame-dark flag flips (nearest plane index < 2). HallChrome
   * (Wave 4) uses it to swap the label's texture-text variant for readability
   * over bright images. Optional so App can opt in without breaking.
   */
  onFrameDarkChange?: (isDark: boolean) => void;
}

export default function DepthGallery({
  hallId,
  onActiveChange,
  onFrameDarkChange,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep the latest callbacks in refs so the engine effect (keyed on hallId)
  // doesn't tear down + rebuild WebGL when a parent passes a fresh inline
  // callback identity on re-render.
  const onActiveChangeRef = useRef(onActiveChange);
  const onFrameDarkChangeRef = useRef(onFrameDarkChange);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
    onFrameDarkChangeRef.current = onFrameDarkChange;
  }, [onActiveChange, onFrameDarkChange]);

  // Focus the gallery wrapper on mount so keyboard scroll works immediately.
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    const projects = getProjectsByHall(hallId);

    // Engine constructs the per-instance Experience (gallery + background +
    // trailController) internally from `projects`. Survives StrictMode
    // mount → cleanup → mount because every Engine is a fresh instance and
    // dispose() fully releases the previous one's GPU resources.
    const engine = new Engine(canvasRef.current, { hallId, projects });

    // Scroll is the input layer (owns the camera Z). It needs the gallery's
    // depth bounds, so build it after the Engine and inject it.
    const gallery = engine.getGallery();
    const scroll = new Scroll(wrapperRef.current, {
      cameraStartZ: gallery.getCameraStartZ(),
      cameraMinZ: gallery.getCameraMinZ(),
      cameraMaxZ: gallery.getCameraMaxZ(),
      planeCount: gallery.getCount(),
      getPlaneZ: (i) => gallery.getPlaneZ(i),
    });
    engine.setScroll(scroll);

    // Active-plane + frame-dark notifiers (fired from Experience via Engine's
    // RAF loop; paused automatically when offscreen). Refs keep identities
    // stable so this effect doesn't re-run on parent re-renders.
    engine.setActivePlaneCallback((i) =>
      onActiveChangeRef.current?.(projects[i] ?? null),
    );
    engine.setFrameDarkCallback((isDark) =>
      onFrameDarkChangeRef.current?.(isDark),
    );

    // Seed the Experience (trail + first label/frame-dark feed), then start.
    engine.init();
    engine.start();

    // Force an initial resize after wiring but before the first callback fires.
    // Catches the case where the canvas had a 0×0 rect during construction.
    engine.forceResize();

    return () => {
      engine.dispose();
    };
  }, [hallId]);

  return (
    <div
      ref={wrapperRef}
      id="hall-canvas"
      role="region"
      aria-label="גלריית האולם"
      tabIndex={0}
      className="fixed inset-0 z-10"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}
