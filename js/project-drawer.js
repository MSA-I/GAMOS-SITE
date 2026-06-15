/**
 * project-drawer.js — ProjectDetail side-panel (vanilla port)
 *
 * Spec   : C:\Users\art1\.claude\plans\quizzical-stirring-castle.md (Phase 4)
 * Source : arch-corridor-gallery/src/components/ProjectDetail.tsx
 *
 * DOM is lazily injected on first open(). Single root <aside> with backdrop +
 * sliding panel. Open via window.gamosProjectDrawer.open(projectId); close
 * via X button, backdrop click, Escape key, or popstate (browser back).
 *
 * Constitution
 *   §10.3 module-scoped state, init/destroy, ESM exports.
 *   §4 RTL — panel slides from inline-end (= right in RTL) via translateX(100%).
 *   §9 a11y — focus trap on open, restore on close, aria-modal/role=dialog.
 */

import { getProjectById } from "./projects-data.js";
import { playClick }       from "./audio.js";
import { prefersReducedMotion } from "./utils/media-query.js";

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state = {
  initialised: false,
  root: null,                // <aside class="project-drawer">
  backdrop: null,
  panel: null,
  closeBtn: null,
  reducedMotion: false,
  isOpen: false,
  lastFocus: null,           // element focused before open() — restored on close
  currentId: null,
  bound: {
    onKeyDown: null,
    onPopState: null,
    onBackdropClick: null,
    onCloseClick: null,
  },
};


// ---------------------------------------------------------------------------
// DOM construction (one-shot, on first open)
// ---------------------------------------------------------------------------

function buildRoot() {
  const root = document.createElement("aside");
  root.className = "project-drawer";
  root.setAttribute("role", "dialog");
  root.setAttribute("aria-modal", "true");
  root.setAttribute("aria-hidden", "true");
  root.setAttribute("aria-labelledby", "project-drawer-title");

  root.innerHTML = `
    <div class="project-drawer__backdrop" data-drawer-backdrop aria-hidden="true"></div>
    <section class="project-drawer__panel" data-drawer-panel>
      <header class="project-drawer__media" data-drawer-media>
        <picture>
          <source type="image/webp" srcset="" data-drawer-img-webp>
          <img data-drawer-img alt="" loading="eager" decoding="async">
        </picture>
        <div class="project-drawer__media-overlay" aria-hidden="true"></div>
        <button type="button"
                class="project-drawer__close"
                data-drawer-close
                aria-label="סגור פרטים">
          <span aria-hidden="true">×</span>
        </button>
        <div class="project-drawer__media-text" data-drawer-media-text>
          <span class="project-drawer__category" data-drawer-category></span>
          <p class="project-drawer__exhib-label" data-drawer-exhib></p>
          <h2 class="project-drawer__title" id="project-drawer-title" data-drawer-title></h2>
          <p class="project-drawer__subtitle" data-drawer-subtitle></p>
        </div>
      </header>

      <div class="project-drawer__body" data-drawer-body>
        <div class="project-drawer__section">
          <p class="project-drawer__eyebrow">תיאור התועלת והחוויה • Artwork description</p>
          <p class="project-drawer__desc" data-drawer-desc></p>
        </div>

        <div class="project-drawer__section project-drawer__section--bullets" data-drawer-bullets-wrap>
          <p class="project-drawer__eyebrow">אלמנטים מרכזיים • key elements</p>
          <ul class="project-drawer__bullets" data-drawer-bullets></ul>
        </div>

        <div class="project-drawer__bio">
          <div class="project-drawer__bio-col">
            <p class="project-drawer__bio-label">צילום ואמנות • Artistry</p>
            <p class="project-drawer__bio-value" data-drawer-photographer></p>
          </div>
          <div class="project-drawer__bio-col project-drawer__bio-col--right">
            <p class="project-drawer__bio-label">מיקוד ומיקום • Locality</p>
            <p class="project-drawer__bio-value project-drawer__bio-value--mono" data-drawer-location></p>
          </div>
        </div>

        <div class="project-drawer__section project-drawer__section--meta" data-drawer-meta-wrap hidden>
          <p class="project-drawer__eyebrow">מפרט טכני • Technical specs</p>
          <dl class="project-drawer__meta">
            <div data-drawer-meta-row data-row="camera"   hidden><dt>מצלמה</dt><dd data-drawer-camera></dd></div>
            <div data-drawer-meta-row data-row="lens"     hidden><dt>עדשה</dt><dd data-drawer-lens></dd></div>
            <div data-drawer-meta-row data-row="settings" hidden><dt>הגדרות</dt><dd data-drawer-settings></dd></div>
            <div data-drawer-meta-row data-row="lighting" hidden><dt>תאורה</dt><dd data-drawer-lighting></dd></div>
            <div data-drawer-meta-row data-row="composition" hidden><dt>קומפוזיציה</dt><dd data-drawer-composition></dd></div>
          </dl>
        </div>
      </div>

      <footer class="project-drawer__footer">
        <div>
          <p class="project-drawer__footer-eyebrow">Gamos Experience Archive</p>
          <p class="project-drawer__footer-sub">גאמוס קומפלקס אירועים וריזורט יוקרתי</p>
        </div>
        <span class="project-drawer__footer-tag">GAMOS EXHIBITION</span>
      </footer>
    </section>
  `;
  document.body.appendChild(root);
  return root;
}


