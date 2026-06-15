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
  (no CDN) for the cinematic scroll choreography (canvas-frame scrub, pinned
  mask-reveals, parallax). Driven by a custom scroll-orchestrator.
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
| `/halls/dist/oasis/`  | "אולם" — Atmospheric Depth Gallery (WebGL planes, GLSL background) |
| `/halls/dist/lumina/` | "ריזורט" — same engine, lumina skin |
| `/rooms/dist/`        | Draggable curved photo-wall (phantom.land-style) for the lodging rooms |

Build-time tools (Node 18+): `sharp` for WebP/JPEG encoding, `ffmpeg` for video
intermediates. All shipped assets are pre-encoded under `assets/`.

## Quick start

One command boots **all pages** (main site + both halls) on a single port:

```bash
npm run dev          # → http://localhost:8000  (auto-builds halls/ if stale)
```

- `/`                    → main vanilla site
- `/halls/dist/oasis/`   → אולם (Depth Gallery)
- `/halls/dist/lumina/`  → ריזורט
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
- `build:halls`  → `cd halls && npm install && npm run build` → `halls/dist/{oasis,lumina}/`.
- `build:rooms`  → `cd rooms && npm install && npm run build` → `rooms/dist/`.

For React HMR while iterating on a sub-app, run its dev server in a second
terminal: `npm run dev:halls` (port 5173) or `npm run dev:rooms` (port 5174).

> **Before going to production**, read [`DEPLOYMENT-COSTS.md`](./DEPLOYMENT-COSTS.md)
> (Constitution §14). It mandates Cloudflare Pages, excluding orphaned heavy
> assets from the deploy, and a couple of required swaps.

## Asset pipeline

Source masters live in `../GAMOS-DOCS/תמונות לאנימציית האתר/` (READ-ONLY per
Constitution §7; moved out of GAMOS-SITE on 2026-06-09 to keep the repo lean).
The encoders resolve that path automatically. Output goes to `assets/`.

```bash
# Brand + poster + section images (WebP/JPEG variants)
npm run encode:images

# Canvas-scrub frame sequences (WebP). Hero frames are legacy — the hero is a
# static PNG composition now; the culinary scrub is the live consumer.
npm run encode:culinary       # culinary frame sequence
npm run encode:hero           # legacy hero frames
npm run encode:all            # both

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
│   ├── hero-static.js      # static-composition hero + progress stub for nav/portals
│   ├── shabbat-gallery.js  # GSAP pinned mask-reveal
│   ├── directions-map.js   # #routes branded Leaflet map + origin tabs
│   ├── press-shader.js     # /press/ MeshGradient closer (paper-shaders)
│   ├── rooms-door.js       # #rooms door → /rooms/dist/ navigation
│   ├── portals.js          # Web Animations API
│   └── (reveals, accordions, slider, counters, contact-form, site-nav, ...)
├── assets/
│   ├── fonts/              # self-hosted WOFF2 (Rubik, Heebo, Playfair, Cinzel)
│   ├── images/brand/       # hero-static layers, texture-text fills, logos, portals
│   ├── images/{gallery,halls,culinary,...}/  # full+half WebP/JPG variants
│   ├── frames/             # WebP frame sequences (culinary, culinary-mobile; hero=legacy)
│   ├── vendor/             # self-hosted gsap, ScrollTrigger, ScrollToPlugin, leaflet, paper-shaders
│   └── video/              # masters (gitignored — local only)
├── mobile/                 # dedicated mobile layer: loader.js + css/ + generated index.html (§13)
├── halls/                  # React/Vite Depth-Gallery sub-app → halls/dist/{oasis,lumina}/ (§2.1)
├── rooms/                  # React/Vite curved-wall sub-app → rooms/dist/ (§2.1)
├── press/                  # standalone /press/ "מן העיתונות" page (vanilla + paper-shaders)
├── legal/                  # privacy, terms, accessibility (3 standalone Hebrew pages)
├── architecture/           # design SOPs (per-domain)
├── PLANS/                  # research/ reference docs + next-steps/ active plans
├── docs/                   # operational notes
└── scripts/                # build-time tools (dev, build-mobile-index, encoders)
```

## Architecture

The site uses a custom scroll-orchestrator (`js/scroll-orchestrator.js`) that
registers `[data-scrub]` sections and computes per-section progress via
IntersectionObserver + scroll position. Sections opt into a renderer mode such as
**`canvas-frames`** (pre-extracted WebP frames driven by `<canvas>`, manifest-driven,
two-phase preload — used by the culinary scrub) or CSS-driven reveals/parallax.

The **hero** is a static, frozen five-layer PNG/WebP composition (Constitution
§3 v9) that simply scrolls out of view as one unit — there is no scroll-driven
rise. `window.gamosHero` (in `js/hero-static.js`) still exposes an `onProgress`
hook (computed from `getBoundingClientRect`) so the side-dot-nav and portals can
react to the hero's position.

### Section order

Top-to-bottom narrative in `index.html`:

```
hero → lounge → culinary → shabbat-chatan → rooms → about
     → testimonials → gallery → events → kosher → contact → routes
```

The two hero CTAs ("אירועים" / "ריזורט") route to `/halls/dist/oasis/` and
`/halls/dist/lumina/`. The `#rooms` section's door image links to `/rooms/dist/`.
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
