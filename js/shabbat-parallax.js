/* ===========================================================================
   shabbat-parallax.js — multi-panel port of olivierlarose/parallax-scroll

   Each panel is the repo's exact 3-image absolute layout (50vh×60vh,
   30vh×40vh, 20vh×25vh at left 55vw / 27.5vw, top 15vh / 40vh). With
   N=4 panels, the inner stack is 400vh tall and translates 0 → -300vh
   across the section's scroll band — so each panel passes through the
   100vh viewport in turn.

   Variables written to the section root each frame:
     --shabbat-progress : global 0..1 (drives title-1 -50px scrub)
     --shabbat-stack-y  : vh units, 0 → -(N-1)*100  (panel-stack translate)

   Variables written per panel (data-shabbat-panel="i"):
     --panel-progress   : local 0..1 over [i/N, (i+1)/N] of global p

   Per-letter <span>:
     --letter-y         : px, p × random rate ∈ [-100..-25]
                          (matches repo: Math.floor(Math.random() * -75) - 25)

   Constitution §2 (vanilla, no frameworks), §10.3 (module-scoped state).
   ========================================================================= */

const SECTION_ID = "shabbat-chatan";
const LETTER_SELECTOR = "[data-shabbat-letter]";
const PANEL_SELECTOR  = "[data-shabbat-panel]";

/** @type {HTMLElement | null} */
let _section = null;

/** @type {Array<{ el: HTMLElement, rate: number }>} */
let _letters = [];

/** @type {HTMLElement[]} */
let _panels = [];

/** @type {number} */
let _panelCount = 0;

const _reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Random integer in [-100, -25] — matches repo's
 *  `Math.floor(Math.random() * -75) - 25`. */
function randomLetterRate() {
  return Math.floor(Math.random() * -75) - 25;
}

function clamp01(v) {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function init() {
  _section = document.getElementById(SECTION_ID);
  if (!_section) return;

  _panels = Array.from(_section.querySelectorAll(PANEL_SELECTOR));
  _panelCount = _panels.length || 1;

  // Mirror panel count in CSS (the stack height is N*100vh).
  _section.style.setProperty("--shabbat-panel-count", String(_panelCount));

  const letterEls = _section.querySelectorAll(LETTER_SELECTOR);
  _letters = Array.from(letterEls).map((el) => ({
    el,
    rate: _reducedMotion ? 0 : randomLetterRate(),
  }));

  // Initial paint: anchor at p=0 so panel-1 + repo composition are
  // visible before the user has scrolled past culinary.
  _section.style.setProperty("--shabbat-progress", "0");
  _section.style.setProperty("--shabbat-stack-y", "0");
  for (const panel of _panels) {
    panel.style.setProperty("--panel-progress", "0");
  }

  // Expose handler so scroll-scene.js's custom-mode resolver finds it.
  // data-scrub-handler="gamosShabbat" → window.gamosShabbat(p).
  window.gamosShabbat = (p) => {
    if (!_section) return;

    _section.style.setProperty("--shabbat-progress", String(p));

    // Stack translation: 0 → -(N-1)*100 in vh.
    const stackY = -p * (_panelCount - 1) * 100;
    _section.style.setProperty("--shabbat-stack-y", stackY.toFixed(2));

    // Per-panel local progress: each panel runs 0→1 over its 1/N band.
    // Panel i is "active" while p ∈ [i/N, (i+1)/N].
    const seg = 1 / _panelCount;
    for (let i = 0; i < _panels.length; i++) {
      const local = clamp01((p - i * seg) / seg);
      _panels[i].style.setProperty("--panel-progress", local.toFixed(4));
    }

    // Per-letter parallax — same range as repo (random rate baked in).
    for (let i = 0; i < _letters.length; i++) {
      const { el, rate } = _letters[i];
      el.style.setProperty("--letter-y", `${(p * rate).toFixed(2)}px`);
    }
  };
}

export function destroy() {
  if (window.gamosShabbat) delete window.gamosShabbat;
  _section = null;
  _letters = [];
  _panels = [];
  _panelCount = 0;
}
