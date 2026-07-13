# Conversion Pass — יישום מסקנות הביקורת השיווקית

**Status:** done (Completed: 2026-07-13 — 28/28 Playwright checks passed; pending user sign-offs: hero screenshot, copy-refine, CF beacon token)
**Category:** features
**Created:** 2026-07-13
**Author agent:** Claude (Fable 5)
**Related:** `GAMOS-DOCS/ביקורת שיווקית ומסקנות לשיפור אתר GAMOS.txt`, Constitution §2/§3/§13,
`architecture/section-order.md`

---

## 1. הקשר ומטרה

ביקורת שיווקית (2026-07) קבעה: האתר מרשים ויזואלית אך מתפקד כתצוגת-חוויה ולא כאתר
ממיר. אבחון מול הקוד אישר:

1. אין CTA המרה עד סקציה 13/14 (`#contact`); "צור קשר" בניווט הוא קישור רגיל; אין בר
   פעולה קבוע במובייל.
2. H1 קיים אך פיוטי ונעלם בגלילה; אין נתוני אמון במסך הראשון.
3. צילום אמיתי ראשון של המתחם רק בסקציה 3 (`#lounge`).
4. ~9 דפוסי אינטראקציה; שני מודולי lightbox משוכפלים; ל-`#gallery` אין רמז אינטראקציה.
5. אפס אנליטיקה.
6. Favicon גנרי ("G" ראסטרי בתוך SVG) ולא הלוגו הרשמי; אין favicon.ico/16px.

מה שהביקורת טענה וכבר קיים: OG/Twitter tags מלאים + og:url נכון; מותג + EVENTS/RESORT
במסך הראשון; טופס + טלפונים + וואטסאפ.

## 2. תוצאה רצויה (Definition of Done)

- CTA ראשי "תיאום סיור ובדיקת תאריך" (גלילה ל-`#contact`) מופיע: הירו, ניווט (כפתור
  מובחן), סוף `#why-gamos`, סוף `#testimonials`, ובר תחתון קבוע במובייל (טלפון/וואטסאפ/סיור).
- שורת נתוני אמון בהירו + סקציית `#why-gamos` חדשה (צילום אמיתי, מונים, ציטוטים, CTA)
  בין `#hall-portal` ל-`#lounge`.
- lightbox משותף אחד (`js/lightbox.js`); רמזי ix-hint ל-`#gallery` ו-`#shabbat-chatan`.
- Favicon מלא מהלוגו הרשמי (SVG וקטורי, ico, 16/32/180/192/512) + תמונת Social Preview
  ייעודית 1200×630 ועדכון og:image.
- `js/analytics.js` (cta_click / lead_submit / section_reach) + beacon Cloudflare מוכן
  להפעלה (מוערם, placeholder).
- כל המחרוזות החדשות מתורגמות (PAIRS he/en/fr); `npm run build` נקי; אימות Playwright
  שההירו לא השתנה כוריאוגרפית.

## 3. אילוצים מה-Constitution

- **§3 LOCKED:** אסור לגעת ב-timeline/scrub של ההירו — תוספת additive בלבד בתוך
  `.hero_content` (תיקון §3 מתועד).
- **§2:** אין ספריות חדשות; analytics.js וניל; ה-beacon של Cloudflare הוא תוספת §2 מתועדת.
- **§13:** כל קוד המובייל (בר CTA) ב-`/mobile/` בלבד; `mobile/index.html` נבנה, לא נערך.
- **§10.1:** עדכון `architecture/section-order.md` לפני שינוי סדר ב-HTML.
- **§10.2/§5:** צבעים מהטוקנים בלבד; palette-lint חייב לעבור.
- **§4/§4.1:** RTL logical properties; טקסטורות-טקסט מהמערכת הקיימת.
- **כפתורים:** שפת הקו של `css/components/buttons.css` (LOCKED) — אין להמציא מראה חדש.

## 4. צעדים

- [x] Phase 0 — ממשל: קובץ זה, שכתוב `section-order.md`, תיקוני CLAUDE.md מתוארכים.
- [x] Phase 1 — CTA: כפתור ניווט, hero_stats + hero_ctas, `css/components/cta-band.css`,
      PAIRS + build:i18n.
- [x] Phase 2 — `#why-gamos`: markup + `css/sections/why-gamos.css` + side-dot-nav +
      mobile override + palette-lint (נקי לקבצים החדשים; ההפרות שנותרו legacy).
- [x] Phase 3 — `js/lightbox.js` משותף + ריפקטור שני הצרכנים + רמזים ל-gallery/shabbat.
- [x] Phase 4 — `mobile/css/cta-bar.css` + `injectCtaBar()` ב-loader + build:mobile +
      README.
- [x] Phase 5 — favicon: **התברר שהסמל הנוכחי כבר נגזר מהלוגו הרשמי** (`לוגו_.png` =
      חלקו העליון של הלוגו המרכזי) — הושלמו החוסרים האמיתיים: favicon-16.png +
      /favicon.ico (PNG-in-ICO ידני) + sizes ב-head. `scripts/make-social-preview.mjs`
      חדש → `social-preview.jpg` 1200×630 (צילום אמיתי + לוגו זהב) + עדכון og:image +
      deploy allow-list + `npm run build:brand`.
- [x] Phase 6 — beacon מוערם + `js/analytics.js` + MODULES + DEPLOYMENT-COSTS note.
- [x] Phase 7 — build + Playwright 28/28 (hero additions + fade, why-gamos, CTA scroll,
      lightboxes, hints, mobile bar ≥44px, i18n EN, reduced-motion, אפס שגיאות קונסול)
      + ניקוי קבצי-זבל מהשורש.

**תיקון תוך-כדי:** `.hero_stats` קיבל `max-inline-size:none` — כלל ה-`<p>` הגלובלי
כיווץ אותו והצמיד לימין בגריד (אותה עקיפה שכבר קיימת ב-`.hero_text`).

## 5. סיכוני עיצוב / רגרסיות

- תוספת ילדים ל-`.hero_content` מזיזה מעט את הבלוק הממורכז — CSS קומפקטי + צילום
  לפני/אחרי.
- כפתורי ההירו נשארים hit-testable ב-opacity 0 באמצע ה-scrub (פעולות שפירות; תיקון
  CSS בלבד אם יפריע).
- הכנסת סקציה אחרי ההירו הנעוץ מזיזה ScrollTrigger offsets — לאמת shabbat pin +
  culinary scrub.
- לוגו wordmark רחב עלול להיות בלתי-קריא ב-16px — נדרש אישור ויזואלי של המשתמש
  (wordmark מול emblem).
- PAIRS חייב להתאים byte-for-byte ל-DOM (מפרידי `·`).

## 6. אישור משתמש נדרש?

כן — (א) צילום לפני/אחרי של המסך הראשון עם ה-CTAs; (ב) בחירת וריאנט Favicon
(wordmark/emblem); (ג) נוסח שיווקי סופי (סומן `TODO copy-refine`).
