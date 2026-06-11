import { useRef, useState, useCallback } from "react";
import RoomsWall from "./wall/RoomsWall";
import RoomsChrome from "./components/RoomsChrome";
import IntroGate from "./intro/IntroGate";
import { getRooms } from "./roomsData";
import type { RoomCard } from "./roomsData";
import type { CardProjection } from "./wall/Engine";

export default function App() {
  // Lazy initial state: pick the first card synchronously during the first
  // render so RoomsChrome's active title is populated on the very first paint
  // (no flash of empty title). The wall feeds the active index from its RAF
  // loop once the user pans toward a card.
  const [activeCard, setActiveCard] = useState<RoomCard | null>(
    () => getRooms()[0] ?? null,
  );

  // The label-overlay projector: RoomsChrome registers an imperative updater
  // here (writes transforms straight to its pre-created label DOM nodes); the
  // Engine (via RoomsWall) calls it each frame. Routed through a ref so neither
  // component re-renders per frame.
  const projectorRef = useRef<((p: CardProjection[]) => void) | null>(null);
  const handleProject = useCallback((p: CardProjection[]) => {
    projectorRef.current?.(p);
  }, []);
  const registerProjector = useCallback(
    (fn: ((p: CardProjection[]) => void) | null) => {
      projectorRef.current = fn;
    },
    [],
  );

  // IntroGate is the FUTURE-VIDEO SEAM: today it renders {children} immediately
  // (no-op pass-through). The wall mounts behind it regardless, so WebGL warms
  // up during any future door-opening playback. See intro/IntroGate.tsx.
  return (
    <IntroGate>
      <RoomsWall onActiveChange={setActiveCard} onProject={handleProject} />
      <RoomsChrome activeCard={activeCard} registerProjector={registerProjector} />
    </IntroGate>
  );
}
