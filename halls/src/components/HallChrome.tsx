import { useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Home, ArrowLeft, ArrowRight } from "lucide-react";
import type { ProjectWithColors } from "../types";

interface Props {
  hallId: "oasis" | "lumina";
  activeProject: ProjectWithColors | null;
}

const HALL_LABEL_HE: Record<"oasis" | "lumina", string> = {
  oasis: "אולם",
  lumina: "ריזורט",
};

export default function HallChrome({ hallId, activeProject }: Props) {
  const reducedMotion = useReducedMotion();
  const lastKnownProjectRef = useRef<ProjectWithColors | null>(activeProject);
  if (activeProject) lastKnownProjectRef.current = activeProject;
  const display = activeProject ?? lastKnownProjectRef.current;

  const otherHallId = hallId === "oasis" ? "lumina" : "oasis";
  const otherHallLabel = HALL_LABEL_HE[otherHallId];
  const currentHallLabel = HALL_LABEL_HE[hallId];

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

      {/* PerImageLabel — bottom-center, fades on activeProject change */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="absolute bottom-10 sm:bottom-10 left-1/2 -translate-x-1/2 max-w-[min(90vw,640px)] text-center px-6 py-3 bg-[color:var(--color-ivory)]/10 backdrop-blur-md border border-[color:var(--color-brass)]/30 rounded-2xl shadow-lg pointer-events-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={display?.id ?? "fallback"}
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0.6 }}
            transition={labelTransition}
          >
            <h2 className="text-[color:var(--color-ivory)] text-lg md:text-xl font-display tracking-wide">
              {display?.label ?? ""}
            </h2>
            <p className="text-[color:var(--color-ivory)]/70 text-xs md:text-sm mt-1 line-clamp-2">
              {display?.title ?? ""}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
