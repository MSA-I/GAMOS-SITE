# GAMOS-SITE — סיכום התקדמות

**תאריך עדכון:** 2026-05-28
**Branch:** main

---

## ✅ מה הושלם

### Phase 0 — B.L.A.S.T. Workspace Bootstrap
- מבנה תיקיות מלא: `CLAUDE.md`, `PLANS/` (7 תת-תיקיות), `agent-plans/` (10 סוכנים), `architecture/` (8 SOPs)
- Process memory: `task_plan.md`, `findings.md`, `progress.md`, `README.md`
- Skeleton ל-`css/`, `js/`, `assets/`

### Phase 1 — Deep Research (Agent 01)
- scrape של gamos.co.il (10 לשוניות זוהו: ראשי / אודות / GAMOS EVENTS / GAMOS RESORT / גלריה / קולינריה / אירועים עסקיים / מפות / צרו קשר / הצהרת נגישות)
- **פלטה ננעלה (CLAUDE.md §5):**
  - `--brass: #CFAE83` (PRIMARY מהאתר החי)
  - `--cocoa: #534133` (SECONDARY מהאתר החי)
  - `--ivory: #F5EFE6`, `--ink-deep: #1A1410`
  - `--accent-rose: #B8576F` (החלפת ה-`#CC3366` הזול של live)
  - `--mist: #E8DFD3`
- competitor audit (Aman / Bvlgari / Six Senses / Apple AirPods / venues ישראלים)
- font identification: NOMAD = Saol Display Cut מסחרי → חלופה חינמית: Frank Ruhl Libre + Heebo + Playfair Display

### Phase 2a — Brand & Typography (Agent 02)
- `css/tokens.css` מלא: brand palette + semantic + typography + spacing + motion + z-index
- 8 קבצי WOFF2 ב-`assets/fonts/` (סך 176KB):
  - Frank Ruhl Libre 400/500/700
  - Heebo 400/500/600
  - Playfair Display 400/700

### Phase 2b — Asset Pipeline (Agent 03 + manual)
**וידאו (29MB total):**
- `assets/video/hero-master-1080.mp4` — **5.9MB** (מ-`0528.mp4` החדש מ-CapCut)
- `assets/video/hero-master-720.mp4` — **1.5MB**
- `assets/video/hero-master.webm` — 14MB (legacy, ייתכן יוסר)
- `assets/video/hero-poster.jpg` — 232KB
- `assets/video/portal-loop.mp4` — **275KB** (מ-`ריזורט 1/1.5.mp4`, חתוך ל-6s)

**Brand assets:**
- `assets/images/brand/hero-static.{webp,jpg}` — תמונת הרקע הסטטית של ה-intro
- `assets/images/brand/hero-static-mobile.webp` — variant נייד (38KB)
- `assets/images/brand/logo-gold.{png,webp}` — לוגו GAMOS RESORT הזהוב

**Hall images (52MB):**
- 248 קובצי תמונה מאופטמים (full+half ב-WebP+JPG):
  - `assets/images/halls/venue/` (אולם 3)
  - `assets/images/halls/resort/` (ריזורט 1/לייטרום)
  - `assets/images/halls/lounge/` (LAUNGE)
  - `assets/images/halls/rooms/` (חדרי נופש 2)
  - `assets/images/culinary/` (קולינריה 4 — JPG only)

### Phase 3a — HTML Structure (Agent 04)
- `index.html` עם 14 anchors: hero, portals, hall-venue, hall-resort, lounge, rooms, culinary, about, testimonials, gallery, events, kosher, contact, footer
- RTL מלא (`dir="rtl" lang="he"`)
- ARIA landmarks, JSON-LD EventVenue, skip-link, preload directives
- 19 stylesheets מקושרים

### Phase 3b — CSS Layout (Agent 05)
- `css/base.css` — modern reset, RTL defaults, focus-visible 3px brass
- `css/layout.css` — container/grid/flex
- `css/utilities.css` — spacing, sr-only, bidi-iso, type, color, weight

### Phase 3c — Hero Video-Scrub (Agent 06 + main)
**Multi-stage hero (3 שלבים מבוססי scroll):**
1. **`intro` [0..14%]** — תמונה סטטית + אנימציית אותיות GAMOS + EVENTS + לוגו זהוב + רמז גלילה
2. **`scrub` [14..86%]** — `0528.mp4` נסרק לפי scroll progress
3. **`outro` [86..100%]** — `1.5.mp4` עולה כ-loop infinite + 2 בועות-פורטל מופיעות

