import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, motion, useReducedMotion } from "motion/react";
import { X } from "lucide-react";
import type { RoomCard } from "../roomsData";
import type { CardScreenRect } from "../wall/Engine";
import { t } from "../i18n";

interface Props {
  card: RoomCard;
  /** Re-measure the source card's current screen rect (Engine.cardScreenRect). */
  measureFrom: () => CardScreenRect;
  /** Close → App unfreezes the engine + unmounts this. */
  onClose: () => void;
}

const BASE = import.meta.env.BASE_URL;
const MORPH = { duration: 0.72, ease: [0.65, 0, 0.35, 1] as const };
const SCRIM = { duration: 0.5, ease: [0.22, 1, 0.3, 1] as const };

/**
 * RoomDetail — the FLIP card→detail page, ported from phantom-sphere-gallery's
 * GSAP morph to Framer `motion` (Constitution §2.1 bans GSAP here).
 *
 * Open: snapshot the source card's screen rect (FROM), dim+blur the gallery canvas
 * (a CSS class on #rooms-canvas), drop a fixed clone <img> at FROM, measure the
 * detail media slot (TO), and `animate()` the clone left/top/width/height FROM→TO
 * while the scrim fades up and the text staggers in. Close reverses (re-measure
 * FROM — the wall may have settled), then onClose().
 *
 * a11y (§9): role="dialog" aria-modal, focus the close button on open, return
 * focus to #rooms-canvas on close, Escape closes, Tab is trapped. Reduced motion:
 * no morph — the detail shows instantly, canvas dims with no transition.
 */
export default function RoomDetail({ card, measureFrom, onClose }: Props) {
  const reduce = useReducedMotion();
  const flipRef = useRef<HTMLImageElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const src = BASE + card.image;
  const canvasEl = (): HTMLElement | null =>
    document.getElementById("rooms-canvas");

  // ---- OPEN (mount) -------------------------------------------------------
  useLayoutEffect(() => {
    const flip = flipRef.current;
    const media = mediaRef.current;
    const scrim = scrimRef.current;
    if (!flip || !media || !scrim) return;

    const from = measureFrom();
    canvasEl()?.classList.add("is-dimmed");

    if (reduce) {
      // No morph — clone goes straight to the media slot; scrim opaque.
      flip.style.opacity = "0"; // media slot's own img shows instead
      scrim.style.opacity = "1";
      return;
    }

    // Place the clone over the source card, then morph to the media slot.
    const to = media.getBoundingClientRect();
    flip.style.left = `${from.left}px`;
    flip.style.top = `${from.top}px`;
    flip.style.width = `${from.width}px`;
    flip.style.height = `${from.height}px`;
    flip.style.opacity = "1";

    const a1 = animate(
      flip,
      { left: to.left, top: to.top, width: to.width, height: to.height },
      MORPH,
    );
    const a2 = animate(scrim, { opacity: [0, 1] }, SCRIM);

    return () => {
      a1.stop();
      a2.stop();
    };
    // measureFrom/reduce are stable for the lifetime of this mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- focus management + Escape -----------------------------------------
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();

    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        e.preventDefault();
        startClose();
      } else if (e.key === "Tab") {
        // simple focus trap within the dialog
        const root = dialogRef.current;
        if (!root) return;
        const focusables = root.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      canvasEl()?.classList.remove("is-dimmed");
      // return focus to the gallery region
      const target = canvasEl() ?? prevFocus;
      target?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- CLOSE --------------------------------------------------------------
  function startClose(): void {
    if (closingRef.current) return;
    closingRef.current = true;

    const flip = flipRef.current;
    const media = mediaRef.current;
    const scrim = scrimRef.current;
    const inner = innerRef.current;

    if (reduce || !flip || !media || !scrim) {
      canvasEl()?.classList.remove("is-dimmed");
      onClose();
      return;
    }

    const to = measureFrom();
    const mediaRect = media.getBoundingClientRect();
    // start the clone from the media slot and morph back to the card
    flip.style.left = `${mediaRect.left}px`;
    flip.style.top = `${mediaRect.top}px`;
    flip.style.width = `${mediaRect.width}px`;
    flip.style.height = `${mediaRect.height}px`;
    flip.style.opacity = "1";

    if (inner) animate(inner, { opacity: [1, 0] }, { duration: 0.28 });
    animate(scrim, { opacity: [1, 0] }, { duration: 0.45, delay: 0.05 });
    canvasEl()?.classList.remove("is-dimmed");
    const a = animate(
      flip,
      { left: to.left, top: to.top, width: to.width, height: to.height },
      { ...MORPH, duration: 0.6 },
    );
    a.then(() => onClose());
  }

  // text stagger (source: y 26→0, opacity 0→1, 0.06 stagger after the morph midpoint)
  const textTransition = (i: number) =>
    reduce
      ? { duration: 0 }
      : { duration: 0.5, delay: 0.42 + i * 0.06, ease: [0.16, 1, 0.3, 1] as const };

  const items = [
    // 2026-06-18: "NN / total" index removed per user (numbers were confusing).
    <h1 key="title" id="rooms-detail-title" className="rooms-detail__title">
      {t(card.category)}
    </h1>,
    <p key="subtitle" className="rooms-detail__subtitle">
      {t(card.titleHe)}
    </p>,
    <div key="meta" className="rooms-detail__meta">
      <span className="rooms-detail__tag">{t(card.tag)}</span>
    </div>,
    <p key="body" className="rooms-detail__body">
      {t(card.body)}
    </p>,
  ];

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rooms-detail-title"
      className="rooms-detail"
    >
      {/* scrim — fades up over the dimmed canvas */}
      <div ref={scrimRef} className="rooms-detail__scrim" style={{ opacity: 0 }} />

      {/* morphing clone (fixed, animated FROM→TO) */}
      <img
        ref={flipRef}
        className="rooms-flip"
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
      />

      <div className="rooms-detail__inner" ref={innerRef}>
        <button
          ref={closeRef}
          type="button"
          className="rooms-detail__close"
          onClick={startClose}
          aria-label={t("סגירה")}
        >
          <X size={18} aria-hidden="true" />
          <span>{t("סגירה")}</span>
        </button>

        <div className="rooms-detail__layout">
          {/* media slot — the morph lands here; its own img shows once settled */}
          <div ref={mediaRef} className="rooms-detail__media">
            <img src={src} alt={t(card.titleHe)} draggable={false} />
          </div>

          <div className="rooms-detail__text">
            {items.map((node, i) => (
              <motion.div
                key={node.key}
                initial={reduce ? false : { y: 26, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={textTransition(i)}
              >
                {node}
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
