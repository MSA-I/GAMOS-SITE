/* ===========================================================================
   shabbat-gallery.js — DOM port of David Faure's horizontal parallax gallery
   (https://github.com/davidfaure/horizontal-parallax-gallery-codrops, MIT).

   Architecture: this section is a normal scroll-scene driven by the site's
   scroll orchestrator (data-scrub-mode="custom", data-scrub-handler=
   "gamosShabbat"). The orchestrator calls window.gamosShabbat(p) each frame
   with p ∈ [0,1] mapped from the section's vertical scroll progress. We
   translate the row horizontally and apply Faure's per-image counter-motion
   (translate3d(±t * 10%) where t = clamp((center - vc) / vc, -1, 1)).

   No wheel hijack, no scroll lock, no engage/disengage. The page scrolls
   naturally; the user is never trapped.

   Constitution §2 (vanilla, no framework), §4 (RTL), §10 (module-scoped).
   ========================================================================= */

const SECTION_SELECTOR = "#shabbat-chatan";
const WRAPPER_SELECTOR = ".gallery__wrapper";
const ROW_SELECTOR     = ".gallery__image__container";
const IMG_SELECTOR     = ".gallery__media__image";

const MAX_SHIFT_PCT    = 10;
const MOBILE_MAX       = 640;

let _section = null;
let _wrapper = null;
let _container = null;
let _images = [];
let _maxScroll = 0;
let _isRTL = false;
let _ro = null;
let _onLoad = null;

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function recomputeMaxScroll() {
  if (!_container || !_wrapper) return;
  _maxScroll = Math.max(0, _container.scrollWidth - _wrapper.clientWidth);
}

export function init() {
  _section = document.querySelector(SECTION_SELECTOR);
  if (!_section) return;
  _wrapper = _section.querySelector(WRAPPER_SELECTOR);
  _container = _section.querySelector(ROW_SELECTOR);
  if (!_wrapper || !_container) return;
  _images = Array.from(_section.querySelectorAll(IMG_SELECTOR));
  _isRTL = document.documentElement.dir === "rtl";

  if (REDUCED_MOTION || window.innerWidth <= MOBILE_MAX) return;

  recomputeMaxScroll();
  if (typeof ResizeObserver !== "undefined") {
    _ro = new ResizeObserver(recomputeMaxScroll);
    _ro.observe(_wrapper);
  }
  _onLoad = recomputeMaxScroll;
  window.addEventListener("load", _onLoad, { once: true });
}

export function destroy() {
  if (_ro) { _ro.disconnect(); _ro = null; }
  if (_onLoad) {
    window.removeEventListener("load", _onLoad);
    _onLoad = null;
  }
  if (_container) _container.style.transform = "";
  for (const img of _images) img.style.transform = "";
  if (typeof window.gamosShabbat === "function") {
    try { delete window.gamosShabbat; } catch { window.gamosShabbat = undefined; }
  }
  _section = _wrapper = _container = null;
  _images = [];
  _maxScroll = 0;
}

window.gamosShabbat = function gamosShabbat(p) {
  if (!_container) return;
  if (REDUCED_MOTION || window.innerWidth <= MOBILE_MAX) return;
  const v = p < 0 ? 0 : p > 1 ? 1 : p;
  const scroll = v * _maxScroll;
  const tx = _isRTL ? scroll : -scroll;
  _container.style.transform = `translate3d(${tx}px, 0, 0)`;

  const vc = window.innerWidth / 2;
  for (let i = 0; i < _images.length; i++) {
    const img = _images[i];
    const parent = img.parentElement;
    if (!parent) continue;
    const r = parent.getBoundingClientRect();
    const ec = r.left + r.width / 2;
    let t = (ec - vc) / vc;
    if (t < -1) t = -1; else if (t > 1) t = 1;
    const shift = (_isRTL ? +t : -t) * MAX_SHIFT_PCT;
    img.style.transform = `translate3d(${shift}%, 0, 0)`;
  }
};
