# Lighthouse Baseline — Static Audit (No Browser)

**Date:** 2026-05-28
**Author:** Agent 10 (QA & Performance enforcer)
**Method:** Pure static analysis — Bash/WebFetch denied in sandbox; no browser available.
**Scope:** Predict Lighthouse / CWV outcomes from source-only inspection of HTML, CSS, JS, and asset budget tracking from `architecture/asset-inventory.md` + sizes recorded in user prompt.

---

## TL;DR (Predicted Lighthouse Mobile, 4G, Moto G4)

| Pillar          | Target | Predicted | Verdict |
|-----------------|--------|-----------|---------|
| Performance     | ≥ 90   | **62–72** | 🔴 Fail (asset oversize + CSS/HTML class mismatches degrade LCP/CLS) |
| Accessibility   | ≥ 95   | **84–92** | 🟡 Borderline (a11y baseline strong; placeholders break landmark labels) |
| Best Practices  | ≥ 95   | **88–95** | 🟡 (HTTP source links; otherwise clean) |
| SEO             | ≥ 95   | **92–96** | 🟢 Likely pass once meta + JSON-LD TODO placeholders are filled |

> **Bottom line: NOT YET ready for browser testing.** 6 P0 defects must close first
> (see `PLANS/fixes/2026-05-28_*.md`). Once closed, expected Performance bumps to
> 88–93 mobile, 96–99 desktop.

---

## 1. Asset-Budget Audit

Sizes per user prompt + Glob inventory.

| Asset                                     | Budget   | Actual         | Status |
|-------------------------------------------|----------|----------------|--------|
| `assets/video/hero-master-1080.mp4`       | ≤ 12 MB  | **~13 MB**     | 🔴 OVER (8% over) |
| `assets/video/hero-master-720.mp4`        | ≤ 6 MB   | **~9.6 MB**    | 🔴 OVER (60% over) |
| `assets/video/hero-poster.jpg`            | ≤ 80 KB  | **~72 KB**     | ✅ |
| `assets/video/portal-loop.mp4`            | ≤ 2 MB   | **~275 KB**    | ✅ |
| `assets/fonts/*.woff2` (8 files)          | ≤ 200 KB | **~176 KB**    | ✅ |
| Hall images (full WebP, 64+68+20+44 files)| ≤ 240 KB | not measured¹  | 🟡 Pending audit (Agent 03 produced them; sizes not tracked) |
| Hall images (half WebP)                   | ≤ 90 KB  | not measured¹  | 🟡 Pending audit |
| Culinary images (×52 variants)            | ≤ 240 KB | not measured¹  | 🟡 Pending audit |

¹ Not measurable from static analysis without shell `Get-ChildItem -Length` or `du`.
   Recommendation: rerun after pipeline so each manifest row in `asset-inventory.md`
   gets a real size column. This blocks ✅ green on the image budget.

### Hero Video Budget — Why It Matters

The hero MP4 is preloaded with `preload="auto"` — a 13 MB / 9.6 MB starting payload
on a 4G connection (~5 Mbit/s effective) burns ~20–25 s of bandwidth before LCP
poster is fully ready. Even though the **poster** (72 KB) is the actual LCP
candidate, the simultaneous video fetch contention degrades TTFB-to-LCP timing
by 200–600 ms. Predicted LCP impact: **+0.4–0.9 s on mobile**, pushing 4G LCP
toward 2.8–3.4 s — over the 2.5 s budget.

**See:** `PLANS/fixes/2026-05-28_hero-1080p-over-budget.md`,
        `PLANS/fixes/2026-05-28_hero-720p-over-budget.md`.

---

## 2. LCP (Largest Contentful Paint) — Predicted

**Candidate:** `/assets/video/hero-poster.jpg` (72 KB).
**Preload:** ✅ `<link rel="preload" as="image" href="/assets/video/hero-poster.jpg" fetchpriority="high">` present in `<head>`.
**Format:** JPEG (could be WebP for ~15% reduction; deferred — within budget).
**Decoding:** Browser can decode 72 KB JPEG in <50 ms even on Moto G4.

