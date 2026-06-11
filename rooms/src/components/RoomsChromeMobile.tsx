import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getRooms } from "../roomsData";
import type { RoomCard } from "../roomsData";

interface Props {
  /** Centre-most card (Engine flips it as the wall pans) — for the bottom title. */
  activeCard: RoomCard | null;
}

/**
 * RoomsChromeMobile — phone-first re-layout of RoomsChrome. Same content, same
 * data (getRooms / hint auto-dismiss / reducedMotion), same a11y contract (skip
 * link → #rooms-canvas, aria-live title, focus-visible, ≥44px back). The WebGL
 * wall + RoomDetail are NOT touched — only the overlaid chrome is re-positioned
 * for ≤430px so nothing wraps/occludes the gallery.
 *
 * Layout (vs desktop):
 *  - Back (top inline-start): ≥44px tap target, short "חזרה" label so it can't
 *    collide with the eyebrow on a 360px row.
 *  - Eyebrow (top inline-end): compact, quiet, single short line.
 *  - Active title: a clean BOTTOM BAR with a scrim gradient behind it; index →
 *    title → type STACKED vertically, title capped to 2 lines (CSS line-clamp)
 *    at a phone-safe size → it can never wrap upward over the gallery centre.
 *  - Hint: low, just ABOVE the title bar (not screen-centre), so it never sits
 *    on a tappable card; auto-dismisses on first input; no pulse on reduced-motion.
 *
 * Classes are prefixed `.roomsm-` (isolated from the desktop `.rooms-*` set) and
 * styled in index.mobile.css; brand tokens + .texture-text--light are reused.
 */
export default function RoomsChromeMobile({ activeCard }: Props) {
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

  // ease-out entrance; reduced-motion → no movement (opacity-only via duration 0).
  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <>
      {/* Skip link — first focusable (a11y §9, identical target to desktop). */}
      <a
        href="#rooms-canvas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:start-3 focus:z-40 focus:pointer-events-auto focus:px-4 focus:py-2 focus:rounded-lg focus:bg-ivory focus:text-ink-deep focus:font-medium focus-visible:ring-[3px] focus-visible:ring-brass focus-visible:outline-none"
      >
        דלג לגלריה
      </a>

      {/* Back link — top inline-start. ≥44px tap target; short "חזרה" label. */}
      <motion.a
        href="/#rooms"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="roomsm-back"
        aria-label="חזרה לחדרי האירוח באתר Gamos"
      >
        <span className="roomsm-back__arrow" aria-hidden="true">←</span>
        <span className="roomsm-back__label">חזרה</span>
      </motion.a>

      {/* Eyebrow — top inline-end. Compact, quiet, single line. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="roomsm-eyebrow"
      >
        <p className="roomsm-eyebrow__kicker">חדרי אירוח</p>
      </motion.div>

      {/* Active-card title — bottom BAR with scrim. aria-live announces the
          centre-most room as the wall pans (§9). Index → title → type stacked. */}
      <section
        aria-live="polite"
        aria-atomic="true"
        className="roomsm-active"
      >
        <p className="roomsm-active__index">
          <bdi>{`${activeCard?.number ?? "01"} / ${totalLabel}`}</bdi>
        </p>
        <h1 className="roomsm-active__title texture-text texture-text--light">
          {activeCard?.titleHe ?? ""}
        </h1>
        {activeCard?.type ? (
          <p className="roomsm-active__type">{activeCard.type}</p>
        ) : null}
      </section>

      {/* First-load hint — LOW (just above the title bar), small; auto-dismisses
          so it never covers a tappable card. */}
      {hintVisible ? (
        <div className="roomsm-hint" aria-hidden="true">
          <span className="roomsm-hint__pill">גררו לחקור · לחצו על חדר</span>
        </div>
      ) : null}
    </>
  );
}
