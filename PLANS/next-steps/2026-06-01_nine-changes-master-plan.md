# Master Plan — 9 Changes (Rooms / Nav / Lounge / Portals / Culinary / Gallery / Typography / Footer)

**Created:** 2026-06-01
**Status:** Research complete (10 agents). Ready for execution (10 agents, wave-sequenced).
**Constitution:** `CLAUDE.md` — all changes obey vanilla-only stack, tokens single-source, RTL-first, ESM init/destroy, §12 log per change.

> Synthesized from 10 parallel research agents. Each work-item below carries: root cause / chosen assets / Hebrew copy / concrete edits.

---

## Chokepoints (shared files — must be serialized)

Three files are touched by many items. To avoid collisions, only ONE agent owns each at a time:

| File | Owner | Notes |
|------|-------|-------|
| `css/tokens.css` | Wave 0 token-owner | adds `--texture-light/-dark` |
| `js/main.js` | Wave 0 registry-owner | MODULES array L43-59, append new module tuples |
| `index.html` | Wave 2 only, section-by-section in disjoint line regions | no two agents edit overlapping lines |

Everything else (new `js/*.js`, new `css/sections/*.css`, new `css/components/*.css`) is isolated → parallel-safe.

---

## 1. Rooms (#rooms — חדרי אירוח)

**Pattern:** adapt `animated-slideshow.tsx` (hover text-label → clip-path image swap) to vanilla.
**Assets:** 10 images ALREADY encoded at `assets/images/halls/rooms/` — use `05,04,09,06,07,03,11,08,01,02` `.full.webp`. No re-encode.
**Defect found:** index.html uses `.rooms__card` but rooms.css styles `.rooms__item` masonry (dormant mismatch).
**Plan:**
- New `js/rooms-gallery.js` — two-pane hover-swap: `[data-rooms-stage]` image panel + 10 `[data-rooms-trigger]` buttons. Active index drives clip-path reveal. Keyboard: arrow keys RTL-aware, hover on desktop / tap on mobile. `init()/destroy()`.
- Rewrite `css/sections/rooms.css` for two-pane layout (text list + image stage), reduced-motion = instant swap.
- Rewrite `#rooms` markup in index.html (10 triggers + stage).
- Register in `js/main.js`.
- 10 Hebrew titles/captions (provided per-image by rooms agent).

## 2. Nav bar redesign

**Finding:** logo already gold GAMOS EVENTS (no file swap needed — just re-export at 2× for retina).
**Defects:** 11-link overcrowding, no scroll state, breakpoint dead-zone 901-1023px, RTL underline-origin bug, CTA uses brass not rose.
**Plan (`css/sections/site-nav.css` + `js/site-nav.js`/new scroll-spy):**
- Trim to 6 primary desktop links + mark rest `data-secondary` (into mobile overlay only).
- Scroll-state: add `.is-scrolled` shrink class on scroll (height + bg opacity).
- Fix breakpoint to single `≥1024px` desktop / below = hamburger.
- Fix RTL underline transform-origin.
- CTA = outline + `--accent-rose` hover.
- `aria-current` scroll-spy highlighting active section.

## 3. Lounge (#lounge)

**Pattern:** adapt `interactive-selector.tsx` (click panel → flex-grow expand). **IGNORE all icons.**
**Assets:** 10 images from `תמונות גאמוס/גאמוס/` (paths provided). Must copy to new source dir `LOUNGE-SELECTOR/`, add encode mapping → output `assets/images/halls/lounge/01..10`.
**Plan:**
- `npm run encode:images` after adding mapping.
- New `js/lounge-selector.js` — horizontal flex-grow expanding selector, ONE active panel, click/keyboard ArrowKeys RTL-aware, no icons. `init()/destroy()`.
- Rewrite `css/sections/lounge.css` rail block (expanding panels, label fade-in on active).
- Rewrite `#lounge` markup (10 panels, Hebrew title/desc per panel).
- Register in `js/main.js`.

## 4. Hero portals fix (CRITICAL)

**Root cause:**
- `css/sections/hero.css:283-284` sets `.hero__canvas{opacity:0}` and `:279` restores `.hero__static-bg{opacity:1}` at `[data-stage="portals"]` → the baked-in-bubble video frame is HIDDEN, PNGs sit on bare desert.
- PNG art is a full-viewport plate (resort bubble center **72.8%,59.6%**; venue **28.0%,59.6%**) but CSS forces it into a narrow 30vw button with `object-fit:contain` + guessed positioning → tiny & misaligned. Frame 1280×720, renderer `ZOOM_FACTOR 1.35`.
**Plan (CSS only, no JS):**
- Keep `.hero__canvas` VISIBLE at portals stage (remove the opacity:0 / keep static-bg hidden).
- Make `.portal__overlay` a full-viewport plate: `object-fit:cover` + `transform:scale(1.35)` matching ZOOM_FACTOR, anchored so each PNG bubble sits exactly on its baked frame bubble.
- Reposition clickable hotspots to measured coords (resort 72.8%/59.6%, venue 28.0%/59.6%).
- Verify reveal threshold still p>0.92.

