# GAMOS-SITE — מצב נוכחי

**עודכן:** 2026-06-04 (halls/ React sub-app shipped)
**Branch:** `main` — מסונכרן עם `origin/main` (https://github.com/MSA-I/GAMOS-SITE)
**מקור-אמת לתוכנית הראשית:** [`PLANS/research/2026-05-28_master-rebuild-plan.md`](PLANS/research/2026-05-28_master-rebuild-plan.md)
**מקור-אמת לחוקה:** [`CLAUDE.md`](CLAUDE.md)

---

## ⭐ NEW (2026-06-04) — Halls sub-app (React/Vite/Tailwind under §2.1)

שני דפי האולמות הפכו ל-React sub-app ב-`halls/` לפי בקשת המשתמש בסשן הזה.
ה-Constitution §2.1 מאשר את החריגה לשני הנתיבים בלבד: `/halls/oasis/` ו-`/halls/lumina/`.

| נתיב | initialHall | תוכן |
|------|-------------|------|
| `/halls/dist/oasis/` (default) | oasis | ThreeDCorridor עם archways, GAMOS EVENTS branding, 6 קלפי oasis |
| `/halls/dist/lumina/` | lumina | ThreeDCorridor עם mountain-curves + water-canal, GAMOS RESORT, 6 קלפי lumina |

> **הערה על הנתיב:** `vite.config.ts` מגדיר `base: "/halls/dist/"` כדי שכל ה-asset URLs ייצאו עם prefix נכון. ה-static server של GAMOS-SITE (`npx serve`) מגיש את `halls/dist/` כקבצים סטטיים מהשורש. כדי לקבל URLs נקיים יותר (`/halls/oasis/` במקום `/halls/dist/oasis/`), אפשר בעתיד להוסיף rewrite rule ב-`serve.json` או בשרת הפרודקשן.

**Stack בתת-האפליקציה:** React 19 + TypeScript + Vite 6 + Tailwind v4 + Motion + Lucide + Three.js. פורט מדויק של `D:\משה פרוייקטים\arch-corridor-gallery\src\` (LandingHero מועתק verbatim, ThreeDCorridor + ProjectDetail מועתקים, App.tsx + main.tsx הותאמו ל-`initialHall` prop במקום `view`+`selectedHall` state). שינוי יחיד ב-ThreeDCorridor: `handleSwitchHall` מנווט דרך `window.location.href`, לא משנה state.

**Build:** `npm run build:halls` (= `cd halls && npm install && npm run build`) → `halls/dist/{oasis,lumina}/index.html` + `halls/dist/assets/main-*.{js,css}` + `halls/dist/images/projects/{oasis,lumina}-{01..06}.jpg`. גודל: ~376KB JS / ~120KB gzip + ~43KB CSS / ~8KB gzip + ~1MB תמונות.

**Wire-up:** `js/hero-shader.js` `navigateToTarget()` מנווט עכשיו ל-`/halls/oasis/` או `/halls/lumina/` (לפי `pitchDown` flag = label לחוץ), עם `window.gamosLoading.show()` כ-700ms transition. ה-vanilla `corridor.html` + `js/corridor.js` נשארים על-מקום כ-fallback.

**Verification (manual, ע"י המשתמש):**
1. `npm run dev` (single command — בונה halls/ אם צריך + מפעיל serve על port 8000).
2. `http://localhost:8000/` → אתר הוונילה הראשי.
3. `http://localhost:8000/halls/dist/oasis/` → ThreeDCorridor archways view.
4. `http://localhost:8000/halls/dist/lumina/` → ThreeDCorridor mountain view.
5. Click "אולם"/"ריזורט" ב-hero של `/` או בתפריט העליון → ניווט ל-`/halls/dist/{oasis,lumina}/` אחרי loading overlay.

**Scripts:**
- `npm run dev` — שרת אחד, שלושה דפים (build idempotent: מדלג אם `halls/dist/` עדכני מול `halls/src/`).
- `npm run dev:fast` — מדלג על בדיקת build, סתם `npx serve` (כשאתה יודע שה-bundle עדכני).
- `npm run dev:halls` — Vite dev server של halls בלבד (port 5173) ל-React HMR.
- `npm run build:halls` — `cd halls && npm install && npm run build`.

ראה Constitution §2.1 ו-§12 (2026-06-04 entry).

---

> מסמך זה מסכם מה נבנה בפועל לעומת התוכנית ב-10 הסוכנים, ומה נשאר.
> תוכניות עתידיות (לא הושלמו) נמצאות תחת [`PLANS/next-steps/`](PLANS/next-steps).

---

## 1. השוואה לתוכנית המקורית — 10 סוכנים

הטבלה למטה ממופה אחד-לאחד מול §"עשרה סוכנים" של ה-[Master Rebuild Plan](PLANS/research/2026-05-28_master-rebuild-plan.md).

| # | סוכן | תוצרים מתוכננים | סטטוס | הערה |
|---|------|----------------|--------|------|
| 01 | Research & Content | site-content-map / full-tab-inventory / competitor-audit / asset-inventory | ✅ הושלם | 4 קבצי research תחת `PLANS/research/` |
| 02 | Brand & Typography | tokens.md + tokens.css + WOFF2 fonts | ✅ הושלם | פלטה ננעלה ב-`CLAUDE.md §5`. Bodoni Moda 900 הוסף לכותרת ה-hero |
| 03 | Asset Pipeline | hero MP4 + variants + halls images + portal-loop | ✅ הוחלף ב-pipeline חדש | מוחלף ב-canvas-frame WebP (ראה Wave 5 למטה) |
| 04 | HTML Structure | `index.html` semantic + ARIA + JSON-LD | ✅ הושלם | 11 anchors, EventVenue JSON-LD מאומת מנתוני האתר החי |
| 05 | CSS Layout | base/layout/utilities/tokens | ✅ הושלם | כל ערך ויזואלי דרך tokens (Constitution §10.2) |
| 06 | Hero Video-Scrub | `hero-video-scrub.js` + `hero.css` | ✅ הושלם → V2 | מולטי-stage (intro/title/scrub/portals) |
| 07 | Portal Bubbles | `portals.js` + `portals.css` | ✅ הושלם → bubble-overlay | החליף את הבועות העגולות בoverlay PNG מ-PSB |
| 08 | Hall Sections | hall-venue / hall-resort / lounge / rooms / culinary | ✅ scaffolds + culinary live | resort/venue ב-Ken-Burns poster — ממתין לסרטונים |
| 09 | Motion (static) | reveals / accordions / slider | ✅ הושלם + הורחב | 11 דפוסי reveal, marquee transition, counter animation |
| 10 | QA & Performance | Lighthouse baseline + defect tickets | ⚠️ חלקי | ה-defects של Wave 1 נסגרו (13 ticket). Lighthouse אמיתי דורש דפדפן |

---

## 2. תוצרים שהוספו מעבר לתוכנית המקורית (Waves 2-5)

מאז התוכנית המקורית הוספו 5 גלי-עבודה שלא היו בתכנון. כולם נכנסים לחוקה דרך `CLAUDE.md §12 Maintenance Log`:

### Wave 2 — Phase A: הסרת תלות ב-CDN (2026-06-01)
- GSAP CDN הוסר לחלוטין מ-`hero-video-scrub.js`, `portals.js`, `main.js`.
- Portal expand → Web Animations API (`Element.animate()`).
- Hero scrub → native scroll listener + RAF.

### Wave 3 — Architecture specs (Agents 11-14)
- `architecture/scroll-orchestrator.md` — single-RAF, IO-driven activation, `window.gamosScroll` API.
- `architecture/transitions-and-nav.md` — loading-overlay 800ms + 8-dot side-nav (RTL right edge).
- `architecture/scroll-video-system.md` — מודל ל-4 scroll-scenes (Hero / Resort / Venue / Culinary).
- Hero spec V2 — 5-stage timeline (0→8→22→88→100%).

### Wave 4 — סקציות סטטיות (`weblove-motion`)
- `js/reveals.js` + `js/accordions.js` + `js/slider.js` + `js/counters.js` + `js/marquee.js`.
- 3 motion stylesheets + marquee bridge בין `#culinary` ל-`#about`.

### Wave 5 — Canvas frame migration (`video-to-website` skill)
- `<video>.currentTime` scrub הוחלף ב-canvas frame-sequence rendering.
- `js/canvas-frame-renderer.js` — DPR-aware, two-phase preloader (10 frames eager + remainder async).
- `js/scrollytelling.js` — orchestrator משותף עם loader-overlay אחד לכל הסצנות.
- GSAP חזר כ-self-hosted ב-`assets/vendor/` (76KB) — לא CDN. ScrollToPlugin משמש לעוגן smooth-scroll.
- 528 פריימים hero + 180 culinary @ 30fps × 1280×720 × WebP q65 = **32MB סך הכל**.
- iOS scrub יציב (זה היה ה-driver למיגרציה).

### Wave-D — Phase D Interactivity (Agent 23)
- `js/contact-form.js` — WhatsApp deep-link + mailto fallback. `data-wa-number` / `data-email` data-attrs.
- `js/site-nav.js` — overlay תפריט סלולר עם focus-trap + Escape close + body scroll-lock.
- `js/slider.js` — testimonials slider עם `data-slider-*` contract.
- `legal/{privacy,terms,accessibility}.html` + `legal/legal.css` — 3 דפי משפט עבריים.

### Wave-Final — תוכן אותנטי + brand polish
- 8 ציטוטים עבריים עם attribution (במקום 3 placeholders).
- 4 USP bullets + 3 stat counters לסעיף `#about`.
- Map embed + 3 routes ל-`#contact`.
- Logo image (`logo-gold.webp`) במקום טקסט בנאוויגציה.
- Bubble overlays מ-PSB (ריזורט/אולם) במקום הבועות העגולות.

---

## 3. אינוונטר סקציות (`index.html` — 11 anchors)

| # | ID | סוג | סטטוס |
|---|----|-----|--------|
| 1 | `#hero` | Scroll-scene canvas (528 frames) | ✅ Live |
| 2 | `#hall-venue` | Scroll-scene poster Ken-Burns | ⏳ Scaffold (ממתין לסרטון) |
| 3 | `#hall-resort` | Scroll-scene poster Ken-Burns | ⏳ Scaffold (ממתין לסרטון) |
| 4 | `#lounge` | Expanding-panels selector (10 panels, `lounge-selector.js`) | ✅ Live |
| 5 | `#rooms` | Two-pane hover-swap gallery (10 rooms, `rooms-gallery.js`) | ✅ Live |
| 6 | `#culinary` | Scroll-scene canvas (180 frames, 900vh spacer) + 6 dish grid | ✅ Live |
| 7 | `#about` | Static + counter animations | ✅ Live |
| 8 | `#testimonials` | Slider (8 ציטוטים) | ✅ Live |
| 9 | `#gallery` | Static 8-tile mosaic (images filled) | ✅ Live |
| 10 | `#events` | Static (event types) | ✅ Live |
| 11 | `#kosher` | Static (rotate-in stamp) | ⚠️ שם רבנות TODO |
| 12 | `#contact` | Form + map iframe | ✅ Live |

Plus: side-dot nav, marquee transition, mobile hamburger, loading overlay.

---

## 4. Constitution §11 DoD — checklist

| פריט | סטטוס | הערה |
|------|-------|------|
| Lighthouse mobile ≥ 90 (4 axes) | ⚠️ pending | דורש `npm run dev` + `npm run lighthouse` בדפדפן |
| RTL keyboard pass + focus rings | ✅ ok | brass 3px ring ב-`tokens.css` |
| Two portal bubbles + click-routing | ✅ ok | WAAPI expand + loading overlay |
| 60fps scrub (M1-class) | ⚠️ pending | architecture תומכת — דורש browser-verify |
| Mobile fallback (iOS / reduced-motion) | ✅ ok | iOS branch + `prefers-reduced-motion` קוד |
| כל סקציות gamos.co.il מיוצגות | ✅ ok | 11 anchors מאומתים מול scrape |
| ≥10 agent-plans | ✅ ok | 14 plans היסטוריים (כולם בוצעו, נמחקו אחרי השלמה) |
| Console clean + 0 404s | ⚠️ pending | דורש browser-verify |

5/8 ירוקים. 3 הצהובים דורשים פתיחה ידנית בדפדפן.

---

## 5. Tech stack בפועל (`Constitution §2`)

```
HTML5 + CSS3 (custom properties, container queries, logical props)
+ ES2022 vanilla JS modules (17 files)
+ build-time tools: ffmpeg + sharp (npm scripts)
+ self-hosted GSAP + ScrollToPlugin (76KB, /assets/vendor/)

✅ אפס תלות runtime ב-CDN (offline-after-load)
❌ אין framework / bundler / 3D / Tailwind runtime
```

**JS modules (20):** `accordions, canvas-frame-renderer, contact-form, counters, hero-video-scrub, lenis, loading-overlay, lounge-selector, main, marquee, portals, reveals, rooms-gallery, scroll-orchestrator, scroll-scene, scroll-spy, scrollytelling, side-dot-nav, site-nav, slider`

**CSS sections (20):** `about, contact, culinary, events, gallery, hall-resort, hall-venue, hero, kosher, lounge, motion-accordions, motion-reveals, motion-slider, portals, rooms, scroll-scene, section-header, site-footer, site-nav, testimonials`

**CSS components (5):** `loading-overlay, side-dot-nav, marquee, scrollytelling-loader, texture-text`

---

## 6. Asset inventory

| תיקייה | גודל | מספר | הערה |
|--------|------|------|------|
| `assets/frames/hero/` | 27MB | 528 frames + manifest | 30fps × 1280×720 × WebP q65 |
| `assets/frames/culinary/` | 5.0MB | 180 frames + manifest | 30fps × 1280×720 × WebP q65 |
| `assets/images/halls/` | 49MB | venue 14 / resort 17 / lounge 5 / rooms 11 | full+half × WebP+JPG |
| `assets/images/culinary/` | 6.7MB | 13 dishes × 4 variants | full+half × WebP+JPG |
| `assets/images/brand/` | 2.3MB | hero-static, logo-gold, title-texture, portal overlays, favicon | LCP-critical |
| `assets/fonts/` | 184KB | 8 WOFF2 (Frank Ruhl + Heebo + Playfair + Bodoni Moda) | self-hosted |
| `assets/vendor/` | 76KB | gsap.min.js + ScrollToPlugin.min.js | self-hosted |
| `assets/video/` | (gitignored) | hero-master, culinary, portal-loop, posters | masters לוקאליים בלבד |

**סך הכל ב-repo:** ~95MB.

---

## 7. מה נשאר — Open Items

ראה [`PLANS/next-steps/2026-06-01_hall-videos-and-content-finalization.md`](PLANS/next-steps/2026-06-01_hall-videos-and-content-finalization.md) לפירוט מלא.

תקציר:

### חסום על user (תוכן)
- [ ] **שם רבנות** — `#kosher` כרגע "בהשגחת רב מקומי"
- [ ] **סרטוני Resort + Venue** — 4-8s clips לקבצים `assets/video/{resort,venue}-1080.mp4`. Pipeline מוכן (`docs/adding-hall-video.md`).
- [ ] **קואורדינטות מדויקות** — היום: 31.7700, 35.2900 (Maale Adumim approximation)
- [ ] **6-10 ציטוטים אמיתיים** עם שמות מלאים + תאריכים + הסכמה (כרגע 8 placeholders עם שם פרטי בלבד)
- [ ] **WhatsApp number אימות** — אנחנו משתמשים ב-`972779972343` (טלפון ראשי מה-scrape)

### חסום על user (browser verification)
- [ ] Lighthouse mobile/desktop ≥ 90 בכל 4 קטגוריות
- [ ] DevTools Console clean (0 errors / 0 404)
- [ ] 60fps scrub בדסקטופ M1-class (Performance recorder)
- [ ] iOS Safari + Galaxy S22+ Chrome — בדיקת fallback paths
- [ ] `prefers-reduced-motion` toggle — וידוא static-end-state
- [ ] Keyboard-only navigation pass (Tab+Enter דרך כל interactive)

### Polish אופציונלי
- [ ] Lenis smooth scroll — כרגע stub. Constitution §2 מתיר הפעלה ב-desktop בלבד
- [ ] Sitemap.xml + robots.txt
- [ ] Service worker (caching frames/video)
- [ ] GitHub Pages / Netlify deploy

---

## 8. מבנה repo (high-level)

```
GAMOS-SITE/
├── index.html (1024 lines, 11 anchored sections)
├── package.json (npm scripts: dev, encode:*, lighthouse)
├── README.md
├── CLAUDE.md ⭐ Constitution
├── STATUS.md ⭐ This file
│
├── css/
│   ├── tokens.css ⭐ single-source-of-truth
│   ├── base.css, layout.css, utilities.css
│   ├── sections/ (20 files)
│   └── components/ (4 files)
│
├── js/ (17 ESM modules)
│
├── assets/
│   ├── images/{brand, halls, culinary} (tracked)
│   ├── frames/{hero, culinary} (tracked, 32MB)
│   ├── fonts/ (8 WOFF2)
│   ├── vendor/ (gsap + ScrollToPlugin self-hosted)
│   ├── video/ (gitignored — masters לוקאליים)
│   └── favicon.svg
│
├── legal/ (privacy, terms, accessibility + legal.css)
│
├── scripts/ (encode-frames.mjs, encode-images.mjs)
│
├── architecture/ ⭐ design SOPs
│   ├── scroll-orchestrator.md
│   ├── transitions-and-nav.md
│   ├── scroll-video-system.md
│   ├── video-scrub-spec.md
│   ├── portal-bubbles-spec.md
│   ├── motion-language.md
│   ├── performance.md
│   ├── rtl-and-a11y.md
│   ├── section-order.md
│   ├── tokens.md
│   └── asset-inventory.md
│
├── docs/ (asset-encoding.md, adding-hall-video.md, qa-screenshots/)
│
├── PLANS/
│   ├── README.md (B.L.A.S.T. layer guide)
│   ├── research/ ⭐ 5 reference docs (master-plan + content-map + tabs + competitors + fonts)
│   └── next-steps/ ⭐ עתידי בלבד
│
├── agent-plans/
│   └── README.md (אין plans פעילים — כולם בוצעו ונמחקו)
│
└── (source library moved 2026-06-09 → ../GAMOS-DOCS/תמונות לאנימציית האתר/)
```

---

## 9. Commit history (rebuild)

```
e23a6d7  fix: nav layout (logo image, single line) + portals = bubble overlays
7407f02  docs: §12 — GSAP self-hosted re-allowed (scrollytelling spec)
46c1ea1  feat: cinematic scrollytelling — GSAP + parallax + loader pct
b7f8b1c  content: import authentic copy + maps + brand assets from old design
146a8a8  feat: 8 Hebrew testimonials + 3 legal pages
7fe004c  feat: contact form (WhatsApp+mailto) + mobile nav (hamburger)
a80a274  feat: hero+culinary canvas frame-renderer (30fps WebP)
e1eaaca  feat: weblove-motion choreography for static sections + marquee
8610409  feat: scroll-scene module + culinary live (orchestrator-driven)
54d7d2a  feat: hall scaffolds (resort + venue) — Ken-Burns poster mode
f7490b5  feat: hero v2 (5-stage scroll, SVG-mask wordmark)
bbc5f42  feat: loading overlay + side-dot nav (RTL, 8 sections)
3ffa294  feat: complete Phase A (GSAP removal) + Wave 1 architecture specs
24208c1  Initial commit: GAMOS-SITE rebuild scaffold
```

GitHub: https://github.com/MSA-I/GAMOS-SITE

---

## 10. הצעד המיידי הבא

ראה [`PLANS/next-steps/2026-06-01_hall-videos-and-content-finalization.md`](PLANS/next-steps/2026-06-01_hall-videos-and-content-finalization.md).

עבור הבעלים:
1. הפעל `npm run dev` ב-`D:\משה פרוייקטים\GAMOS-SITE\`.
2. פתח `http://localhost:8000/` ב-Chrome עם DevTools פתוח.
3. עבור על Hero → Culinary → סקציות סטטיות → Portals → side-dot nav.
4. דווח על תקלות ויזואליות / Console errors / 404s.
5. (אופציונלי) `npm run lighthouse` למדידה.

עבור הסוכן הבא:
- ⏳ ממתין לסרטוני Resort + Venue.
- ⏳ ממתין לתוכן בעלים (ציטוטים, רבנות, lat/lng).
- ⏳ ממתין לפידבק ויזואלי בדפדפן.

---

**Last updated:** 2026-06-01
**Document scope:** סטטוס בלבד. החוקה ב-`CLAUDE.md`, התוכנית הראשית ב-`PLANS/research/2026-05-28_master-rebuild-plan.md`, השלבים הבאים ב-`PLANS/next-steps/`.
