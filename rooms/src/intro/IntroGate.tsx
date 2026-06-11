import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * IntroGate — the entry reveal for the rooms sub-app (sub-app side of the
 * door-opening transition).
 *
 * The main-site door (#rooms) plays a CSS door-swing that lands on an ink-deep
 * void (js/rooms-door.js + css/sections/rooms.css), then navigates here. This
 * gate hands that off seamlessly: the wall is ALWAYS mounted (so WebGL warms up
 * immediately), with a full-screen ink-deep cover over it that FADES OUT on
 * mount — so the page opens on the same dark tone the door portal ended on, then
 * dissolves to reveal the curved wall. No flash, no video.
 *
 * Honours `prefers-reduced-motion: reduce`: the cover starts already hidden
 * (instant reveal, no fade).
 *
 * NOTE (2026-06-11): the door-opening VIDEO now plays on the MAIN-SITE side
 * (js/rooms-door.js plays assets/images/rooms/door-1080.mp4, ending fully open to
 * black, then navigates here). So this gate only needs the dark cover-fade to
 * hand off from that black ending — no video here. If a crossfade to the open-door
 * frame is ever wanted on this side, render a <video>/<img> over {children} and
 * gate `revealed` on it; the wall stays mounted behind either way.
 * See rooms/src/intro/README.md.
 */
export default function IntroGate({ children }: { children: ReactNode }) {
  const reduce =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The cover starts opaque (matching the door portal's ending void), then
  // fades out one frame after mount. Under reduced motion it starts hidden.
  const [revealed, setRevealed] = useState(reduce);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (reduce) return;
    // Two RAFs so the opaque cover paints once before the opacity transition.
    raf.current = window.requestAnimationFrame(() => {
      raf.current = window.requestAnimationFrame(() => setRevealed(true));
    });
    return () => {
      if (raf.current) window.cancelAnimationFrame(raf.current);
    };
  }, [reduce]);

  return (
    <>
      {children}
      <div
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "var(--color-ink-deep, #1A1410)",
          opacity: revealed ? 0 : 1,
          transition: reduce ? "none" : "opacity 0.7s ease",
          pointerEvents: "none",
        }}
      />
    </>
  );
}
