/**
 * portals.js — Portal-Bubbles module
 *
 * Owner : Agent 07 (Phase 4a)
 * Spec  : architecture/portal-bubbles-spec.md
 *
 * Responsibilities
 * ----------------
 * 1. Reveal: subscribe to window.gamosHero.onProgress(p) and toggle
 *    `.portals.is-active` once p > 0.92 (and back below 0.88 with a small
 *    hysteresis margin to avoid flicker around the boundary).
 * 2. Click: GSAP timeline that scales the clicked bubble to ~6×, fades the
 *    sibling out, then smooth-scrolls to the bubble's data-target.
 * 3. Keyboard: native <button> already handles Enter/Space. We add nothing
 *    that would prevent default — focus-visible styling lives in CSS.
 * 4. Mobile / iOS / no-hero fallback: if window.gamosHero never appears
 *    (or hero fell back to autoplay loop in iOS Safari), we fall back to
 *    an IntersectionObserver on a sentinel placed near the end of #hero.
 * 5. Reduced motion: instant reveal, no GSAP timeline; clicks become a
 *    direct scrollIntoView() call. Honors live `matchMedia` changes.
 *
 * Public API: init({ motion }), destroy()
 *   - `motion` is the read-only handle from main.js carrying { gsap, ScrollTrigger }.
 *     We use motion.gsap if present; otherwise fall back to plain CSS transitions
 *     and a final scrollIntoView. The module never throws if GSAP is missing.
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const REVEAL_THRESHOLD   = 0.92;   // Add .is-active above this hero progress.
const HIDE_THRESHOLD     = 0.88;   // Remove .is-active below this (hysteresis).
const HERO_HOOK_TIMEOUT  = 5000;   // ms — how long we wait for window.gamosHero.
const HERO_HOOK_INTERVAL = 100;    // ms — polling interval while we wait.
const EXPAND_DURATION    = 1.0;    // s — primary expand duration (per spec).
const FADE_OUT_DURATION  = 0.3;    // s — sibling fade out.
const SCROLL_RESET_DELAY = 300;    // ms — delay before resetting transform.

// ----------------------------------------------------------------------------
// Module-scoped state — captured by destroy().
// ----------------------------------------------------------------------------

const state = {
  initialised:   false,
  root:          null,
  buttons:       [],
  unsubProgress: null,
  fallbackIO:    null,
  reducedMQ:     null,
  reducedMotion: false,
  mediaQueryListener: null,
  hookWaitTimer: null,
  isExpanding:   false,
  bound: {
    onClick:        null,
    onMediaChange:  null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

/** Read prefers-reduced-motion *now* (tokens.css also remaps durations). */
function prefersReducedMotion() {
  return Boolean(
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** Wait (with timeout) for window.gamosHero.onProgress to be installed.
 *  Resolves with the onProgress fn or null if the hero module never loads. */
function waitForHeroHook(timeout = HERO_HOOK_TIMEOUT, interval = HERO_HOOK_INTERVAL) {
  return new Promise((resolve) => {
    const start = performance.now();

    const check = () => {
      if (window.gamosHero && typeof window.gamosHero.onProgress === "function") {
        resolve(window.gamosHero.onProgress);
        return;
      }
      if (performance.now() - start >= timeout) {
        resolve(null);
        return;
      }
      state.hookWaitTimer = window.setTimeout(check, interval);
    };

    check();
  });
}

/** Toggle the `.is-active` reveal class with hysteresis. */
function applyProgress(progress) {
  if (!state.root) return;
  const active = state.root.classList.contains("is-active");

  if (!active && progress >= REVEAL_THRESHOLD) {
    state.root.classList.add("is-active");
    return;
  }
  if (active && progress < HIDE_THRESHOLD) {
    state.root.classList.remove("is-active");
  }
}

/** IntersectionObserver fallback — mounts a sentinel sized to the end of #hero
 *  so the bubbles reveal as soon as the user has scrolled past most of it. */
function installFallbackReveal() {
  if (!("IntersectionObserver" in window) || !state.root) {
    // Last-ditch: just reveal immediately so the page is at least usable.
    state.root?.classList.add("is-active");
    return;
  }

  // Try to anchor the sentinel near the end of #hero. If hero is missing,
  // anchor at the start of #portals' nearest section-sibling, falling back
  // to .portals itself.
  const hero       = document.getElementById("hero");
  const portalsId  = state.root.id || "portals";
  const reference  = hero || document.getElementById(portalsId) || state.root;

  state.fallbackIO = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          state.root.classList.add("is-active");
        }
      }
    },
    {
      // Trigger when the bottom 8% of the reference (≈ end of hero) is in view.
      rootMargin: "0px 0px -92% 0px",
      threshold: 0,
    }
  );

  state.fallbackIO.observe(reference);
}

