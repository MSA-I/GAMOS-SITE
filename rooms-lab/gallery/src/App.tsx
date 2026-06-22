import { useCallback, useRef, useState } from "react";
import type * as THREE from "three";
import RoomsWall from "./wall/RoomsWall";
import RoomsChrome from "./components/RoomsChrome";
import RoomDetail from "./components/RoomDetail";
import IntroGate from "./intro/IntroGate";
import { getRooms } from "./roomsData";
import type { RoomCard } from "./roomsData";
import type { CardScreenRect } from "./wall/Engine";

/** Imperative handle the wall exposes once its Engine is live. */
export interface WallApi {
  cardScreenRect: (mesh: THREE.Mesh) => CardScreenRect;
  unfreeze: () => void;
}

export default function App() {
  // Active (centre-most) card — feeds the bottom aria-live editorial title. Lazy
  // initial so the title isn't blank on the first paint.
  const [activeCard, setActiveCard] = useState<RoomCard | null>(
    () => getRooms()[0] ?? null,
  );

  // The selected card (FLIP detail page open). null = gallery only.
  const [selected, setSelected] = useState<{
    card: RoomCard;
    mesh: THREE.Mesh;
  } | null>(null);

  // The wall's imperative API (cardScreenRect + unfreeze), set once on ready.
  const apiRef = useRef<WallApi | null>(null);
  const handleReady = useCallback((api: WallApi) => {
    apiRef.current = api;
  }, []);

  // A tap on a card → open the detail page (RoomsWall has already frozen the engine).
  const handleSelect = useCallback((card: RoomCard, mesh: THREE.Mesh) => {
    setSelected({ card, mesh });
  }, []);

  const handleClose = useCallback(() => {
    apiRef.current?.unfreeze();
    setSelected(null);
  }, []);

  // IntroGate is the door-transition seam: it renders {children} immediately with
  // an ink-deep cover that fades out on mount, handing off from the door's black.
  return (
    <IntroGate>
      <RoomsWall
        onActiveChange={setActiveCard}
        onSelect={handleSelect}
        onReady={handleReady}
      />
      <RoomsChrome activeCard={activeCard} />
      {selected ? (
        <RoomDetail
          card={selected.card}
          measureFrom={() =>
            apiRef.current!.cardScreenRect(selected.mesh)
          }
          onClose={handleClose}
        />
      ) : null}
    </IntroGate>
  );
}
