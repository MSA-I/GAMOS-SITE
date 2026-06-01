# Progress — GAMOS-SITE

> סטטוס מהדורה. עדכון אחרון: 2026-06-01 (Agent 24, Final QA pass).

**Legend:** ⬜ Not started | 🟡 In progress | 🔴 Blocked | ✅ Done

---

## Status Matrix

| Phase | Description                                       | Owner / Agent       | Status |
|-------|---------------------------------------------------|---------------------|--------|
| 0     | Workspace bootstrap + Constitution                | main                | ✅     |
| 1     | Deep research (live site scrape, content map)     | Agent 01            | ✅     |
| 2a    | Brand & typography (tokens.css)                   | Agent 02            | ✅     |
| 2b    | Asset pipeline (fonts, scripts, encode-images)    | Agent 03 + scripts/ | ✅     |
| 3a    | HTML structure                                    | Agent 04            | ✅     |
| 3b    | CSS layout                                        | Agent 05            | ✅     |
| 3c    | Hero V1 (multi-stage scrub)                       | Agent 06            | ✅     |
| 4a    | Portal bubbles                                    | Agent 07            | ✅     |
| 4b    | Hall sections (venue + resort scaffolds)          | Agent 08            | ✅     |
| 4c    | Motion (static reveals, accordions, slider)       | Agent 09            | ✅     |
| 5     | QA & performance                                  | Agent 10 / 24       | ✅     |
| A     | GSAP CDN removal — native scroll + RAF            | Agent 12 → 15       | ✅     |
| B     | Markup ↔ CSS sync, real content + JSON-LD          | Agent 16            | ✅     |
| C     | Scroll-orchestrator + scroll-scene module         | Agent 17 / 18       | ✅     |
| D     | Interactivity (contact form, mobile nav, slider)  | Agent 23            | ✅     |
| E     | Polish — favicon, README, A11y audit, junk sweep  | Agent 24            | ✅     |

---

## Phase Log (high-density, latest first)

### 2026-06-01 — Agent 24, Final QA pass (Phase E)
- Junk file sweep: removed root-level `,` (zero-byte shell mishap), pruned `.claude-flow/`
  cache from working tree, deleted empty `remotion/remotion/` subdirectory.
- Verified: every CSS link in `index.html` resolves (27 stylesheets, 0 missing); every
  ESM import in `js/main.js` resolves (15 modules, 0 missing).
- Created `assets/favicon.svg` — Hebrew gimel "ג" in brass `#CFAE83` on `#1A1410` ground.
- README rewritten — old version mentioned GSAP+ScrollTrigger which was removed in Phase A.
- A11y review: skip-link first-focusable ✅, single h1 ✅, all `<img>` have `alt` ✅,
  every form field has `<label for>` ✅, brass focus ring 3px in `tokens.css` + `base.css` ✅.
- Footer legal links still go to `href="#"` (privacy/terms/accessibility-statement) —
  flagged as content TODO; outside QA agent scope.

### 2026-06-01 — Agent 23, Phase D (Interactivity coder)
- `js/contact-form.js` — vanilla form handler. Builds WhatsApp deep-link with encoded
  Hebrew text, falls back to mailto. Inline error states via `aria-live="polite"`.
- `js/site-nav.js` — mobile hamburger overlay, focus trap, Esc-to-close, body scroll-lock.
- `js/slider.js` — testimonials slider with `data-slider-*` contract, dots, keyboard arrows.

### 2026-06-01 — Agent 22 (Real content + JSON-LD + brand fix)
- Replaced placeholder Hebrew copy across hero / hall-venue / hall-resort / lounge /
  rooms / culinary / about / kosher / contact with copy verified against the live site
  scrape (`site-content-map.md`).
- Brand name corrected: גמוס → **גאמוס** (live site spelling).
- `EventVenue` JSON-LD added to `<head>` with verified phones, email, address, geo,
  Facebook + Instagram socials.

### 2026-06-01 — Agent 21 (Canvas frame renderer, video-to-website skill)
- Replaced `<video>`-based scrub with canvas `<canvas>` rendering pre-extracted 30fps
  WebP frames. Manifest-driven, two-phase preload (first 10 frames → reveal poster
  hidden, then progressive fetch).
- Hero: ~210 frames @ 1280px → ~27MB total.
- Culinary: ~180 frames @ 960px → ~5MB total.
- LCP unaffected: `hero-static.webp` (80KB) is the eager-loaded LCP candidate; the
  frames are deferred behind manifest fetch at scroll progress ≥ 0.06.

### 2026-06-01 — Agent 20 (Static-section choreographer, weblove-motion)
- 11 reveal patterns: `slide-right`, `slide-left`, `fade-up`, `clip-reveal`, `scale-up`,
  `rotate-in`, with `--reveal-delay` cascade and `data-stagger` containers.
- Marquee transition band between `#culinary` and `#about`.
- Counter animation on `.about__stats` (currently shows qualitative labels only —
  no unverified numeric claims, per Agent 22 brief).

### 2026-06-01 — Agent 18 (Hall scaffolds — Ken-Burns poster mode)
- `hall-venue` + `hall-resort` shipped as `[data-scrub-mode="poster-ken-burns"]`. CSS
  drift on the poster image → cinematic feel without an actual video. When real video
  lands, swap the `<picture>` for a `<video>` (see `docs/adding-hall-video.md`).

### 2026-06-01 — Agent 17 (Scroll-orchestrator + culinary scene)
- New `js/scroll-orchestrator.js` — single source of progress, registers all
  `[data-scrub]` sections, computes per-section progress via IntersectionObserver +
  scroll position, calls registered onProgress handlers.
- New `js/scroll-scene.js` — auto-discovers `[data-scrub]` sections AFTER hero, mounts
  the right renderer per `data-scrub-mode` (`canvas-frames` / `poster-ken-burns`).
- `#culinary` is the first non-hero scroll-scene live.

### 2026-05-31 — Hero V2 (5-stage scroll, SVG-mask wordmark)
- Stages: A static-bg → B title-reveal → C scrub → D portals.
- Wordmark is an SVG mask with sand-grain texture clipped per-letter.
- Frame freeze on last frame so portals land on a stable image.

### 2026-05-30 — Loading overlay + side-dot nav
- Two-phase `js/loading-overlay.js` — DOM-ready phase + frames-warmup phase.
- `js/side-dot-nav.js` — RTL-aware vertical dot nav with active section tracking.

### 2026-05-29 — Phase A — GSAP CDN removed
- `hero-video-scrub.js` rewritten to use native `scroll` listener + `requestAnimationFrame`
  (no GSAP, no ScrollTrigger).
- `portals.js` migrated to Web Animations API (`Element.animate`) for the click-expand
  timeline. Zero external runtime deps.

### 2026-05-28 — Initial commit (scaffold)
- Constitution drafted. Tokens locked. Agent plans 01-12 written.

---

## Open Items (handed off to user / next-iteration)

- **Real testimonials copy** — owner to provide 6-10 verified quotes (current text is
  generic placeholder). Slot: `#testimonials .testimonial__quote`.
- **Real rabbinate name** in `#kosher` — owner to provide certifying authority.
- **Privacy / terms / accessibility statement** — three footer links currently `href="#"`.
- **Real dish + room imagery** — `data-placeholder` slots in `#culinary`, `#rooms`,
  `#lounge`, `#gallery` await processed media.
- **Map embed** — `.contact__map` is a placeholder; final embed strategy (privacy-friendly
  Google Maps lazy-iframe vs static tile) is a content decision.
- **Lighthouse audit** — must be run in browser. Run `npm run dev` then `npm run lighthouse`.
