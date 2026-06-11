import { useEffect, useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { getRooms } from "../roomsData";
import type { RoomCard } from "../roomsData";
import type { CardProjection } from "../wall/Engine";

interface Props {
  /** Centre-most card (Engine flips it as the wall pans). */
  activeCard: RoomCard | null;
  /**
   * Register the imperative label-projection updater. App routes the Engine's
   * per-frame projection feed into this; we write transforms straight to the
   * pre-created label DOM nodes — never React state — so there's no jitter.
   */
  registerProjector: (fn: ((p: CardProjection[]) => void) | null) => void;
}

// The category/year edge scale (static — pure CSS, zero projection jitter).
const SCALE_ITEMS = ["סוויטות", "חדרים", "ספא", "נוף", "2026"];

export default function RoomsChrome({ activeCard, registerProjector }: Props) {
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

  // One pre-created label node per card; positioned imperatively each frame.
  const labelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const activeIndexRef = useRef<number>(activeCard ? cards.indexOf(activeCard) : 0);

  // Track the active index so the projector can highlight the centre label
  // without re-rendering the whole overlay.
  useEffect(() => {
    activeIndexRef.current = activeCard ? cards.indexOf(activeCard) : -1;
  }, [activeCard, cards]);

  useEffect(() => {
    const updater = (projections: CardProjection[]): void => {
      const activeIdx = activeIndexRef.current;
      for (const p of projections) {
        const node = labelRefs.current[p.index];
        if (!node) continue;
        if (p.visible) {
          node.style.transform = `translate3d(${p.x}px, ${p.y}px, 0)`;
          node.style.opacity = "1";
          node.classList.toggle("is-active", p.index === activeIdx);
        } else {
          node.style.opacity = "0";
        }
      }
    };
    registerProjector(updater);
    return () => registerProjector(null);
  }, [registerProjector]);

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };

  return (
    <>
      {/* Skip link — first focusable */}
      <a
        href="#rooms-canvas"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:inset-inline-start-4 focus:z-40 focus:pointer-events-auto focus:px-4 focus:py-2 focus:rounded-lg focus:bg-ivory focus:text-ink-deep focus:font-medium focus-visible:ring-[3px] focus-visible:ring-brass focus-visible:outline-none"
      >
        דלג לגלריה
      </a>

      {/* Back link — minimal-editorial. A plain text link with a brass underline
          that grows on hover (the site's link grammar), NOT a glass pill. Returns
          to the #rooms section of the main site so closing lands where it opened.
          The arrow nudges on hover. */}
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

      {/* Section eyebrow — top inline-end. Quiet brass eyebrow + muted sub-line,
          no box (announces the gallery). */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="rooms-heading"
      >
        <p className="rooms-heading__eyebrow">חדרי אירוח</p>
        <p className="rooms-heading__sub">הסוויטות והחדרים של גאמוס</p>
      </motion.div>

      {/* Per-card floating labels — DOM overlay, transforms written each frame */}
      <div className="rooms-labels" aria-hidden="true">
        {cards.map((card, i) => (
          <div
            key={card.id}
            ref={(el) => {
              labelRefs.current[i] = el;
            }}
            className={`rooms-label${card.isReal ? " is-real" : ""}`}
          >
            <span className="rooms-label__num">{card.number}</span>
            <span className="rooms-label__name">{card.titleHe}</span>
            <span className="rooms-label__tag">{card.tag}</span>
          </div>
        ))}
      </div>

      {/* Category / year edge scale — static */}
      <div className="rooms-scale" aria-hidden="true">
        {SCALE_ITEMS.map((s) => (
          <span key={s} className="rooms-scale__item">
            {s}
          </span>
        ))}
      </div>

      {/* Active-card editorial title — bottom, aria-live announces it. Tight
          stack: index → texture-text title → optional type, centered. */}
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

      {/* First-load hint — top-centre, clear of the bottom title; auto-dismisses
          on first interaction. */}
      {hintVisible ? (
        <div className="rooms-hint" aria-hidden="true">
          <span className="rooms-hint__pill">גררו לחקור את החדרים</span>
        </div>
      ) : null}
    </>
  );
}
