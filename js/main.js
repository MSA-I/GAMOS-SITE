/**
 * GAMOS-SITE — main entry shell
 *
 * Constitution §10.3: JS is module-scoped. ESM modules with `init(el)` + `destroy()`.
 * No globals. Each section module exports an `init()` function that's safe to call
 * even if the DOM nodes are missing (so this entry never throws).
 *
 * Phase A complete (2026-06-01, Agent 15): GSAP fully removed.
 *   - hero-video-scrub uses native scroll listener + RAF.
 *   - portals uses Web Animations API (Element.animate) for the expand timeline.
 *   - This entry boots without any external CDN imports — pure local ESM + DOM.
 */

// Section modules — placeholder shells. Each exposes `init()`.
import * as heroVideoScrub from "./hero-video-scrub.js";
import * as portals        from "./portals.js";
import * as reveals        from "./reveals.js";
import * as accordions     from "./accordions.js";
import * as slider         from "./slider.js";
import * as lenis          from "./lenis.js";

const MODULES = [
  ["lenis",            lenis],
  ["hero-video-scrub", heroVideoScrub],
  ["portals",          portals],
  ["reveals",          reveals],
  ["accordions",       accordions],
  ["slider",           slider],
];

function safeInit(name, mod) {
  try {
    if (mod && typeof mod.init === "function") {
      mod.init();
    } else {
      console.info(`[main] module "${name}" has no init() — skipping.`);
    }
  } catch (err) {
    // Intentionally swallow: a single broken module must not break the page.
    console.error(`[main] module "${name}" init failed:`, err);
  }
}

function bootstrap() {
  for (const [name, mod] of MODULES) {
    safeInit(name, mod);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
