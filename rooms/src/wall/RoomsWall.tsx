import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { PhantomWall } from "./PhantomWall";
import { getRooms } from "../roomsData";
import type { RoomCard } from "../roomsData";
import type { WallApi } from "../App";
import { t } from "../i18n";

interface Props {
  /** Fired when the centre-most card changes (bottom aria-live title). */
  onActiveChange?: (card: RoomCard | null) => void;
  /** Fired on a card tap — opens the FLIP detail page. */
  onSelect?: (card: RoomCard, mesh: THREE.Mesh) => void;
  /** Hands the imperative wall API (cardScreenRect + unfreeze) up to App. */
  onReady?: (api: WallApi) => void;
}

export default function RoomsWall({ onActiveChange, onSelect, onReady }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Keep latest callbacks in refs so the engine effect (mounted once) doesn't
  // tear down WebGL when a parent passes a fresh inline callback identity.
  const onActiveChangeRef = useRef(onActiveChange);
  const onSelectRef = useRef(onSelect);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange;
    onSelectRef.current = onSelect;
    onReadyRef.current = onReady;
  }, [onActiveChange, onSelect, onReady]);

  // Focus the wrapper on mount so keyboard pan works immediately.
  useEffect(() => {
    wrapperRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !wrapperRef.current) return;
    const cards = getRooms();
    const reducedMotion =
      typeof matchMedia !== "undefined" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches;

    const wall = new PhantomWall(
      canvasRef.current,
      cards,
      {
        onActiveChange: (card) => onActiveChangeRef.current?.(card),
        // A tap → freeze the wall + open the detail page (FLIP measures the mesh).
        // The wall tiles the catalogue, so resolve the card via the wall (the tap
        // index is into the tiled placement, not the raw 25-card catalogue).
        onCellClick: (index) => {
          const mesh = wall.meshForIndex(index);
          const card = wall.cardForIndex(index);
          if (!mesh || !card) return;
          wall.freeze(true);
          onSelectRef.current?.(card, mesh);
        },
      },
      reducedMotion,
    );

    // Open on the centre of the catalogue (row 2), like the old engine.
    wall.setInitialOffset(0, 0);
    wall.forceResize();

    // Expose the imperative API for the FLIP detail page.
    onReadyRef.current?.({
      cardScreenRect: (mesh) => wall.cardScreenRect(mesh),
      unfreeze: () => wall.freeze(false),
    });

    return () => {
      wall.destroy();
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      id="rooms-canvas"
      role="region"
      aria-label={t("גלריית חדרי האירוח — גררו לחקור, לחצו על חדר לפרטים")}
      tabIndex={0}
      className="fixed inset-0 z-10 outline-none"
      style={{ touchAction: "none" }}
    >
      <canvas ref={canvasRef} className="block w-full h-full" aria-hidden="true" />
    </div>
  );
}
