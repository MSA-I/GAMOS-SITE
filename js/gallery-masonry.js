/**
 * gallery-masonry.js — shortest-column masonry for the #gallery grid.
 *
 * Owner : Gallery Section (#gallery — "רגעים מהמתחם")
 * Spec  : CLAUDE.md §2 (vanilla ESM, no framework), §10 (init/destroy,
 *         module-scoped, idempotent, no globals).
 *
 * Why this exists
 * ---------------
 * Neither CSS `columns` (balance-fill) nor CSS-grid `grid-auto-flow:dense` can
 * equalise column BOTTOMS — both left ~850px of ragged light space at the end of
 * the gallery. The only reliable evener is classic masonry: place each item into
 * the currently-SHORTEST column. We size columns by cumulative ASPECT RATIO (the
 * width/height attrs already on every <img>), so it's correct without waiting for
 * images to load and independent of the live pixel width (all columns are equal
 * width, so relative heights are proportional to h/w).
 *
 * The grid becomes a flex row of .gallery__col wrappers this module creates and
 * fills. Column count follows the 768/1100 breakpoints (2 / 3 / 4). We only
 * rebuild on a breakpoint change (distribution is width-independent).
 *
 * The lightbox (js/gallery-lightbox.js) queries `.gallery__item` by class and
 * runs AFTER this module, so it sees items in their column-major order — fine.
 *
 * Public API: init(), destroy()
 */

const RESIZE_DEBOUNCE_MS = 120;
// A small constant added per item to approximate the row-gap so a column of many
// short (landscape) items isn't treated as shorter than it renders.
const GAP_PROXY = 0.06;

const state = {
  initialised: false,
  grid: null,
  items: [], // canonical DOM order, captured once
  cols: 0,
  onResize: null,
  resizeTimer: 0,
};

function columnCount() {
  if (window.matchMedia("(min-width: 1100px)").matches) return 4;
  if (window.matchMedia("(min-width: 768px)").matches) return 3;
  return 2;
}

function ratioOf(item) {
  const img = item.querySelector("img");
  if (!img) return 1;
  const w = parseFloat(img.getAttribute("width"));
  const h = parseFloat(img.getAttribute("height"));
  if (w > 0 && h > 0) return h / w;
  if (img.naturalWidth > 0) return img.naturalHeight / img.naturalWidth;
  return 1;
}

function build() {
  const n = columnCount();
  const cols = [];
  const heights = new Array(n).fill(0);

  // Detach everything (columns + items) then rebuild from the canonical order.
  state.grid.textContent = "";
  for (let i = 0; i < n; i++) {
    const col = document.createElement("div");
    col.className = "gallery__col";
    state.grid.appendChild(col);
    cols.push(col);
  }

  // Largest-first greedy (LPT bin-packing): placing the tallest photos first lets
  // the small ones top up the columns, giving far more even bottoms than DOM-order
  // greedy (~455px → typically <150px residual raggedness).
  const order = [...state.items].sort((a, b) => ratioOf(b) - ratioOf(a));
  for (const item of order) {
    let min = 0;
    for (let i = 1; i < n; i++) if (heights[i] < heights[min]) min = i;
    cols[min].appendChild(item);
    heights[min] += ratioOf(item) + GAP_PROXY;
  }
  state.cols = n;
}

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.grid = document.querySelector("[data-gallery-stage]");
  if (!state.grid) return; // no gallery here → no-op

  state.items = Array.from(state.grid.querySelectorAll(".gallery__item"));
  if (state.items.length === 0) return;

  build();

  // Rebuild only when the column count changes (2/3/4). Within a breakpoint the
  // ratio-based distribution is width-independent.
  state.onResize = () => {
    window.clearTimeout(state.resizeTimer);
    state.resizeTimer = window.setTimeout(() => {
      if (columnCount() !== state.cols) build();
    }, RESIZE_DEBOUNCE_MS);
  };
  window.addEventListener("resize", state.onResize);

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;
  if (state.onResize) window.removeEventListener("resize", state.onResize);
  window.clearTimeout(state.resizeTimer);
  // Flatten columns back to plain items in canonical order.
  if (state.grid) {
    state.grid.textContent = "";
    for (const item of state.items) state.grid.appendChild(item);
  }
  state.initialised = false;
  state.grid = null;
  state.items = [];
  state.cols = 0;
  state.onResize = null;
}

export default { init, destroy };
