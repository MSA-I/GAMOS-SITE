/**
 * hero-static.js — Static-image hero with clickable hotspots (2026-06-08)
 *
 * Replaces hero-shader.js. The hero is now a single <picture> (HERO-GAMOS.png)
 * with two transparent <a> hotspots laid over the baked-in EVENTS / RESORT
 * words. Clicking a hotspot:
 *   1) fires playWhoosh (pitch contextual to direction)
 *   2) shows the loading overlay (200ms fade-in)
 *   3) navigates to /halls/dist/{oasis,lumina}/ after a 350ms beat
 *
 * Also installs the window.gamosHero stub so side-dot-nav and any lingering
 * portal-hysteresis consumers unblock. The stub fires onProgress with the
 * actual scroll-relative position of the hero section (0..1 over 100vh of
 * scroll past the hero).
 *
 * Constitution: §2 (no Three.js), §10.3 module-scoped state, ESM init().
 */

import { playWhoosh } from "./audio.js";

const NAV_DELAY_MS = 350;

const state = {
  initialised: false,
  hero: null,
  subs: new Set(),
  lastP: -1,
  ticking: false,
  scrollHandler: null,
};

/** Compute hero scroll-progress (0..1 over the section height) and notify. */
function computeProgress() {
  if (!state.hero) return;
  const r = state.hero.getBoundingClientRect();
  const h = window.innerHeight || 1;
  // Section is 100vh tall; -r.top in [0..h] maps linearly to [0..1].
  const p = Math.max(0, Math.min(1, -r.top / h));
  if (Math.abs(p - state.lastP) < 0.005) return;
  state.lastP = p;
  state.subs.forEach((cb) => { try { cb(p); } catch { /* swallow */ } });
}

function onScroll() {
  if (state.ticking) return;
  state.ticking = true;
  requestAnimationFrame(() => {
    computeProgress();
    state.ticking = false;
  });
}

function installGamosHeroStub() {
  if (window.gamosHero && typeof window.gamosHero.onProgress === "function") return;

  window.gamosHero = {
    onProgress(cb) {
      if (typeof cb !== "function") return () => {};
      state.subs.add(cb);
      // Fire current progress immediately so the consumer initialises.
      try { cb(state.lastP < 0 ? 0 : state.lastP); } catch { /* swallow */ }
      return () => { state.subs.delete(cb); };
    },
    get duration() { return 0; },
    get progress() { return state.lastP < 0 ? 0 : state.lastP; },
    get stage() { return state.lastP >= 0.85 ? "released" : "active"; },
    get titleProgress() { return 1; },
    get portalsVisible() { return false; },
  };
}

function bindHotspot(link) {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    const isResort = link.dataset.heroLink === "resort";
    try { playWhoosh(isResort); } catch { /* audio is best-effort */ }
    try { window.gamosLoading && window.gamosLoading.show(); } catch { /* ignore */ }
    const target = link.href;
    setTimeout(() => { window.location.href = target; }, NAV_DELAY_MS);
  });
}

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  const hero = document.querySelector("#hero.hero-static");
  if (!hero) {
    // Hero not on the page (e.g., a sub-page). Install stub anyway so any
    // consumer that subscribes to gamosHero gets a synthetic 1-progress.
    state.lastP = 1;
    installGamosHeroStub();
    state.initialised = true;
    return;
  }

  state.hero = hero;
  installGamosHeroStub();

  // Wire hotspot clicks.
  hero.querySelectorAll("[data-hero-link]").forEach(bindHotspot);

  // Drive progress from scroll.
  state.scrollHandler = onScroll;
  window.addEventListener("scroll", state.scrollHandler, { passive: true });
  // Initial compute so subscribers settle on the right value.
  requestAnimationFrame(computeProgress);

  state.initialised = true;
}

export function destroy() {
  if (state.scrollHandler) {
    window.removeEventListener("scroll", state.scrollHandler);
    state.scrollHandler = null;
  }
  state.subs.clear();
  state.hero = null;
  state.lastP = -1;
  state.initialised = false;
}
