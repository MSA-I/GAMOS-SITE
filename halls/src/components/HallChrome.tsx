import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";
import { getProjectsByHall } from "../projectsData";
import { t } from "../i18n";
import type { ProjectWithColors } from "../types";

interface Props {
  hallId: "events" | "resort";
  /** Blend-aware active project (Engine flips it at the crossfade midpoint). */
  activeProject: ProjectWithColors | null;
  /**
   * Wave-1 frame-dark flag: true when the nearest plane index < 2 (bright
   * photos). Drives `data-frame-dark` on the label so the texture-text title
   * swaps to the LIGHT (cream) fill and stays legible over bright imagery.
   */
  frameDark?: boolean;
}

const HALL_LABEL_HE: Record<"events" | "resort", string> = {
  events: "אולם",
  resort: "ריזורט",
};

export default function HallChrome({ hallId, activeProject, frameDark = false }: Props) {
  const reducedMotion = useReducedMotion();
  const lastKnownProjectRef = useRef<ProjectWithColors | null>(activeProject);
  if (activeProject) lastKnownProjectRef.current = activeProject;
  const display = activeProject ?? lastKnownProjectRef.current;

  const otherHallId = hallId === "events" ? "resort" : "events";
  const otherHallLabel = t(HALL_LABEL_HE[otherHallId]);
  const currentHallLabel = t(HALL_LABEL_HE[hallId]);

  // Total plane count for this hall → the denominator of the "NN / TT" index.
  const planeCount = useMemo(() => getProjectsByHall(hallId).length, [hallId]);
  const totalLabel = String(planeCount).padStart(2, "0");

  // First-load scroll hint — invites the visitor to scroll down through the
  // gallery; auto-dismisses on the first scroll/wheel/touch/key input.
  const [cueVisible, setCueVisible] = useState(true);
  useEffect(() => {
    const dismiss = () => setCueVisible(false);
    const opts = { once: true, passive: true } as const;
    window.addEventListener("wheel", dismiss, opts);
    window.addEventListener("touchmove", dismiss, opts);
    window.addEventListener("scroll", dismiss, opts);
    window.addEventListener("keydown", dismiss, opts);
    return () => {
      window.removeEventListener("wheel", dismiss);
      window.removeEventListener("touchmove", dismiss);
      window.removeEventListener("scroll", dismiss);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  const transition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const };
  const labelTransition = reducedMotion
    ? { duration: 0 }
    : { duration: 0.35, ease: "easeOut" as const };

  return (
    <div className="fixed inset-0 z-30 pointer-events-none select-none" aria-hidden={false}>
      {/* Skip link — first focusable */}
      <a
        href="#hall-canvas"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-40 focus:pointer-events-auto focus:px-4 focus:py-2 focus:rounded-lg focus:bg-ivory focus:text-ink-deep focus:font-medium focus-visible:ring-[3px] focus-visible:ring-brass focus-visible:outline-none"
      >
        {t("דלג לגלריה")}
      </a>

      {/* "חזרה לאתר" ghost back-pill — top-inline-end (top-left in RTL), exact
          press-page .press-home-link language: a mirrored "→" arrow + label,
          ivory hairline over a blurred ink scrim so it reads over bright photos.
          Positioned in CSS (.hall-home) — the old Tailwind inset classes were
          invalid v4 utilities and collided with the switch pill. */}
      <motion.a
        href="/#hall-portal"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="hall-home pointer-events-auto"
        aria-label={t("חזרה לבחירת אולם באתר Gamos")}
      >
        <span className="hall-home__arrow" aria-hidden="true">
          →
        </span>
        <span className="hall-home__label">{t("חזרה לאתר")}</span>
      </motion.a>

      {/* HallSwitcher — top-inline-start (top-right in RTL), opposite corner from
          the home pill (no overlap). A primary filled pill (press CTA language)
          with the current-hall eyebrow beside it. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        role="group"
        aria-label={t("מעבר אולם")}
        className="hall-switch pointer-events-auto"
      >
        <span className="hall-switch__eyebrow hidden sm:inline">
          {currentHallLabel}
        </span>
        <a
          href={`/halls/dist/${otherHallId}/`}
          aria-label={`${t("עבור ל")}${otherHallLabel}`}
          className="hall-switch__pill"
        >
          {hallId === "events" ? (
            <>
              <span>{otherHallLabel}</span>
              <ArrowLeft size={16} aria-hidden="true" />
            </>
          ) : (
            <>
              <ArrowRight size={16} aria-hidden="true" />
              <span>{otherHallLabel}</span>
            </>
          )}
        </a>
      </motion.div>

      {/* Scroll-down cue — tells the visitor to scroll to move through the
          gallery. Fades out on the first scroll/touch input. */}
      <AnimatePresence>
        {cueVisible ? (
          <motion.div
            key="scrollcue"
            className="hall-scrollcue"
            aria-hidden="true"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={transition}
          >
            <span className="hall-scrollcue__text">{t("גללו לצפייה בתמונות")}</span>
            <motion.span
              className="hall-scrollcue__arrow"
              animate={reducedMotion ? undefined : { y: [0, 6, 0] }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { duration: 1.6, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <ChevronDown size={18} aria-hidden="true" />
            </motion.span>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── Editorial color-chip label (folds reference Label.js into chrome) ──
          A bottom-anchored bar spanning the viewport (logical insets). Two
          groups: a spec block (location / year — replaces the reference
          CMYK/RGB/HEX/PMS rows) toward the inline-START, and the index +
          texture-text TITLE toward the inline-END. DOM order is [spec, title]
          so under dir=rtl + justify-between the spec lands inline-start (right)
          and the title inline-end (left), per the approved mockup.
          `data-frame-dark` flips the title's texture variant for legibility
          over bright photos. aria-live announces the active venue. */}
      <section
        aria-live="polite"
        aria-atomic="true"
        data-frame-dark={frameDark ? "true" : "false"}
        className="absolute inset-inline-0 bottom-8 sm:bottom-10 px-[clamp(1.25rem,6vw,7rem)] pointer-events-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={display?.id ?? "fallback"}
            initial={{ opacity: reducedMotion ? 1 : 0.55 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reducedMotion ? 1 : 0.55 }}
            transition={labelTransition}
            className="flex w-full items-end justify-between gap-6"
          >
            {/* Spec block — inline-start (DOM first) */}
            <dl className="m-0 grid gap-1.5 text-start">
              <div className="hall-label__spec-row">
                <dt className="hall-label__spec-key">{t("מיקום")}</dt>
                <dd className="hall-label__spec-val m-0">{t(display?.location ?? "")}</dd>
              </div>
              <div className="hall-label__spec-row">
                <dt className="hall-label__spec-key">{t("שנה")}</dt>
                <dd className="hall-label__spec-val m-0">
                  <bdi>{display?.year ?? ""}</bdi>
                </dd>
              </div>
            </dl>

            {/* Title block — inline-end (DOM second) */}
            <div className="flex flex-col items-end gap-2 text-end">
              <p className="hall-label__index inline-flex items-center gap-2.5">
                {/* Color chip — the extracted tone of the active photo
                    (decorative, editorial; not a competing UI accent). */}
                <span
                  aria-hidden="true"
                  className="inline-block w-2.5 h-2.5 rounded-full ring-1 ring-[color:var(--color-ivory)]/20"
                  style={{ backgroundColor: display?.colors.blob2 ?? "var(--color-brass)" }}
                />
                <bdi>{`${display?.number ?? "01"} / ${totalLabel}`}</bdi>
              </p>
              <h2 className="hall-label__title texture-text texture-text--light">{t(display?.title ?? "")}</h2>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
