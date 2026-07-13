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
 *   - Coarse pointers / ≤768px: the module does NOTHING — the phone layout
 *     is stacked cards (mobile/css/events.css): each row shows its own
 *     <picture> (native lazy, .half.webp source) with the description
 *     always visible. No sticky panel, no scroll-driven state (§13 rule 8
 *     is met by the card layout itself). matchMedia change listeners
 *     re-wire on rotation/resize.
 *
 * Perf (§8): desktop images warm one viewport ahead (one-shot IO; nothing
 * at boot). Reduced motion: the wipe collapses to an instant swap (CSS).
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
let _listeners = [];
let _mqlWidth = null;
let _mqlHover = null;
let _warmed = false;

function on(target, type, handler, opts) {
  target.addEventListener(type, handler, opts);
  _listeners.push([target, type, handler, opts]);
}

function imageUrl(row) {
  return row.dataset.image || "";
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

/* ---- Panel swap: incoming layer wipes in OVER the still-visible outgoing
   one (z-index toggle), which is hidden only after the wipe completes — the
   panel never shows a blank frame, even during rapid hover sweeps (a swap
   arriving mid-wipe first snaps the current wipe to its final state so the
   panel stays fully covered). ---- */

const WIPE_MS = 760; // clip-path 700ms + headroom

let _swapTimer = 0;

/* Complete a layer's in-flight transition instantly (state unchanged). */
function snapLayer(layer) {
  layer.classList.add("no-transition");
  void layer.offsetWidth;
  layer.classList.remove("no-transition");
}

/* Reset a layer to its hidden state without animating a reverse wipe. */
function hideLayer(layer) {
  layer.classList.add("no-transition");
  layer.classList.remove("is-shown");
  void layer.offsetWidth;
  layer.classList.remove("no-transition");
}

function showImage(src, instant) {
  const back = 1 - _front;
  const incoming = _layers[back];
  const outgoing = _layers[_front];
  window.clearTimeout(_swapTimer);
  snapLayer(outgoing);  // mid-wipe? complete it — full coverage before we start
  hideLayer(incoming);  // also finalizes a pending deferred hide
  incoming.style.backgroundImage = `url("${src}")`;
  incoming.style.zIndex = "2";
  outgoing.style.zIndex = "1";
  if (instant) {
    incoming.classList.add("is-shown", "no-transition");
    void incoming.offsetWidth; // commit before re-enabling transitions
    incoming.classList.remove("no-transition");
    hideLayer(outgoing);
  } else {
    incoming.classList.add("is-shown"); // CSS wipes it in over the outgoing
    _swapTimer = window.setTimeout(() => hideLayer(outgoing), WIPE_MS);
  }
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

  // Coarse pointers get the stacked-card layout (mobile/css/events.css) —
  // the panel is hidden, every card shows its own natively-lazy <picture>,
  // and there is no activation state at all. Only the re-wire listeners
  // above stay armed so a rotation to desktop boots the panel behavior.
  if (_coarse) return;

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

  on(_list, "pointerover", activateFrom);
  on(_list, "focusin", activateFrom);
  // Deliberately no pointerleave clear — the last image stays (calm).
}

export function destroy() {
  for (const [t, type, h, o] of _listeners) t.removeEventListener(type, h, o);
  _listeners = [];
  if (_mqlWidth) { _mqlWidth.removeEventListener("change", onBreakpointChange); _mqlWidth = null; }
  if (_mqlHover) { _mqlHover.removeEventListener("change", onBreakpointChange); _mqlHover = null; }
  if (_preIO) { _preIO.disconnect(); _preIO = null; }
  window.clearTimeout(_swapTimer);
  _swapTimer = 0;
  for (const layer of _layers) {
    layer.classList.remove("is-shown", "no-transition");
    layer.style.backgroundImage = "";
    layer.style.zIndex = "";
  }
  for (const r of _rows) r.classList.remove("is-active");
  _stage = _list = _active = null;
  _rows = [];
  _layers = [];
  _front = 0;
  // _warmed intentionally survives re-init — images are already in cache.
}
