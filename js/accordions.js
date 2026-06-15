/**
 * accordions.js — Smooth, accessible accordion animation.
 *
 * Agent 09 — Motion Engineer (static sections).
 *
 * Built on native <details>/<summary> for built-in A11y:
 *   - aria-expanded is managed by the browser.
 *   - Enter / Space toggle for free.
 *   - Screen readers know about disclosure semantics natively.
 *
 * Smooth height transition strategy:
 *   1. Prefer `interpolate-size: allow-keywords` (CSS) where supported.
 *      In that case, this script does nothing for the height itself —
 *      the CSS file handles it.
 *   2. Fallback: JS-driven height animation via Element.animate().
 *      No GSAP needed. Cancels in flight to handle rapid toggles.
 *
 * Reduced motion: skip animation, just open/close instantly.
 *
 * Contract: ES2022 module. Exports `init()` returning a destroy fn.
 *           Selector: `details[data-accordion]`.
 *
 * Constitution refs: §9 (WCAG 2.2 AA — keyboard, ARIA),
 *                    §10 (init/destroy contract, no globals).
 */

import { prefersReducedMotion } from "./utils/media-query.js";

const SELECTOR = "details[data-accordion]";
const ANIMATION_DURATION = 320; // ms — matches --dur-base..--dur-slow band
const EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)"; // --ease-out-cinema literal

// One-time feature detection for interpolate-size keyword support.
let supportsInterpolateSize = null;
function detectInterpolateSize() {
  if (supportsInterpolateSize !== null) return supportsInterpolateSize;
  try {
    supportsInterpolateSize =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("interpolate-size", "allow-keywords");
  } catch (_) {
    supportsInterpolateSize = false;
  }
  return supportsInterpolateSize;
}

/**
 * Get the inner content element of a <details>.
 * Native <details> has <summary> as first child + the rest as content.
 * We treat the second-and-beyond children as the panel.
 */
function getPanel(details) {
  // If author wrapped content in [data-accordion-content], use it.
  const explicit = details.querySelector(":scope > [data-accordion-content]");
  if (explicit) return explicit;

  // Otherwise, build a temporary measurement set: children minus summary.
  const summary = details.querySelector(":scope > summary");
  const all = Array.from(details.children);
  return all.filter((el) => el !== summary);
}

/**
 * Sum content heights for a set of elements (panel can be multiple nodes).
 */
function measureContentHeight(panel) {
  if (Array.isArray(panel)) {
    return panel.reduce((sum, el) => sum + el.scrollHeight, 0);
  }
  return panel.scrollHeight;
}

/**
 * Animate the <details> element open/closed via height.
 * Returns the running Animation, or null if no animation was scheduled.
 */
function animateDetails(details, opening) {
  // Cancel any in-flight animation first to avoid stacking.
  if (details._gamosAccordionAnim) {
    details._gamosAccordionAnim.cancel();
    details._gamosAccordionAnim = null;
  }

  const summary = details.querySelector(":scope > summary");
  if (!summary) return null;

  // Force open during measurement so we can read the full content height.
  const wasOpen = details.open;
  if (!wasOpen) details.open = true;

  const summaryHeight = summary.offsetHeight;
  const panel = getPanel(details);
  const contentHeight = measureContentHeight(panel);
  const totalHeight = summaryHeight + contentHeight;

  // For closing animation, browser may have re-collapsed already; ensure open.
  details.open = true;

  const fromHeight = opening ? `${summaryHeight}px` : `${totalHeight}px`;
  const toHeight = opening ? `${totalHeight}px` : `${summaryHeight}px`;

  // Lock current height so the transition has a starting point.
  details.style.overflow = "hidden";
  details.style.height = fromHeight;

  const anim = details.animate(
    [{ height: fromHeight }, { height: toHeight }],
    {
      duration: ANIMATION_DURATION,
      easing: EASING,
    },
  );

  details._gamosAccordionAnim = anim;

  anim.onfinish = () => {
    details._gamosAccordionAnim = null;
    details.style.height = "";
    details.style.overflow = "";
    if (!opening) {
      details.open = false;
    }
  };
  anim.oncancel = () => {
    details._gamosAccordionAnim = null;
    details.style.height = "";
    details.style.overflow = "";
  };

  return anim;
}

/**
 * Click handler that intercepts <summary> clicks so we can animate.
 * Native toggle still happens, but we drive the height transition.
 */
function handleSummaryClick(event) {
  const summary = event.currentTarget;
  const details = summary.parentElement;
  if (!details || details.tagName.toLowerCase() !== "details") return;

  // Reduced-motion or interpolate-size path: let native behavior run.
  if (prefersReducedMotion()) return;
  if (detectInterpolateSize()) return;

  // We're going to drive the animation manually — block native instant toggle.
  event.preventDefault();

  const opening = !details.open;
  // Animate first; the onfinish callback flips details.open at the end
  // for closes. For opens we already set details.open = true inside animate.
  animateDetails(details, opening);
}

/**
 * Attach listeners for one accordion.
 */
function attachAccordion(details) {
  if (details._gamosAccordionAttached) return;
  const summary = details.querySelector(":scope > summary");
  if (!summary) return;
  summary.addEventListener("click", handleSummaryClick);
  details._gamosAccordionAttached = true;
  details._gamosAccordionSummary = summary;
}

/**
 * Detach listeners for one accordion.
 */
function detachAccordion(details) {
  if (!details._gamosAccordionAttached) return;
  const summary = details._gamosAccordionSummary;
  if (summary) summary.removeEventListener("click", handleSummaryClick);
  if (details._gamosAccordionAnim) details._gamosAccordionAnim.cancel();
  details._gamosAccordionAttached = false;
  details._gamosAccordionSummary = null;
}

/**
 * Initialize all accordions on the page.
 * Returns a destroy() function for callers that need cleanup.
 */
export function init() {
  if (typeof document === "undefined") return () => {};

  const accordions = document.querySelectorAll(SELECTOR);
  accordions.forEach(attachAccordion);

  return function destroy() {
    accordions.forEach(detachAccordion);
  };
}

/**
 * Standalone destroy (matches Agent 09 contract). Safe even if init never ran.
 */
export function destroy() {
  if (typeof document === "undefined") return;
  document.querySelectorAll(SELECTOR).forEach(detachAccordion);
}

export default { init, destroy };
