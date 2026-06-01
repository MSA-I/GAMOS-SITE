# Plan — Hall Videos + Content Finalization + Browser QA

**Created:** 2026-06-01
**Status:** Open — awaiting user inputs
**Owner:** main agent (after user provides assets/content)
**Constitution alignment:** §3 (4 scroll-scenes), §8 (perf budget), §11 (DoD)

---

## Goal

לסגור את ה-Definition of Done של ה-Constitution §11 ולהעלות את האתר ל-launch readiness:

1. סרטוני Resort + Venue — להחליף את ה-Ken-Burns scaffolds בסצנות canvas-frame אמיתיות.
2. תוכן בעלים — שם רבנות, ציטוטים אמיתיים, lat/lng מדויקים.
3. Browser QA — Lighthouse, console, 60fps, mobile fallback.

---

## Open Items by Owner

### A. חסום על user — תוכן

- [ ] **שם רבנות** באישור הכשרות
  - מיקום: `index.html` → `#kosher` → טקסט "בהשגחת רב מקומי"
  - פעולה: החלפה למחרוזת אמיתית
  - הערכה: 5 דקות

- [ ] **6-10 ציטוטים אמיתיים** מלקוחות (עם שמות מלאים + תאריכים + הסכמה)
  - מיקום: `index.html` → `#testimonials` → `data-slider-track`
  - פעולה: החלפה של 8 ה-placeholders הקיימים
  - הערכה: 30 דקות (יצירה) / יותר אם צריך לאסוף הסכמות

- [ ] **קואורדינטות מדויקות** של המתחם (lat/lng)
  - מיקום: `index.html` → JSON-LD `EventVenue` → `geo` (כרגע: `31.7700, 35.2900`)
  - + `index.html` → `#contact` → iframe Google Maps URL
  - פעולה: השגה מ-Google Maps + עדכון 2 מקומות
  - הערכה: 10 דקות

- [ ] **שעות פתיחה** — לא הופיעו ב-scrape של האתר החי
  - מיקום: `index.html` → JSON-LD `EventVenue` → `openingHoursSpecification`
  - פעולה: הוספה אם רלוונטי
  - הערכה: 5 דקות

- [ ] **WhatsApp number אימות**
  - כרגע: `972779972343` (הטלפון הראשי מה-scrape)
  - האתר החי מציג `wa.me/9725` שבור — לא מדויק
  - מיקום: `js/contact-form.js` → `data-wa-number` ב-form
  - פעולה: לאמת + לעדכן

- [ ] **תמונות אמיתיות לסקציות `data-placeholder`**
  - gallery / rooms / culinary tiles עם markup מוכן
  - מיקום: `index.html` → `#gallery`, `#rooms`, `#culinary` → `[data-placeholder]`
  - פעולה: החלפה של placeholders ב-`<picture>` אמיתי

### B. חסום על user — סרטוני אולם וריזורט

- [ ] **Resort scroll-scene video** — `assets/video/resort-1080.mp4` (4-8s clip)
- [ ] **Venue scroll-scene video** — `assets/video/venue-1080.mp4` (4-8s clip)

לאחר הוספה, פעולה אוטומטית:

```bash
# מהשורש של הפרויקט
npm run encode:all  # יצור frames + manifests עבור כל הסצנות

# ידני (אופציה אם רוצים רק resort/venue)
node scripts/encode-frames.mjs resort venue
```

הסקריפט:
1. מחלץ פריימים @ 30fps עם ffmpeg → PNG.
2. מקודד ל-WebP @ q65 × 1280px עם sharp.
3. כותב `assets/frames/{resort,venue}/manifest.json` עם `frameCount` + `fps` + `pattern`.
4. כותב הראשון 10 פריימים לעיניב (priority high).

לאחר ההרצה — `index.html` כבר מצביע על המיקומים האלה. צריך רק להחליף את ה-`<picture>` הקיים ל-`<canvas>` עם `data-manifest-url`.

ראה הוראות מלאות: [`docs/adding-hall-video.md`](../../docs/adding-hall-video.md).

### C. חסום על user — Browser QA (לא ניתן ל-AI agent)

- [ ] **Lighthouse mobile ≥ 90** בכל 4 צירים (Performance / A11y / Best Practices / SEO)
  - הפעלה: `npm run dev` ב-tab אחד, `npm run lighthouse` ב-tab שני
  - יעד: 90+ בכל קטגוריה
  - אם יש ירידה → `PLANS/fixes/<date>_lighthouse-regression-<axis>.md`

- [ ] **DevTools Console clean** — אפס errors + 0 חסרי 404
  - בדיקה ידנית בChrome
  - אם יש errors → לתעד ב-`PLANS/fixes/`

- [ ] **DevTools Network panel** — וידוא שפריימים יורדים lazy
  - הפריימים אחרי frame 10 צריכים להוריד `fetchpriority="low"` + רק אחרי scroll
  - אם הם יורדים upfront → באג ב-`canvas-frame-renderer.js` two-phase preloader