## 5. Culinary (#culinary)

**Too-short root cause:** `--scene-spacer:500vh` (the only live value; `data-scrub-spacer-vh` is dead for scrollytelling-owned scenes). 500vh/180 frames ≈ too fast.
**Empty-images root cause:** 6 empty dish placeholders.
**Plan:**
- Change spacer **500vh → 900vh** in BOTH `index.html:560` (`data-scrub-spacer-vh`) and `:522` (`--scene-spacer`).
- Fill 6 dish placeholders — images ALREADY encoded (`01,05,07,09,12,13`) at `assets/images/culinary/`. Use `<picture>` + figcaption Hebrew copy (provided).

## 6. Gallery (#gallery — רגעים מהמתחם)

**Assets:** 19 source images at `עיצוב אתר מחודש/gamos_images/04_גלריה_צילומי_אירועים`. Chosen 8 (with Hebrew alt):

| # | Source file | Hebrew alt |
|---|-------------|-----------|
| 1 | `DSC_6448-scaled.jpg` | מבט רחב על אולם האירועים המפואר |
| 2 | `3E3A1432-scaled.jpg` | אורחים חוגגים ברגע של שמחה |
| 3 | `ZINO1161-scaled.jpg` | תאורה חמה על במת האירוע |
| 4 | `LII5384_websize.jpg` | מנה מעוטרת בעדינות על השולחן |
| 5 | `3E3A1218-scaled.jpg` | עיצוב שולחן אלגנטי בפרטי פרטים |
| 6 | `ZINO0729-scaled.jpg` | רחבת ריקודים גועשת בערב |
| 7 | `AI7I1079-scaled.jpg` | רגע פורמלי מטקס האירוע |
| 8 | `WhatsApp-Image-2024-09-03-at-13.11.44.jpeg` | פרט אישי ואינטימי מהחגיגה |

**Status:** NOT encoded; `assets/images/gallery/` empty. Must ADD a new mapping to `encode-images.mjs`.
**Plan:**
- Copy 8 chosen into a new source dir, add MAPPINGS entry → `assets/images/gallery/01..08`.
- `npm run encode:images`.
- Replace 8 empty `<li data-placeholder>` with `<picture>` tiles (width/height for CLS), keep `data-reveal="scale-up"` stagger.

## 7. Typography — texture-filled headings

**CONFIRMED:** no Hebrew font file exists; NOMAD specimens are Latin-only PNGs. Deliverable = texture-FILL CSS technique, NOT a font swap.
**Plan:**
- Encode the two swatches (`טקסטורה לטיפוגרפיה בהירה.png`, `...כהה.png`) → `assets/images/brand/texture-{light,dark}.webp`.
- New tokens `--texture-light` / `--texture-dark` in `css/tokens.css`.
- New `css/components/texture-text.css` — `@supports`-gated `.texture-text--light` / `--dark` using `background-clip:text`.
- Apply to LARGE headings only (≥28px): hero wordmark, section titles, nav logo wordmark. Light texture on dark surfaces; dark/gold-swirl texture on light surfaces (dominant — site is mostly ivory).
- Keep `base.css:95` solid color as fallback.

## 8. Footer / last section

**"Weird angle" root cause:**
- `css/layout.css:255-262` `.section-rail--end { padding-inline-start:55vw }` + `> *{max-inline-size:40vw}` crushes contact into lopsided column.
- `css/sections/motion-reveals.css:85` `[data-reveal="rotate-in"]{transform:rotate(3deg)...}` can stay frozen if IO never fires for last section.
**Content:** authentic from `עיצוב אתר מחודש/Scrape/gamos.co.il_...md` lines 138-163 (3-col: nav menu, contact details, social). Logo = `logo-gold.webp`.
**Plan:**
- Fix `index.html:926` `section-rail--end` → centered container (un-crush contact).
- Rebuild `css/sections/site-footer.css` to 4-col grid.
- Ensure rotate-in reveal fires (or remove rotate for footer).

---

## Execution waves (collision-free)

**Wave 0 — chokepoint owners (serial):**
- Agent A: `css/tokens.css` — add texture tokens.
- Agent B: `js/main.js` — append module tuples (rooms-gallery, lounge-selector, scroll-spy).
- Agent C: `scripts/encode-images.mjs` — add lounge + gallery mappings, run `encode:images`.

**Wave 1 — isolated section files (parallel):**
- rooms.css + js/rooms-gallery.js
- lounge.css + js/lounge-selector.js
- hero.css + portals.css (portal fix)
- site-nav.css + js/site-nav.js (nav)
- css/components/texture-text.css
- site-footer.css + layout.css footer fix
- culinary.css (if needed)

**Wave 2 — index.html, section-by-section in disjoint line regions (serialized):**
- #rooms markup / #lounge markup / #culinary spacer+dishes / #gallery tiles / footer markup / nav link trim / texture-text class application.

**Post:** §12 Maintenance Log entries for each change; STATUS.md section table update.
