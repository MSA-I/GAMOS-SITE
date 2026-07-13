/**
 * events-gallery.js — #events "סוגי אירועים" editorial fixed-preview gallery.
 *
 * 2026-07-13 v3 (user-chosen redesign; replaces the WebGL mouse-distortion
 * port — see git history): a framed preview panel sits beside the row list
 * and swaps its image when a row activates. The swap is a two-layer
 * clip-path wipe: the incoming layer reveals top→down over the outgoing one
 * (which stays put underneath — no empty frame, ever). Row 1 is active by
 * default and leaving the list keeps the last image, so the panel is always
 * populated. Pure DOM+CSS — no WebGL, no GSAP.
 *
 * Activation:
 *   - Fine pointers: pointerover / keyboard focusin on a row.
 *   - Coarse pointers / ≤768px (§13 rule 8): center-band IntersectionObserver
 *     activates the row crossing mid-viewport while scrolling; the sticky
 *     panel (mobile/css/events.css) swaps in view. matchMedia change
 *     listeners re-wire the branch on rotation/resize.
 *
 * Perf (§8): images warm one viewport ahead (one-shot IO; nothing at boot),
 * coarse viewports use the .half.webp variants. Reduced motion (live
 * subscription): the wipe collapses to an instant swap (CSS handles it).
 *
 * Contract: ES2022 module, init()/destroy(), self-no-ops without
 * [data-events-stage]. No globals. §9: rows are native links with stable
 * aria-labels; the panel is aria-hidden decoration.
 */

const COARSE_QUERY = "(max-width: 768px)";
const NO_HOVER_QUERY = "(hover: none)";

let _stage = null;
let _list = null;
let _rows = [];
let _layers = [];   // two .events__preview-img elements
let _front = 0;     // index into _layers of the currently shown layer
let _active = null;
let _coarse = false;

let _preIO = null;
let _rowIO = null;
let _listeners = [];
let _mqlWidth = null;
let _mqlHover = null;
let _warmed = false;

function on(target, type, handler, opts) {
  target.addEventListener(type, handler, opts);
  _listeners.push([target, type, handler, opts]);
}

/* Coarse viewports get the .half variant (mobile/loader.js convention). */
function imageUrl(row) {
  const src = row.dataset.image || "";
  return _coarse ? src.replace(".full.", ".half.") : src;
}

function warmImages() {
  if (_warmed) return;
  _warmed = true;
  for (const row of _rows) {
    const src = imageUrl(row);
    if (src) { const img = new Image(); img.src = src; }
  }
  // First paint of the panel happens here too (§8 — the default image is not
  // fetched at boot; the panel fills one viewport before the section shows).
  if (_active) {
    const src = imageUrl(_active);
    if (src) showImage(src, true);
  }
}

/* ---- Panel swap: incoming layer wipes in over the outgoing one ---- */

function showImage(src, instant) {
  const back = 1 - _front;
  const incoming = _layers[back];
  const outgoing = _layers[_front];
  incoming.style.backgroundImage = `url("${src}")`;
  if (instant) {
    // First paint: no wipe, just show it.
    incoming.classList.add("is-shown", "no-transition");
    void incoming.offsetWidth; // commit before re-enabling transitions
    incoming.classList.remove("no-transition");
  } else {
    incoming.classList.add("is-shown"); // CSS transitions clip-path + scale
  }
  // The outgoing layer resets beneath once the wipe is over; hiding it with
  // transitions off avoids a reverse-wipe flash.
  outgoing.classList.add("no-transition");
  outgoing.classList.remove("is-shown");
  void outgoing.offsetWidth;
  outgoing.classList.remove("no-transition");
  _front = back;
}

function setActive(row, instant = false) {
  if (row === _active) return;
  _active = row;
  for (const r of _rows) r.classList.toggle("is-active", r === row);
  if (!_warmed) return; // pre-warm: class only; warmImages paints the panel
  const src = imageUrl(row);
  if (src) showImage(src, instant);
}

function activateFrom(e) {
  const row = e.target.closest(".events__row");
  if (row && row !== _active && _list.contains(row)) setActive(row);
}

/* ---- init / destroy ---- */

function onBreakpointChange() {
  destroy();
  init();
}

export function init() {
  _stage = document.querySelector("#events [data-events-stage]");
  if (!_stage) return;
  _list = _stage.querySelector("[data-events-list]");
  _rows = Array.from(_stage.querySelectorAll(".events__row"));
  _layers = Array.from(_stage.querySelectorAll("[data-events-img]"));
  if (!_list || _rows.length === 0 || _layers.length !== 2) return;
  _front = 0;

  _mqlWidth = window.matchMedia(COARSE_QUERY);
  _mqlHover = window.matchMedia(NO_HOVER_QUERY);
  _coarse = _mqlWidth.matches || _mqlHover.matches;
  _mqlWidth.addEventListener("change", onBreakpointChange);
  _mqlHover.addEventListener("change", onBreakpointChange);
  // Reduced motion is handled entirely in CSS (the wipe/scale transitions
  // collapse under prefers-reduced-motion) — no JS subscription needed.

  // Row 1 active from the start (class only — the image itself paints in
  // warmImages, one viewport before the section, so nothing loads at boot).
  setActive(_rows[0], true);

  // Warm the row images one viewport before the section (§8 — not at boot).
  _preIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      warmImages();
      _preIO.disconnect();
      _preIO = null;
    }
  }, { rootMargin: "100% 0px" });
  _preIO.observe(_stage);

  if (_coarse) {
    // Scroll-driven activation: the row crossing the viewport's center band
    // becomes active. Tap = plain link navigation to #contact (no trap).
    _rowIO = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) setActive(entry.target);
      }
    }, { rootMargin: "-40% 0px -40% 0px", threshold: 0 });
    for (const row of _rows) _rowIO.observe(row);
  } else {
    on(_list, "pointerover", activateFrom);
    on(_list, "focusin", activateFrom);
    // Deliberately no pointerleave clear — the last image stays (calm).
  }
}

export function destroy() {
  for (const [t, type, h, o] of _listeners) t.removeEventListener(type, h, o);
  _listeners = [];
  if (_mqlWidth) { _mqlWidth.removeEventListener("change", onBreakpointChange); _mqlWidth = null; }
  if (_mqlHover) { _mqlHover.removeEventListener("change", onBreakpointChange); _mqlHover = null; }
  if (_preIO) { _preIO.disconnect(); _preIO = null; }
  if (_rowIO) { _rowIO.disconnect(); _rowIO = null; }
  for (const layer of _layers) {
    layer.classList.remove("is-shown", "no-transition");
    layer.style.backgroundImage = "";
  }
  for (const r of _rows) r.classList.remove("is-active");
  _stage = _list = _active = null;
  _rows = [];
  _layers = [];
  _front = 0;
  // _warmed intentionally survives re-init — images are already in cache.
}