// ---------------------------------------------------------------------------
// Populate panel with a project record
// ---------------------------------------------------------------------------

function populate(project) {
  const root = state.root;
  if (!root || !project) return;

  // Header image
  const imgWebp = root.querySelector("[data-drawer-img-webp]");
  const img     = root.querySelector("[data-drawer-img]");
  if (imgWebp) imgWebp.srcset = project.image || "";
  if (img) {
    img.src = project.imageJpg || project.image || "";
    img.alt = project.photoTitleHe || project.title || "";
  }

  // Title block
  const set = (sel, val) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = val ?? "";
  };
  set("[data-drawer-category]", project.category || "");
  set("[data-drawer-exhib]",     `EXHIBITION IMAGE ${project.number || ""}`.trim());
  set("[data-drawer-title]",     project.photoTitleHe || project.title || "");

  const subtitleEl = root.querySelector("[data-drawer-subtitle]");
  if (subtitleEl) {
    if (project.photoTitleEn) {
      subtitleEl.textContent = project.photoTitleEn;
      subtitleEl.hidden = false;
    } else {
      subtitleEl.textContent = "";
      subtitleEl.hidden = true;
    }
  }

  // Body
  set("[data-drawer-desc]", project.description || "");

  // Bullets
  const bulletsWrap = root.querySelector("[data-drawer-bullets-wrap]");
  const bulletsUl   = root.querySelector("[data-drawer-bullets]");
  if (bulletsUl) {
    bulletsUl.innerHTML = "";
    const arr = Array.isArray(project.details) ? project.details : [];
    if (arr.length === 0) {
      if (bulletsWrap) bulletsWrap.hidden = true;
    } else {
      if (bulletsWrap) bulletsWrap.hidden = false;
      arr.forEach((detail, i) => {
        const li = document.createElement("li");
        li.className = "project-drawer__bullet";
        li.style.setProperty("--i", String(i));
        li.innerHTML = `<span class="project-drawer__bullet-dot" aria-hidden="true"></span><span>${escapeHtml(detail)}</span>`;
        bulletsUl.appendChild(li);
      });
    }
  }

  // Bio
  set("[data-drawer-photographer]", project.photographer || "אמן קדם");
  const loc = `${project.location || "קדם"} · ${project.year || ""}`.trim();
  set("[data-drawer-location]", loc);

  // Meta (camera/lens/settings/lighting/composition)
  const metaWrap = root.querySelector("[data-drawer-meta-wrap]");
  let metaHasAny = false;
  const metaFields = [
    ["camera",       project.camera],
    ["lens",         project.lens],
    ["settings",     project.settings],
    ["lighting",     project.lighting],
    ["composition",  project.composition],
  ];
  for (const [key, val] of metaFields) {
    const row = root.querySelector(`[data-drawer-meta-row][data-row="${key}"]`);
    const dd  = root.querySelector(`[data-drawer-${key}]`);
    if (!row || !dd) continue;
    if (val && String(val).trim() && String(val).trim() !== "—") {
      dd.textContent = val;
      row.hidden = false;
      metaHasAny = true;
    } else {
      row.hidden = true;
    }
  }
  if (metaWrap) metaWrap.hidden = !metaHasAny;
}


