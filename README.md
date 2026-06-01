# GAMOS-SITE

A premium Hebrew-RTL rebuild of [gamos.co.il](https://gamos.co.il) — a luxury
event-venue, gardens and resort complex in Maale Adumim, Israel.

אתר עברית-RTL יוקרתי לבנייה מחדש של גאמוס — מתחם אירועים, גנים וריזורט.

## Tech stack

Vanilla HTML5 + CSS3 + ES2022 modules. **No framework, no bundler, no 3D engine.**
Lenis (smooth scroll, desktop only). Native `requestAnimationFrame` + scroll listener
for the hero video-scrub (no GSAP — see §2 of [`CLAUDE.md`](./CLAUDE.md)).

Build-time tools (Node 18+): `sharp` for WebP/JPEG encoding, `ffmpeg` for video
intermediates. All shipped assets are pre-encoded in `assets/`.

## Quick start

```bash
# Option A — npx serve (recommended)
npm run dev          # → http://localhost:8000

# Option B — Python stdlib, no node_modules required
npm run dev:python   # → http://localhost:8000
```

Then open `http://localhost:8000/` in a desktop browser. Hebrew + RTL is the
canonical view; LTR is verified second.

## Asset pipeline

```bash
# One-time install of build deps
npm install --save-dev sharp

# Re-encode the canvas-scrub frame sequences (hero + culinary)
npm run encode:all          # both
npm run encode:hero         # ~210 frames @ 1280px → ~27MB
npm run encode:culinary     # ~180 frames @ 960px  → ~5MB

# Re-encode brand + poster images (WebP/JPEG variants)
npm run encode:images
```

Source masters live in `תמונות לאנימציית האתר/` (READ-ONLY per Constitution §7).
Output goes to `assets/frames/` and `assets/images/`.

## Project structure

```
GAMOS-SITE/
├── index.html              # single-page entry, semantic structure
├── CLAUDE.md               # Project Constitution (read this first)
├── css/
│   ├── tokens.css          # single source of design truth (§10.2)
│   ├── base.css            # normalize + focus rings + reduced-motion
│   ├── layout.css          # grid + section rails
│   ├── utilities.css
│   ├── sections/           # one stylesheet per architectural section
│   └── components/         # loading-overlay, side-dot-nav, marquee
├── js/
│   ├── main.js             # ESM entry — boots all section modules
│   ├── scroll-orchestrator.js
│   ├── scroll-scene.js     # auto-discovers [data-scrub] sections
│   ├── hero-video-scrub.js # native RAF + scroll listener
│   ├── canvas-frame-renderer.js
│   ├── portals.js          # Web Animations API (no GSAP)
│   └── (reveals, accordions, slider, contact-form, site-nav, ...)
├── assets/
│   ├── fonts/              # self-hosted WOFF2 (Frank Ruhl, Heebo, Playfair, Bodoni)
│   ├── images/brand/       # hero-static, title-texture, logos
│   ├── img/                # poster images (venue, resort)
│   ├── frames/             # 30fps WebP frame sequences (hero, culinary)
│   └── video/              # poster + portal-loop
├── architecture/           # design SOPs (per-domain)
├── agent-plans/            # historical agent plans
├── PLANS/                  # research + completed plans
├── docs/                   # operational notes (e.g. adding-hall-video.md)
└── scripts/                # build-time encoders (encode-frames, encode-images)
```

## Architecture

The site uses a custom scroll-orchestrator (`js/scroll-orchestrator.js`) that
registers `[data-scrub]` sections and computes per-section progress via
IntersectionObserver + scroll position. Each section opts into one of two
renderer modes:

- **`canvas-frames`** — pre-extracted 30fps WebP frames driven by `<canvas>`,
  manifest-driven, two-phase preload (used by hero + culinary).
- **`poster-ken-burns`** — CSS-driven Ken-Burns drift over a single poster image
  (used by hall-venue + hall-resort until real video lands).

See [`architecture/scroll-orchestrator.md`](./architecture/scroll-orchestrator.md)
and [`docs/adding-hall-video.md`](./docs/adding-hall-video.md) for swap procedures.

## Constitution

The single source of process truth is [`CLAUDE.md`](./CLAUDE.md). It locks the
stack (§2), palette (§5), perf budget (§8), a11y (§9), DoD (§11), and a maintenance
log (§12). Any agent or contributor should read it before editing.

## Contact

office@gamos.co.il — gamos.co.il
