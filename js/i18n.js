/**
 * i18n.js — Hebrew ⇄ English language switch + auto geo-detection
 *
 * Constitution §2 (vanilla ESM, no framework), §4 (RTL logical properties —
 * flipping dir="ltr" for English "just works" because every layout rule is
 * logical), §10.3 (module-scoped init()/destroy(), no globals beyond the one
 * documented window hook).
 *
 * Strategy (LOCKED 2026-07-01)
 * ---------------------------
 * Hebrew is the DOM default — it stays inline in index.html and needs no JSON.
 * English lives in a single dictionary `assets/i18n/en.json` shaped
 * { "<canonical hebrew>": "<english>" }. On switch-to-EN we walk every visible
 * text node + translatable attribute, look up its canonical Hebrew, and swap in
 * the English (caching the original so switch-back-to-HE is lossless). Setting
 * html.dir="ltr"/lang="en" mirrors the whole layout via logical properties.
 *
 * Locale resolution order:
 *   1. localStorage 'gamos-lang' — an explicit user choice, sticky forever.
 *   2. Geo heuristic (client-side, no backend): Israel timezone OR Hebrew
 *      browser language → 'he'; otherwise → 'en' (international default).
 *   Detection is re-evaluated every visit until the user makes an explicit
 *   choice (so travellers aren't locked in, but a deliberate toggle wins).
 *
 * Runs on BOTH the desktop page and the generated /mobile/ page (same /js bundle).
 *
 * ponytail: node-level text swap, not a keyed-template engine. Ceiling: text
 * split across inline children translates per-fragment; a Hebrew string that
 * means two different things in two places shares one English rendering. Both
 * are fine for static marketing copy. Upgrade path if that ever bites: add
 * data-i18n keys to the ambiguous nodes only.
 */

const STORAGE_KEY = "gamos-lang";
const DICT_URL = "/assets/i18n/en.json";
const ATTRS = ["alt", "aria-label", "placeholder", "title", "content"];
const SKIP_PARENTS = new Set(["SCRIPT", "STYLE", "NOSCRIPT"]);

// Elements that a later module rewrites (GSAP SplitText shatters the hero title
// into per-word spans in hero-scene.js) — a whole-phrase text-node swap can't
// match them after the split. We snapshot their pristine innerHTML at init
// (i18n runs BEFORE hero-scene) and swap the whole element's HTML per language,
// then keep the generic text walk out of their subtree.
const RICH_SELECTORS = [".hero_title h1"];

const state = {
  initialised: false,
  lang: "he",
  dict: null,          // { canonicalHe: en }
  origText: new Map(), // textNode -> original nodeValue
  rich: [],            // [{ el, pristineHTML }]
  bound: { onToggle: null },
};

// ---------------------------------------------------------------------------
// Canonicalisation — MUST match scripts/i18n-build.mjs exactly, so DOM text and
// dictionary keys agree. Decodes &nbsp;, collapses all whitespace (incl. U+00A0
// which \s matches), trims.
// ---------------------------------------------------------------------------
function canon(s) {
  return String(s).replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------------------
// Locale detection
// ---------------------------------------------------------------------------
function savedLang() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "he" || v === "en" ? v : null;
  } catch { return null; }
}

function detectLang() {
  const saved = savedLang();
  if (saved) return saved;
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    if (tz === "Asia/Jerusalem" || tz === "Asia/Tel_Aviv") return "he";
  } catch { /* ignore */ }
  try {
    const langs = (navigator.languages || [navigator.language || ""]).join(",").toLowerCase();
    if (/(^|,)(he|iw)\b/.test(langs)) return "he";
  } catch { /* ignore */ }
  return "en"; // international default
}

// ---------------------------------------------------------------------------
// Dictionary
// ---------------------------------------------------------------------------
async function loadDict() {
  if (state.dict) return state.dict;
  const res = await fetch(DICT_URL, { cache: "force-cache" });
  if (!res.ok) throw new Error(`i18n dict ${res.status}`);
  state.dict = await res.json();
  return state.dict;
}

// ---------------------------------------------------------------------------
// Apply / restore
// ---------------------------------------------------------------------------
function insideRich(node) {
  for (const { el } of state.rich) {
    if (el.contains(node)) return true;
  }
  return false;
}

function walkTextNodes(fn) {
  const root = document.documentElement;
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentNode;
      if (parent && SKIP_PARENTS.has(parent.nodeName)) return NodeFilter.FILTER_REJECT;
      if (insideRich(node)) return NodeFilter.FILTER_REJECT;
      return node.nodeValue && node.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    },
  });
  let n;
  while ((n = tw.nextNode())) fn(n);
}

// Translate the text nodes inside a detached copy of `html`, preserving markup
// (<br>, <span class="accent">…</span>) — used for the SplitText-managed hero
// title. Returns the translated innerHTML string.
function translateHtml(html, dict) {
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  const tw = document.createTreeWalker(tpl.content, NodeFilter.SHOW_TEXT);
  let n;
  while ((n = tw.nextNode())) {
    const en = dict[canon(n.nodeValue)];
    if (en != null) {
      const lead = n.nodeValue.match(/^\s*/)[0];
      const trail = n.nodeValue.match(/\s*$/)[0];
      n.nodeValue = lead + en + trail;
    }
  }
  return tpl.innerHTML;
}

function applyRich(lang, dict) {
  for (const entry of state.rich) {
    if (!entry.el.isConnected) continue;
    entry.el.innerHTML = lang === "en" ? translateHtml(entry.pristineHTML, dict) : entry.pristineHTML;
  }
}

