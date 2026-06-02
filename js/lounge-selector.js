/**
 * lounge-selector.js — #lounge expanding-panels selector
 *
 * Owner : Lounge Section Engineer (Wave 1)
 * Spec  : CLAUDE.md §2 (vanilla ESM), §4 (RTL-first), §9 (a11y), §10 (init/destroy,
 *         module-scoped, idempotent, no globals), §8 (prefers-reduced-motion).
 *
 * Concept
 * -------
 * A horizontal rail of image panels. Exactly ONE panel is active at a time
 * (default = first). The active panel grows (CSS `flex: 7`) while the rest stay
 * narrow (`flex: 1`); the active panel reveals a Hebrew title + description label.
 *
 * Interaction
 * -----------
 * Each `[data-lounge-panel]` is a focusable `<button>`. It becomes active on:
 *   - click
 *   - focus (keyboard tabbing into it)
 *   - mouseenter (pointer hover)
 * Only one `.is-active` at a time; `aria-selected` mirrors the active state.
 *
 * Keyboard (RTL-aware) — see ARROW_KEY_DIRECTION note below:
 *   - ArrowLeft  → move active to the NEXT panel (visually to the left in RTL =
 *                  higher display index). Feels natural: the arrow points at the
 *                  panel you land on.
 *   - ArrowRight → move active to the PREVIOUS panel (visually to the right in
 *                  RTL = lower display index).
 *   - ArrowUp / ArrowDown also work (previous / next) for the mobile vertical
 *     stack, where "next" is below.
 *   - Home → first panel, End → last panel.
 *   - All movement wraps around.
 *
 * The rail is a `tablist` of `tab`s — the most fitting ARIA pattern for a
 * single-select strip of panels.
 *
 * Public API: init(), destroy()
 */

// ----------------------------------------------------------------------------
// Constants
// ----------------------------------------------------------------------------

const ROOT_SELECTOR    = "[data-lounge-selector]";
const ROOT_FALLBACK    = "#lounge";
const PANEL_SELECTOR   = "[data-lounge-panel]";
const ACTIVE_CLASS     = "is-active";

/**
 * RTL arrow mapping.
 * In a right-to-left strip, panel index 0 sits at the RIGHT edge and higher
 * indices march LEFT. So pressing ArrowLeft should advance to a HIGHER index
 * (the panel physically to the left), and ArrowRight should retreat to a LOWER
 * index. We encode the *delta* applied to the active index.
 */
const KEY_DELTA = {
  ArrowLeft:  +1, // visually-left  → next panel (higher index)
  ArrowRight: -1, // visually-right → previous panel (lower index)
  ArrowDown:  +1, // mobile vertical stack → next (below)
  ArrowUp:    -1, // mobile vertical stack → previous (above)
};

// ----------------------------------------------------------------------------
// Module-scoped state
// ----------------------------------------------------------------------------

const state = {
  initialised: false,
  root:        null,
  panels:      [],   // ordered array of [data-lounge-panel] elements
  activeIndex: 0,
  bound: {
    onClick:      null,
    onFocusIn:    null,
    onPointerOver:null,
    onKeyDown:    null,
  },
};

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function setActive(index, { focus = false } = {}) {
  if (!state.panels.length) return;

  // Clamp + wrap into range.
  const count = state.panels.length;
  const next = ((index % count) + count) % count;
  state.activeIndex = next;

  state.panels.forEach((panel, i) => {
    const isActive = i === next;
    panel.classList.toggle(ACTIVE_CLASS, isActive);
    panel.setAttribute("aria-selected", isActive ? "true" : "false");
    // Roving tabindex: only the active tab is in the Tab order; arrows move
    // between the others. This is the canonical tablist keyboard pattern.
    panel.tabIndex = isActive ? 0 : -1;
  });

  if (focus) {
    try { state.panels[next].focus(); } catch { /* ignore */ }
  }
}