- [ ] **60fps scrub בדסקטופ M1-class** — DevTools Performance recording
  - גלול דרך Hero → Culinary
  - וודא frame timing < 16.67ms ברוב הזמן
  - אם פחות → לבדוק GPU usage / קונטיינר scaling

- [ ] **iOS Safari + Galaxy S22+ Chrome**
  - iOS branch של `canvas-frame-renderer.js` משתמש ב-fps מופחת אם צריך
  - Galaxy: וידוא של touch scroll + portal click

- [ ] **`prefers-reduced-motion: reduce`** — toggle ב-DevTools
  - כל אנימציה צריכה להיות מבוטלת או מוחלפת ב-static-end-state
  - hero spacer מצטמצם ל-100vh

- [ ] **Keyboard-only navigation** — Tab+Enter דרך כל interactive
  - skip-link ראשון
  - focus ring brass 3px על כולם
  - portals: Tab→Enter פותח את האולם המתאים

- [ ] **Screen reader pass** — VoiceOver (Mac) / NVDA (Windows)
  - skip-link, h1 יחיד, `aria-current` בנקודות-נווט, alt text עברי

### D. Polish אופציונלי (אם המשתמש יבקש)

- [ ] **Lenis smooth scroll** ב-desktop בלבד (Constitution §2 מתיר)
  - היום `js/lenis.js` הוא stub
  - הפעלה: import + `new Lenis({ smoothTouch: false })`
  - יתרון: gentler easing
  - חיסרון: 8KB extra

- [ ] **Sentry / error tracking**
  - integrate `@sentry/browser` (~70KB) לקבל תקלות בזמן אמת
  - דורש Sentry account + DSN

- [ ] **Service worker — frames cache**
  - cache `assets/frames/hero/*` ו-`culinary/*` באופן precache או runtime
  - יקטין repeat visits drastically

- [ ] **Sitemap.xml + robots.txt**
  - לא קיימים. SEO best-practice
  - sitemap עבור `/` + `/legal/{privacy,terms,accessibility}.html`

- [ ] **GitHub Pages / Netlify deploy**
  - היום הקוד רץ רק לוקאלית
  - GitHub Pages: free, פשוט, אבל גודל repo (95MB) קרוב ל-limit (1GB)
  - Netlify: יותר גמיש, CDN included, free tier 100GB/חודש

---

## Execution Order (כשהמשתמש יספק את הנכסים)

```
1. תוכן בעלים (A) — 1-2 שעות
   ├─ שם רבנות
   ├─ ציטוטים
   ├─ lat/lng
   └─ WhatsApp verification

2. סרטוני אולם (B) — תלוי בזמן הבעלים
   ├─ קבל resort-1080.mp4 + venue-1080.mp4
   ├─ npm run encode:all (~5 דקות)
   ├─ עדכון index.html: <picture> → <canvas>
   ├─ הוספת data-scrollytelling attribute
   └─ git commit "feat: resort+venue scroll-scenes live"

3. Browser QA (C) — דורש user
   ├─ Lighthouse mobile + desktop
   ├─ console + 60fps + iOS/Android
   ├─ keyboard + screen reader
   └─ אם יש regressions → PLANS/fixes/<date>_*.md

4. Polish אופציונלי (D) — לפי בקשת בעלים
```

---

## Constitution Updates Required

לפני סגירת התוכנית הזאת, עדכן `CLAUDE.md`:

- **§12 Maintenance Log** — שורה לכל שינוי תוכן/וידאו/QA
- **§3** — אם תוכן הסקציות משתנה משמעותית, לעדכן "Hybrid Concept"
- **§8** — אם asset budget משתנה (sevices videos יוסיפו ~50MB ל-frames), לעדכן `Hero MP4 1080p ≤ 12MB` ל-`Per-scene canvas frames ≤ XX MB`

---

## Definition of Done

תוכנית זו תיחשב סגורה כאשר:

- [ ] כל פריט ב-A מבוצע + commit
- [ ] כל פריט ב-B מבוצע + 4 הסצנות חיות + commit
- [ ] כל פריט ב-C עובר (5/8 → 8/8 ב-checklist של STATUS.md §4)
- [ ] D — אופציונלי, רק אם המשתמש מבקש
- [ ] עדכון `CLAUDE.md §12` עם Maintenance Log entry
- [ ] עדכון `STATUS.md` — מצב נוכחי
- [ ] הזזת התוכנית הזאת ל-`PLANS/archive/` (אם הושלמה במלואה) או עדכון בה (אם חלקית)

---

## Notes

- אם הסרטונים שיגיעו יהיו ארוכים (>10 שניות) — Constitution §8 ידרוש עדכון. נצטרך להחליט בין: (a) חיתוך הסרטון ל-≤8s, (b) הקטנת fps ל-24, (c) עדכון התקציב.
- Resort + Venue יורידו ~25-30MB נוספים ל-`assets/frames/`. סך repo יגיע ל-~120-130MB. עדיין מתחת ל-Git limit אבל קרוב.
- אם תקציב ה-frames מתפוצץ — אופציה למעבר ל-Git LFS ל-`assets/frames/` בלבד. הוראות ב-`docs/asset-encoding.md`.

---

**Last updated:** 2026-06-01 by main agent.