/** Resolve a CSS selector defensively. */
function resolveTarget(selector) {
  if (!selector) return null;
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

/** Smooth-scroll to a target section, RTL-safe (RTL doesn't affect block axis). */
function scrollToTarget(target) {
  if (!target) return;
  try {
    target.scrollIntoView({
      behavior: state.reducedMotion ? "auto" : "smooth",
      block: "start",
    });
  } catch {
    // Pre-2020 Safari fallback.
    target.scrollIntoView();
  }
}

// ----------------------------------------------------------------------------
// Click — expand timeline (GSAP) or instant scroll (reduced motion / no GSAP).
// ----------------------------------------------------------------------------

function expandPortal({ button, gsap }) {
  if (state.isExpanding) return;          // ignore concurrent clicks
  state.isExpanding = true;

  const targetSel = button.dataset.target;
  const target    = resolveTarget(targetSel);
  const sibling   = state.buttons.find((b) => b !== button);

  // Reduced-motion or no-GSAP fast path: skip the cinematic expand.
  if (state.reducedMotion || !gsap) {
    scrollToTarget(target);
    state.isExpanding = false;
    return;
  }

  // Mark the clicked button and the wrapper so CSS can reorder z-index.
  button.classList.add("is-expanding");
  state.root?.classList.add("is-leaving");

  const tl = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete() {
      scrollToTarget(target);

      // Reset state shortly after the scroll begins. We DON'T leave the bubble
      // expanded full-screen because users can scroll back to the hero.
      window.setTimeout(() => {
        try {
          gsap.set(button, { clearProps: "transform,opacity,scale" });
          if (sibling) {
            gsap.set(sibling, { clearProps: "opacity" });
          }
          state.root?.classList.remove("is-leaving");
          button.classList.remove("is-expanding");
        } catch {
          /* ignore */
        }
        state.isExpanding = false;
      }, SCROLL_RESET_DELAY);
    },
  });

  tl.to(button, {
    scale:    6,
    duration: EXPAND_DURATION,
    ease:     "power3.in",
    transformOrigin: "50% 50%",
  });

  if (sibling) {
    tl.to(
      sibling,
      { opacity: 0, duration: FADE_OUT_DURATION, ease: "power2.out" },
      "-=0.7"
    );
  }
}

// ----------------------------------------------------------------------------
// Reduced-motion live listener — flips behavior without page reload.
// ----------------------------------------------------------------------------

function watchReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return;

  state.reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  state.reducedMotion = state.reducedMQ.matches;

  state.bound.onMediaChange = (e) => {
    state.reducedMotion = e.matches;
    if (state.reducedMotion && state.root) {
      // Force-reveal so users on reduced-motion can always see the portals.
      state.root.classList.add("is-active");
    }
  };

  // Modern + Safari < 14 fallback.
  if (typeof state.reducedMQ.addEventListener === "function") {
    state.reducedMQ.addEventListener("change", state.bound.onMediaChange);
  } else if (typeof state.reducedMQ.addListener === "function") {
    state.reducedMQ.addListener(state.bound.onMediaChange);
  }
}

// ----------------------------------------------------------------------------
// init()
// ----------------------------------------------------------------------------

export function init({ motion } = {}) {
  if (state.initialised) return;

  // 1. Locate DOM. Bail (silently) if markup is missing.
  state.root    = document.querySelector(".portals");
  state.buttons = Array.from(document.querySelectorAll(".portal"));
  if (!state.root || state.buttons.length === 0) {
    return;
  }

  state.initialised = true;
  watchReducedMotion();

  // 2. Wire click handlers (Enter/Space work natively because <button>).
  const gsap = motion && motion.gsap ? motion.gsap : (window.gsap || null);

  state.bound.onClick = (event) => {
    const button = event.currentTarget;
    if (!(button instanceof HTMLElement)) return;
    expandPortal({ button, gsap });
  };

  state.buttons.forEach((b) => {
    b.addEventListener("click", state.bound.onClick);
  });

  // 3. Reduced-motion path: reveal immediately, never wait for hero progress.
  if (state.reducedMotion) {
    state.root.classList.add("is-active");
    return;
  }

  // 4. Try the canonical hero-progress hook from Agent 06.
  waitForHeroHook().then((onProgress) => {
    if (onProgress) {
      try {
        // Subscribe — hero module returns either an unsubscribe fn or undefined.
        const result = onProgress(applyProgress);
        if (typeof result === "function") {
          state.unsubProgress = result;
        }
      } catch (err) {
        // Hero hook errored — fall back to IO so portals still reveal.
        // eslint-disable-next-line no-console
        console.warn("[portals] hero progress hook failed; using IO fallback.", err);
        installFallbackReveal();
      }
    } else {
      // Hero module never appeared (iOS loop fallback OR Agent 6 not yet wired).
      installFallbackReveal();
    }
  });
}

// ----------------------------------------------------------------------------
// destroy()
// ----------------------------------------------------------------------------

export function destroy() {
  if (!state.initialised) return;

  // 1. Unsubscribe progress.
  if (typeof state.unsubProgress === "function") {
    try { state.unsubProgress(); } catch { /* ignore */ }
  }
  state.unsubProgress = null;

  // 2. Clear pending hook-wait poll.
  if (state.hookWaitTimer != null) {
    window.clearTimeout(state.hookWaitTimer);
    state.hookWaitTimer = null;
  }

  // 3. Disconnect IO fallback.
  if (state.fallbackIO) {
    try { state.fallbackIO.disconnect(); } catch { /* ignore */ }
    state.fallbackIO = null;
  }

  // 4. Drop click listeners.
  if (state.bound.onClick) {
    state.buttons.forEach((b) => {
      b.removeEventListener("click", state.bound.onClick);
    });
  }

  // 5. Drop media-query listener.
  if (state.reducedMQ && state.bound.onMediaChange) {
    if (typeof state.reducedMQ.removeEventListener === "function") {
      state.reducedMQ.removeEventListener("change", state.bound.onMediaChange);
    } else if (typeof state.reducedMQ.removeListener === "function") {
      state.reducedMQ.removeListener(state.bound.onMediaChange);
    }
  }

  // 6. Reset state.
  state.initialised  = false;
  state.root         = null;
  state.buttons      = [];
  state.reducedMQ    = null;
  state.bound.onClick       = null;
  state.bound.onMediaChange = null;
  state.isExpanding  = false;
}
