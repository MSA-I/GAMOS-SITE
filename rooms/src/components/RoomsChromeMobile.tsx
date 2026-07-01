import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import type { RoomCard } from "../roomsData";
import { t } from "../i18n";

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

  // First-load swipe hint — GUARANTEED visible: it shows on load with the pulse and
  // dismisses ONLY after a real explore gesture (a touch SWIPE past a threshold, a
  // wheel/scroll, or a key pan) or an auto-hide timeout — never on a bare tap. A
  // minimum-visible window protects it from a stray early tap. (Prior logic killed
  // it on the first touchstart in <100ms, so it was imperceptible.)
  const [hintVisible, setHintVisible] = useState(true);
  useEffect(() => {
    const MIN_VISIBLE_MS = 3000; // a stray tap before this can't dismiss it
    const AUTO_HIDE_MS = 6000; // fades on its own if the user just reads it
    const DRAG_THRESHOLD_PX = 24; // a press must MOVE this far to count as a swipe
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
        dismiss(); // a real swipe/pan gesture
      }
    };
    const onPointerUp = () => {
      pressing = false; // a tap (no swipe) — leave the hint up
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
        {t("דלג לגלריה")}
      </a>

      {/* Back link — top inline-start. ≥44px tap target; short "חזרה" label. */}
      <motion.a
        href="/#rooms"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="roomsm-back"
        aria-label={t("חזרה לחדרי האירוח באתר Gamos")}
      >
        <span className="roomsm-back__arrow" aria-hidden="true">←</span>
        <span className="roomsm-back__label">{t("חזרה")}</span>
      </motion.a>

      {/* Eyebrow — top inline-end. Compact, quiet, single line. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="roomsm-eyebrow"
      >
        <p className="roomsm-eyebrow__kicker">{t("חדרי אירוח")}</p>
      </motion.div>

      {/* Active-card title — bottom BAR with scrim. aria-live announces the
          centre-most room as the wall pans (§9). Index → title → type stacked. */}
      <section
        aria-live="polite"
        aria-atomic="true"
        className="roomsm-active"
      >
        {/* 2026-06-18: "NN / total" index removed per user (confusing numbers). */}
        <h1 className="roomsm-active__title">
          {t(activeCard?.category ?? "")}
        </h1>
        {activeCard?.titleHe ? (
          <p className="roomsm-active__type">{t(activeCard.titleHe)}</p>
        ) : null}
      </section>

      {/* First-load hint — LOW (just above the title bar), small; an animated
          invitation (drifting ‹ › arrows around the label) so it reads as "swipe
          to explore"; auto-dismisses on first input. Reduced-motion → static. */}
      {hintVisible ? (
        <div
          className={
            "roomsm-hint" + (reducedMotion ? " roomsm-hint--static" : "")
          }
          aria-hidden="true"
        >
          <span className="roomsm-hint__arrow roomsm-hint__arrow--start">‹</span>
          <span className="roomsm-hint__pill">{t("החליקו לצדדים לגילוי החדרים")}</span>
          <span className="roomsm-hint__arrow roomsm-hint__arrow--end">›</span>
        </div>
      ) : null}
    </>
  );
}
