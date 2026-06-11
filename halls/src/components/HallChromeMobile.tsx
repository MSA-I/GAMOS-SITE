import { useMemo, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getProjectsByHall } from "../projectsData";
import type { ProjectWithColors } from "../types";

interface Props {
  hallId: "oasis" | "lumina";
  /** Blend-aware active project (Engine flips it at the crossfade midpoint). */
  activeProject: ProjectWithColors | null;
  /**
   * frame-dark flag: true when the nearest plane index < 2 (bright photos).
   * Drives `data-frame-dark` on the label so the texture-text title swaps to
   * the LIGHT (cream) fill and stays legible over bright imagery.
   */
  frameDark?: boolean;
}

const HALL_LABEL_HE: Record<"oasis" | "lumina", string> = {
  oasis: "אולם",
  lumina: "ריזורט",
};

/**
 * PHONE-FIRST chrome twin of HallChrome (plan §B). The WebGL gallery is
 * reused VERBATIM (App.mobile mounts the same <DepthGallery>); only this
 * overlay is re-laid-out for ≤430px so the editorial label no longer competes
 * for ~336px and wraps/overlaps the gallery, and the controls hit ≥44px.
 *
 * Layout decisions vs. the desktop chrome:
 *  - Top corners carry COMPACT icon-led chips (≥44px hit area) instead of the
 *    ~80px uppercase-tracked desktop pills: a back chip (top-inline-end) and a
 *    hall-switch chip (top-inline-start). Both keep the blurred-ink-scrim +
 *    ivory-hairline language so they read over bright photos.
 *  - The editorial label collapses from the desktop `justify-between`
 *    spec-vs-title row into ONE full-width bottom bar that STACKS vertically
 *    (index → title → spec) — no horizontal competition, no wrap-overlap. A
 *    soft blurred-ink gradient sits behind it for legibility.
 *
 * Identical to HallChrome: props interface, data (HALL_LABEL_HE,
 * getProjectsByHall, totalLabel), a11y (skip link → #hall-canvas, aria-live
 * label, focus-visible rings, ≥44px targets), the color chip + frameDark
 * texture swap. DIFFERENT: the hall-switch links to the `-mobile` sibling so
 * mobile↔mobile navigation stays on the phone build.
 */
export default function HallChromeMobile({
  hallId,
  activeProject,
  frameDark = false,
}: Props) {
  const reducedMotion = useReducedMotion();
  const lastKnownProjectRef = useRef<ProjectWithColors | null>(activeProject);
  if (activeProject) lastKnownProjectRef.current = activeProject;
  const display = activeProject ?? lastKnownProjectRef.current;

  const otherHallId = hallId === "oasis" ? "lumina" : "oasis";
  const otherHallLabel = HALL_LABEL_HE[otherHallId];

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
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:start-4 focus:z-40 focus:pointer-events-auto focus:px-4 focus:py-2 focus:rounded-lg focus:bg-ivory focus:text-ink-deep focus:font-medium focus-visible:ring-[3px] focus-visible:ring-brass focus-visible:outline-none"
      >
        דלג לגלריה
      </a>

      {/* Back chip — top-inline-end (top-left in RTL). Compact icon + short
          label, ≥44px hit area; blurred-ink scrim + ivory hairline so it reads
          over bright photos. */}
      <motion.a
        href="/"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        className="hallm-home pointer-events-auto"
        aria-label="חזרה לאתר Gamos"
      >
        <span className="hallm-home__arrow" aria-hidden="true">
          →
        </span>
        <span className="hallm-home__label">לאתר</span>
      </motion.a>

      {/* Hall-switch chip — top-inline-start (top-right in RTL), opposite
          corner from the back chip (no overlap). Compact directional pill with
          the SHORT other-hall label (4–6 chars). Links to the `-mobile`
          sibling so the phone build stays on mobile. */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={transition}
        role="group"
        aria-label="מעבר אולם"
        className="hallm-switch pointer-events-auto"
      >
        <a
          href={`/halls/dist/${otherHallId}-mobile/`}
          aria-label={`עבור ל${otherHallLabel}`}
          className="hallm-switch__pill"
        >
          {hallId === "oasis" ? (
            <>
              <span>{otherHallLabel}</span>
              <ArrowLeft size={18} aria-hidden="true" />
            </>
          ) : (
            <>
              <ArrowRight size={18} aria-hidden="true" />
              <span>{otherHallLabel}</span>
            </>
          )}
        </a>
      </motion.div>

      {/* ── Editorial label — single bottom bar, STACKED vertically ──
          Unlike the desktop `justify-between` spec-vs-title row, the mobile
          label is one full-width column anchored to the bottom: index →
          texture-text TITLE → spec inline-row (location · year). start-aligned
          (RTL = right). A soft blurred-ink gradient (in CSS) sits behind it so
          the cream title stays legible over any frame. `data-frame-dark` flips
          the title's texture variant; aria-live announces the active venue. */}
      <section
        aria-live="polite"
        aria-atomic="true"
        data-frame-dark={frameDark ? "true" : "false"}
        className="hallm-label pointer-events-none"
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={display?.id ?? "fallback"}
            initial={{ opacity: reducedMotion ? 1 : 0.55 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: reducedMotion ? 1 : 0.55 }}
            transition={labelTransition}
            className="hallm-label__stack"
          >
            {/* Index row — color chip + "NN / TT" */}
            <p className="hallm-label__index">
              <span
                aria-hidden="true"
                className="hallm-label__chip"
                style={{ backgroundColor: display?.colors.blob2 ?? "var(--color-brass)" }}
              />
              <bdi>{`${display?.number ?? "01"} / ${totalLabel}`}</bdi>
            </p>

            {/* Title — texture-filled display type, sized to fit 360px on
                one–two lines. */}
            <h2 className="hallm-label__title texture-text texture-text--light">
              {display?.label ?? ""}
            </h2>

            {/* Spec — location · year on a single inline row (replaces the
                desktop two-row <dl>; sr-only keys preserve semantics). */}
            <dl className="hallm-label__spec">
              <div className="hallm-label__spec-item">
                <dt className="sr-only">מיקום</dt>
                <dd className="hallm-label__spec-val m-0">{display?.location ?? ""}</dd>
              </div>
              <span aria-hidden="true" className="hallm-label__spec-sep">·</span>
              <div className="hallm-label__spec-item">
                <dt className="sr-only">שנה</dt>
                <dd className="hallm-label__spec-val m-0">
                  <bdi>{display?.year ?? ""}</bdi>
                </dd>
              </div>
            </dl>
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}
