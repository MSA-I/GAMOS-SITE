/**
 * analytics.js — conversion-event collection (2026-07-13 conversion pass).
 *
 * Owner : marketing critique P4 ("להגדיר אירועי אנליטיקה ללחיצה על טלפון,
 *         וואטסאפ וטופס; למדוד כמה משתמשים מגיעים לכל סקציה").
 * Spec  : CLAUDE.md §2 amendment 2026-07-13 (vanilla, dependency-free),
 *         §10.3 (ESM init()/destroy(), module-scoped).
 *
 * What it tracks (no PII ever leaves the payloads):
 *   cta_click     — any click on a[href^="tel:"], a[href*="wa.me"], [data-cta]
 *   lead_submit   — submit on .contact__form (capture phase, so it fires even
 *                   though contact-form.js preventDefault()s) — eventType only
 *   section_reach — first time each main > section[id] is 40% visible
 *
 * Transport: the Cloudflare Web Analytics beacon has NO custom-events API
 * (pageviews + Core Web Vitals only), so events are pushed to a local queue —
 * window.gamosAnalyticsQueue — in a GA4/Zaraz-compatible {name, params, ts}
 * shape. When a custom-events endpoint is chosen (GA4 / CF Zaraz / Plausible),
 * point flush() at it; nothing else changes. Debug: set
 * localStorage['gamos-debug'] to any value → events echo to console.debug.
 */

const state = {
  initialised: false,
  onClick: null,
  onSubmit: null,
  io: null,
  reached: null,
};

function track(name, params) {
  const q = (window.gamosAnalyticsQueue = window.gamosAnalyticsQueue || []);
  const event = { name, params: params || {}, ts: Date.now() };
  q.push(event);
  try {
    if (window.localStorage && window.localStorage.getItem("gamos-debug")) {
      console.debug("[gamos-analytics]", event.name, event.params);
    }
  } catch { /* storage blocked — fine */ }
}

function onClick(event) {
  const a = event.target.closest && event.target.closest("a, [data-cta]");
  if (!a) return;
  const href = a.getAttribute && (a.getAttribute("href") || "");
  const cta = a.getAttribute && a.getAttribute("data-cta");
  if (cta) {
    track("cta_click", { id: cta, href });
  } else if (href.startsWith("tel:")) {
    track("cta_click", { id: "tel", href });
  } else if (href.includes("wa.me")) {
    track("cta_click", { id: "whatsapp" });
  }
}

function onSubmit(event) {
  const form = event.target;
  if (!form || !form.classList || !form.classList.contains("contact__form")) return;
  const type = form.querySelector("#contact-event-type");
  track("lead_submit", { eventType: type ? type.value : "" });
}

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.onClick = onClick;
  state.onSubmit = onSubmit;
  // Capture phase: fires before consumer handlers stopPropagation/preventDefault.
  document.addEventListener("click", state.onClick, { capture: true, passive: true });
  document.addEventListener("submit", state.onSubmit, { capture: true });

  // Scroll depth — first meaningful visibility of each top-level section.
  // A section counts as "reached" when 40% of ITS height is visible OR it
  // covers 40% of the viewport — the second clause matters for the tall
  // pinned sections (hero/shabbat are 500vh: their intersectionRatio can
  // never exceed ~0.2, the classic threshold trap).
  const sections = document.querySelectorAll("main > section[id]");
  if (sections.length && "IntersectionObserver" in window) {
    state.reached = new Set();
    state.io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const vh = window.innerHeight || 1;
        if (e.intersectionRatio < 0.4 && e.intersectionRect.height < vh * 0.4) continue;
        const id = e.target.id;
        if (state.reached.has(id)) continue;
        state.reached.add(id);
        track("section_reach", { id });
        state.io.unobserve(e.target);
      }
    }, { threshold: [0.05, 0.1, 0.2, 0.3, 0.4] });
    for (const s of sections) state.io.observe(s);
  }

  track("page_view", { path: window.location.pathname });
  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;
  if (state.onClick) document.removeEventListener("click", state.onClick, { capture: true });
  if (state.onSubmit) document.removeEventListener("submit", state.onSubmit, { capture: true });
  if (state.io) state.io.disconnect();
  state.onClick = null;
  state.onSubmit = null;
  state.io = null;
  state.reached = null;
  state.initialised = false;
}

export default { init, destroy };
