import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getRooms } from "../roomsData";
import type { RoomCard } from "../roomsData";

interface Props {
  /** Centre-most card (Engine flips it as the wall pans) — for the bottom title. */
  activeCard: RoomCard | null;
}

export default function RoomsChrome({ activeCard }: Props) {
  const reducedMotion = useReducedMotion();
  const cards = useMemo(() => getRooms(), []);
  const totalLabel = String(cards.length).padStart(2, "0");

  // First-load drag hint — auto-dismisses on the first pointer/wheel/key input.
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    const dismiss = () => setHintVisible(false);
    const opts = { once: true, passive: true } as const;
    window.addEventListener("pointerdown", dismiss, opts);
    window.addEventListener("wheel", dismiss, opts);
    window.addEventListener("keydown", dismiss, opts);
    return () => {
      window.removeEventListener("pointerdown", dismiss);
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("keydown", dismiss);
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
          room as the wall pans (§9). Tight stack: index → texture-text title →
          optional type, centered. */}
      <section aria-live="polite" aria-atomic="true" className="rooms-active">
        <p className="rooms-title__index">
          <bdi>{`${activeCard?.number ?? "01"} / ${totalLabel}`}</bdi>
        </p>
        <h1 className="rooms-title texture-text texture-text--light">
          {activeCard?.titleHe ?? ""}
        </h1>
        {activeCard?.type ? (
          <p className="rooms-title__type m-0">{activeCard.type}</p>
        ) : null}
      </section>

      {/* First-load hint — vertical centre, clear of the bottom title; auto-dismisses. */}
      {hintVisible ? (
        <div className="rooms-hint" aria-hidden="true">
          <span className="rooms-hint__pill">גררו לחקור · לחצו על חדר</span>
        </div>
      ) : null}
    </>
  );
}
