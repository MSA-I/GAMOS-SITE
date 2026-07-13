# GAMOS-SITE — מצב נוכחי

**עודכן:** 2026-07-13 (Conversion pass — יישום הביקורת השיווקית)
**Branch:** `main` — מסונכרן עם `origin/main` (https://github.com/MSA-I/GAMOS-SITE)
**מקור-אמת לתוכנית הראשית:** [`PLANS/research/2026-05-28_master-rebuild-plan.md`](PLANS/research/2026-05-28_master-rebuild-plan.md)
**מקור-אמת לחוקה:** [`CLAUDE.md`](CLAUDE.md)

---

## ⭐ NEW (2026-07-13) — Conversion pass (הביקורת השיווקית)

יושמה תוכנית `PLANS/next-steps/2026-07-13_conversion-pass.md` (מקור: `GAMOS-DOCS/ביקורת
שיווקית ומסקנות לשיפור אתר GAMOS.txt`). עיקרי השינוי — שכבת המרה מבלי לגעת בכוריאוגרפיה:

- **CTA ראשי "תיאום סיור ובדיקת תאריך"** (גלילה ל-`#contact`) + משני וואטסאפ: בהירו
  (תוספת אדיטיבית ל-`.hero_content`, §3 amendment), בניווט (`.site-nav__cta` — היפוך
  מתועד של הסרת 2026-06-02), ב-cta-band אחרי `#why-gamos` ואחרי `#testimonials`, ובר
  תחתון קבוע במובייל (`mobile/css/cta-bar.css` + `injectCtaBar()`).
- **שורת נתוני אמון בהירו** + **סקציה חדשה `#why-gamos`** (סקציה 3): צילום אמיתי, 4
  מונים, 2 ציטוטים, CTA. `architecture/section-order.md` שוכתב ל-15 סקציות.
- **איחוד שפת אינטראקציה:** מנוע lightbox משותף `js/lightbox.js` (lounge + gallery
  הפכו צרכנים רזים); רמז ix-hint חדש ל-`#gallery` (tap). (רמז ה-scroll של
  `#shabbat-chatan` הוסר באותו יום עם ביטול הסקציה — ראה NEW למטה.)

## ⭐ NEW (2026-07-13, מאוחר יותר) — צמצום גלריות + גלריית סוגי-אירועים

- **`#buffet` בוטל** — 6 כרטיסי בופה נבחרים נטמעו בגריד המנות של `#culinary` (תג
  "בופה"); `buffet-parallax` הוסר מ-MODULES.
- **`#shabbat-chatan` בוטל** — מיוצג כפריט בגלריית `#events`; בניווט "סוגי אירועים"
  תפס את מקומו (הוסרה הכפילות "אירועים").
- **`#events` חדש (v4)** — **editorial fixed-preview gallery** (בחירת משתמש
  אחרי סקירת דפוסי hover-image menus): גריד RTL — שורות שמות-אירוע מימין (עם
  הפירוט המקורי שנפתח מתחת לשורה הפעילה), פאנל תצוגה ממוסגר sticky משמאל;
  hover/focus מחליף את תמונת הפאנל ב-wipe עדין של clip-path + settle-scale.
  שורה 1 פעילה כברירת מחדל (הפאנל לעולם לא ריק). DOM+CSS טהור — אפס WebGL/GSAP.
  **מובייל (v4): כרטיסים נערמים** — הפאנל מוסתר; לכל שורה `<picture>` משלה
  (native lazy, half.webp) + הפירוט גלוי תמיד; אפס sticky/מצבי-גלילה (v3 הדביק
  חפף וחתך כותרות). **המעבר מהגלריה הבהירה (v4.1):** אחרי ששני ניסיונות
  גרדיאנט נראו בוציים/מפוספסים — הבלוק הכהה הוא צורה: קשת אליפטית עדינה
  ברוחב מלא בקצה העליון (border-radius dome, מהדהדת את קשתות-המותג שמעל סמל
  GAMOS EVENTS בגלריה); התחתית חיתוך ישר (החלטת משתמש). בלי גרדיאנטים.
  `js/events-gallery.js` (רזה) + `css/sections/events.css` +
  `mobile/css/events.css`. (שתי גרסאות-ביניים באותו יום — hover-list עם
  ScrambleText ופורט mouse-image-distortion ב-raw WebGL — הוחלפו; ראה git.)
- **סטטים של `#why-gamos`** — טקסטורת typo-on-light (כמו about).
- **ביקורת קוד (8 זוויות) יושמה:** שימור זהות text-nodes מול i18n, strip של
  data-reveal אחרי entrance (מונע קונפליקט transitions), טעינת תמונות עצלה
  (IO viewport-ahead) + half.webp במגע, הסרת preload של why-gamos מה-head,
  רצפת dim 0.6 במובייל (AA), תווית nav קצרה ב-EN/FR, עדכון export-screenshots.
- **מיתוג/שיתוף:** favicon-16 + `/favicon.ico` (הסמל הרשמי — היה כבר המקור); תמונת
  Social Preview ייעודית 1200×630 (`npm run build:brand`) + og:image מעודכן.
- **אנליטיקה:** `js/analytics.js` (cta_click / lead_submit / section_reach →
  `window.gamosAnalyticsQueue`) + בלוק beacon של Cloudflare מוערם (צעד דיפלוי: token).
- **אומת:** Playwright 28/28 (דסקטופ + מובייל + i18n EN + reduced-motion, אפס שגיאות
  קונסול). כל המחרוזות החדשות ב-PAIRS (he/en/fr).
- **ממתין למשתמש:** אישור ויזואלי להירו, ליטוש קופי (`TODO copy-refine`), token ל-beacon.

**סבב פידבק (2026-07-13, אותו יום):** חמישה תיקונים לפי הערות המשתמש —
(1) כותרת why-gamos עברה ל-`section-header--center` (הייתה קופסה 64ch צמודת-ימין
עם 3 שורות); (2) זוג ה-CTA בהירו הוסתר במובייל (`mobile/css/hero-scene.css` —
כפול לבר התחתון ולא-קריא על המדבר); (3) ה-X ב-overlay: תוקן guard של
`instanceof HTMLElement` שבלע הקשות על ה-SVG (`js/site-nav.js`); (4) toggle שפות
קבוע ב-navbar במובייל (`injectNavbarLang()` ב-loader + ה-FAB מוצג עכשיו רק
בהירו); (5) **באג עומק בהמלצות:** ל-Chromium מודרני IntersectionObserver מחשיב
את ה-clip-path של האלמנט עצמו → מצב-הפתיחה של `clip-reveal` (חיתוך מלא) יצר
deadlock והסקציה לא נחשפה כלל (דסקטופ ומובייל!). נבנה מחדש כווילון `::after`
(`motion-reveals.css`); בנוסף הנקודות חזרו ל-static בשורת ה-controls (ברחו
מ-absolute של motion-slider) וה-`data-reveal` הוסר מכרטיסי הקרוסלה (ה-track
המוסט החוצה מנע reveal). אומת Playwright 13/13 + צילומי מסך.

## ⭐ NEW (2026-06-16) — FOUC fix (nav + text flash) + hero mobile-stability pass

תוקנו שתי בעיות שדיווח המשתמש: הבהוב ה-nav + הבהוב האותיות בטעינה, וחוסר-יציבות
ההירו במובייל. דרך הסקילים `scroll-hero-effect` / `fixing-motion-performance` /
`systematic-debugging` / `mobile-design`. אומת ב-Playwright (16/16 desktop+mobile-emul).

**הבהוב ה-nav — שני שורשים:**
1. `index.html` נטען בלי `data-hero-mode` → ה-`.site-nav` נצבע נראה ואז ה-JS הסתיר אותו
   עם transition = הבהוב. תוקן: זרע סטטי `<html data-hero-mode="true">` (המצב המוסתר
   הוא הפריים הראשון, בלי transition) + `<noscript>` שמחזיר את הבר ב-JS-off (§9).
2. **באג עומק שנחשף בבדיקה אמפירית:** `js/site-nav-hover-reveal.js` קבע hero-mode לפי
   `intersectionRatio > 0.30` — אבל ההירו הוא 500vh, אז ה-ratio מקסימום ~0.2 ו-hero-mode
   **לעולם לא הופעל** מאז מעבר ל-v10. כלומר פיצ'ר ה"nav מוסתר בהירו, נחשף ב-hover" (§3)
   היה מת, וה-JS הפך את הזרע ל-`false` תוך 150ms = ההבהוב. תוקן ל-בדיקת rect ישירה
   (`top<=1 && bottom>vh`) + re-eval על scroll (rAF-throttled).

**הבהוב האותיות (FOUT + texture-pop):** Heebo (טקסט ההירו) לא היה ב-preload + `swap`.
תוקן: preload ל-`heebo-400.woff2` + Heebo `font-display: optional` (סטייה מודעת מ-`swap`,
מתועדת ב-`tokens.css:63`). הטקסטורות (`typo-on-light/-dark.webp`) לא היו ב-preload →
כותרת ה-lounge שקופה→קופצת. תוקן: preload לשתיהן עם `?v=2026-06-15-brown` (חייב לתאום
ל-`tokens.css`).

**הירו מובייל (suspect: vh לא-יציב מול toolbar דינמי + scrub נעוץ):** `js/hero-scene.js`
— `ScrollTrigger.config({ignoreMobileResize:true})` + `ScrollTrigger.refresh()` על
`load` (תופס את ה-mobile CSS שמוזרק async) ועל `orientationchange`. `mobile/css/hero-scene.css`
— `.hero_top{block-size:100svh}`. **טרם אומת על טלפון אמיתי** — המשתמש לבדוק scrub/pin
על מכשיר; אם נותרים באגים, ראה השערות B0 בתוכנית.

**נלווה (גישה במגע):** במכשירי `(hover:none)` ה-nav נשאר חשוף ב-hero-mode (ההמבורגר
נגיש — אין mousemove לחשיפה), מאזיני העכבר מדולגים.

**קבצים:** `index.html`, `css/tokens.css`, `js/site-nav-hover-reveal.js`, `js/hero-scene.js`,
`mobile/css/hero-scene.css`. `npm run build:mobile` הורץ. תוכנית:
`C:\Users\art1\.claude\plans\skill-orchestrator-kind-dream.md`.

---

## ⭐ NEW (2026-06-15) — v10 cinematic scroll-hero (replaces v9 static composition)

ההירו של גאמוס הוחלף לחלוטין בהירו הקולנועי שפותח ב-sandbox
`D:\משה פרוייקטים\פיתוח אתרים\findrealestate-clone - עותק` (בקשת המשתמש). זה **הופך
את החלטת §3 v9** (2026-06-10, שבה ה-scroll-rise בוטל) — ה-sandbox הוא הגרסה הנקייה של
אותו אפקט. הפורט הוא **re-implementation וונילה** (ה-sandbox React; §2 אוסר framework),
דרך ה-skill `scroll-hero-effect`.

**מה נבנה:**
- `assets/images/hero-scene/{sky.jpg,subject.png,clouds.png,smoke.png,logo.svg,base.png}` — שכבות ההירו (הועתקו כמו-שהן מה-sandbox).
- `css/sections/hero-scene.css` — 500vh sticky-pin scene + composer `.hall-portal` (tokenized, namespaced, scoped rem-base).
- `js/hero-scene.js` — GSAP entrance + ScrollTrigger scrub, logo outline+mask injection, `window.gamosHero` stub (over 500vh), `#hall-portal` CTA→halls routing (whoosh + loading overlay).
- `index.html` — `#hero.hero-scene` החליף את `#hero.hero-static`; **סקציה חדשה `#hall-portal`** בין ההירו ל-`#lounge`; preload + CSS link עודכנו.
- `js/main.js` — `hero-scene` החליף את `hero-static` ב-MODULES (rank-3).
- `mobile/css/hero-scene.css` + `mobile/loader.js` — overrides + route-rewrite ל-`.hall-portal__cta--*`. `npm run build:mobile` הורץ.
- `css/tokens.css` — `--brass-olive:#857147` (accent הכותרת). `CLAUDE.md` §2/§3 עודכנו.

**Legacy v9 נשמר** (§2.1 כלל 6): `js/hero-static.js` + `css/sections/hero-static.css` +
`mobile/css/hero-static.css` על-מקום, מנותקים. חזרה = החלפת markup+link+entry אחת.

**✅ נסגר 2026-06-30:** `subject.png` (היה PNG ~20MB, 6240×1599) **קודד מחדש**
ל-3120×800 RGBA full-color (~1.6MB, sharp resize+level9) — ~92% חיסכון, ללא banding.
ה-subject הנראה בפועל ממילא נטען מ-WebP responsive (`subject-*.webp` דרך `<source>`);
ה-PNG הוא fallback בלבד. שאר שכבות ההירו (`sky.jpg` 78KB, `clouds.png` 387KB,
`smoke.png` 693KB) כבר קטנות. חריגת §8 נפתרה.

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
| 08 | Hall Sections | lounge / rooms / culinary (hall-venue/hall-resort הוסרו) | ✅ live | **hall-venue/hall-resort נמחקו 2026-06-15** — האולמות עברו ל-sub-app React (§2.1, `/halls/dist/events/` + `/resort/`). **אין צורך בסרטוני אולמות** — הטענה על "ממתין לסרטונים" בוטלה |
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

> ⚠️ **הטבלה הזו קודמת ל-hero v10 ולמעבר האולמות ל-sub-apps (2026-06-15).**
> חלק מהתיאורים מיושנים (`#hero` הוא כיום scroll-pinned layered scene ולא 528-frame
> canvas; `#lounge` הוא טבעת 3D; `#rooms` הוא דלת → `/rooms/dist/`; `#culinary` הוא
> 320vh ולא 900vh). **מקור האמת הוא `index.html` + `CLAUDE.md §3`, לא הטבלה הזו.**

| # | ID | סוג | סטטוס |
|---|----|-----|--------|
| 1 | `#hero` | Scroll-scene canvas (528 frames) | ✅ Live |
| — | ~~`#hall-venue`~~ | **הוסר 2026-06-15** → sub-app React `/halls/dist/events/` (§2.1) | ✅ Migrated (אין סרטון) |
| — | ~~`#hall-resort`~~ | **הוסר 2026-06-15** → sub-app React `/halls/dist/resort/` (§2.1) | ✅ Migrated (אין סרטון) |
| 4 | `#lounge` | Expanding-panels selector (10 panels, `lounge-selector.js`) | ✅ Live |
| 5 | `#rooms` | Two-pane hover-swap gallery (10 rooms, `rooms-gallery.js`) | ✅ Live |
| 6 | `#culinary` | Scroll-scene canvas (180 frames, 900vh spacer) + 6 dish grid | ✅ Live |
| 7 | `#about` | Static + counter animations | ✅ Live |
| 8 | `#testimonials` | Slider (8 ציטוטים) | ✅ Live |
| 9 | `#gallery` | Static 8-tile mosaic (images filled) | ✅ Live |
| 10 | `#events` | Static (event types) | ✅ Live |
| 11 | ~~`#kosher`~~ | בוטלה 2026-07-13 — התוכן ב-#contact | ⚠️ שם רבנות TODO |
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
| תוכניות מתועדות ב-`PLANS/` | ✅ ok | 14 plans היסטוריים בוצעו ונמחקו; `agent-plans/` בוטלה 2026-06-22 — תוכניות עתידיות תחת `PLANS/` |
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

**JS modules (רשומים ב-MODULES):** `audio, canvas-frame-renderer, contact-form, corridor, corridor-page, counters, directions-map, events-gallery, hero-scene, loading-overlay, lounge-lightbox, lounge-selector, main, main-press, marquee, portals, press-shader, project-drawer, projects-data, reveals, rooms-door, rooms-gallery, scroll-orchestrator, scroll-scene, scroll-spy, scrollytelling, side-dot-nav, site-nav, site-nav-hover-reveal, slider` (+ `utils/media-query`). `hero-static` נשאר כ-seam מנותק (§3). **2026-07-13:** `shabbat-gallery`, `buffet-parallax`, `accordions` הוסרו מ-MODULES (הקבצים בדיסק כ-legacy) — `#shabbat-chatan`/`#buffet` בוטלו ו-`#events` הפך לגלריית הפאנל (v4, `js/events-gallery.js`).

**CSS sections (מקושרים ב-head):** `about, contact, corridor, culinary, directions, events, gallery, hero, hero-scene, hero-static, lounge, motion-reveals, motion-slider, portals, rooms, scroll-scene, section-header, site-footer, site-nav, testimonials`. `hall-venue`/`hall-resort` נמחקו 2026-06-15; `buffet.css`/`shabbat-chatan.css`/`motion-accordions.css`/`kosher.css` נותקו 2026-07-13 (legacy בדיסק).

**CSS components (10):** `buttons, loading-overlay, lounge-lightbox, marquee, media-caption, project-drawer, scrollytelling-loader, side-dot-nav, site-nav-hover, texture-text`

---

## 6. Asset inventory

| תיקייה | גודל | מספר | הערה |
|--------|------|------|------|
| ~~`assets/frames/hero/`~~ | 155MB | 529 frames | **untracked 2026-06-15** — יתום (hero v10 = scroll scene, לא frames). local-only, gitignored. |
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
- [ ] **שם רבנות** — בלוק "כשרות ורבנות" ב-#contact כרגע "בפיקוח הרבנות" (הסקציה #kosher בוטלה 2026-07-13)
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
│   └── next-steps/ ⭐ עתידי בלבד (כל התוכניות, כולל של סוכנים, חיות כאן)
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
