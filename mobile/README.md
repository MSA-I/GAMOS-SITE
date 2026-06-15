# mobile/ — Mobile-only overrides for GAMOS-SITE

> **קונבנציה נעולה 2026-06-08 v2 — self-contained loader model.**

כל קוד שנכתב כדי שהאתר ייראה ויתפקד טוב במובייל חי כאן ב-`/mobile/`.
התיקייה היא self-contained: שורת קוד אחת ב-`/index.html`
(`<script src="/mobile/loader.js" defer></script>`) טוענת את הכל.

**אל תוסיף `@media (max-width: …)` rules ישירות לקבצים ב-`/css/sections/` —
הם desktop-first.** כל override מובייל חייב לשבת תחת `/mobile/css/`.

---

## למה תיקייה נפרדת + loader?

1. **Self-contained merge ל-main** — אפשר למזג את `/mobile/` ישירות ל-main
   בלי לערוך `index.html` בעשרות מקומות, בלי שינויים ב-`js/main.js`,
   ובלי hooks מיוחדים ב-`js/*-selector.js`. אם רוצים לכבות את ה-mobile
   pass — מוחקים את התיקייה ואת השורה היחידה ב-`index.html`.

2. **שמירה על "תקרת חוויה" (Constitution §1)** — האתר נבנה לדסקטופ עם
   חוויות scroll-driven מורכבות. במובייל אנחנו לא **מאבדים** את החוויות,
   אלא מתרגמים אותן (coverflow במקום ring 3D, snap-carousel במקום
   parallax, פריימים בגרסה מוקטנת).

3. **Cascade order ברור** — הloader מזריק `<link>` tags של `mobile/css/*`
   *אחרי* כל קבצי הליבה ב-`<head>`, ולכן ה-overrides תמיד מנצחים בלי
   `!important`-ים מיותרים.

4. **Onboarding לסוכנים עתידיים** — כל מי שרוצה להוסיף תיקון מובייל יודע
   במדויק לאן הוא הולך, באיזו תבנית.

---

## מבנה התיקייה

```
mobile/
├── README.md                       ← אתה פה
├── loader.js                       ← entry point יחיד שטוען את הכל
├── css/                            ← @media overrides בלבד
│   ├── lounge.css                    coverflow carousel ל-≤768px
│   ├── shabbat-chatan.css            snap carousel ל-≤640px
│   ├── culinary.css                  2-col grid ל-≤559px
│   ├── hero-static.css               pill CTA buttons ל-≤768px
│   ├── responsive-images.css         (placeholder; עיבוד עתידי)
│   ├── touch-targets.css             ≥44×44 + html overflow lock
│   └── headings.css                  Hebrew descender clearance + kosher fix
└── scripts/
    └── encode-frames-mobile.mjs      encoder לפריימי culinary במובייל
```

---

## חוקי הקונבנציה (חובה)

### 1. הכניסה הקנונית: `loader.js`

קובץ אחד אחראי על כל ההזרקות לרניטיים. הוא טוען בערך כך:

1. **`<link>` tags** — דוחק את כל קבצי `mobile/css/*.css` ל-`<head>`
   אחרי קבצי הליבה.
2. **Heebo preload** — מזריק `<link rel="preload" as="font">` לטיפוגרפיה.
3. **Responsive `<picture>`** — עובר על כל `<picture>` שיש לו source עם
   `…full.webp`, ומוסיף `<source media="(max-width: 768px)" srcset=
   "…half.webp">` לפניו.
4. **Hero CTA labels** — מוסיף `<span class="hero-static__cta-label">`
   עם הטקסט "אירועים" / "ריזורט" בתוך כל אחד מה-`<a>` של ה-hero.
   ה-rule הdefault (visually-hidden) נטען כ-inline `<style>` כדי שלא
   יראה בדסקטופ.
5. **Culinary mobile manifest** — מוסיף `data-manifest-url-mobile`
   על ה-canvas, ומחליף את ה-`data-manifest-url` הפעיל ל-mobile URL
   ב-≤768px לפני ש-`scroll-scene.js` קורא אותו.

הוא **לא** מייבא דבר מ-`js/main.js` או מ-`js/lounge-selector.js`. אם
תוסיף הזרקה חדשה — הוסף אותה כפונקציה חדשה ב-loader.js.

### 2. CSS

