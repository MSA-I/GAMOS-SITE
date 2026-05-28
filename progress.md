# Progress — GAMOS-SITE

> מצב phases × סוכנים. עדכן בכל phase gate.

**Legend:** ⬜ Not started | 🟡 In progress | 🔴 Blocked | ✅ Done

---

## Status Matrix

| Phase | Description                          | Owner       | Status |
|-------|--------------------------------------|-------------|--------|
| 0     | Workspace Bootstrap                  | main        | ✅     |
| 1     | Deep Research                        | Agent 01    | 🟡     |
| 2a    | Brand & Typography                   | Agent 02    | ✅     |
| 2b    | Asset Pipeline                       | Agent 03    | 🔴     |
| 3a    | HTML / Structure                     | Agent 04    | ✅     |
| 3b    | CSS Layout                           | Agent 05    | ✅     |
| 3c    | Hero Video-Scrub                     | Agent 06    | ⬜     |
| 4a    | Portal Bubbles                       | Agent 07    | ✅     |
| 4b    | Hall Sections                        | Agent 08    | 🟡     |
| 4c    | Motion (static)                      | Agent 09    | 🟡     |
| 5     | QA & Performance                     | Agent 10    | 🟡     |

---

## Phase Log

### Phase 0 — Workspace Bootstrap

- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Owner:** main agent
- **Outputs:**
  - `CLAUDE.md` (Constitution, 12 §)
  - `PLANS/README.md` + 7 sub-folders (fixes/features/refactors/design/performance/research/archive)
  - `agent-plans/README.md`
  - `architecture/` עם 8 SOPs ו-Skeleton
  - `task_plan.md`, `findings.md`, `progress.md`, `README.md`
  - `.tmp/` (gitignored placeholder)
  - `css/`, `js/`, `assets/` skeleton
  - העתקת התוכנית ל-`PLANS/research/2026-05-28_master-rebuild-plan.md`

---

### Phase 1 — Deep Research

