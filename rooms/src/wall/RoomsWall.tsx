import { useEffect, useRef } from "react";
import type * as THREE from "three";
import Engine from "./Engine";
import Drag from "./Drag";
import Hover from "./Hover";
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

    const engine = new Engine(canvasRef.current, { cards });

    // Drag owns the pan offset (infinite). A tap → raycast the pooled meshes from
    // the tap point → freeze the engine + open the detail page.
    const drag = new Drag(wrapperRef.current, engine.getInitialMetrics(), {
      onTap: (e) => {
        const hit = engine.pickAt(e.clientX, e.clientY);
        if (hit) {
          engine.freeze(true);
          onSelectRef.current?.(hit.card, hit.mesh);
        }
      },
    });
    engine.setDrag(drag);

    const hover = new Hover(
      wrapperRef.current,
      engine.wall,
      drag,
      engine.camera,
      engine.quality,
    );
    engine.setHover(hover);

    engine.setActiveCallback((card) => onActiveChangeRef.current?.(card));

    engine.init();
    engine.start();
    engine.forceResize();

    // Expose the imperative API for the FLIP detail page.
    onReadyRef.current?.({
      cardScreenRect: (mesh) => engine.cardScreenRect(mesh),
      unfreeze: () => engine.freeze(false),
    });

    return () => {
      engine.dispose();
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
