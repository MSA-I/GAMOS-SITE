/**
 * events-gallery.js — #events "סוגי אירועים" hover-list gallery.
 *
 * 2026-07-13: vanilla port of the "Music Portfolio" hover-list template
 * (React reference supplied by the user), replacing the <details> accordion.
 *
 * Behavior:
 *   - Fine-pointer viewports: hovering / keyboard-focusing a row swaps the
 *     floating background image (CSS scale-in transition), dims sibling rows,
 *     and scrambles the row's text with Hebrew glyphs (GSAP ScrambleTextPlugin,
 *     self-hosted in assets/vendor/).
 *   - Coarse/narrow viewports (≤768px OR hover:none — so landscape phones and
 *     tablets are covered too): an IntersectionObserver center band activates
 *     the row crossing the middle of the viewport while scrolling (§13 rule 8
 *     — equivalent experience). A tap always navigates to #contact.
 *     A matchMedia change listener tears down and re-wires the branch on
 *     resize/rotation, so the gallery is never left inert.
 *   - Idle: after 4s without interaction (hover-capable only, section
 *     on-screen), a repeating GSAP timeline flickers row opacities.
 *
 * Reveal coupling: rows carry [data-reveal] for the entrance stagger, but
 * motion-reveals.css leaves a permanent opacity/transform transition (with
 * per-row --reveal-delay) on [data-reveal] elements, which would smear the
 * sibling-dim and the idle flicker. Once reveals.js marks a row .is-visible
 * we STRIP data-reveal + the inline --reveal-delay (stripRevealed) — the
 * entrance already happened, and the row returns to plain-CSS control.
 * Un-revealed rows are excluded from dim/flicker (CSS :not([data-reveal])
 * guard + revealedRows() filter) so activation can never expose a row that
 * hasn't done its entrance yet.
 *
 * i18n safety: scramble captures the cell's ORIGINAL text NODE before the
 * tween starts and re-installs that same node (with the captured live text)
 * on kill/complete — js/i18n.js caches translations by text-node identity
 * (state.origText), so replacing nodes would permanently break language
 * switching on scrambled cells. Target text is read live at activation time.
 * A11y: rows are native links with a stable aria-label; reduced-motion is a
 * LIVE subscription (onReducedMotionChange) — enabling it mid-session stops
 * scramble + flicker immediately.
 *
 * Perf (§8): row images are NOT fetched at boot — a one-shot IO with a
 * one-viewport rootMargin warms them just before the section approaches,
 * and coarse viewports fetch the .half.webp variants (the same naming
 * convention mobile/loader.js uses for <picture> sources).
 *
 * Contract: ES2022 module, init()/destroy(), self-no-ops without
 * [data-events-stage]. GSAP consumed as the vendor global. Constitution:
 * §2 (vendor plugins), §9 (WCAG 2.2 AA), §10 (module contract), §13.
 */

import { prefersReducedMotion, isMobile, onReducedMotionChange } from "./utils/media-query.js";

const HEBREW_CHARS = "אבגדהוזחטיכלמנסעפצקרשת";
const IDLE_DELAY_MS = 4000;
const COARSE_QUERY = "(max-width: 768px)";
const NO_HOVER_QUERY = "(hover: none)";

let _stage = null;
let _list = null;
let _bgEl = null;
let _rows = [];
let _active = null;
let _reduced = false;
let _coarse = false;
let _scrambleReady = false;

let _idleTimer = 0;
let _idleTl = null;
let _flickerRows = [];
let _sectionVisible = false;
let _visIO = null;
let _preIO = null;
let _rowIO = null;
let _scrambles = []; // { tween, cell, node, text }
let _listeners = [];
let _mqlWidth = null;
let _mqlHover = null;
let _rmUnsub = null;
let _preloaded = false;

function on(target, type, handler, opts) {
  target.addEventListener(type, handler, opts);
  _listeners.push([target, type, handler, opts]);
}

/* Row image URL — coarse viewports get the .half variant (same convention
   as mobile/loader.js injectHalfSources; every row image has one). */
function imageUrl(row) {
  const src = row.dataset.image || "";
  return _coarse ? src.replace(".full.", ".half.") : src;
}

