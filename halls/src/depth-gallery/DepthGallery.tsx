import { useEffect, useRef } from "react";
import Engine from "./Engine";
import Gallery from "./Gallery";
import Scroll from "./Scroll";
import Background from "./Background";
import { getProjectsByHall } from "../projectsData";
import type { ProjectWithColors } from "../types";

interface Props {
  hallId: "oasis" | "lumina";
  onActiveChange?: (project: ProjectWithColors | null) => void;
}

export default function DepthGallery({ hallId, onActiveChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const onActiveChangeRef = useRef(onActiveChange);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
  }, [onActiveChange]);

  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    const projects = getProjectsByHall(hallId);
    const engine = new Engine(canvasRef.current, { hallId });

    // Gallery uses default anisotropy (4) per its constructor — Engine does
    // not currently expose its renderer's max-anisotropy. If higher quality
    // is needed later, add Engine.getMaxAnisotropy() and pass it through.
    const gallery = new Gallery(engine.getScene(), projects);
    engine.setGallery(gallery);

    const scroll = new Scroll(wrapperRef.current, {
      cameraStartZ: gallery.getCameraStartZ(),
      cameraMinZ: gallery.getCameraMinZ(),
      cameraMaxZ: gallery.getCameraMaxZ(),
      planeCount: gallery.getCount(),
      getPlaneZ: (i) => gallery.getPlaneZ(i),
    });
    engine.setScroll(scroll);

    const background = new Background(wrapperRef.current, gallery);
    engine.setBackground(background);

    engine.start();

    // Force an initial resize after the renderer + scene are wired but before
    // the active-plane callback fires. Catches the case where the canvas had
    // a 0×0 bounding rect during Engine construction (layout not yet flushed).
    engine.forceResize();

    // Active-plane notifier: Engine fires this from its RAF loop when the
    // closest plane changes — one source of truth, paused automatically
    // when Engine is offscreen. The ref keeps the callback identity stable
    // so this effect doesn't tear down on parent re-renders.
    engine.setActivePlaneCallback((i) =>
      onActiveChangeRef.current?.(projects[i] ?? null),
    );

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