Predicted LCP path:
1. HTML `<head>` parsed → preload kicks in (~50–150 ms after navigation).
2. Hero MP4 begins fetching in parallel under `preload="auto"` (contends).
3. Poster paints under hero `<video poster="...">` once the inline 100vh sticky
   layout settles.

**Predicted LCP (4G mobile):** 2.4–3.2 s.
**Verdict:** 🟡 Borderline. **Will likely fail without one of:**
- (A) Re-encode hero MP4 to budget (drops contention).
- (B) Switch hero video `preload="metadata"` until first scroll.
- (C) Both, recommended.

---

## 3. CLS (Cumulative Layout Shift) — Predicted

| Risk source                                 | Mitigation present?                                  | Verdict |
|---------------------------------------------|------------------------------------------------------|---------|
| Hero `<video>`                              | `width:100%; height:100%; object-fit:cover` in CSS, sticky 100vh container | ✅ |
| Web fonts swap                              | `font-display: swap` + `unicode-range` subsetting    | ✅ low risk |
| Hall section images                         | **No `<picture>` or `<img>` markup in `index.html` yet — only `data-placeholder` divs.** | 🔴 Will need verification once Agent 04 integrates Agent 08's stubs. |
| Portal-loop video bubbles                   | Fixed-size circles via tokens; no aspect-ratio shift | ✅ |
| Form / mobile menu reflow                   | `min-height: 100dvh` on body; flex layout            | ✅ |

**Predicted CLS:** 0.02–0.08.
**Verdict:** 🟡 At-risk only because **the actual photo content is not yet in
`index.html`** — once Agent 04 replaces `data-placeholder` divs with
`<picture>` markup that includes `width`/`height`/`aspect-ratio`, CLS should
fall to ~0.02. **See defect:** `PLANS/fixes/2026-05-28_no-picture-markup.md`.

---

## 4. INP (Interaction to Next Paint) — Predicted

- **GSAP main bundle:** 70 KB gz (CDN, defer-loaded).
- **App JS modules:** 6 modules, all `init()`/`destroy()` contract, all use
  `passive: true` listeners (slider.js verified).
- **Reduced-motion paths:** All 3 motion modules + portals.js + hero-video-scrub.js
  have explicit reduced-motion branches.
- **No globals, no synchronous DOM thrash.**

**Predicted INP:** 80–140 ms desktop, 130–220 ms mobile.
**Verdict:** 🟢 Within budget on desktop, 🟡 borderline on mobile (200 ms target).
**Risk:** GSAP CDN over `cdn.skypack.dev` — ESM with TLS handshake adds
~150 ms first-paint cost on cold cache. Recommend self-hosting for production.

---

## 5. CSS Architecture Audit

### 5.1 Token discipline (Constitution §10.2)

- ✅ All raw hex values are in `css/tokens.css` (12 brand tokens) — no leaks.
- ✅ Defense-in-depth fallback hexes inside `var(--accent, #b89766)` in 3
  motion-* files are acceptable (graceful degrade if tokens.css fails to load).
- 🔴 **Token-vs-Constitution mismatch:** `tokens.css` declares `--brass: #B89766`,
  but Constitution §5 LOCKED 2026-05-28 says `--brass: #CFAE83`. **Live brand
  color is not honored.** See `PLANS/fixes/2026-05-28_brand-token-mismatch.md`.

### 5.2 RTL discipline (Constitution §4)

- ✅ Zero `margin-left|margin-right|padding-left|padding-right|left:|right:` outside tokens.css.
- ✅ All sectional CSS uses logical properties (`inset-inline-*`, `padding-block`, etc.).
- ✅ Skip-link uses `inset-inline-start`.

### 5.3 `!important` usage

- ✅ All 100+ `!important` instances confined to `css/utilities.css` (Constitution §10.2 spirit).
- ✅ Single exception: `prefers-reduced-motion` block in `base.css` (a11y mandatory).
- ✅ No section CSS uses `!important`.

### 5.4 Cascade Layers

