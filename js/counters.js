/**
 * counters.js — animated number counters for stat blocks
 *
 * Agent 20 — Static Sections Choreographer (2026-06-01).
 *
 * Targets: `<span class="stat-number" data-value="20" data-suffix="+">0</span>`
 *
 * On viewport intersection, animates the textContent from 0 → data-value
 * over 1.6s with an ease-out cubic curve.
 *
 * Contract:    ES2022 module. Exports `init()` and `destroy()`.
 *              Idempotent — safe to call multiple times.
 *
 * Hebrew note: numbers are wrapped in `unicode-bidi: isolate` via the
 * `.stat-number` class so they read LTR even inside an RTL flow.
 *
 * Reduced motion: writes the final value immediately, skips animation.
 *
 * Constitution refs: §2 (vanilla JS), §8 (perf — only one rAF loop per
 *                    counter, runs once), §9 (a11y — final value is the
 *                    text the user sees regardless of motion preference),
 *                    §10.3 (ESM).
 */

const COUNTER_SELECTOR = ".stat-number[data-value]";
const ROOT_MARGIN = "-15% 0px -15% 0px";
const DEFAULT_DURATION_MS = 1600;

let observer = null;
let observed = new WeakSet();
let mqlReduce = null;
let mqlListener = null;

/**
 * ease-out cubic: smooth deceleration toward the target.
 */
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

/**
 * Format an interim value according to data-decimals.
 * Default: integer, with thousands separator (en-US to keep digits LTR).
 */
function formatValue(v, decimals) {
  if (decimals > 0) return v.toFixed(decimals);
  return Math.round(v).toLocaleString("en-US");
}

/**
 * Animate a single counter element from 0 (or data-from) to data-value.
 */
function animateCounter(el) {
  const end = parseFloat(el.dataset.value || "0");
  const start = parseFloat(el.dataset.from || "0");
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  const dur = parseInt(el.dataset.duration || `${DEFAULT_DURATION_MS}`, 10);

  if (!Number.isFinite(end)) {
    el.textContent = el.dataset.value || el.textContent;
    return;
  }

  const t0 = performance.now();
  function frame(now) {
    const k = Math.min(1, (now - t0) / dur);
    const eased = easeOutCubic(k);
    const v = start + (end - start) * eased;
    el.textContent = formatValue(v, decimals) + suffix;
    if (k < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

/**
 * Write the final value immediately — for reduced-motion users.
 */
function writeFinalImmediately(el) {
  const end = parseFloat(el.dataset.value || "0");
  const decimals = parseInt(el.dataset.decimals || "0", 10);
  const suffix = el.dataset.suffix || "";
  if (!Number.isFinite(end)) return;
  el.textContent = formatValue(end, decimals) + suffix;
}

function getObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
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

function observeAll() {
  const obs = getObserver();
  const targets = document.querySelectorAll(COUNTER_SELECTOR);
  targets.forEach((el) => {
    if (observed.has(el)) return;
    obs.observe(el);
    observed.add(el);
  });
}

/**
 * Initialize counters. Idempotent.
 */
export function init() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  mqlReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mqlReduce.matches) {
    document.querySelectorAll(COUNTER_SELECTOR).forEach(writeFinalImmediately);
    mqlListener = (event) => {
      if (!event.matches) observeAll();
    };
    if (mqlReduce.addEventListener) {
      mqlReduce.addEventListener("change", mqlListener);
    }
    return;
  }

  if (!("IntersectionObserver" in window)) {
    // Old browsers — show final values, no animation.
    document.querySelectorAll(COUNTER_SELECTOR).forEach(writeFinalImmediately);
    return;
  }

  observeAll();

  mqlListener = (event) => {
    if (event.matches) {
      document.querySelectorAll(COUNTER_SELECTOR).forEach(writeFinalImmediately);
    } else {
      observeAll();
    }
  };
  if (mqlReduce.addEventListener) {
    mqlReduce.addEventListener("change", mqlListener);
  }
}

/**
 * Tear down. Used by HMR / re-init flows.
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