// ---------------------------------------------------------------------------
// Open / close
// ---------------------------------------------------------------------------

function open(projectId) {
  if (!state.initialised) return;
  const project = getProjectById(projectId);
  if (!project) return;

  if (!state.root) {
    state.root = buildRoot();
    state.backdrop = state.root.querySelector("[data-drawer-backdrop]");
    state.panel    = state.root.querySelector("[data-drawer-panel]");
    state.closeBtn = state.root.querySelector("[data-drawer-close]");

    state.bound.onBackdropClick = () => { playClick(); close(); };
    state.bound.onCloseClick    = () => { playClick(); close(); };
    state.backdrop.addEventListener("click", state.bound.onBackdropClick);
    state.closeBtn.addEventListener("click", state.bound.onCloseClick);
  }

  populate(project);

  state.lastFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  state.currentId = projectId;

  state.root.setAttribute("aria-hidden", "false");
  state.root.classList.add("is-open");
  document.documentElement.setAttribute("data-drawer-open", "true");
  document.body.style.overflow = "hidden";

  // Push history entry so browser back closes the drawer.
  try {
    history.pushState({ drawer: projectId }, "", `#project=${encodeURIComponent(projectId)}`);
  } catch { /* ignore */ }

  // Move focus into the panel.
  // Force layout flush so the close button is positioned before focus.
  void state.panel.offsetHeight;
  state.closeBtn.focus({ preventScroll: true });

  state.isOpen = true;
}

function close() {
  if (!state.initialised || !state.isOpen || !state.root) return;
  state.isOpen = false;
  state.root.classList.remove("is-open");
  state.root.setAttribute("aria-hidden", "true");
  document.documentElement.removeAttribute("data-drawer-open");
  document.body.style.overflow = "";

  // Restore focus
  if (state.lastFocus && document.contains(state.lastFocus)) {
    try { state.lastFocus.focus({ preventScroll: true }); } catch { /* ignore */ }
  }
  state.lastFocus = null;

  // Pop the history entry we pushed.
  if (history.state && history.state.drawer) {
    try { history.back(); } catch { /* ignore */ }
  }

  state.currentId = null;
}


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function trapFocus(e) {
  if (!state.isOpen || e.key !== "Tab" || !state.panel) return;
  const focusable = state.panel.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last  = focusable[focusable.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}


// ---------------------------------------------------------------------------
// Init / destroy
// ---------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.reducedMotion = prefersReducedMotion();

  state.bound.onKeyDown = (e) => {
    if (!state.isOpen) return;
    if (e.key === "Escape") {
      e.preventDefault();
      playClick();
      close();
    } else if (e.key === "Tab") {
      trapFocus(e);
    }
  };
  state.bound.onPopState = () => {
    if (state.isOpen) close();
  };

  document.addEventListener("keydown", state.bound.onKeyDown);
  window.addEventListener("popstate", state.bound.onPopState);

  // Public API
  window.gamosProjectDrawer = { open, close };

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;
  if (state.bound.onKeyDown) document.removeEventListener("keydown", state.bound.onKeyDown);
  if (state.bound.onPopState) window.removeEventListener("popstate", state.bound.onPopState);
  if (state.backdrop && state.bound.onBackdropClick) {
    state.backdrop.removeEventListener("click", state.bound.onBackdropClick);
  }
  if (state.closeBtn && state.bound.onCloseClick) {
    state.closeBtn.removeEventListener("click", state.bound.onCloseClick);
  }
  if (state.root && state.root.parentNode) {
    state.root.parentNode.removeChild(state.root);
  }
  if (window.gamosProjectDrawer) {
    try { delete window.gamosProjectDrawer; }
    catch { window.gamosProjectDrawer = undefined; }
  }
  state.initialised = false;
  state.root = null;
  state.backdrop = null;
  state.panel = null;
  state.closeBtn = null;
  state.isOpen = false;
  state.bound.onKeyDown = null;
  state.bound.onPopState = null;
  state.bound.onBackdropClick = null;
  state.bound.onCloseClick = null;
}
