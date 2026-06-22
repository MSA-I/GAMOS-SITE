# GAMOS-SITE

A premium Hebrew-RTL rebuild of [gamos.co.il](https://gamos.co.il) — a luxury
event-venue, gardens and resort complex in Maale Adumim, Israel.

אתר עברית-RTL יוקרתי לבנייה מחדש של גאמוס — מתחם אירועים, גנים וריזורט.

> **Read [`CLAUDE.md`](./CLAUDE.md) first.** It is the Project Constitution and
> the single source of process truth (stack, palette, perf budget, a11y, the
> mobile convention, and the deployment-cost discipline). This README is a map;
> `CLAUDE.md` is the law.

## Tech stack

**Main site** — Vanilla HTML5 + CSS3 (custom properties, `@layer`, container
queries) + ES2022 modules. **No framework, no bundler.**

- **GSAP + ScrollTrigger + ScrollToPlugin** — self-hosted in `assets/vendor/`
  (no CDN) for the cinematic scroll choreography: the v10 scroll-pinned hero
  (`js/hero-scene.js`, a 500vh pinned scene), the `#shabbat-chatan` mask-reveal,
  the culinary canvas-frame scrub, and parallax. The non-hero scrub sections are
  driven by a custom scroll-orchestrator; the hero owns its own ScrollTrigger.
- **Leaflet ~42KB** — self-hosted (`assets/vendor/leaflet.js` + `.css`), used
  **only** for the interactive "directions" map in the `#routes` section. Tiles
  are recolored to the brand palette via CSS filters.
- **`@paper-design/shaders` (vanilla core, ~21KB)** — self-hosted
  (`assets/vendor/paper-shaders.module.js`), used **only** by `js/press-shader.js`
  for the animated MeshGradient background on the `/press/` page closer.
- No Three.js, no 3D models on the main site (Constitution §2).

**Sub-apps (Constitution §2.1 exception)** — three routes run a separate
React 19 + TypeScript + Vite 6 + Tailwind v4 + Motion + Three.js stack, built to
static bundles ahead of deploy. They never touch the main site at runtime; entry
is via plain `window.location` navigation:

| Route | What it is |
|-------|------------|
| `/halls/dist/events/` | "אירועים" — Atmospheric Depth Gallery (WebGL planes, GLSL background) |
| `/halls/dist/resort/` | "ריזורט" — same engine, resort skin |
| `/rooms/dist/`        | Draggable curved photo-wall (phantom.land-style) for the lodging rooms |

Build-time tools (Node 18+): `sharp` for WebP/JPEG encoding, `ffmpeg` for video
intermediates. All shipped assets are pre-encoded under `assets/`.

## Quick start

One command boots **all pages** (main site + both halls) on a single port:

```bash
npm run dev          # → http://localhost:8000  (auto-builds halls/ if stale)
```

- `/`                    → main vanilla site
- `/halls/dist/events/`  → אירועים (Depth Gallery)
- `/halls/dist/resort/`  → ריזורט
- `/rooms/dist/`         → curved rooms wall (build it first — see below)
- `/press/`              → press / "מן העיתונות" page
- `/mobile/`             → dedicated mobile entry (see **Mobile** below)

Alternatives:

```bash
npm run dev:fast     # plain `npx serve` — skips the halls build check (fast)
npm run dev:python   # Python stdlib http.server — no node_modules needed
```

Then open `http://localhost:8000/` in a desktop browser. Hebrew + RTL is the
canonical view; LTR is verified second. Port 8000 is fixed on purpose (`dev`
fails loudly if it's taken, so bookmarked links stay valid); `dev:fast` will hop
to a free port if needed.

> 📄 A step-by-step Hebrew operator guide lives in [`איך להפעיל.txt`](./איך%20להפעיל.txt).

## Mobile

The site has a **dedicated mobile entry document** at `/mobile/` (Constitution
§13). Visitors on a narrow screen (≤768px) hitting `http://localhost:8000/` are
auto-redirected there; desktop (≥769px) stays on `/`.

- **`mobile/index.html` is a build artifact — never hand-edited.** It is
  generated from `index.html` (the single source) by `npm run build:mobile`.
  Edit content once in `index.html`, then rebuild.
- The mobile-truth layer is `mobile/css/*` (`@media` overrides only) +
  `mobile/loader.js` (a single injected entry that wires half-resolution images,
  hero pill CTAs, the culinary mobile-frame manifest, ≥44px touch targets, etc.).
  See [`mobile/README.md`](./mobile/README.md) for the full convention.

```bash
npm run build:mobile     # regenerate mobile/index.html after any index.html change
```

## Build (before deploy)

```bash
npm run build            # = build:mobile + build:halls + build:rooms
```

- `build:mobile` → regenerates `mobile/index.html`.
- `build:halls`  → `cd halls && npm install && npm run build` → `halls/dist/{events,resort}/`.
- `build:rooms`  → `cd rooms && npm install && npm run build` → `rooms/dist/`.

For React HMR while iterating on a sub-app, run its dev server in a second
terminal: `npm run dev:halls` (port 5173) or `npm run dev:rooms` (port 5174).

### Deploy to Cloudflare Pages

`scripts/deploy-cloudflare.mjs` runs the full build, assembles a clean
production tree in `_site/` from an **allow-list** of paths (so repo junk, the
`docs/` notes, the orphaned hero frames, and `assets/_src/` never ship),
copies the gitignored culinary video in from disk, runs pre-flight asserts
(6 routes present, no file > 25 MiB), then uploads via `wrangler`:

```bash
npm run deploy:cf            # build + stage + PREVIEW deploy
npm run deploy:cf:prod       # build + stage + PRODUCTION deploy
npm run deploy:cf:stage      # build + stage only (dry run, no upload)
```

The deploy carries `_headers` (immutable caching for hashed/vendor/font/image
assets + baseline security headers), `robots.txt`, and `sitemap.xml`.

> **Read [`DEPLOYMENT-COSTS.md`](./DEPLOYMENT-COSTS.md) first** (Constitution
> §14): it mandates Cloudflare Pages (egress is free at every tier; Vercel/
> Netlify overage can reach ~$800–$2,800/mo at scale). Two follow-ups remain
> before a real custom-domain launch: swap the keyless CARTO map tiles for a
> domain-locked MapTiler key (`MAPTILER_KEY` in `js/directions-map.js`), and
> set the production hostname in `sitemap.xml` / `robots.txt`.

## Asset pipeline

Source masters live in `../GAMOS-DOCS/תמונות לאנימציית האתר/` (READ-ONLY per
Constitution §7; moved out of GAMOS-SITE on 2026-06-09 to keep the repo lean).
The encoders resolve that path automatically. Output goes to `assets/`.

```bash
# Brand + poster + section images (WebP/JPEG variants)
npm run encode:images

# Canvas-scrub frame sequences (WebP). The culinary scrub is the only live frame
# consumer — the v10 hero is a layered GSAP scroll scene (assets/images/hero-scene/),
# not canvas frames. Legacy v9 hero frames are untracked and have no npm script;
# re-encode them manually only if the v9 canvas hero ever returns.
npm run encode:culinary       # culinary frame sequence (live)
npm run encode:all            # alias of encode:culinary

# Low-res culinary frames for the mobile scrub
node mobile/scripts/encode-frames-mobile.mjs

# Rooms door image
npm run encode:rooms-door
```

## Project structure

```
GAMOS-SITE/
├── index.html              # main single-page entry, semantic structure
├── CLAUDE.md               # Project Constitution (read this first)
├── STATUS.md               # current state vs. master plan + DoD checklist
├── DEPLOYMENT-COSTS.md     # mandatory pre-deploy reading (§14)
├── איך להפעיל.txt          # Hebrew operator guide (run desktop + mobile)
├── serve.json              # `npx serve` headers (no-cache HTML/JS, immutable hashed assets)
├── _headers                # Cloudflare Pages cache + security headers
├── robots.txt / sitemap.xml # SEO — sitemap lists /, halls events/resort, rooms, press
├── css/
│   ├── tokens.css          # single source of design truth (§10.2)
│   ├── base.css            # normalize + focus rings + reduced-motion
│   ├── layout.css / utilities.css
│   ├── sections/           # one stylesheet per architectural section
│   └── components/         # loading-overlay, side-dot-nav, marquee, texture-text, ...
├── js/
│   ├── main.js             # ESM entry — boots all section modules
│   ├── scroll-orchestrator.js / scroll-scene.js   # auto-discovers [data-scrub] sections
│   ├── scrollytelling.js   # cinematic canvas + GSAP
│   ├── canvas-frame-renderer.js
│   ├── hero-scene.js       # v10 cinematic scroll-pinned hero (GSAP, 500vh) + gamosHero progress stub
│   ├── hero-static.js      # legacy v9 static hero — kept on disk for rollback (§3), not loaded
│   ├── shabbat-gallery.js  # GSAP pinned mask-reveal
│   ├── directions-map.js   # #routes branded Leaflet map + origin tabs
│   ├── press-shader.js     # /press/ MeshGradient closer (paper-shaders)
│   ├── rooms-door.js       # #rooms door → /rooms/dist/ navigation
│   ├── portals.js          # Web Animations API
│   └── (reveals, accordions, slider, counters, contact-form, site-nav, ...)
├── assets/
│   ├── fonts/              # self-hosted WOFF2 (Rubik, Heebo, Playfair, Cinzel)
│   ├── images/hero-scene/  # v10 hero layers (sky, subject WebP set, clouds, smoke, logo)
│   ├── images/brand/       # texture-text fills, logos, portal overlays
│   ├── images/{gallery,halls,culinary,...}/  # full+half WebP/JPG variants
│   ├── frames/             # WebP frame sequences (culinary + culinary-mobile; hero/ untracked)
│   ├── vendor/             # self-hosted gsap, ScrollTrigger, ScrollToPlugin, leaflet, paper-shaders
│   └── video/              # masters (gitignored — local only)
├── mobile/                 # dedicated mobile layer: loader.js + css/ + generated index.html (§13)
├── halls/                  # React/Vite Depth-Gallery sub-app → halls/dist/{events,resort}/ (§2.1)
├── rooms/                  # React/Vite curved-wall sub-app → rooms/dist/ (§2.1)
├── press/                  # standalone /press/ "מן העיתונות" page (vanilla + paper-shaders)
├── legal/                  # privacy, terms, accessibility (3 standalone Hebrew pages)
├── architecture/           # design SOPs (per-domain)
├── PLANS/                  # research/ reference docs + next-steps/ active plans
├── docs/                   # operational notes
└── scripts/                # build-time tools (dev, build-mobile-index, encoders, deploy-cloudflare)
```

## Architecture

The site uses a custom scroll-orchestrator (`js/scroll-orchestrator.js`) that
registers `[data-scrub]` sections and computes per-section progress via
IntersectionObserver + scroll position. Sections opt into a renderer mode such as
**`canvas-frames`** (pre-extracted WebP frames driven by `<canvas>`, manifest-driven,
two-phase preload — used by the culinary scrub) or CSS-driven reveals/parallax.

The **hero** is a v10 cinematic, scroll-pinned scene (Constitution §3 v10):
`<section id="hero">` is 500vh tall, its inner stage is `position:sticky`, and
`js/hero-scene.js` drives a GSAP entrance timeline + ScrollTrigger scrub that
animates layered images (`assets/images/hero-scene/` — sky, a responsive WebP
desert subject, clouds, smoke, an injected logo outline + masked composite).
`window.gamosHero.onProgress` (computed over the full 500vh) feeds the
side-dot-nav and the `#hall-portal` reveal. The legacy v9 static hero
(`js/hero-static.js` + `css/sections/hero-static.css`) is kept on disk,
disconnected, for a one-edit rollback.

### Section order

Top-to-bottom narrative in `index.html`:

```
hero → hall-portal → lounge → culinary → shabbat-chatan → rooms → about
     → testimonials → gallery → events → kosher → contact → routes
```

`#hall-portal` (the composer section right after the hero) holds the two CTAs
("אירועים" / "ריזורט") that route to `/halls/dist/events/` and
`/halls/dist/resort/`. The `#rooms` section's door image links to `/rooms/dist/`.
The right-edge dot-nav (`js/side-dot-nav.js`) surfaces the hub sections and
tracks the active one via a scroll-position picker; the hero is special-cased
through `window.gamosHero.onProgress`.

## Constitution

The single source of process truth is [`CLAUDE.md`](./CLAUDE.md). It locks the
stack (§2 + the §2.1 sub-app exception), palette (§5), perf budget (§8), a11y
(§9), DoD (§11), the mobile convention (§13), and deployment-cost discipline
(§14). Any agent or contributor should read it before editing.

## Contact

office@gamos.co.il — gamos.co.il