function indexOfPanel(el) {
  // Walk up from the event target to the panel element, then look it up.
  const panel = el && el.closest ? el.closest(PANEL_SELECTOR) : null;
  if (!panel) return -1;
  return state.panels.indexOf(panel);
}

// ----------------------------------------------------------------------------
// Event handlers
// ----------------------------------------------------------------------------

function onClick(event) {
  const idx = indexOfPanel(event.target);
  if (idx === -1) return;
  setActive(idx);
}

function onFocusIn(event) {
  const idx = indexOfPanel(event.target);
  if (idx === -1) return;
  // Tabbing/focusing a panel activates it — but don't re-focus (already focused).
  setActive(idx);
}

function onPointerOver(event) {
  // Only react to real pointer hovers, not the synthetic ones some browsers
  // dispatch. Touch/pen are handled by click; hover-activate is a mouse nicety.
  if (event.pointerType && event.pointerType !== "mouse") return;
  const idx = indexOfPanel(event.target);
  if (idx === -1) return;
  setActive(idx);
}

function onKeyDown(event) {
  // Home / End jump to edges.
  if (event.key === "Home") {
    event.preventDefault();
    setActive(0, { focus: true });
    return;
  }
  if (event.key === "End") {
    event.preventDefault();
    setActive(state.panels.length - 1, { focus: true });
    return;
  }

  const delta = KEY_DELTA[event.key];
  if (delta === undefined) return;

  event.preventDefault();
  setActive(state.activeIndex + delta, { focus: true });
}

// ----------------------------------------------------------------------------
// init() / destroy()
// ----------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  // Self-select root: prefer [data-lounge-selector], fall back to #lounge.
  state.root =
    document.querySelector(ROOT_SELECTOR) ||
    document.querySelector(ROOT_FALLBACK);
  if (!state.root) return; // no-op if section absent

  state.panels = Array.from(state.root.querySelectorAll(PANEL_SELECTOR));
  if (!state.panels.length) return; // no-op if no panels

  // Determine the initial active panel: honour a pre-marked .is-active in the
  // HTML, else default to the first.
  const preMarked = state.panels.findIndex((p) =>
    p.classList.contains(ACTIVE_CLASS)
  );
  const initialIndex = preMarked >= 0 ? preMarked : 0;

  // Wire listeners (delegated on the root — robust to DOM order, cheap to unbind).
  state.bound.onClick       = onClick;
  state.bound.onFocusIn     = onFocusIn;
  state.bound.onPointerOver = onPointerOver;
  state.bound.onKeyDown     = onKeyDown;

  state.root.addEventListener("click", state.bound.onClick);
  state.root.addEventListener("focusin", state.bound.onFocusIn);
  state.root.addEventListener("pointerover", state.bound.onPointerOver);
  state.root.addEventListener("keydown", state.bound.onKeyDown);

  // Paint initial state (no focus pull on load).
  setActive(initialIndex);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  if (state.root) {
    if (state.bound.onClick)
      state.root.removeEventListener("click", state.bound.onClick);
    if (state.bound.onFocusIn)
      state.root.removeEventListener("focusin", state.bound.onFocusIn);
    if (state.bound.onPointerOver)
      state.root.removeEventListener("pointerover", state.bound.onPointerOver);
    if (state.bound.onKeyDown)
      state.root.removeEventListener("keydown", state.bound.onKeyDown);
  }

  // Reset panel state so the section is clean if re-init'd later.
  state.panels.forEach((panel) => {
    panel.classList.remove(ACTIVE_CLASS);
    panel.removeAttribute("aria-selected");
    panel.tabIndex = 0;
  });

  state.initialised = false;
  state.root        = null;
  state.panels      = [];
  state.activeIndex = 0;
  state.bound.onClick       = null;
  state.bound.onFocusIn     = null;
  state.bound.onPointerOver = null;
  state.bound.onKeyDown     = null;
}
