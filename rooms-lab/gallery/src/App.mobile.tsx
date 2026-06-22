import { useCallback, useRef, useState } from "react";
import type * as THREE from "three";
import RoomsWall from "./wall/RoomsWall";
import RoomsChromeMobile from "./components/RoomsChromeMobile";
import RoomDetail from "./components/RoomDetail";
import IntroGate from "./intro/IntroGate";
import { getRooms } from "./roomsData";
import type { RoomCard } from "./roomsData";
import type { WallApi } from "./App";

/**
 * App.mobile — byte-for-byte the same wiring as App.tsx (same IntroGate seam, the
 * same RoomsWall props/callbacks, the same RoomDetail FLIP, the same WallApi/
 * activeCard/selected state machine), with ONE difference: it renders the
 * phone-first <RoomsChromeMobile> instead of <RoomsChrome>. The WebGL wall is
 * untouched. WallApi is imported (not redeclared) from "./App" so RoomsWall keeps
 * resolving the same type.
 */
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

  return (
    <IntroGate>
      <RoomsWall
        onActiveChange={setActiveCard}
        onSelect={handleSelect}
        onReady={handleReady}
      />
      <RoomsChromeMobile activeCard={activeCard} />
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
