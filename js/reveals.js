/**
 * reveals.js — Scroll-triggered reveal animations
 *
 * Agent 09 — Motion Engineer (static sections).
 * Agent 20 — Choreographer extension (2026-06-01): added new variants for
 * weblove-motion language: slide-left, slide-right, scale-up, clip-reveal,
 * rotate-in. The existing fade / fade-up / mask / scale variants are
 * untouched (CSS in motion-reveals.css owns the from→to states).
 *
 * IntersectionObserver-based reveal pattern. CSS does the actual transition;
 * this module simply toggles `is-visible` when targets enter the viewport.
 *
 * Contract: ES2022 module. Exports `init()` and `destroy()`.
 *           Idempotent — calling `init()` twice is safe.
 *
 * Usage in HTML:
 *   <h2 data-reveal="fade-up">כותרת</h2>
 *   <ul data-stagger>
 *     <li data-reveal="scale-up">item</li>
 *     <li data-reveal="scale-up">item</li>
 *   </ul>
 *
 * Per-item delay can be set via inline `style="--reveal-delay: 240ms"`,
 * or fall back to the auto stagger (80ms steps) computed by this module
 * when the parent has [data-stagger].
 *
 * Reduced motion: skips the observer and adds `is-visible` to all targets
 * synchronously, so the final state is always visible without transition.
 *
 * Constitution refs: §8 (perf budget — reduced-motion mandatory),
 *                    §10 (JS module-scoped, init/destroy contract).
 */

const REVEAL_SELECTOR = "[data-reveal]";
const STAGGER_ATTR = "data-stagger";
const VISIBLE_CLASS = "is-visible";
const STAGGER_STEP_MS = 80;
const STAGGER_MAX = 8; // motion-language.md: max children with stagger
const ROOT_MARGIN = "-10% 0px -10% 0px";

let observer = null;
let observed = new WeakSet();
let mqlReduce = null;
let mqlListener = null;

/**
 * Compute the stagger delay for a child element (capped at STAGGER_MAX).
 * If the element already has --reveal-delay set inline, we leave it alone
 * (the choreographer pipeline often hard-codes per-item delays).
 */
function computeStaggerDelay(child) {
  // Honor an explicit per-item delay if one is set.
  const inlineDelay = child.style.getPropertyValue("--reveal-delay");
  if (inlineDelay && inlineDelay.trim() !== "" && inlineDelay.trim() !== "0ms") {
    return 0; // CSS will respect the inline custom property.
  }
  const parent = child.parentElement;
  if (!parent || !parent.hasAttribute(STAGGER_ATTR)) return 0;
  const siblings = Array.from(parent.children).filter((el) =>
    el.matches(REVEAL_SELECTOR),
  );
  const index = siblings.indexOf(child);
  if (index < 0) return 0;
  const cappedIndex = Math.min(index, STAGGER_MAX - 1);
  return cappedIndex * STAGGER_STEP_MS;
}

/**
 * Reveal a single element with optional stagger delay.
 * For elements with inline --reveal-delay, CSS handles the timing via
 * `transition-delay: var(--reveal-delay)` so we just add the class.
 */
function reveal(el) {
  if (el.classList.contains(VISIBLE_CLASS)) return;
  const delay = computeStaggerDelay(el);
  if (delay > 0) {
    setTimeout(() => el.classList.add(VISIBLE_CLASS), delay);
  } else {
    el.classList.add(VISIBLE_CLASS);
  }
}

/**
 * Reveal every target instantly — used for reduced-motion users.
 */
function revealAllImmediately() {
  const targets = document.querySelectorAll(REVEAL_SELECTOR);
  targets.forEach((el) => el.classList.add(VISIBLE_CLASS));
}

/**
 * Build (or return existing) IntersectionObserver.
 */
function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          reveal(entry.target);
          // Once revealed, stop observing — reveals are one-way.
          observer.unobserve(entry.target);
        }
      }
    },
    {
      root: null,
      rootMargin: ROOT_MARGIN,
      threshold: 0,
    },
  );
  return observer;
}

/**
 * Observe every reveal target that hasn't been observed yet.
 */
function observeAll() {
  const obs = getObserver();
  const targets = document.querySelectorAll(REVEAL_SELECTOR);
  targets.forEach((el) => {
    if (observed.has(el)) return;
    if (el.classList.contains(VISIBLE_CLASS)) return;
    obs.observe(el);
    observed.add(el);
  });
}

/**
 * Initialize the reveal system.
 * Idempotent — safe to call multiple times.
 */
export function init() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Reduced-motion users: skip observer, show everything immediately.
  mqlReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mqlReduce.matches) {
    revealAllImmediately();
    // Listen for the user toggling the OS preference back off.
    mqlListener = (event) => {
      if (!event.matches) {
        observeAll();
      }
    };
    if (mqlReduce.addEventListener) {
      mqlReduce.addEventListener("change", mqlListener);
    }
    return;
  }

  if (!("IntersectionObserver" in window)) {
    // Old browsers — graceful fallback to instant final state.
    revealAllImmediately();
    return;
  }

  observeAll();

  // Re-observe when reduced-motion preference flips off.
  mqlListener = (event) => {
    if (event.matches) {
      revealAllImmediately();
    } else {
      observeAll();
    }
  };
  if (mqlReduce.addEventListener) {
    mqlReduce.addEventListener("change", mqlListener);
  }
}

/**
 * Tear down observers and listeners. Used by HMR / re-init flows.
 */
export function destroy() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  observed = new WeakSet();
  if (mqlReduce && mqlListener && mqlReduce.removeEventListener) {
    mqlReduce.removeEventListener("change", mqlListener);
  }
  mqlReduce = null;
  mqlListener = null;
}

export default { init, destroy };
