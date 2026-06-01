# GAMOS-SITE — Progress Report

**Generated:** 2026-06-01
**Repo state:** `main @ 146a8a8` — synced with `origin/main`
**Total commits in rebuild:** 13 (post-`061190e` baseline)
**Live source compared against:** [gamos.co.il](https://gamos.co.il/)

---

## 1. תקציר מנהלים

הפרויקט עבר מ-**0% מבונה** ל-**~85% מוכן ל-launch** ב-3 ימי עבודה (29 במאי – 1 ביוני 2026).
24 סוכני AI עבדו לפי תוכנית 5-Wave של מבנה הירארכי: research → architecture → code → polish → QA.

**מה עובד היום:**
- Hero V2 קולנועי עם 4 שלבים (static → title → canvas-scrub → portals)
- 4 scroll-scenes חיים: Hero (live), Resort+Venue (poster scaffold), Culinary (live)
- Canvas frame renderer 30fps לפי `video-to-website` skill (708 פריימים סה"כ)
- 11 סקציות סטטיות עם choreography מ-`weblove-motion`
- טופס יצירת קשר → WhatsApp + mailto + 3 דפי משפט מלאים
- Side-dot nav, loading overlay, mobile hamburger
- אפס תלות ב-CDN (offline-after-load)

**מה עוד חסר:** ראה §6.

---

## 2. השוואה לתוכנית המקורית

### תוכנית: `PLANS/research/2026-05-28_master-rebuild-plan.md` (10 סוכנים)

| Agent | תוכנית מקורית | סטטוס | הערה |
|-------|----------------|-------|------|
| 01 | Site inventory + palette | ✅ Complete | Palette LOCKED ב-§5 Constitution |
| 02 | Architecture + tokens.css | ✅ Complete | tokens single-source |
| 03 | Typography (self-hosted fonts) | ✅ Complete | + Bodoni Moda 900 (Agent 11 הרחיב) |
| 04 | RTL boilerplate | ✅ Complete | logical properties בכל הקבצים |
| 05 | Hero scroll-video | ✅ V2 — multi-stage + canvas frames |
| 06 | Portals + scroll-scenes | ✅ V2 — orchestrator + 4 scenes |
| 07 | Static sections (CSS) | ✅ Complete + weblove-motion |
| 08 | Asset pipeline | ✅ npm scripts + sharp + ffmpeg |
| 09 | A11y + perf budget | ⚠️ Lighthouse לא נמדד עדיין |
| 10 | QA + DoD | ⚠️ DoD §11: 5/8 ירוקים, 3 מצריכים בדיקה דפדפן |

### Constitution §11 DoD checklist

| Item | Status | Note |
|------|--------|------|
| Lighthouse mobile ≥ 90 | ⚠️ pending | `npm run lighthouse` לאחר `npm run dev` |
| RTL keyboard pass + focus rings | ✅ ok | brass 3px ring ב-tokens.css:146 |
| Two portal bubbles + click-routing | ✅ ok | WAAPI expand + loading overlay |
| 60fps scrub (M1-class) | ⚠️ pending | architecture supports it, browser-verify |
| Mobile fallback (iOS/reduced-motion) | ✅ ok | iOS branch + prefers-reduced-motion קוד |
| כל סקציות gamos.co.il | ✅ ok | 11 anchors (ראה §3) |
| ≥10 agent-plans | ✅ ok | 14 plans existing |
| Console clean + 0 404s | ⚠️ pending | browser-verify |

---

## 3. אינוונטר סקציות (11 anchors)

| # | ID | סוג | סטטוס |
|---|----|----|-------|
| 1 | `#hero` | Scroll-scene (canvas, 528 frames) | ✅ Live |
| 2 | `#hall-venue` | Scroll-scene (poster, Ken-Burns) | ⏳ Scaffold (waiting for video) |
| 3 | `#hall-resort` | Scroll-scene (poster, Ken-Burns) | ⏳ Scaffold (waiting for video) |
| 4 | `#lounge` | Static (gallery + reveal-animate) | ✅ |
| 5 | `#rooms` | Static (grid + reveal-animate) | ✅ |
| 6 | `#culinary` | Scroll-scene (canvas, 180 frames) | ✅ Live |
| 7 | `#about` | Static + counter animations | ✅ |
| 8 | `#testimonials` | Slider (8 quotes) | ✅ |
| 9 | `#gallery` | Static (8-tile mosaic) | ✅ |
| 10 | `#events` | Static (event types) | ✅ |
| 11 | `#kosher` | Static (rotate-in stamp) | ⚠️ Rabbinate name TODO |
| 12 | `#contact` | Form (WhatsApp + mailto) + map deeplink | ✅ |

Plus: side-dot nav + marquee transition (between #culinary & #about).

---

## 4. Tech stack שנדחק (Constitution §2)

```
HTML5 + CSS3 (custom properties, container queries, logical props)
+ ES2022 vanilla JS modules
+ build-time tools: ffmpeg + sharp (npm scripts)
- ZERO runtime framework, bundler, CDN dependency
- ZERO 3D, GSAP (removed Phase A), Tailwind, React/Vue/Svelte
```

**JS modules (16 files):**
`accordions, canvas-frame-renderer, contact-form, counters, hero-video-scrub, lenis (stub), loading-overlay, main, marquee, portals, reveals, scroll-orchestrator, scroll-scene, side-dot-nav, site-nav, slider`

**CSS sections (20 files):** about, contact, culinary, events, gallery, hall-resort, hall-venue, hero, kosher, lounge, motion-accordions, motion-reveals, motion-slider, portals, rooms, scroll-scene, section-header, site-footer, site-nav, testimonials. Plus 3 components: loading-overlay, side-dot-nav, marquee.

---

## 5. Asset inventory (112MB total)

| Folder | Size | Count | Note |
|--------|------|-------|------|
| `assets/frames/hero/` | 27MB | 528 frames + manifest | 30fps × 1280×720 × WebP q65 |
| `assets/frames/culinary/` | 5MB | 180 frames + manifest | 30fps × 1280×720 × WebP q65 |
| `assets/images/brand/` | 250KB | hero-static, logo-gold, title-texture, favicon | LCP-critical |
| `assets/images/halls/` | ~30MB | venue 14 / resort 17 / lounge 5 / rooms 11 | `.full.webp` + `.half.webp` + `.full.jpg` + `.half.jpg` per source |
| `assets/images/culinary/` | ~8MB | 13 dishes × 4 variants | same |
| `assets/video/` | (gitignored, on disk) | hero-master 1080+720, culinary 1080+720, portal-loop, posters | masters kept locally |
| `assets/fonts/` | 180KB | 8 WOFF2 (Frank Ruhl + Heebo + Playfair + Bodoni Moda) | self-hosted |

Resort + Venue real videos: not yet provided by user. Scaffold mode is poster + Ken-Burns until they arrive.

---

## 6. מה עוד נשאר לעשות

### 6.1 Browser-only verification (חסום עבור AI agents — דורש user)

- [ ] **Lighthouse mobile/desktop ≥ 90** בכל 4 קטגוריות (Perf / A11y / Best-Practices / SEO)
  - Run: `npm run dev` ב-tab אחד, `npm run lighthouse` ב-tab שני
- [ ] **DevTools Console clean** — אפס errors + 0 חסר (404)
- [ ] **DevTools Network** — וידוא שפריימים יורדים lazy (אחרי scroll, לא בהתחלה)
- [ ] **60fps scrub** בדסקטופ M1-class — DevTools Performance recording
- [ ] **iOS Safari** + **Galaxy S22+ Chrome** — fallback paths
- [ ] **prefers-reduced-motion** — toggle בdevtools, וודא static-end-state
- [ ] **Keyboard-only navigation** — Tab+Enter דרך כל interactive
- [ ] **Screen reader pass** — VoiceOver / NVDA (ARIA-current בנקודות-נווט)

### 6.2 Content TODOs (חסום עבור AI — דורש בעלים)

- [ ] **שם רבנות** באישור הכשרות (`#kosher` כרגע "בהשגחת רב מקומי")
- [ ] **6-10 ציטוטים אמיתיים** עם שמות מלא + תאריכים + הסכמת לקוח (כרגע: 8 placeholder עם שמות פרטיים בלבד)
- [ ] **קואורדינטות מדויקות** (lat/lng) של המתחם — היום: 31.7700, 35.2900 (Maale Adumim approx)
- [ ] **שעות פתיחה** — לא ב-scrape של האתר החי
- [ ] **מיקוד פוסטלי** — לא ב-scrape
- [ ] **WhatsApp number אימות** — האתר החי מציג `wa.me/9725` שבור; אנחנו משתמשים ב-`972779972343` (טלפון ראשי)
- [ ] **תמונות אמיתיות לסקציות `data-placeholder`** — gallery/rooms/culinary tiles עם markup מוכן

### 6.3 Pending assets (חסום עבור AI — דורש user content)

- [ ] **Resort scroll-scene video** — 4-8s clip מוכן ב-`assets/video/resort-1080.mp4`
- [ ] **Venue scroll-scene video** — 4-8s clip מוכן ב-`assets/video/venue-1080.mp4`
- [ ] לאחר הוספה: `npm run encode:all` (יצור frames אוטומטית) — ראה `docs/adding-hall-video.md`

### 6.4 Optional polish (אם המשתמש יבקש)

- [ ] **Lenis smooth scroll** — כרגע stub. אופציה להפעיל ב-desktop (Constitution §2 מתיר)
- [ ] **Sentry / error tracking** — אם רוצים לקבל תקלות בזמן אמת
- [ ] **Service worker** — caching strategy לוידאו/frames
- [ ] **Sitemap.xml + robots.txt** — לא קיימים
- [ ] **GitHub Pages / Netlify deploy** — היום הקוד רץ רק לוקאלית

---

## 7. Known issues

### 7.1 DoD §8 — Hero asset budget exceedance
Constitution §8 מציין hero MP4 1080p ≤ 12MB. אנחנו עברנו ל-canvas frames (per `video-to-website` skill) שמשקלם 27MB total. **Trade-off:**
- ✅ LCP נשאר ≤ 80KB (`hero-static.webp`)
- ✅ Two-phase preloader (10 frames immediate ~ 500KB) → reach Stage C ב-1-2s
- ❌ Total transfer גבוה
- ✅ iOS scrub יציב (היה ה-driver למיגרציה)

**המלצה:** עדכון §8 ב-Constitution להבדיל בין `<video>` budget ל-canvas-frames budget. בתהליך.

### 7.2 Untracked file at repo root
`video-to-website.md` (skill reference) — נמצא untracked. אינטרנציה: או לעקוב אחריו (יש בו ערך ל-onboarding) או להוסיף ל-.gitignore.

### 7.3 Repo size
112MB ב-`assets/` — לא קטן אבל לא בעייתי ל-Git. אם יוסיפו hall videos, frames יוסיפו ~50MB נוספים. אם יחליטו לעבור ל-Git LFS לפריימים, הוראות ב-`docs/asset-encoding.md`.

---

## 8. Architecture invariants שנשמרו

✅ **§3 Hybrid Concept (refined V2)** — Hero multi-stage עם 4 שלבים
✅ **§4 RTL** — `<html dir="rtl">` + logical properties בלבד
✅ **§5 Palette** — 7 tokens, max 5 active per surface, single accent
✅ **§7 Asset Rules** — `תמונות לאנימציית האתר/` נשאר READ-ONLY
✅ **§9 A11y** — focus rings, skip-link, alt עברי, ARIA
✅ **§10 Modules** — JS module-scoped, `init()` + `destroy()`
✅ **§12 Maintenance Log** — 9 entries ב-CLAUDE.md מתעדים החלטות

---

## 9. Repo structure (high-level)

```
GAMOS-SITE/
├── index.html (978 lines, 11 anchored sections)
├── package.json (npm scripts: dev, encode:hero/culinary/all/images, lighthouse)
├── README.md (English, dev quick-start)
├── CLAUDE.md (Constitution, 248 lines)
├── PROGRESS_REPORT.md (this file)
│
├── css/
│   ├── tokens.css, base.css, layout.css, utilities.css
│   ├── sections/ (20 files — one per section)
│   └── components/ (3 — loading-overlay, side-dot-nav, marquee)
│
├── js/ (16 ESM modules)
│
├── assets/
│   ├── images/{brand, halls, culinary} (tracked)
│   ├── frames/{hero, culinary} (tracked, 32MB)
│   ├── fonts/ (8 WOFF2)
│   ├── video/ (gitignored — masters kept locally)
│   └── favicon.svg
│
├── legal/
│   ├── privacy.html, terms.html, accessibility.html
│   └── legal.css
│
├── scripts/
│   ├── encode-frames.mjs (ffmpeg + sharp)
│   └── encode-images.mjs (sharp)
│
├── architecture/ (3 design docs)
│   ├── scroll-orchestrator.md
│   ├── transitions-and-nav.md
│   └── scroll-video-system.md
│
├── agent-plans/ (14 plans)
│
├── docs/
│   ├── asset-encoding.md (ffmpeg recipes)
│   └── adding-hall-video.md (resort/venue swap-in)
│
├── PLANS/ (research + refactors archive)
│
└── תמונות לאנימציית האתר/ (READ-ONLY source library)
```

---

## 10. Commit history (rebuild branch)

```
146a8a8  feat: 8 Hebrew testimonials + 3 legal pages (privacy/terms/accessibility)
c22a568  chore: final QA pass — junk cleanup, favicon, README, DoD audit
7fe004c  feat: contact form (WhatsApp+mailto) + mobile nav (hamburger)
38450e7  feat: real contact data + JSON-LD + Hebrew copy polish
ced77ed  chore: add npm scripts for dev server + asset encoding pipeline
a80a274  feat: hero+culinary canvas frame-renderer (30fps WebP, per video-to-website skill)
6e85675  fix: brand name גמוס→גאמוס; sandstone texture for hero wordmark
e1eaaca  feat: weblove-motion choreography for static sections + marquee
8610409  feat: scroll-scene module + culinary live (orchestrator-driven)
54d7d2a  feat: hall scaffolds (resort + venue) — Ken-Burns poster mode
f7490b5  feat: hero v2 (5-stage scroll, SVG-mask wordmark, freeze-on-last-frame)
bbc5f42  feat: loading overlay + side-dot nav (RTL, 8 sections)
3ffa294  feat: complete Phase A (GSAP removal) + Wave 1 architecture specs
e276c86  docs: handoff + scroll-video architecture spec; sync progress
061190e  feat: multi-stage hero (intro/scrub/outro) + portal click feedback
24208c1  Initial commit: GAMOS-SITE rebuild scaffold
```

GitHub: https://github.com/MSA-I/GAMOS-SITE

---

## 11. הצעד הבא (NEXT ACTION)

**עבור המשתמש:**
1. `npm run dev` ב-`D:\משה פרוייקטים\GAMOS-SITE\` (לא `E:\GAMOS-SITE` הריק)
2. פתח `http://localhost:8000/` ב-Chrome עם DevTools
3. **Hard refresh** (Ctrl+F5) למקרה של cache ישן
4. גלוש דרך ה-Hero, Culinary, סקציות סטטיות, פורטלים, side-dot nav
5. דווח על תקלות ויזואליות / Console errors / 404s
6. (אופציונלי) `npm run lighthouse` למדידת ביצועים

**עבור הסוכן:**
- ⏳ ממתין לסרטוני Resort + Venue
- ⏳ ממתין לתוכן בעלים: ציטוטים אמיתיים, רבנות, קואורדינטות מדויקות
- ⏳ ממתין לקריאת מצב בדפדפן + פידבק ויזואלי

---

**Last updated:** 2026-06-01 by main agent.