- **רק overrides בתוך `@media`**. כלל בודד מחוץ ל-`@media` הוא באג.
- ה-breakpoints המקובלים: `768px` (mobile-wide), `640px` (mobile-narrow),
  `480px` (פיינטיון hero CTA וכו'), `360px` (פינות קטנות).
- **Logical properties בלבד** (`block-size`, `inline-size`, `padding-block`,
  `padding-inline`, `inset-block-start`, `inset-inline-start` וכו'). לא
  `width`/`height`/`left`/`right` (Constitution §4).
- **לא להוסיף צבעים חדשים** (Constitution §5). אם נדרש צבע — להשתמש
  בטוקנים מ-`/css/tokens.css`.
- **`transform: none !important`** ו-`!important` בכלל מותרים *רק* כשנדרש
  לעקוף inline-style שכותב JS של הליבה (לדוגמה ב-shabbat / lounge).

### 3. אסור לערוך קבצים מחוץ ל-`/mobile/`

Self-contained משמעו self-contained. אם בעתיד תזהה תיקון מובייל שדורש
לערוך `index.html` או `js/main.js` או קובץ ב-`/css/sections/` — חשוב מחדש
את הפתרון. כמעט תמיד אפשר לעשות אותו דבר דרך:
- DOM mutation ב-`loader.js` (אם זה DOM patch).
- `@media` override ב-`mobile/css/<section>.css` (אם זה CSS).
- `MutationObserver` ב-`loader.js` (אם זה reactive ל-JS של הליבה).

החריג היחיד: שורת `<script src="/mobile/loader.js" defer></script>`
ב-`<head>` של `index.html`. זה ה-bootstrap היחיד שמחבר את הכל.

### 4. Scripts

- `mobile/scripts/*.mjs` הם CLI tools להפקת נכסי mobile (לדוגמה,
  encode פריימים ברזולוציה נמוכה). לא נטענים ב-runtime.

### 5. Git

- אין branch ייעודי. הכל נדחף ל-`main` כי הקבצים בתיקייה נפרדת.
- Commit מסביר מה נוסף תחת `/mobile/` (וטכנית גם השורה היחידה
  ב-`index.html`).
- אסור לערבב refactor של ליבה (rooms-gallery, contact-form וכו') באותו
  commit.

### 6. עקרון "preserve experience"

**אם דסקטופ מציג חוויה X, מובייל חייב להציג גרסה equivalent של X — לא
fallback סטטי שטוח.** דוגמאות:
- Lounge desktop = 3D ring → mobile = coverflow carousel עם scale +
  opacity (לא grid שטוח).
- Shabbat desktop = parallax אופקי → mobile = snap-scroll carousel
  אופקי (לא column אנכי).
- Culinary desktop = canvas-frame scrub → mobile = canvas-frame scrub
  ברזולוציה נמוכה יותר (לא poster סטטי).

ה-`prefers-reduced-motion: reduce` הוא היוצא היחיד — שם מותר fallback
סטטי, כי המשתמש ביקש זאת במפורש.

---

## איך להוסיף תיקון מובייל לסקציה חדשה

1. **CSS**: צור `mobile/css/<section>.css`. כל ה-rules בתוך `@media`.
2. **DOM patch** (אם נדרש): הוסף פונקציה ל-`mobile/loader.js` (לדוגמה
   `injectCarouselDots()`). הtask מתחיל ב-DOMContentLoaded לאחר ש-DOM זמין.
3. **Wire**: הוסף את ה-CSS path ל-`MOBILE_CSS` array ב-`loader.js`.
4. **Verify**:
   - DevTools device toolbar → iPhone 12 Pro / Galaxy S22 / iPhone SE.
   - Throttle Slow 4G — Lighthouse ≥90.
   - Reduced-motion ON → fallback מתאים.
   - Reload בדסקטופ → אפס רגרסיות.

---

## מסלול בדיקה מהיר

```bash
# מהשורש של GAMOS-SITE:
npx serve . -l 5050
# פתח http://localhost:5050 ב-Chrome → DevTools → device toolbar:
#   iPhone 12 Pro (390×844)
#   Galaxy S22  (360×780)
#   iPhone SE   (375×667)
# Reload ולבדוק:
#   - Hero: 2 pill buttons "אירועים"/"ריזורט", ≥44px hit area, no overlap.
#   - Lounge: coverflow carousel — focused card scale(1), sides 0.86.
#   - Culinary: scrub plays from /assets/frames/culinary-mobile/ (אם encoded).
#   - Shabbat: swipe → snap to next picture (RTL — image 01 right-most).
#   - Rooms: pill scroller stays.
#   - Contact: 1-col, submit ≥44px.
```

---

## Roadmap (ידוע / open)

- ✅ Self-contained loader.js (single entry point).
- ✅ Phase 1: responsive `<picture>` + Heebo preload.
- ✅ Phase 2A: lounge coverflow carousel.
- ✅ Phase 2B: shabbat snap carousel.
- ✅ Phase 2C: culinary mobile-frames manifest swap (encoder + runtime).
- ✅ Phase 3A: hero pill CTA buttons.
- ✅ Phase 3B: WCAG ≥44×44 touch-targets + Hebrew descender clearance + kosher heading fix.
- ✅ Phase 3C (fidelity pass 2026-06-15): closed remaining §9 touch-target gaps
  found via Playwright settled-state audit — contact channel links (tel/mail/WA)
  → 44px, directions origin tabs → 44px floor, Leaflet zoom controls → 44px,
  skip-link → 44px, hero scroll-cue → transparent `::before` 48px hit box,
  testimonials dots → 46px (sub-pixel buffer). Verified: at 390/360px the main
  site has **zero horizontal overflow + zero console errors** and every section
  reads as an equivalent of its desktop experience (settled-state, animations
  disabled). The Leaflet attribution credit (216×18) is the only sub-44px
  interactive element left — an essential inline map-license link (WCAG 2.5.5
  exempt). `assets/frames/culinary-mobile/` is populated; the manifest swap in
  `setupCulinaryMobileManifest()` serves it on ≤768px.
- ⏳ Halls/Rooms sub-app mobile builds (`/halls/dist/oasis-mobile/`,
  `/halls/dist/lumina-mobile/`, `/rooms/dist/mobile/`) — purpose-built phone
  chrome (`HallChromeMobile`/`RoomsChromeMobile`); polished + rebuilt in the
  same fidelity pass. Source under `halls/`+`rooms/` per §2.1 (not `/mobile/`).
