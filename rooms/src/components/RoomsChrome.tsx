import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { RoomCard } from "../roomsData";

interface Props {
  /** Centre-most card (Engine flips it as the wall pans) — for the bottom title. */
  activeCard: RoomCard | null;
}

export default function RoomsChrome({ activeCard }: Props) {
  const reducedMotion = useReducedMotion();

  // First-load drag hint — GUARANTEED visible: it shows on load with the pulse and
  // dismisses ONLY after a real explore gesture (a pointer DRAG past a threshold,
  // a wheel/scroll, or a key pan) or an auto-hide timeout — never on a bare tap.
  // A minimum-visible window protects it from a stray early click. (Prior logic
  // killed it on the first pointerdown in <100ms, so it was imperceptible.)
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    const MIN_VISIBLE_MS = 3000; // a stray tap before this can't dismiss it
    const AUTO_HIDE_MS = 6000; // fades on its own if the user just reads it
    const DRAG_THRESHOLD_PX = 24; // a press must MOVE this far to count as a drag
    const mountedAt = performance.now();
    let dismissed = false;
    let pressX = 0;
    let pressY = 0;
    let pressing = false;

    const canDismiss = () => performance.now() - mountedAt >= MIN_VISIBLE_MS;
    const dismiss = () => {
      if (dismissed || !canDismiss()) return;
      dismissed = true;
      setHintVisible(false);
    };

    const onPointerDown = (e: PointerEvent) => {
      pressing = true;
      pressX = e.clientX;
      pressY = e.clientY;
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!pressing) return;
      if (Math.hypot(e.clientX - pressX, e.clientY - pressY) >= DRAG_THRESHOLD_PX) {
        pressing = false;
        dismiss(); // a real drag/pan gesture
      }
    };
    const onPointerUp = () => {
      pressing = false; // a tap (no drag) — leave the hint up
    };
    const opts = { passive: true } as const;
    window.addEventListener("pointerdown", onPointerDown, opts);
    window.addEventListener("pointermove", onPointerMove, opts);
    window.addEventListener("pointerup", onPointerUp, opts);
    window.addEventListener("wheel", dismiss, opts);
    window.addEventListener("keydown", dismiss, opts);
    const timer = window.setTimeout(() => setHintVisible(false), AUTO_HIDE_MS);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("keydown", dismiss);
      window.clearTimeout(timer);
    };
  }, []);

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <>
      {/* Skip link — first focusable */}
      <a
        href="#rooms-canvas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-40 focus:pointer-events-auto focus:px-4 focus:py-2 focus:rounded-lg focus:bg-ivory focus:text-ink-deep focus:font-medium focus-visible:ring-[3px] focus-visible:ring-brass focus-visible:outline-none"
      >
        דלג לגלריה
      </a>

      {/* Back link — minimal-editorial, returns to #rooms on the main site. */}
      <motion.a
        href="/#rooms"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="rooms-back"
        aria-label="חזרה לחדרי האירוח באתר Gamos"
      >
        <span className="rooms-back__arrow" aria-hidden="true">←</span>
        <span className="rooms-back__label">חזרה לאתר</span>
      </motion.a>

      {/* Section eyebrow — top inline-end. Quiet brass eyebrow + muted sub-line. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="rooms-heading"
      >
        <p className="rooms-heading__eyebrow">חדרי אירוח</p>
        <p className="rooms-heading__sub">הסוויטות והחדרים של גאמוס</p>
      </motion.div>

      {/* Active-card editorial title — bottom, aria-live announces the centre-most
          room as the wall pans (§9). Tight stack: texture-text title →
          optional type, centered. */}
      <section aria-live="polite" aria-atomic="true" className="rooms-active">
        <h1 className="rooms-title texture-text texture-text--light">
          {activeCard?.category ?? ""}
        </h1>
        {activeCard?.titleHe ? (
          <p className="rooms-title__type m-0">{activeCard.titleHe}</p>
        ) : null}
      </section>

      {/* First-load hint — vertical centre, clear of the bottom title; an animated
          invitation (drifting ‹ › arrows around the label) that reads as "drag to
          explore"; auto-dismisses on first input. Reduced-motion → static (CSS). */}
      {hintVisible ? (
        <div
          className={
            "rooms-hint" + (reducedMotion ? " rooms-hint--static" : "")
          }
          aria-hidden="true"
        >
          <span className="rooms-hint__arrow rooms-hint__arrow--start">‹</span>
          <span className="rooms-hint__pill">גררו לצדדים כדי לגלות את החדרים</span>
          <span className="rooms-hint__arrow rooms-hint__arrow--end">›</span>
        </div>
      ) : null}
    </>
  );
}