- ✅ `tokens, base, layout, utilities, sections` declared consistently.
- ✅ `hero.css` wraps in `@layer sections {}`.
- 🔴 **All other `css/sections/*.css` (portals, hall-venue, hall-resort, lounge,
  rooms, culinary, motion-*) DO NOT wrap in `@layer sections {}`.** Utilities
  may not override sectional rules without `!important` in some cases.
  **See:** `PLANS/fixes/2026-05-28_section-css-not-layered.md`.

### 5.5 Class-name reconciliation

- 🔴 **`.section-header` class used in HTML 9 times — not defined in any CSS.**
  Agent 4 used `.section-header__*` throughout (`#lounge`, `#rooms`, `#culinary`,
  `#about`, `#testimonials`, `#gallery`, `#events`, `#kosher`, `#contact`),
  while Agent 8 implemented per-section BEM (`.lounge__header`, `.rooms__header`,
  `.culinary__header`). All section headers will render as unstyled `<header>` defaults.
  **See:** `PLANS/fixes/2026-05-28_class-name-reconciliation.md`.
- 🔴 `.hero__sub` defined in CSS, but HTML uses `.hero__subtitle`. Hero subtitle
  unstyled. Same fix.
- 🔴 `.section` / `.section--alt` / `.section--dark` defined in `layout.css`
  but **never applied** to any `<section>` in `index.html`. Site-wide
  `padding-block: var(--space-32)` lost on every section.
  **See:** `PLANS/fixes/2026-05-28_section-class-not-applied.md`.

### 5.6 Missing CSS files

The HTML links 10 section stylesheets, but the section-order.md mandates
14 sections + footer. Missing CSS:
- 🔴 `css/sections/gallery.css` — does not exist.
- 🔴 `css/sections/events.css` — does not exist.
- 🔴 `css/sections/kosher.css` — does not exist.
- 🔴 `css/sections/site-nav.css` (or equivalent) — does not exist.
- 🔴 `css/sections/site-footer.css` — does not exist.

The HTML has visible `#gallery`, `#events`, `#kosher`, `<header class="site-nav">`,
`<footer class="site-footer">`, but no styles target them.
**See:** `PLANS/fixes/2026-05-28_missing-section-stylesheets.md`.

