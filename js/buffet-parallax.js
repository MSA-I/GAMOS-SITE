/**
 * buffet-parallax.js — subtle vertical parallax for #buffet band images.
 *
 * Port of the Desktop reference (Buffet-Parallax-standalone.html) RAF parallax
 * into the site's ESM init()/destroy() contract (§10). Each [data-par] element
 * (the .band__par viewport inside a .band__fig) is translated on the Y axis by
 *   translateY = -( (elCenter - viewportCenter) / viewportHeight ) * par * 100  px
 * so images drift gently as the band scrolls through view. RAF-throttled.
 *
 * Reveal is owned by reveals.js — this module only does the parallax.
 *
 * Reduced motion: early-exit (leaves the CSS guard `.band__par{transform:none}`
 * intact — we never write inline transforms in that mode).
 *
 * Constitution: §2 (vanilla, no framework), §8 (reduced-motion), §10 (module-scoped).
 */

let els = [];
let ticking = false;
let mqlReduce = null;
let mqlListener = null;

function update() {
  const H = window.innerHeight || document.documentElement.clientHeight;
  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const r = el.getBoundingClientRect();
    const off = (r.top + r.height / 2 - H / 2) / H;
    const f = parseFloat(el.getAttribute("data-par")) || 0.1;
    el.style.transform = "translateY(" + (-off * f * 100).toFixed(1) + "px)";
  }
}

function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    update();
    ticking = false;
  });
}

export function init() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (els.length) return; // idempotent

  mqlReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mqlReduce.matches) {
    // honor the CSS guard — do not write inline transforms; re-init if toggled off
    mqlListener = (e) => { if (!e.matches) init(); };
    if (mqlReduce.addEventListener) mqlReduce.addEventListener("change", mqlListener);
    return;
  }

  els = [].slice.call(document.querySelectorAll("#buffet [data-par]"));
  if (!els.length) return;

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  update();
}

export function destroy() {
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", onScroll);
  els.forEach((el) => { el.style.transform = ""; });
  els = [];
  ticking = false;
  if (mqlReduce && mqlListener && mqlReduce.removeEventListener) {
    mqlReduce.removeEventListener("change", mqlListener);
  }
  mqlReduce = null;
  mqlListener = null;
}

export default { init, destroy };
