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
const TRACK_SELECTOR   = ".lounge__track";
const DOTS_SELECTOR    = ".lounge__dots";
const RAIL_SELECTOR    = ".lounge__rail";
const ACTIVE_CLASS     = "is-active";
const DOT_CLASS        = "lounge__dot";

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
  rail:        null,
  track:       null,
  panels:      [],   // ordered array of [data-lounge-panel] elements
  dotsContainer: null,
  dots:        [],   // ordered array of <button.lounge__dot>
  activeIndex: 0,
  isRTL:       false,
  bound: {
    onClick:      null,
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
    panel.tabIndex = isActive ? 0 : -1;
  });

  state.dots.forEach((dot, i) => {
    const isActive = i === next;
    dot.classList.toggle(ACTIVE_CLASS, isActive);
    dot.setAttribute("aria-selected", isActive ? "true" : "false");
    dot.tabIndex = isActive ? 0 : -1;
  });

  // Drive the carousel slide via CSS variable. The CSS rule reads
  // calc(var(--lounge-active) * var(--lounge-sign) * 100%) on the track.
  if (state.rail) {
    state.rail.style.setProperty("--lounge-active", String(next));
  }

  if (focus) {
    try { state.panels[next].focus(); } catch { /* ignore */ }
  }
}

function indexOfPanel(el) {
  const panel = el && el.closest ? el.closest(PANEL_SELECTOR) : null;
  if (!panel) return -1;
  return state.panels.indexOf(panel);
}

function indexOfDot(el) {
  const dot = el && el.closest ? el.closest("." + DOT_CLASS) : null;
  if (!dot) return -1;
  return state.dots.indexOf(dot);
}

/**
 * Build a row of dots — one per panel — appended after the rail. Idempotent:
 * if .lounge__dots already exists in markup we reuse it, only filling the
 * children. Otherwise we inject it.
 */
function ensureDots() {
  if (!state.root) return;
  let container = state.root.querySelector(DOTS_SELECTOR);
  if (!container) {
    container = document.createElement("div");
    container.className = "lounge__dots";
    container.setAttribute("role", "tablist");
    container.setAttribute("aria-label", "בחירת תמונה בלאונג'");
    // Append to the rail's parent (.lounge__container) so dots sit below the rail.
    const railParent = state.rail ? state.rail.parentNode : state.root;
    if (railParent) railParent.appendChild(container);
  } else {
    container.innerHTML = "";
  }
  state.dotsContainer = container;

  state.dots = state.panels.map((panel, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = DOT_CLASS;
    dot.setAttribute("role", "tab");
    dot.setAttribute("aria-label", `תמונה ${i + 1}`);
    dot.dataset.loungeDot = String(i);
    container.appendChild(dot);
    return dot;
  });
}

// ----------------------------------------------------------------------------
// Event handlers
// ----------------------------------------------------------------------------

function onClick(event) {
  // Try a dot first (most common click target), then a panel as a fallback.
  const dotIdx = indexOfDot(event.target);
  if (dotIdx !== -1) {
    setActive(dotIdx);
    return;
  }
  const panelIdx = indexOfPanel(event.target);
  if (panelIdx !== -1) {
    setActive(panelIdx);
  }
}

function onKeyDown(event) {
  // Only intercept when focus is inside the lounge component.
  const active = document.activeElement;
  if (!active || !state.root || !state.root.contains(active)) return;

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

  state.root =
    document.querySelector(ROOT_SELECTOR) ||
    document.querySelector(ROOT_FALLBACK);
  if (!state.root) return;

  state.rail  = state.root.querySelector(RAIL_SELECTOR);
  state.track = state.root.querySelector(TRACK_SELECTOR);
  state.panels = Array.from(state.root.querySelectorAll(PANEL_SELECTOR));
  if (!state.panels.length) return;

  // Determine direction at init time so the slide sign matches the document.
  const computed = typeof window !== "undefined" && window.getComputedStyle
    ? window.getComputedStyle(state.root).direction
    : "ltr";
  state.isRTL = computed === "rtl";
  // Sign: in RTL, +N translates the track into the reading order (rightward),
  // which means a higher index reveals the next panel from the left edge of
  // the viewport. In LTR, sign is -1 (translate left to bring next panel in).
  if (state.rail) {
    state.rail.style.setProperty("--lounge-sign", state.isRTL ? "1" : "-1");
  }

  // Build the dots row (idempotent — uses an existing .lounge__dots if any).
  ensureDots();

  // Determine the initial active panel: honour a pre-marked .is-active, else 0.
  const preMarked = state.panels.findIndex((p) =>
    p.classList.contains(ACTIVE_CLASS)
  );
  const initialIndex = preMarked >= 0 ? preMarked : 0;

  // Wire listeners (delegated on the root). Hover-activate has been removed
  // 2026-06-03 — the user reported the rail snapped to the next image just
  // from cursor passing over the strip, which made deliberate selection
  // impossible. Now only click + keyboard activates.
  state.bound.onClick   = onClick;
  state.bound.onKeyDown = onKeyDown;

  state.root.addEventListener("click", state.bound.onClick);
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
    if (state.bound.onKeyDown)
      state.root.removeEventListener("keydown", state.bound.onKeyDown);
  }

  state.panels.forEach((panel) => {
    panel.classList.remove(ACTIVE_CLASS);
    panel.removeAttribute("aria-selected");
    panel.tabIndex = 0;
  });
  state.dots.forEach((dot) => {
    if (dot && dot.parentNode) dot.parentNode.removeChild(dot);
  });

  if (state.rail) {
    state.rail.style.removeProperty("--lounge-active");
    state.rail.style.removeProperty("--lounge-sign");
  }

  state.initialised   = false;
  state.root          = null;
  state.rail          = null;
  state.track         = null;
  state.panels        = [];
  state.dotsContainer = null;
  state.dots          = [];
  state.activeIndex   = 0;
  state.isRTL         = false;
  state.bound.onClick   = null;
  state.bound.onKeyDown = null;
}