/* Strip the reveal coupling from rows whose entrance already ran —
   removes motion-reveals' permanent transition/delay from interaction. */
function stripRevealed() {
  for (const row of _rows) {
    if (row.hasAttribute("data-reveal") && row.classList.contains("is-visible")) {
      row.removeAttribute("data-reveal");
      row.style.removeProperty("--reveal-delay");
    }
  }
}

function revealedRows() {
  return _rows.filter((r) => !r.hasAttribute("data-reveal"));
}

/* ---- Scramble (node-identity preserving) ---- */

function restoreScramble(entry) {
  entry.tween.kill();
  if (entry.node) {
    entry.node.nodeValue = entry.text;
    // Re-install the ORIGINAL text node — the plugin's per-tick writes
    // replaced it, and i18n keys its cache on node identity.
    entry.cell.replaceChildren(entry.node);
  } else {
    entry.cell.textContent = entry.text;
  }
}

function killScramble() {
  for (const entry of _scrambles) restoreScramble(entry);
  _scrambles = [];
}

function startScramble(row) {
  if (_reduced || !_scrambleReady) return;
  const cells = row.querySelectorAll(".events__cell--name, .events__cell--desc, .events__cell--tag, .events__cell--meta");
  for (const cell of cells) {
    if (!cell.offsetParent) continue; // hidden (e.g. tag/meta on phones) — skip wasted tweens
    const text = cell.textContent; // LIVE read — survives i18n swaps
    if (!text || !text.trim()) continue;
    const node = (cell.childNodes.length === 1 && cell.firstChild.nodeType === Node.TEXT_NODE)
      ? cell.firstChild : null;
    const entry = { cell, node, text, tween: null };
    entry.tween = window.gsap.to(cell, {
      duration: 0.8,
      scrambleText: { text, chars: HEBREW_CHARS, revealDelay: 0.3, speed: 0.4 },
      onComplete() {
        restoreScramble(entry);
        _scrambles = _scrambles.filter((e) => e !== entry);
      },
    });
    _scrambles.push(entry);
  }
}

/* ---- Activation ---- */

function setActive(row) {
  if (row === _active) return;
  stripRevealed();
  killScramble();
  _active = row;
  for (const r of _rows) r.classList.toggle("is-active", r === row);
  _list.classList.add("has-active");
  const image = imageUrl(row);
  if (image) {
    // Template-faithful swap: snap to scale(1.2) with transitions off, then
    // let the CSS transition carry it to 1. is-visible is NOT removed —
    // removing it would blink the layer to opacity 0 on every swap.
    if (!_reduced) {
      _bgEl.style.transition = "none";
      _bgEl.style.transform = "scale(1.2)";
      _bgEl.style.backgroundImage = `url("${image}")`;
      void _bgEl.offsetWidth; // reflow — same idiom as rooms-door.js
      _bgEl.style.transition = "";
      _bgEl.style.transform = "";
    } else {
      _bgEl.style.backgroundImage = `url("${image}")`;
    }
    _bgEl.classList.add("is-visible");
  }
  startScramble(row);
  resetIdle();
}

function clearActive() {
  killScramble();
  _active = null;
  for (const r of _rows) r.classList.remove("is-active");
  _list.classList.remove("has-active");
  _bgEl.classList.remove("is-visible");
  resetIdle();
}

function activateFrom(e) {
  const row = e.target.closest(".events__row");
  if (row && row !== _active && _list.contains(row)) setActive(row);
}

/* ---- Idle flicker (hover-capable viewports only) ---- */

function stopFlicker() {
  if (!_idleTl) return;
  _idleTl.kill();
  _idleTl = null;
  window.gsap.set(_flickerRows, { clearProps: "opacity" });
  for (const r of _flickerRows) r.style.removeProperty("transition");
  _flickerRows = [];
}

