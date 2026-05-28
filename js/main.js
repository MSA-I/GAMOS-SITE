/**
 * GAMOS-SITE — main entry shell
 *
 * Constitution §10.3: JS is module-scoped. ESM modules with `init(el)` + `destroy()`.
 * No globals. Each section module exports an `init()` function that's safe to call
 * even if the DOM nodes are missing (so this entry never throws).
 *
 * GSAP + ScrollTrigger come from CDN at this stage. Agent 6 / Agent 9 may
 * later swap to a self-hosted bundle once Phase 2b decides.
 */

import { gsap }          from "https://cdn.skypack.dev/gsap@3.12.5";
import ScrollTrigger     from "https://cdn.skypack.dev/gsap@3.12.5/ScrollTrigger";

// Register GSAP plugins once, defensively (CDN module may already register).
try {
  gsap.registerPlugin(ScrollTrigger);
} catch (err) {
  console.warn("[main] GSAP plugin registration skipped:", err);
}

// Expose minimally to other modules (read-only handle; not a global API).
const motion = Object.freeze({ gsap, ScrollTrigger });

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
      mod.init({ motion });
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