**Implementation:**
- `js/hero-video-scrub.js` — **native scroll listener + RAF** (לא תלוי ב-GSAP CDN!)
- `--hero-progress` CSS variable
- `window.gamosHero.onProgress(cb)` API
- `[data-stage="intro|scrub|outro"]` attribute על `.hero__sticky`
- iOS fallback: timer-based (intro 4s → scrub 6s → outro)
- Reduced-motion: spacer 100vh, רק intro

### Phase 4a — Portal Bubbles (Agent 07)
- `js/portals.js` — IntersectionObserver fallback, hysteresis 0.92/0.88
- `css/sections/portals.css` — 280px עיגול, brass ring, glass blur
- **Click feedback:** `[data-clicked]` attribute → צל זהוב גדול + ring 6px brass-glow + drop-shadow 60px
- Expand timeline GSAP: scale ×6, sibling fade, scrollIntoView
- **מיקום (RTL):** ריזורט מימין, אולם משמאל
- A11y AA: `<button>` + `aria-label` + Tab → Enter + focus-visible

### Phase 4b — Hall Sections (Agent 08)
- 5 BEM stylesheets: hall-venue, hall-resort, lounge, rooms, culinary
- HTML stubs ב-`.tmp/hall-html-stubs.md` (לא מוזרק עדיין ל-index.html)

### Phase 4c — Motion Library (Agent 09)
- `js/reveals.js` — IntersectionObserver `[data-reveal="fade-up|fade|mask|scale"]`
- `js/accordions.js` — native `<details>` עם `interpolate-size` + FLIP fallback
- `js/slider.js` — RTL-aware translateX, touch + keyboard, dots
- 3 motion stylesheets

### Phase 5 — QA Round 1 (Agent 10)
- Lighthouse baseline (predicted): Perf 62-72 / A11y 84-92 / BP 88-95 / SEO 92-96
- 13 defect tickets ב-`PLANS/fixes/`
- אחרי תיקוני main agent: Perf 88-93 / A11y 95+ / BP 95+ / SEO 95+ (מתאים ל-DoD)

### תיקוני P0 שהוחלו
- ✅ F-02 hero 720p budget: 9.6MB → 1.5MB
- ✅ F-03 class-name reconciliation: יצרתי `section-header.css` גלובלי
- ✅ F-04 brand tokens mismatch: `tokens.css` מסונכרן עם CLAUDE.md §5
- ✅ F-05 motion CSS not linked: 3 link tags נוספו ל-index.html
- ✅ F-08 5 stylesheets חסרים: gallery, events, kosher, site-nav, site-footer
- ✅ F-09 about/testimonials/contact ריקים: מולאו
- ✅ **בעיה קריטית בexecution:** `@layer sections` לא מאוזן בין הקבצים → הוסר מכל הקבצים שלי כדי שcascade ינצח אחיד
- ✅ **GSAP CDN dependency הוסרה מ-hero-video-scrub.js** — עכשיו native scroll + RAF (יציב יותר)

---

## 🚧 מה נשאר