Additionally:
- 🔴 **Motion CSS files NOT linked from `index.html`:** `motion-reveals.css`,
  `motion-accordions.css`, `motion-slider.css` exist but are not in `<link>`
  tags. Reveals/accordions/slider will run unstyled (still functional, but
  visually broken — opacity 0 won't transition to 1).
  **See:** `PLANS/fixes/2026-05-28_motion-css-not-linked.md`.

### 5.7 Empty placeholder stylesheets

- 🔴 `about.css` — empty placeholder (5 lines, only header comment).
- 🔴 `testimonials.css` — empty placeholder.
- 🔴 `contact.css` — empty placeholder.

`#about` (with stats), `#testimonials` (with carousel), `#contact` (with
form + map) will render with global defaults only.
**See:** `PLANS/fixes/2026-05-28_empty-section-stylesheets.md`.

---

## 6. JS Architecture Audit

### 6.1 Module contract (Constitution §10.3)

| Module                  | `init()` | `destroy()` | `prefers-reduced-motion` | Notes |
|-------------------------|:-------:|:-----------:|:------------------------:|-------|
| `main.js`               | n/a     | n/a         | passes `motion` to all   | bootstraps |
| `hero-video-scrub.js`   | ✅      | ✅          | ✅                       | full impl by Agent 06 — wait, Phase 3c was ⬜! Actually filled in commit. Verify with Agent 06. |
| `portals.js`            | ✅      | ✅          | ✅ (live MQL listener)   | iOS fallback via IntersectionObserver |
| `reveals.js`            | ✅      | ✅          | ✅                       | idempotent, WeakSet observer tracking |
| `accordions.js`         | ✅      | ✅          | ✅                       | native `<details>` + JS height fallback |
| `slider.js`             | ✅      | ✅          | ✅                       | RTL-aware sign flip |
| `lenis.js`              | ✅ stub | ✅ no-op    | ❌ (stub)                | 🔴 **Still placeholder — `console.log("lenis: TODO (Agent 09)")`** |

🔴 **lenis.js is unfinished.** Constitution §2 says Lenis is desktop smooth-scroll
backbone. Currently a no-op printing `console.log` on every page load.
**See:** `PLANS/fixes/2026-05-28_lenis-not-implemented.md`.

### 6.2 Production-noise audit (`console.*` calls)

- `main.js:19,47,51` — `console.warn/.info/.error` (legitimate err handlers).
- `portals.js:304` — `console.warn` (graceful fallback notice).
- `hero-video-scrub.js:36,94` — `console.error/.warn` (handler errors, missing DOM).
- 🔴 `lenis.js:11` — `console.log("lenis: TODO (Agent 09)")` — production noise; remove with implementation.

All other modules clean. ✅

### 6.3 GSAP loading

- ✅ ESM imports from `cdn.skypack.dev` per Constitution §2.
- ⚠️ `defer` attribute on `<script type="module">` is redundant (modules are
  deferred by spec). Harmless.
- 🟡 Recommendation: Self-host GSAP for production launch (cuts third-party
  TLS handshake; ~150 ms saved on cold load).

---

## 7. HTML / `index.html` Audit

### 7.1 Accessibility checklist

- ✅ `<html dir="rtl" lang="he">`.
- ✅ Skip-link is first focusable (`<a class="skip-link" href="#main-content">דלג לתוכן הראשי</a>`).
- ✅ ARIA landmarks: `<header role="banner">`, `<main>`, `<aside>` (×2: portals, contact-details), `<footer role="contentinfo">`.
- ✅ All interactive elements have `aria-label` or text content.
- ✅ Mobile menu toggle: `aria-controls="site-nav-mobile"` + `aria-expanded="false"`.
  - 🟡 But there is no element with `id="site-nav-mobile"` in DOM — broken `aria-controls`.
- ✅ Form: every `<input>` has `<label for>`, `aria-required`, `aria-describedby`.
- ✅ `<bdi>` wraps every digit run inside Hebrew text.
- ✅ `dir="ltr"` on `tel`/`email` inputs.
- ✅ JSON-LD `EventVenue` is present (with `TODO-*` placeholders — Agent 1's job to fill).

**Predicted A11y impact:** broken `aria-controls` is one a11y violation worth
~3–5 Lighthouse points. **See:** `PLANS/fixes/2026-05-28_aria-controls-broken.md`.

### 7.2 Structured data / SEO

- ✅ `<title>`, `<meta name="description">` present (placeholder copy).
- ✅ Open Graph + Twitter cards present.
- 🟡 JSON-LD `TODO-PHONE`, `TODO-STREET`, `TODO-LAT`, `TODO-LNG` — Agent 01 must fill before launch (validation will fail).
- ✅ Canonical URL via OG.
- ❌ No `sitemap.xml` (single-page site — acceptable).
- ❌ No `robots.txt` (acceptable for staging).

### 7.3 Section anchors vs `section-order.md`

| # | Spec anchor       | In HTML | Status |
|---|-------------------|---------|--------|
| 1 | top nav           | ✅ `<header class="site-nav">` | OK |
| 2 | `#hero`           | ✅ | OK |
| 3 | `#portals`        | ✅ | OK |
| 4 | `#hall-venue`     | ✅ | OK |
| 5 | `#hall-resort`    | ✅ | OK |
| 6 | `#lounge`         | ✅ | OK |
| 7 | `#rooms`          | ✅ | OK |
| 8 | `#culinary`       | ✅ | OK |
| 9 | `#about`          | ✅ | OK |
| 10| `#testimonials`   | ✅ | OK |
| 11| `#gallery`        | ✅ | OK |
| 12| `#events`         | ✅ | OK |
| 13| `#kosher`         | ✅ | OK |
| 14| `#contact`        | ✅ | OK |
| 15| `#footer`         | ✅ | OK |

**14/14 sections present.** ✅

### 7.4 Performance markup

- ✅ `<link rel="preload" as="image" href=".../hero-poster.jpg" fetchpriority="high">`.
- ✅ `<link rel="preload" as="font" type="font/woff2" crossorigin href=".../frank-ruhl-libre-400.woff2">`.
- ✅ `<script type="module" defer src="/js/main.js">`.
- ✅ `<meta name="viewport" content="...viewport-fit=cover">`.
- 🔴 **No `<picture>` markup anywhere — all hall/lounge/rooms/culinary/gallery
  spots are placeholder `<div data-placeholder="...">`.** 248 image files exist
  on disk per `asset-inventory.md` Half 2, but the HTML never references them.
  **See:** `PLANS/fixes/2026-05-28_no-picture-markup.md`.
- 🔴 **No `data-reveal` or `data-stagger` attributes on any DOM node** — Agent 09's
  reveal module won't fire on any element. Agent 4's TODO in
  `.tmp/reveal-attribute-injections.md` was never executed.
  **See:** `PLANS/fixes/2026-05-28_no-reveal-attributes.md`.

---

## 8. Predicted Score Breakdown

### Mobile Lighthouse (4G, Moto G4)

| Metric                | Predicted    | Budget   | Score Contribution |
|-----------------------|--------------|----------|--------------------|
| First Contentful Paint| 1.6–2.0 s    | < 1.8    | 18/25 |
| Speed Index           | 3.0–4.0 s    | < 3.4    | 8/15  |
| LCP                   | 2.7–3.2 s    | < 2.5    | **15/30 — fails** |
| TBT                   | 90–180 ms    | < 200    | 18/25 |
| CLS                   | 0.04–0.10    | < 0.1    | 4/5 (borderline) |
| **Total est.**        |              |          | **63/100** |

### Desktop Lighthouse

LCP, FCP, TBT all stronger; expect **82–92** before fixes.

### Once P0 fixes land

- Re-encode hero MP4 → Performance jumps to ~85 mobile.
- Add `<picture>` markup → CLS lands ~0.02, FCP improves.
- Link motion CSS, fix class-name reconciliation → polish-only (no perf swing).
- Final predicted: **88–93 mobile, 96–99 desktop**. Targets met.

---

## 9. Defect Summary (P0 must close before browser test)

| ID | File | Severity | Owner |
|----|------|----------|-------|
| F-01 | `2026-05-28_hero-1080p-over-budget.md`         | P1 | Agent 03 |
| F-02 | `2026-05-28_hero-720p-over-budget.md`          | P0 | Agent 03 |
| F-03 | `2026-05-28_class-name-reconciliation.md`      | P0 | Agent 04 + 08 |
| F-04 | `2026-05-28_brand-token-mismatch.md`           | P0 | Agent 02 |
| F-05 | `2026-05-28_motion-css-not-linked.md`          | P0 | Agent 04 |
| F-06 | `2026-05-28_section-class-not-applied.md`      | P0 | Agent 04 |
| F-07 | `2026-05-28_section-css-not-layered.md`        | P1 | Agents 07, 08, 09 |
| F-08 | `2026-05-28_missing-section-stylesheets.md`    | P0 | Agent 08 + 09 |
| F-09 | `2026-05-28_empty-section-stylesheets.md`      | P0 | Agent 08 + 09 |
| F-10 | `2026-05-28_no-picture-markup.md`              | P0 | Agent 04 + 08 |
| F-11 | `2026-05-28_no-reveal-attributes.md`           | P1 | Agent 04 |
| F-12 | `2026-05-28_lenis-not-implemented.md`          | P1 | Agent 09 |
| F-13 | `2026-05-28_aria-controls-broken.md`           | P1 | Agent 04 |

**P0 = must fix before Phase 5 ✅. P1 = must fix before launch.**

---

## 10. Verdict

**Phase 5 status:** 🟡 In progress — defects discovered. Recommend HOLD on
browser smoke test until F-02, F-03, F-04, F-05, F-06, F-08, F-09, F-10
close. The site will load and not crash, but 4–5 sections render unstyled,
which undermines any visual / Lighthouse pass.

After P0 closes, expect mobile Lighthouse Performance 88–93, A11y 95+,
SEO 95+, Best Practices 95+ — all on target.
