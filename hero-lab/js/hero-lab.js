/* =========================================================================
   GAMOS · Hero Lab — scroll/entrance orchestrator (sandbox)
   - Lenis smooth scroll (self-hosted vendor)
   - GSAP entrance timeline on load (--enter 0 → 1)
   - ScrollTrigger scrub over the 500vh track (writes --p 0 → 1)
   Defensive: if any vendor is missing OR the user prefers reduced motion,
   it forces the finished static frame (--enter:1) and bails — never a blank
   or half-revealed hero.
   ========================================================================= */

const root = document.documentElement;
const hero = document.querySelector(".hero_root");
const stage = document.querySelector(".hero_top");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Guarantee the scene is shown in its finished state. Called on every bail. */
function showFinishedFrame() {
  root.style.setProperty("--enter", "1");
}

/** Vendors are loaded with `defer`; this module is `type=module` (also deferred),
 *  but order is not guaranteed across defer+module. Poll briefly for the globals. */
function waitForVendors(timeoutMs = 3000) {
  return new Promise((resolve) => {
    const start = performance.now();
    (function poll() {
      const hasGsap = !!window.gsap;
      const hasST = !!(window.ScrollTrigger || (window.gsap && window.gsap.ScrollTrigger));
      if (hasGsap && hasST) return resolve(true);
      if (performance.now() - start > timeoutMs) return resolve(false);
      requestAnimationFrame(poll);
    })();
  });
}

function initLenis() {
  if (reduceMotion || typeof window.Lenis !== "function") return null;
  try {
    const lenis = new window.Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      smoothTouch: false, // §8 spirit: never smooth-scroll touch (jank)
    });
    return lenis;
  } catch (e) {
    console.warn("[hero-lab] Lenis init failed, native scroll:", e.message);
    return null;
  }
}

async function main() {
  if (!hero || !stage) return showFinishedFrame();

  // Reduced motion → render the tasteful static frame the CSS already defines.
  if (reduceMotion) return showFinishedFrame();

  const ok = await waitForVendors();
  if (!ok) {
    console.warn("[hero-lab] GSAP/ScrollTrigger unavailable — static fallback.");
    return showFinishedFrame();
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger || gsap.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  // ---- Lenis ↔ ScrollTrigger sync -------------------------------------------
  const lenis = initLenis();
  if (lenis) {
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  // ---- Entrance timeline (--enter 0 → 1) ------------------------------------
  // We animate a single proxy value and write it to the CSS var each tick, so
  // the entrance composes with the scroll var without competing for transforms.
  const enterState = { v: 0 };
  gsap.to(enterState, {
    v: 1,
    duration: 1.5,
    ease: "power3.out",
    delay: 0.1,
    onUpdate: () => root.style.setProperty("--enter", enterState.v.toFixed(4)),
    onComplete: () => root.style.setProperty("--enter", "1"),
  });

  // ---- Scroll scrub (--p 0 → 1 across the 500vh track) ----------------------
  const scrubState = { v: 0 };
  ScrollTrigger.create({
    trigger: hero,
    start: "top top",
    end: "bottom bottom", // full 500vh
    // scrub 0.1 matches FIND's main ScrollTrigger (was 0.6) — the animation
    // tracks the scroll wheel tighter/more responsively, less lag. (Compared
    // against findrealestate-clone via hero-lab/scripts/compare-find-vs-lab.mjs.)
    scrub: 0.1,
    onUpdate: (self) => {
      scrubState.v = self.progress;
      root.style.setProperty("--p", self.progress.toFixed(4));
    },
  });

  // RF3 — per-path stroke length for the outline draw. Each outline <path> gets
  // its TRUE perimeter (getTotalLength) written to a `--len` CSS var, so the
  // dasharray/dashoffset draw is even across every glyph (instead of a shared
  // 300 approximation). The CSS falls back to 300 if this never runs.
  measureOutlinePaths();

  // keep ST honest if images resize the layout late, and re-measure path lengths
  // after load (layout settled).
  window.addEventListener("load", () => { measureOutlinePaths(); ScrollTrigger.refresh(); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => { measureOutlinePaths(); ScrollTrigger.refresh(); });
  }
}

/** Write each outline path's true length to a `--len` CSS var for an even draw. */
function measureOutlinePaths() {
  const paths = document.querySelectorAll(".layer--outline .wordmark-svg path");
  paths.forEach((p) => {
    try {
      const len = p.getTotalLength();
      if (len > 0) p.style.setProperty("--len", String(Math.ceil(len)));
    } catch { /* getTotalLength unsupported — CSS fallback (300) applies */ }
  });
}

main().catch((e) => {
  console.error("[hero-lab] init error, showing static frame:", e);
  showFinishedFrame();
});