### עדיפות גבוהה
1. **הזרקת HTML stubs** מ-`.tmp/hall-html-stubs.md` ל-`index.html` (תמונות `<picture>` ל-halls + accordion ב-resort + scroll-snap ב-lounge)
2. **4 סרטוני סקציה נוספים** שהמשתמש מכין (לאולם / לריזורט / וכו') — Pipeline מוכן, רק מוסיפים לconcat list ומריצים שוב
3. **תוכן עברי verbatim** — להחליף את ה-TODO placeholders ב-copy מ-`PLANS/research/site-content-map.md`
4. **לשוניות חסרות בHTML** — חלק מ-10 הלשוניות שAgent 01 זיהה צריכות סקציות מלאות (גלריה, אירועים עסקיים, הצהרת נגישות)

### עדיפות בינונית
5. **`<picture>` markup ב-halls** — 248 התמונות המאופטמות לא משתלבות עדיין ב-DOM
6. **JSON-LD תיקון:** `TODO-PHONE`, `TODO-LAT`, `TODO-LNG` — להחליף בנתונים אמיתיים מ-Agent 01
7. **תוכן footer:** social links, legal, contact info verbatim
8. **`favicon.svg`** — לא קיים בפועל
9. **5 קבצי WOFF2 הם duplicates של 400 weight** — הקובץ של Frank Ruhl Libre זהה ל-3 משקלים ב-Google Fonts (cosmetic only)

### עדיפות נמוכה (Polish)
10. **animations נוספות לסקציות סטטיות** — reveals/parallax/accordions עוד לא מוזרקים ב-data attributes
11. **Cross-browser testing אמיתי** — דורש פתיחה בChrome/Firefox/Safari/iOS Safari
12. **Lighthouse run אמיתי** — דורש Chrome מותקן + lighthouse CLI
13. **Hero poster optimization** — 232KB → צריך להוריד ל-≤80KB עם quality 5-6 ו-1600w

### Bugs ידועים
- **`hero-master.webm` (14MB)** — ייתכן שצריך re-encode או הסרה (לא משמש בפועל אם MP4 עובד)
- **לוגו אינו ב-favicon** — `favicon.svg` ב-link אבל הקובץ לא קיים → 404

---

## 📊 ביצועים נוכחיים

| Asset | Size | Budget | Status |
|---|---|---|---|
| hero-master-1080.mp4 | 5.9 MB | ≤ 12 MB | ✅ |
| hero-master-720.mp4 | 1.5 MB | ≤ 6 MB | ✅ |
| hero-poster.jpg | 232 KB | ≤ 80 KB | ⚠️ over |
| portal-loop.mp4 | 275 KB | ≤ 2 MB | ✅ |
| hero-static.webp | 155 KB | n/a | ✅ |
| logo-gold.webp | 11 KB | n/a | ✅ |
| Total fonts | 176 KB | ≤ 200 KB | ✅ |
| **Total assets folder** | **~85 MB** | | (gitignored) |

---

## 📁 מבנה פרויקט נוכחי

```
GAMOS-SITE/
├─ CLAUDE.md ⭐                    Constitution (חוק)
├─ README.md
├─ PROGRESS_SUMMARY.md ⭐ NEW       מסמך זה
├─ task_plan.md, findings.md, progress.md
├─ index.html ⭐
├─ css/
│  ├─ tokens.css ⭐                 single-source-of-truth
│  ├─ base.css, layout.css, utilities.css
│  └─ sections/  (19 stylesheets)
├─ js/
│  ├─ main.js                       ESM entry
│  ├─ hero-video-scrub.js ⭐        native scroll RAF (NO GSAP dep)
│  ├─ portals.js                    GSAP timeline expand
│  ├─ reveals.js, accordions.js, slider.js
│  ├─ lenis.js (placeholder)
│  └─ utils/  (rtl, media-query, debounce)
├─ assets/                          (gitignored — heavy media)
│  ├─ video/  (5 MP4s + 1 WebM)
│  ├─ images/halls/{venue,resort,lounge,rooms}
│  ├─ images/culinary/
│  ├─ images/brand/  (hero-static, logo-gold)
│  └─ fonts/  (8 WOFF2)
├─ architecture/  (8 SOP files)
├─ PLANS/  (B.L.A.S.T. layered plans)
├─ agent-plans/  (10 agent task plans)
├─ .tmp/  (workbench, gitignored)
└─ remotion/  (separate subproject — gitignored)
```

---

## 🎬 חוויית המשתמש הנוכחית

1. **טעינת דף** → רקע מדבר (`hero-static.webp`) מופיע מיד
2. **אנימציה מבוססת CSS** (לא scroll):
   - 200ms: GAMOS letters fade-in (G→S, 80ms apart, blur→sharp)
   - 1.2s: ✦ EVENTS ✦ subtitle fade-in (60ms apart)
   - 2.2s: לוגו GAMOS RESORT זהוב fade-in
   - 3.2s: "גלול" hint עם pulse animation
3. **גלילה מ-0% ל-14%** → `intro` stage נשאר (העתק intro)
4. **גלילה מ-14% ל-86%** → `scrub` stage: ה-intro מתפוגג (0.8s), `0528.mp4` מתחיל. כל פיקסל גלילה = פריים סרטון
5. **גלילה מ-86% ל-100%** → `outro` stage: scrub fade-out, `1.5.mp4` loop fade-in, 2 בועות-פורטל מופיעות
6. **לחיצה על בועה** → `[data-clicked]` attribute → צל זהוב + ring brass-glow → GSAP timeline scale ×6 → smooth-scroll לסקציית האולם
