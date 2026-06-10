/**
 * main-press.js — Entry shell for /press/ (מן העיתונות)
 *
 * Constitution §10.3: ESM module-scoped, init/destroy contract.
 *
 * Per user mandate ("אין NAV BAR בדף הזה"), no top nav exists on this page.
 * The site-nav module is NOT loaded — there's nothing for it to bind to.
 *
 * Page-local concern: while the user is over the dark hero photograph, the
 * floating "חזרה לאתר" home link sits ivory-on-transparent. Once scrolled past
 * the hero (>90vh), it adopts an ivory pill so it stays legible against the
 * editorial intro on ivory. We toggle [data-press-hero] on <html> for that.
 */

import * as reveals from "./reveals.js";
import * as pressShader from "./press-shader.js";

const MODULES = [
  ["reveals", reveals],
  ["press-shader", pressShader],
];

function safeInit(name, mod) {
  try {
    if (mod && typeof mod.init === "function") {
      mod.init();
    }
  } catch (err) {
    console.error(`[main-press] module "${name}" init failed:`, err);
  }
}

/* ---------------------------------------------------------------------------
   Hero-mode: html[data-press-hero="true"] while scrollY < 90vh.
   Single rAF-throttled scroll listener, passive.
   -------------------------------------------------------------------------*/

const html = document.documentElement;
let ticking = false;
let lastY = -1;

function updateHeroMode() {
  ticking = false;
  const y = window.scrollY;
  if (y === lastY) return;
  lastY = y;
  const threshold = window.innerHeight * 0.9;
  if (y < threshold) {
    html.setAttribute("data-press-hero", "true");
  } else {
    html.removeAttribute("data-press-hero");
  }
}

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(updateHeroMode);
    ticking = true;
  }
}

function bootstrap() {
  for (const [name, mod] of MODULES) {
    safeInit(name, mod);
  }
  // Set initial state synchronously so the first paint is correct.
  updateHeroMode();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
