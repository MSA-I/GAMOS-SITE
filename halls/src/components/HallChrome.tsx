import { useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Home, ArrowLeft, ArrowRight } from "lucide-react";
import { getProjectsByHall } from "../projectsData";
import type { ProjectWithColors } from "../types";

interface Props {
  hallId: "oasis" | "lumina";
  /** Blend-aware active project (Engine flips it at the crossfade midpoint). */
  activeProject: ProjectWithColors | null;
  /**
   * Wave-1 frame-dark flag: true when the nearest plane index < 2 (bright
   * photos). Drives `data-frame-dark` on the label so the texture-text title
   * swaps to the LIGHT (cream) fill and stays legible over bright imagery.
   */
  frameDark?: boolean;
}

const HALL_LABEL_HE: Record<"oasis" | "lumina", string> = {
  oasis: "אולם",
  lumina: "ריזורט",
};

export default function HallChrome({ hallId, activeProject, frameDark = false }: Props) {
  const reducedMotion = useReducedMotion();
  const lastKnownProjectRef = useRef<ProjectWithColors | null>(activeProject);
  if (activeProject) lastKnownProjectRef.current = activeProject;
  const display = activeProject ?? lastKnownProjectRef.current;

  const otherHallId = hallId === "oasis" ? "lumina" : "oasis";
  const otherHallLabel = HALL_LABEL_HE[otherHallId];
  const currentHallLabel = HALL_LABEL_HE[hallId];

  // Total plane count for this hall → the denominator of the "NN / TT" index.
  const planeCount = useMemo(() => getProjectsByHall(hallId).length, [hallId]);
  const totalLabel = String(planeCount).padStart(2, "0");

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:inset-inline-start-4 focus:z-40 focus:pointer-events-auto focus:px-4 focus:py-2 focus:rounded-lg focus:bg-ivory focus:text-ink-deep focus:font-medium focus-visible:ring-[3px] focus-visible:ring-brass focus-visible:outline-none"
      >
        דלג לגלריה
      </a>

      {/* Home button — top-inline-start */}
      <motion.a
        href="/"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="pointer-events-auto absolute top-6 inset-inline-start-6 inline-flex items-center gap-2 ps-4 pe-5 py-2.5 min-h-[44px] bg-[color:var(--color-ivory)]/10 backdrop-blur-md border border-[color:var(--color-brass)]/30 rounded-2xl shadow-lg text-[color:var(--color-ivory)] text-sm font-medium hover:bg-[color:var(--color-ivory)]/20 transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brass)] focus-visible:outline-none"
        aria-label="חזרה לאתר Gamos"
      >
        <Home size={18} aria-hidden="true" />
        <span className="hidden sm:inline">לאתר</span>
      </motion.a>

      {/* HallSwitcher — top-inline-end */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        role="group"
        aria-label="מעבר אולם"
        className="pointer-events-auto absolute top-6 inset-inline-end-6 inline-flex items-center gap-3 ps-4 pe-3 py-2 min-h-[44px] bg-[color:var(--color-ivory)]/10 backdrop-blur-md border border-[color:var(--color-brass)]/30 rounded-2xl shadow-lg"
      >
        <span className="hidden sm:inline text-[color:var(--color-ivory)]/70 text-xs uppercase tracking-[0.18em] font-display">
          {currentHallLabel}
        </span>
        <a
          href={`/halls/dist/${otherHallId}/`}
          aria-label={`עבור ל${otherHallLabel}`}
          className="px-3 py-1.5 min-h-[36px] rounded-xl bg-[color:var(--color-brass)]/20 hover:bg-[color:var(--color-brass)]/35 text-[color:var(--color-ivory)] text-sm font-semibold transition-colors duration-200 focus-visible:ring-[3px] focus-visible:ring-[color:var(--color-brass)] focus-visible:outline-none inline-flex items-center gap-2"
        >
          {hallId === "oasis" ? (
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
                <dt className="hall-label__spec-key">מיקום</dt>
                <dd className="hall-label__spec-val m-0">{display?.location ?? ""}</dd>
              </div>
              <div className="hall-label__spec-row">
                <dt className="hall-label__spec-key">שנה</dt>
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
              <h2 className="hall-label__title texture-text texture-text--light">{display?.label ?? ""}</h2>
            </div>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
