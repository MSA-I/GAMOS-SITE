/**
 * corridor-page.js — entry script for /corridor.html
 *
 * Spec   : C:\Users\art1\.claude\plans\quizzical-stirring-castle.md (Phase 4)
 * Source : arch-corridor-gallery/src/components/ThreeDCorridor.tsx (slideVariants)
 *
 * Responsibilities
 * ----------------
 *   1. Read ?hall=oasis|lumina from URL → set <main data-active-hall="...">.
 *   2. Slide #corridor-page in from translateX(100%) → 0 (matches Hero's
 *      exit-LEFT cinema pan in /index.html).
 *   3. Boot `js/corridor.js` (3D RAF + ornaments + HUD) and
 *      `js/project-drawer.js`.
 *   4. Wire the two side arrows ([data-switch-to="oasis"|"lumina"]) — clicking
 *      runs a spring-style horizontal slide that mirrors motion/react's
 *      `slideVariants` from the prototype.
 *   5. Update arrow visibility (only the "go to OTHER hall" arrow shows).
 *
 * Not used: side-dot-nav, site-nav, scrollytelling, lenis. Corridor.html is
 * a focused immersive view — body has overflow:hidden so the whole stage is
 * a fixed full-viewport container.
 */

import * as corridor      from "./corridor.js";
import * as projectDrawer from "./project-drawer.js";
import { playClick, playWhoosh } from "./audio.js";
import { prefersReducedMotion } from "./utils/media-query.js";

const SLIDE_DURATION = 0.7;
const SLIDE_EASE     = "back.out(1.05)";  // gsap approximation of motion/react spring(220, 28)

document.addEventListener("DOMContentLoaded", boot, { once: true });

function boot() {
  const page = document.getElementById("corridor-page");
  if (!page) return;

  // Reduced motion handling — skip animations.
  const reducedMotion = prefersReducedMotion();

  // 1. Pick initial hall from URL.
  const params = new URLSearchParams(location.search);
  const initialHall = params.get("hall") === "lumina" ? "lumina" : "oasis";
  page.dataset.activeHall = initialHall;
  document.documentElement.dataset.activeHall = initialHall;

  // 2. Sync aria-hidden on each hall section.
  const oasisEl  = page.querySelector('.corridor[data-hall="oasis"]');
  const luminaEl = page.querySelector('.corridor[data-hall="lumina"]');
  applyHallVisibility(initialHall, oasisEl, luminaEl);

  // 3. Boot the corridor module (builds ornaments + HUD + RAF for both halls,
  //    skips paint on aria-hidden scenes).
  try { corridor.init(); } catch (e) { console.error("[corridor-page] corridor.init failed:", e); }

  // 4. Boot the drawer.
  try { projectDrawer.init(); } catch (e) { console.error("[corridor-page] drawer.init failed:", e); }

  // 5. Slide page in from the right (matches Hero's exit-left).
  if (window.gsap && !reducedMotion) {
    window.gsap.fromTo(
      page,
      { x: "100%" },
      {
        x: 0,
        duration: 0.85,
        ease: "expo.inOut",
      }
    );
  } else {
    page.style.transform = "translateX(0)";
  }

  // 6. Wire side-arrow hall switching.
  const arrows = page.querySelectorAll("[data-switch-to]");
  for (const btn of arrows) {
    btn.addEventListener("click", () => {
      const next = btn.dataset.switchTo;
      switchHall(next, oasisEl, luminaEl, reducedMotion);
    });
  }
  updateArrowVisibility(initialHall, page);
}


function switchHall(next, oasisEl, luminaEl, reducedMotion) {
  const page = document.getElementById("corridor-page");
  const current = page.dataset.activeHall;
  if (next === current || (next !== "oasis" && next !== "lumina")) return;

  playClick();
  playWhoosh(next === "lumina");

  page.dataset.activeHall = next;
  document.documentElement.dataset.activeHall = next;

  // Direction logic (matches prototype slideVariants with custom={direction}):
  //   direction = +1 when going to lumina   → outgoing hall exits LEFT, incoming enters from RIGHT
  //   direction = -1 when going back to oasis → outgoing hall exits RIGHT, incoming enters from LEFT
  // BUT we're in RTL: "going right" inside the corridor (oasis → lumina) feels
  // like the user pressed the RIGHT-side arrow, so the outgoing hall should
  // exit toward the LEFT inline-end... we keep the prototype's signs because
  // they were already authored against the same RTL layout used here.
  const direction = next === "lumina" ? 1 : -1;

  if (reducedMotion || !window.gsap) {
    // Instant swap.
    if (next === "oasis") {
      oasisEl.style.transform  = "translateX(0)";
      luminaEl.style.transform = "translateX(100%)";
    } else {
      luminaEl.style.transform = "translateX(0)";
      oasisEl.style.transform  = "translateX(-100%)";
    }
    applyHallVisibility(next, oasisEl, luminaEl);
    return;
  }

  // Spring-like horizontal slide (gsap approximation of motion/react's
  // spring(stiffness:220, damping:28)). Both halls animate in parallel.
  const out = direction > 0 ? "-100%" : "100%";
  const inFrom = direction > 0 ? "100%" : "-100%";

  if (next === "lumina") {
    // oasis exits LEFT, lumina enters from RIGHT.
    window.gsap.to(oasisEl, {
      x: out, opacity: 0, filter: "blur(12px)",
      duration: SLIDE_DURATION, ease: SLIDE_EASE,
    });
    window.gsap.fromTo(
      luminaEl,
      { x: inFrom, opacity: 0, filter: "blur(12px)" },
      {
        x: 0, opacity: 1, filter: "blur(0px)",
        duration: SLIDE_DURATION, ease: SLIDE_EASE,
        onStart: () => luminaEl.removeAttribute("aria-hidden"),
        onComplete: () => oasisEl.setAttribute("aria-hidden", "true"),
      }
    );
  } else {
    // lumina exits RIGHT, oasis enters from LEFT.
    window.gsap.to(luminaEl, {
      x: out, opacity: 0, filter: "blur(12px)",
      duration: SLIDE_DURATION, ease: SLIDE_EASE,
    });
    window.gsap.fromTo(
      oasisEl,
      { x: inFrom, opacity: 0, filter: "blur(12px)" },
      {
        x: 0, opacity: 1, filter: "blur(0px)",
        duration: SLIDE_DURATION, ease: SLIDE_EASE,
        onStart: () => oasisEl.removeAttribute("aria-hidden"),
        onComplete: () => luminaEl.setAttribute("aria-hidden", "true"),
      }
    );
  }

  updateArrowVisibility(next, page);
}


function applyHallVisibility(active, oasisEl, luminaEl) {
  if (!oasisEl || !luminaEl) return;
  if (active === "oasis") {
    oasisEl.removeAttribute("aria-hidden");
    luminaEl.setAttribute("aria-hidden", "true");
  } else {
    luminaEl.removeAttribute("aria-hidden");
    oasisEl.setAttribute("aria-hidden", "true");
  }
}


function updateArrowVisibility(active, page) {
  if (!page) page = document.getElementById("corridor-page");
  if (!page) return;
  const right = page.querySelector(".corridor__hall-arrow--right");
  const left  = page.querySelector(".corridor__hall-arrow--left");
  // While oasis active → show RIGHT arrow (= chevron pointing right in LTR =
  // "go forward to lumina"). While lumina active → show LEFT arrow (= back to oasis).
  if (right) right.hidden = active !== "oasis";
  if (left)  left.hidden  = active !== "lumina";
}