function translateToEn(dict) {
  applyRich("en", dict);
  // Text nodes
  walkTextNodes((node) => {
    const raw = node.nodeValue;
    const key = canon(raw);
    const en = dict[key];
    if (en == null) return;
    if (!state.origText.has(node)) state.origText.set(node, raw);
    const lead = raw.match(/^\s*/)[0];
    const trail = raw.match(/\s*$/)[0];
    node.nodeValue = lead + en + trail;
  });
  // Attributes
  for (const attr of ATTRS) {
    document.querySelectorAll(`[${attr}]`).forEach((el) => {
      const raw = el.getAttribute(attr);
      if (!raw) return;
      const en = dict[canon(raw)];
      if (en == null) return;
      const cacheKey = `i18nO${attr.replace(/[^a-z]/gi, "")}`;
      if (el.dataset[cacheKey] == null) el.dataset[cacheKey] = raw;
      el.setAttribute(attr, en);
    });
  }
}

function restoreHe() {
  applyRich("he");
  for (const [node, raw] of state.origText) {
    if (node.isConnected) node.nodeValue = raw;
  }
  for (const attr of ATTRS) {
    const cacheKey = `i18nO${attr.replace(/[^a-z]/gi, "")}`;
    document.querySelectorAll(`[data-${"i18n-o" + attr.replace(/[^a-z]/gi, "")}]`).forEach((el) => {
      const orig = el.dataset[cacheKey];
      if (orig != null) el.setAttribute(attr, orig);
    });
  }
}

function updateToggles(lang) {
  // Segmented control: highlight the ACTIVE language, both always visible.
  document.querySelectorAll(".site-nav__lang").forEach((group) => {
    group.querySelectorAll("[data-lang-set]").forEach((opt) => {
      const active = opt.getAttribute("data-lang-set") === lang;
      opt.classList.toggle("is-active", active);
      opt.setAttribute("aria-pressed", active ? "true" : "false");
    });
  });
}

async function applyLang(lang, { persist = false } = {}) {
  const html = document.documentElement;
  html.lang = lang;
  html.setAttribute("dir", lang === "he" ? "rtl" : "ltr");

  if (lang === "en") {
    try { translateToEn(await loadDict()); }
    catch (e) { console.error("[i18n] dict load failed, staying Hebrew:", e); html.lang = "he"; html.setAttribute("dir", "rtl"); lang = "he"; }
  } else {
    restoreHe();
  }

  state.lang = lang;
  updateToggles(lang);
  if (persist) { try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ } }
  // Broadcast so other modules can react (hero-scene swaps the EN/HE hero logo).
  // The only cross-module language signal besides <html lang>/dir.
  try { document.dispatchEvent(new CustomEvent("gamos:langchange", { detail: { lang } })); }
  catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Toggle button — injected as the last item in .site-nav__links so site-nav.js
// clones it into the mobile overlay for free.
// ---------------------------------------------------------------------------
const GLOBE_SVG =
  '<svg class="site-nav__lang-globe" viewBox="0 0 24 24" width="15" height="15" ' +
  'fill="none" stroke="currentColor" stroke-width="1.35" aria-hidden="true">' +
  '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/>' +
  '<path d="M12 3c2.6 2.6 3.9 5.8 3.9 9s-1.3 6.4-3.9 9c-2.6-2.6-3.9-5.8-3.9-9S9.4 5.6 12 3z"/></svg>';

function injectToggle() {
  const list = document.querySelector(".site-nav__links");
  if (!list || list.querySelector(".site-nav__lang")) return;
  const li = document.createElement("li");
  li.className = "site-nav__lang-item";
  li.innerHTML =
    '<div class="site-nav__lang" role="group" aria-label="Language · שפה">' +
    GLOBE_SVG +
    '<button type="button" class="site-nav__lang-opt" data-lang-set="he" lang="he">עב</button>' +
    '<span class="site-nav__lang-sep" aria-hidden="true"></span>' +
    '<button type="button" class="site-nav__lang-opt" data-lang-set="en" lang="en">EN</button>' +
    "</div>";
  list.appendChild(li);
}

function onToggleClick(event) {
  const opt = event.target.closest("[data-lang-set]");
  if (!opt) return;
  event.preventDefault();
  const lang = opt.getAttribute("data-lang-set");
  if (lang !== "he" && lang !== "en") return;
  if (lang === state.lang) return;
  applyLang(lang, { persist: true });
}

// ---------------------------------------------------------------------------
// init / destroy
// ---------------------------------------------------------------------------
export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  // Snapshot rich elements' pristine markup BEFORE any later module (hero-scene
  // SplitText) rewrites them.
  for (const sel of RICH_SELECTORS) {
    document.querySelectorAll(sel).forEach((el) => {
      state.rich.push({ el, pristineHTML: el.innerHTML });
    });
  }

  injectToggle();
  updateToggles("he");

  // Delegated click — covers the bar button AND the mobile-overlay clone.
  state.bound.onToggle = onToggleClick;
  document.addEventListener("click", state.bound.onToggle);

  // Resolve + apply the starting locale. Israeli visitors (the majority) get
  // Hebrew with zero network work; international visitors trigger the dict fetch.
  const lang = detectLang();
  applyLang(lang, { persist: false });

  state.initialised = true;
}

export function destroy() {
  if (!state.initialised) return;
  if (state.bound.onToggle) document.removeEventListener("click", state.bound.onToggle);
  restoreHe();
  state.origText.clear();
  state.bound.onToggle = null;
  state.initialised = false;
}