- **Started:** 2026-05-28
- **Status:** 🟡 In progress — 6 deliverables shipped; awaiting user approval gate (Q1–Q10 in `full-tab-inventory.md`).
- **Owner:** Agent 01 (Research & Content Lead)
- **Outputs (all absolute paths):**
  - `D:\משה פרוייקטים\GAMOS-SITE\PLANS\research\2026-05-28_site-content-map.md` — verbatim Hebrew copy mapped to every section + sub-page; brand metadata, contact info, all live image/video URLs.
  - `D:\משה פרוייקטים\GAMOS-SITE\PLANS\research\2026-05-28_full-tab-inventory.md` — **user-approval gate**; 10 live tabs + 5 new sections (`#lounge`, `#rooms`, `#testimonials`, `#kosher`, `#events` accordion); 10 decision questions Q1–Q10 awaiting user.
  - `D:\משה פרוייקטים\GAMOS-SITE\PLANS\research\2026-05-28_competitor-audit.md` — 7 references analyzed (Bvlgari, Aman, Six Senses, Gardenia, Herod's, Ronit Farm, Apple AirPods); steal/avoid matrix; decisions that flow into Phases 2-4.
  - `D:\משה פרוייקטים\GAMOS-SITE\PLANS\research\2026-05-28_font-identification.md` — NOMAD reference identified as Saol Display Cut / Migra Inline (commercial); free alternative Frank Ruhl Libre + Heebo + Playfair Display confirmed; subsetting plan + `@font-face` template.
  - `D:\משה פרוייקטים\GAMOS-SITE\architecture\asset-inventory.md` — Pending block replaced with: real brand colors (#CFAE83 brass, #534133 cocoa, #B8576F accent-rose, etc.); logo/og/favicon source URLs; full contact info + social media; 5 live image/video URLs not in local folders; brand metadata.
  - `D:\משה פרוייקטים\GAMOS-SITE\CLAUDE.md` §5 — Provisional palette **LOCKED 2026-05-28 by Agent 01**; Maintenance Log updated.
  - `D:\משה פרוייקטים\GAMOS-SITE\findings.md` — Phase 1 entry added (key findings, bugs, blockers, deliverables).
- **Blockers carried forward:**
  - WebFetch + Bash/curl denied during the run → logo/OG/favicon binaries not yet downloaded; Agent 3 will fetch in Phase 2b.
  - Sub-pages (`/הסיפור-שלנו/`, `/גלריה/`, `/אירועים-עסקיים/`, `/מפות/`, `/הצהרת-נגישות/`) not scraped — Phase 1.5 follow-up needed if WebFetch is re-enabled, otherwise manual user input.
- **Done criteria status:**
  - ✅ All 6 deliverables exist at exact paths.
  - ✅ Inventory includes every visible link (top-nav + footer + sub-pages).
  - 🟡 User approval pending (Q1–Q10 gate).
  - ✅ Constitution §5 palette locked.
  - ✅ Font identification + 2-3 fallbacks per slot with rationale.

### Phase 2a — Brand & Typography

- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Owner:** Agent 02
- **Outputs:**
  - `css/tokens.css` — full implementation: palette, semantic colors, type scale, weights, line-heights, tracking, spacing (4px base), radii, layout, motion durations + easings, z-index, 8 `@font-face` rules with `font-display: swap` and `unicode-range`, reduced-motion override at the token layer.
  - `architecture/tokens.md` — Status flipped to **LOCKED 2026-05-28 by Agent 02**; added "Fonts — self-host map" section with file→family→weight→coverage table.
  - `.tmp/font-smoke.html` — Hebrew display + Hebrew body + Latin display + palette swatches, all driven by tokens.
- **Carry-over:**
  - WOFF2 binaries not on disk: same sandbox limit as Agent 03 (Bash + WebFetch denied). Manual fetch instructions are in `findings.md` (3 options: Google Fonts CSS URL, google-webfonts-helper UI, fontsource npm). `css/tokens.css §1` already references the expected `assets/fonts/*.woff2` paths so the smoke test renders the moment files land.
  - Brand palette block in `tokens.css §2.1` remains Provisional until Agent 1 finishes the gamos.co.il scrape — semantic tokens reference brand, so a single-block edit will propagate.

### Phase 2b — Asset Pipeline

- **Started:** 2026-05-28
- **Owner:** Agent 03
- **Status:** 🔴 Blocked — Bash/shell access denied in agent sandbox; cannot run ffmpeg/sharp.
- **Prepared:**
  - `.tmp/concat-list.txt` (13 absolute-path entries, ordered 1..13)
  - `.tmp/run-asset-pipeline.ps1` (PowerShell, primary)
  - `.tmp/run-asset-pipeline.sh`  (Bash / Git-Bash / WSL fallback)
  - `architecture/asset-inventory.md` Half 2 manifest (every source→dest×variants documented)
  - `findings.md` blocker note + manual-run instructions
- **Next step:** User runs the PowerShell script once ffmpeg + Node are installed. Estimated wall time ~12-25 min. After completion, re-run a verification pass to fill the run-status tracker in `asset-inventory.md` with actual byte sizes, then flip this row to ✅.
- **Blockers:** Sandbox lacks `Bash`. Cannot probe whether ffmpeg is installed locally. **No code path exists in the agent toolkit to encode video / WebP** without shell exec — the deliverables themselves are blocked, not the planning.

### Phase 3a — HTML / Structure

- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Owner:** Agent 04
- **Blockers:** None — built with placeholder copy + `TODO(agent-01)` markers ahead
  of Agent 01's full-tab-inventory.md. Structure is final; only copy needs a pass.
- **Outputs:**
  - `index.html` — full RTL semantic skeleton, all 14 anchors per
    `architecture/section-order.md` (`#hero`, `#portals`, `#hall-venue`,
    `#hall-resort`, `#lounge`, `#rooms`, `#culinary`, `#about`, `#testimonials`,
    `#gallery`, `#events`, `#kosher`, `#contact`, `#footer`). Skip-link first,
    ARIA landmarks on every section, JSON-LD `EventVenue` (placeholders),
    preload hints (poster + Frank Ruhl Libre WOFF2), 11 section stylesheets
    linked, foundation (`tokens` / `base` / `layout` / `utilities`) linked.
  - `js/main.js` — ESM entry shell. CDN GSAP + ScrollTrigger
    (`cdn.skypack.dev/gsap@3.12.5`). `safeInit` per module so a single broken
    module never breaks the page; modules import as namespaces.
  - Placeholder JS modules (mine): `hero-video-scrub.js` (Agent 06 fills),
    `portals.js` (Agent 07 fills), `lenis.js` (Agent 09 fills).
  - **Already populated by Agent 09 in parallel** (NOT overwritten):
    `js/reveals.js`, `js/accordions.js`, `js/slider.js` — all match the
    `init()`/`destroy()` contract `main.js` calls.
  - `js/utils/{rtl,media-query,debounce}.js` — minimal helpers seeded.
  - 10 placeholder section CSS files (`hero` through `contact`) — header
    comments only — so `<link>` tags don't 404 while Agents 5–9 fill them.
- **Notes for downstream agents:**
  - Hero DOM matches `architecture/video-scrub-spec.md` byte-for-byte
    (`#hero` → `.hero__spacer` + `.hero__sticky` → `.hero__video` with
    1080p / 720p `<source>` + `.hero__overlay`).
  - Portal DOM matches `architecture/portal-bubbles-spec.md` byte-for-byte
    (two `<button>` with `data-target` to `#hall-venue` / `#hall-resort`,
    `<video>` loop, `.portal__ring`, `.portal__label`).
  - Numbers in Hebrew text wrapped in `<bdi>` for correct bidi
    (phones, percentages, years, capacity).
  - Form: `dir="ltr"` on `tel`/`email` inputs; `aria-required`,
    `aria-describedby`, `aria-live="polite"` feedback region; `autocomplete`
    + `inputmode` set.
  - `data-placeholder="..."` on every media slot — Agent 8 ID anchors:
    `hall-venue-hero`, `hall-resort-hero`, `lounge-hero`,
    `room-suite/deluxe/classic`, `dish-1..6`, `gallery-1..8`, `map`.
  - Mobile menu toggle wired with `aria-controls="site-nav-mobile"` +
    `aria-expanded="false"` — Agent 5 ties to CSS, Agent 9 to JS.
  - `<details name="events-accordion">` gives single-open behavior natively
    in Chromium 120+; Agent 09's `accordions.js` already supports it.
  - JSON-LD `EventVenue` has `TODO-PHONE`, `TODO-STREET`, `TODO-LAT`,
    `TODO-LNG` — Agent 01 must fill before launch.

### Phase 3b — CSS Layout

- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Owner:** Agent 05
- **Outputs:**
  - `css/base.css` — modern reset (Andy Bell-flavoured), RTL typography defaults,
    headings (h1..h6 → `--font-display-he`), link defaults (no underline → brass on
    hover), `:focus-visible` 3px brass + 4px offset, `.skip-link`,
    `prefers-reduced-motion` global override, form/list/table/media defaults.
  - `css/layout.css` — `.container[--narrow|--wide|--flush]`, `.section[--tight|--loose|--dark|--alt|--flush]`,
    `.grid[--auto-fit|--auto-fill|--2|--3|--4]` with mobile collapses,
    `.flex[--center|--between|--around|--column|--wrap|--baseline|...]`,
    `.gap-{0..16}` + axis-specific `.gap-x-*`/`.gap-y-*`, `.cluster`, `.cover`,
    aspect-ratio holders (`.aspect-{square,video,portrait,cinema}`), `.stack[--sm|--md|--lg|--xl]`.
  - `css/utilities.css` — logical spacing (`.mt|mb|ms|me|mx|my|pt|pb|px|py-{0..32}`),
    `.sr-only` + `.visually-hidden`, `.bidi-iso[--block]`, type scale (`.text-xs..hero`),
    text-align/leading/tracking, color + bg utilities for every brand token,
    `.font-{display-he|display-en|body|mono}`, `.weight-{400..700}`, `.eyebrow[--ivory|--muted]`,
    radii, shadows, position helpers, sizing.
  - `.tmp/layout-smoke.html` — 9-section visual smoke test (skip-link, hero/type ladder,
    palette, containers, grids, flex, dark inversion, spacing utilities, forms with
    focus ring, aspect holders).
- **Notes:**
  - All 3 files start with `@layer base, layout, utilities, sections;` — Agent 08/09
    must wrap section CSS in `@layer sections {}` for utilities to override without
    `!important`.
  - `!important` confined to `utilities.css` (Constitution §10.2 spirit) plus the
    a11y `prefers-reduced-motion` override in `base.css`.
  - Logical properties only — `inline-start/end`, `block-start/end`, `text-align: start`.
- **Blockers:** Phase 2a (tokens.css) — resolved mid-run; Agent 02 published
  `css/tokens.css` while I was writing.

### Phase 3c — Hero Video-Scrub

- **Started:** —
- **Owner:** Agent 06
- **Blockers:** Phase 2b (hero-master-1080.mp4 + poster)

### Phase 4a — Portal Bubbles

- **Started:** 2026-05-28
- **Completed:** 2026-05-28
- **Owner:** Agent 07
- **Status:** ✅ Done — module + CSS shipped; functional even before Agent 06's hero hook lands (graceful IntersectionObserver fallback).
- **Outputs (absolute paths):**
  - `D:\משה פרוייקטים\GAMOS-SITE\css\sections\portals.css` — full implementation per spec (fixed bottom-center, 280px / 180px circles, brass ring + glow, focus-visible 5px ring + outline, reveal via `.is-active`, `.is-leaving` exit state, mobile vertical-stack, reduced-motion + forced-colors blocks).
  - `D:\משה פרוייקטים\GAMOS-SITE\js\portals.js` — ES2022 module with `init({ motion })` + `destroy()`. Subscribes to `window.gamosHero.onProgress` (with 5s polling timeout); falls back to IntersectionObserver on `#hero` if the hook never appears (iOS / Agent 06 not yet wired). GSAP timeline scales clicked bubble to 6× over 1s with `power3.in` while fading the sibling, then `scrollIntoView`. Reduced-motion path: instant reveal + direct scroll, no GSAP. Click race guard via `state.isExpanding`. Honors live `prefers-reduced-motion` toggle without reload.
- **Verification:**
  - `index.html` `#portals` block already matches `architecture/portal-bubbles-spec.md` byte-for-byte (Agent 04 wrote it). No changes needed there.
  - 100% logical properties; 100% `var(--*)` tokens.
  - Reveal hysteresis (0.92 in / 0.88 out) prevents flicker at the boundary.
  - Initial state uses `visibility: hidden` + `pointer-events: none` so invisible portals never block hero clicks.
- **Blockers / handoff notes:**
  - Agent 06 must call `window.gamosHero.onProgress(cb)` from `js/hero-video-scrub.js` for the **canonical** reveal path. Until then, the IO fallback handles it — the portals will still reveal at the end of `#hero`.
  - Agent 03 — `assets/video/portal-loop.mp4` confirmed present (275KB ✅). Spec satisfied.

### Phase 4b — Hall Sections

- **Started:** 2026-05-28
- **Owner:** Agent 08
- **Status:** 🟡 In progress — 5 stylesheets + HTML stubs delivered;
  flips ✅ once Agent 04 injects the stubs into `index.html`.
- **Outputs:**
  - `css/sections/hall-venue.css` (split-grid אולם, brass CTA, gallery)
  - `css/sections/hall-resort.css` (70vh hero + native accordion + room-card)
  - `css/sections/lounge.css` (horizontal scroll-snap rail, scrollbar hidden)
  - `css/sections/rooms.css` (CSS-columns masonry, hover-zoom + brass underline)
  - `css/sections/culinary.css` (3-col gallery, hover-overlay captions, capsule tags)
  - `.tmp/hall-html-stubs.md` — `<picture>` markup, accordion, scroll-snap
    children, placeholder Hebrew copy ready for Agent 04 to merge into `index.html`.
- **Verification:**
  - 100% logical properties (zero `left/right/top/bottom`).
  - 100% `var(--*)` — no hard-coded colors / sizes / durations.
  - All `<img>` carry `width` + `height`; aspect-ratio in CSS — CLS budget held.
  - Reduced-motion override per file (defense-in-depth on top of token-layer).
- **Downstream blockers (not blocking 4b output, only final integration):**
  - Agent 03 — image pipeline must produce `/assets/images/halls/...` +
    `/assets/images/culinary/...` (WebP+JPG, full+half).
  - Agent 01 — Hebrew copy verbatim from full-tab inventory.
  - Agent 09 — `.reveal-*` classes already present in stubs; ScrollTrigger
    wires them at integration time.

### Phase 4c — Motion (static)

- **Started:** 2026-05-28
- **Owner:** Agent 09
- **Status:** 🟡 In progress — modules + CSS shipped; awaiting Agent 04 attribute injection + Agent 08 slider markup for full integration test.
- **Outputs:**
  - `js/reveals.js` — `IntersectionObserver` (`-10% 0px`, threshold 0); `[data-reveal]` selector with `fade` / `fade-up` / `mask` / `scale` variants; `[data-stagger]` parent → 80ms × index (cap 8); idempotent `init()` + `destroy()`; live `prefers-reduced-motion` listener that flips between observer mode and instant-final-state mode without reload.
  - `js/accordions.js` — native `<details data-accordion>`; CSS-only height transition where `interpolate-size: allow-keywords` is supported; `Element.animate` height fallback otherwise; cancels in-flight animation on rapid toggles; `init()` returns destroy fn (also exports standalone `destroy()`).
  - `js/slider.js` — RTL-aware (sign flip on `translateX` based on `getComputedStyle.direction`); pointer drag (passive listeners, 50px threshold, `touch-action: pan-y`); ArrowLeft/Right keyboard with RTL inversion + Home/End; programmatic dots (`<button role="tab" aria-label="עבור לשקופית N">`); optional autoplay via `data-autoplay-ms` (pause on hover/focus/visibilitychange); per-instance `destroy()`.
  - `css/sections/motion-reveals.css` — initial states + final state via `.is-visible`; 4 variants; reduced-motion override.
  - `css/sections/motion-accordions.css` — summary styling, custom-chevron rotation on `[open]`, `interpolate-size` block where supported, focus ring, reduced-motion override.
  - `css/sections/motion-slider.css` — track flex layout, prev/next pill buttons (logical `inset-inline-start/end` so RTL flips), dots strip, RTL chevron mirror.
  - `.tmp/reveal-attribute-injections.md` — checklist for Agent 04: which sections / elements to tag with `data-reveal` and `data-stagger`, plus CSS `<link>` snippet.
- **Coordination:**
  - `main.js` already imports + initializes all three (Agent 04 wired this up while I was working). My modules ignore the `{ motion }` arg they're called with — they don't need GSAP for static motion.
  - No overwrite to `index.html` — the reveal-attribute injection is a markdown handoff because Agent 04 may want to merge it manually with their copy work.
- **Blockers / next:**
  - Agent 04 to apply `data-reveal` attributes from the `.tmp/` markdown.
  - Agent 08 to wrap testimonials in the slider markup contract.
  - Agent 10 to verify reduced-motion path + axe-core 0 violations + iOS Safari pointer drag.

### Phase 5 — QA & Performance

- **Started:** 2026-05-28
- **Status:** 🟡 In progress — static audit complete; 13 defects logged
  (8 P0 + 5 P1). Browser smoke + Lighthouse runs HELD pending P0 fixes.
- **Owner:** Agent 10
- **Outputs:**
  - `PLANS/performance/2026-05-28_lighthouse-baseline.md` — full static audit
    with predicted Lighthouse scores, asset budget table, defect summary.
  - 13 `PLANS/fixes/2026-05-28_*.md` files (one per defect, with owner +
    severity + recommended fix + validation).
  - `findings.md` — Phase 5 entry with full defect list.
- **Predicted Lighthouse (mobile, before fixes):** Perf 62–72 / A11y 84–92 /
  BP 88–95 / SEO 92–96. **Misses Constitution §11 DoD (≥90 across all).**
- **After P0 close, predicted:** Perf 88–93 / A11y 95+ / BP 95+ / SEO 95+.
  **Hits DoD.**
- **Blockers:** Phase 2b still 🔴 (Agent 03 needs ffmpeg shell access for
  hero re-encode); Phases 3c/4b/4c integration glue still required (F-03,
  F-05, F-06, F-08, F-09, F-10, F-11). 8 P0 defects must close before
  browser testing makes sense.
