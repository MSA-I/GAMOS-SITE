import { useEffect, useRef } from "react";
import Engine, { type CardProjection } from "./Engine";
import Drag from "./Drag";
import Hover from "./Hover";
import { getRooms } from "../roomsData";
import type { RoomCard } from "../roomsData";

interface Props {
  /** Fired when the centre-most card changes (active label highlight + title). */
  onActiveChange?: (card: RoomCard | null) => void;
  /**
   * Fired each frame with every card's projected screen position. RoomsChrome
   * passes an imperative updater here that writes transforms straight to the
   * pre-created label DOM nodes — never through React state (no jitter).
   */
  onProject?: (projections: CardProjection[]) => void;
}

export default function RoomsWall({ onActiveChange, onProject }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep latest callbacks in refs so the engine effect (mounted once) doesn't
  // tear down WebGL when a parent passes a fresh inline callback identity.
  const onActiveChangeRef = useRef(onActiveChange);
  const onProjectRef = useRef(onProject);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
    onProjectRef.current = onProject;
  }, [onActiveChange, onProject]);

  // Focus the wrapper on mount so keyboard pan works immediately.
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    const cards = getRooms();

    const engine = new Engine(canvasRef.current, { cards });

    // Drag is the input layer (owns the pan offset). It needs the wall's pan
    // bounds + the input→world scale, so build it after the Engine.
    const bounds = engine.getInitialBounds();
    const drag = new Drag(wrapperRef.current, bounds);
    engine.setDrag(drag);

    const hover = new Hover(
      wrapperRef.current,
      engine.wall,
      drag,
      engine.camera,
      engine.quality,
    );
    engine.setHover(hover);

    engine.setActiveCallback((i) =>
      onActiveChangeRef.current?.(cards[i] ?? null),
    );
    engine.setProjectionCallback((p) => onProjectRef.current?.(p));

    engine.init();
    engine.start();
    engine.forceResize();

    return () => {
      engine.dispose();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      id="rooms-canvas"
      role="region"
      aria-label="גלריית חדרי האירוח — גררו לחקור"
      tabIndex={0}
      className="fixed inset-0 z-10 outline-none"
      style={{ touchAction: "none" }}
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full"
        aria-hidden="true"
      />
    </div>
  );
}
