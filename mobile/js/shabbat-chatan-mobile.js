/* ===========================================================================
   mobile/js/shabbat-chatan-mobile.js — interleave panels with images on ≤768px

   The desktop CSS keeps panels and media in two columns (.shabbat__panels +
   .shabbat__stage). On mobile we want a single column where the cadence is
   panel-image-panel-image-… To do that without restructuring the DOM,
   mobile/css/shabbat-chatan.css sets `display: contents` on the two columns
   so all children flow into the parent flex .shabbat__container; this module
   then writes a CSS `order` on each child to interleave them.

   Pen reference: the original CodePen does the same thing in vanilla JS via
   handleMobileLayout(). Mirrored here. The matching ScrollTriggers for the
   per-image object-position pan are owned by js/shabbat-gallery.js (mobile
   branch) — this file only handles the layout interleave.

   Constitution §13: lives under mobile/, no global pollution, init/destroy.
   ========================================================================= */

const SECTION = "#shabbat-chatan";
const PANEL = ".shabbat__panel";
const MEDIA = ".shabbat__media";
const MQ = "(max-width: 768px)";

let _section = null;
let _mql = null;
let _onChange = null;

function nudgeScrollTrigger() {
  // After we mutate style.order on panels/media, the layout shifts. Any
  // ScrollTrigger registered against these elements must re-measure or its
  // start/end values stay anchored to the pre-shift positions. Defer by one
  // frame so the browser commits the layout pass first.
  if (typeof window.ScrollTrigger === "undefined") return;
  requestAnimationFrame(() => {
    try { window.ScrollTrigger.refresh(); } catch { /* ignore */ }
  });
}

function applyOrder(isMobile) {
  if (!_section) return;
  const panels = Array.from(_section.querySelectorAll(PANEL));
  const media = Array.from(_section.querySelectorAll(MEDIA));
  if (isMobile) {
    panels.forEach((el, i) => { el.style.order = String(i * 2); });
    media.forEach((el, i) => { el.style.order = String(i * 2 + 1); });
  } else {
    panels.forEach(el => { el.style.order = ""; });
    media.forEach(el => { el.style.order = ""; });
  }
}

export function init() {
  // Idempotency guard — calling init() twice would otherwise rebind the
  // change listener and leak the previous closure for the page lifetime.
  if (_section) return;
  _section = document.querySelector(SECTION);
  if (!_section) return;
  _mql = window.matchMedia(MQ);
  applyOrder(_mql.matches);
  nudgeScrollTrigger();
  _onChange = (e) => { applyOrder(e.matches); nudgeScrollTrigger(); };
  if (typeof _mql.addEventListener === "function") {
    _mql.addEventListener("change", _onChange);
  } else if (typeof _mql.addListener === "function") {
    // Safari < 14 fallback
    _mql.addListener(_onChange);
  }
}

export function destroy() {
  if (_mql && _onChange) {
    if (typeof _mql.removeEventListener === "function") {
      _mql.removeEventListener("change", _onChange);
    } else if (typeof _mql.removeListener === "function") {
      _mql.removeListener(_onChange);
    }
  }
  if (_section) {
    _section.querySelectorAll(`${PANEL}, ${MEDIA}`).forEach(el => {
      el.style.order = "";
    });
  }
  _section = null;
  _mql = null;
  _onChange = null;
}