function startFlicker() {
  if (_reduced || _coarse || !window.gsap || _active || !_sectionVisible) return;
  stopFlicker();
  stripRevealed();
  _flickerRows = revealedRows();
  if (!_flickerRows.length) return;
  // Suspend the rows' CSS opacity transition so the GSAP dips render crisply.
  for (const r of _flickerRows) r.style.transition = "none";
  _idleTl = window.gsap.timeline({ repeat: -1, repeatDelay: 2 });
  _idleTl
    .to(_flickerRows, { opacity: 0.05, duration: 0.3, ease: "power2.inOut", stagger: 0.05 })
    .to(_flickerRows, { opacity: 1, duration: 0.3, ease: "power2.inOut", stagger: 0.05 });
}

function resetIdle() {
  window.clearTimeout(_idleTimer);
  stopFlicker();
  if (_reduced || _coarse || _active || !_sectionVisible) return;
  _idleTimer = window.setTimeout(startFlicker, IDLE_DELAY_MS);
}

/* ---- Image warm-up (one viewport ahead, right-sized variant) ---- */

function preloadImages() {
  if (_preloaded) return;
  _preloaded = true;
  for (const row of _rows) {
    const src = imageUrl(row);
    if (src) { const img = new Image(); img.src = src; }
  }
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
  _bgEl = _stage.querySelector("[data-events-bg]");
  _rows = Array.from(_stage.querySelectorAll(".events__row"));
  if (!_list || !_bgEl || _rows.length === 0) return;

  _reduced = prefersReducedMotion();
  _mqlWidth = window.matchMedia(COARSE_QUERY);
  _mqlHover = window.matchMedia(NO_HOVER_QUERY);
  _coarse = _mqlWidth.matches || _mqlHover.matches;
  // Re-wire on rotation/resize across the breakpoint (destroy() is idempotent).
  _mqlWidth.addEventListener("change", onBreakpointChange);
  _mqlHover.addEventListener("change", onBreakpointChange);
  _rmUnsub = onReducedMotionChange((m) => {
    _reduced = m;
    if (m) { stopFlicker(); killScramble(); }
    resetIdle();
  });

  // Register the scramble plugin (vendor global; degrade silently if absent).
  if (window.gsap && window.ScrambleTextPlugin) {
    window.gsap.registerPlugin(window.ScrambleTextPlugin);
    _scrambleReady = true;
  }

  // Warm the row images one viewport before the section (not at boot — §8).
  _preIO = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      preloadImages();
      _preIO.disconnect();
      _preIO = null;
    }
  }, { rootMargin: "100% 0px" });
  _preIO.observe(_stage);

  // Gate the idle flicker to when #events is actually on screen (§8 budget).
  _visIO = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      _sectionVisible = entry.isIntersecting;
      stripRevealed();
      resetIdle();
    }
  }, { threshold: 0.2 });
  _visIO.observe(_stage);

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
    on(_stage, "pointerleave", clearActive);
    on(_list, "focusout", (e) => {
      if (!e.relatedTarget || !_list.contains(e.relatedTarget)) clearActive();
    });
    on(_stage, "pointermove", resetIdle, { passive: true });
  }
}

export function destroy() {
  for (const [t, type, h, o] of _listeners) t.removeEventListener(type, h, o);
  _listeners = [];
  if (_mqlWidth) { _mqlWidth.removeEventListener("change", onBreakpointChange); _mqlWidth = null; }
  if (_mqlHover) { _mqlHover.removeEventListener("change", onBreakpointChange); _mqlHover = null; }
  if (_rmUnsub) { _rmUnsub(); _rmUnsub = null; }
  if (_visIO) { _visIO.disconnect(); _visIO = null; }
  if (_preIO) { _preIO.disconnect(); _preIO = null; }
  if (_rowIO) { _rowIO.disconnect(); _rowIO = null; }
  window.clearTimeout(_idleTimer);
  stopFlicker();
  killScramble();
  if (_bgEl) {
    _bgEl.classList.remove("is-visible");
    _bgEl.style.backgroundImage = "";
    _bgEl.style.transition = "";
    _bgEl.style.transform = "";
  }
  if (_list) _list.classList.remove("has-active");
  for (const r of _rows) r.classList.remove("is-active");
  _stage = _list = _bgEl = _active = null;
  _rows = [];
  _sectionVisible = false;
  _scrambleReady = false;
  // _preloaded intentionally survives re-init — images are already warm.
}
