/**
 * gallery-lightbox.js — click/tap-to-fullscreen for the #gallery masonry.
 *
 * Owner : Gallery Section (#gallery — "רגעים מהמתחם")
 * Spec  : CLAUDE.md §2 (vanilla ESM, no framework), §4 (RTL-first, logical
 *         props), §8 (reduced-motion), §9 (a11y — dialog, focus, keyboard),
 *         §10 (init/destroy, module-scoped, idempotent, no globals).
 *
 * FACTORED 2026-07-13 (conversion pass): the open/show/step/close + swipe
 * skeleton that used to be mirrored here from lounge-lightbox.js now lives in
 * the shared js/lightbox.js engine (the third consumer arrived, per this
 * file's original note). This module keeps only what is gallery-specific:
 * delegated click / Enter / Space on the masonry grid → engine.open(index).
 * No captions (user asked for no per-image descriptions) → withCaption:false.
 *
 * Public API: init(), destroy()
 */

import { createLightbox } from "./lightbox.js";

const state = {
  initialised: false,
  grid: null, // [data-gallery-stage]
  items: [], // .gallery__item elements, DOM order
  lightbox: null,
  bound: { onGridClick: null, onGridKey: null },
};

function indexOfItem(el) {
  const item = el.closest(".gallery__item");
  return item ? state.items.indexOf(item) : -1;
}

function onGridClick(event) {
  const i = indexOfItem(event.target);
  if (i >= 0) state.lightbox.open(i);
}

function onGridKey(event) {
  if (event.key !== "Enter" && event.key !== " " && event.key !== "Spacebar") return;
  const i = indexOfItem(event.target);
  if (i < 0) return;
  event.preventDefault();
  state.lightbox.open(i);
}

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.grid = document.querySelector("[data-gallery-stage]");
  if (!state.grid) return; // no gallery on this page → no-op

  state.items = Array.from(state.grid.querySelectorAll(".gallery__item"));
  if (state.items.length === 0) return;

  state.lightbox = createLightbox({
    count: () => state.items.length,
    // Prefer the pre-generated full-res source; fall back to the decoded grid src.
    getItem: (i) => {
      const img = state.items[i].querySelector("img");
      return {
        src: img.dataset.full || img.currentSrc || img.src,
        alt: "תמונה מגלריית המתחם",
      };
    },
    withCaption: false,
  });

  state.bound.onGridClick = onGridClick;
  state.bound.onGridKey = onGridKey;
  state.grid.addEventListener("click", state.bound.onGridClick);
  state.grid.addEventListener("keydown", state.bound.onGridKey);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;

  if (state.lightbox) state.lightbox.close();

  if (state.grid) {
    if (state.bound.onGridClick) state.grid.removeEventListener("click", state.bound.onGridClick);
    if (state.bound.onGridKey) state.grid.removeEventListener("keydown", state.bound.onGridKey);
  }

  state.initialised = false;
  state.grid = null;
  state.items = [];
  state.lightbox = null;
  state.bound.onGridClick = null;
  state.bound.onGridKey = null;
}

export default { init, destroy };
