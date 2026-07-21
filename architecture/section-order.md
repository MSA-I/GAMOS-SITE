# Section Order

> **חוק.** סדר הסקציות ב-`index.html` הוא הסדר ההגיוני. שינוי דורש עדכון
> הקובץ הזה תחילה. (Constitution §10.1)

**Status:** LOCKED 2026-07-13 — שוכתב מהמצב-בפועל של `index.html` (הגרסה הקודמת
הייתה Provisional מ-2026-05-28 ולא שיקפה את האתר הבנוי). באותו תאריך נוספה
סקציית `#why-gamos` (conversion pass — `PLANS/next-steps/2026-07-13_conversion-pass.md`).

**AMENDED 2026-07-13 (החלטת משתמש, צמצום גלריות):** `#buffet` בוטלה — 6 כרטיסי
בופה נבחרים נטמעו בגריד המנות של `#culinary` (תג "בופה"); `#shabbat-chatan`
בוטלה — התוכן מיוצג כפריט בגלריית `#events` החדשה (hover-list), וקישור הניווט
שלה הוחלף ב"סוגי אירועים" → `#events`. קבצי ה-CSS/JS של שתי הסקציות נשארים
בדיסק כ-legacy לא-מקושר (תקדים §2.1 כלל 6).

---

## Order (top → bottom)

0. **Top Navigation** — `.site-nav`, sticky, RTL, מוסתר במצב hero; כולל כפתור CTA
   "תיאום סיור ובדיקת תאריך" (`#contact`) — הפעולה הראשית של האתר.
1. **`#hero`** — cinematic scroll-pinned scene, 500vh (§3 LOCKED). כולל H1 + שורת
   נתוני אמון + שני CTAs (תיאום סיור / וואטסאפ) בשכבת `.hero_content`.
2. **`#hall-portal`** — קומפוזר EVENTS / RESORT (כניסות ל-sub-apps).
3. **`#why-gamos`** — *(NEW 2026-07-13)* נקודות אמון מוקדמות: צילום אמיתי של המתחם,
   3–4 מונים, ציטוטי המלצות, CTA band. עונה לביקורת השיווקית (מוצר + אמון + המרה
   מוקדם).
4. **`#lounge`** — מתחם קבלת פנים (טבעת תלת-ממד בגרירה).
5. **`#culinary`** — scroll-scrub קולינרי (canvas frames) + גריד מנות
   (כולל 6 כרטיסי בופה — המשך הגריד, תג "בופה").
6. **`#rooms`** — דלת כניסה ל-sub-app חדרי האירוח.
7. **`#about`** — אודות + מונים.
8. **`#testimonials`** — קרוסלת המלצות + CTA band בסיום.
9. **`#gallery`** — masonry + lightbox משותף.
10. **`#events`** — סוגי אירועים: פאנל תצוגה editorial (שורות + פירוט נפתח;
    במובייל כרטיסים נערמים). כולל פריט "שבתות חתן". רקע taupe חם (cocoa-82%)
    עם קשת עליונה.
11. **`#contact`** — טופס + טלפונים + וואטסאפ (יעד ה-CTA הראשי). כולל בלוקי
    פירוט נגישות + כשרות-ורבנות (#kosher בוטלה 2026-07-13 — הועברה לכאן).
12. **`#routes`** — מסלולי הגעה + מפה (reveal-pair עם contact).
13. **`.site-footer`** — *(NEW 2026-07-21, footer-craft pass)* פוטר סגירה
    ("ההזמנה החקוקה") **מחוץ ל-`<main>`** כ-`<footer role="contentinfo">`.
    שלושה פסים על רקע דיו-מדבר: (א) סגירה רגשית — eyebrow מיצוב, כותרת-טקסטורה
    (`.texture-text--light`), lede, וזוג CTA ראשי (תיאום סיור → `#contact` +
    וואטסאפ, בשפת `.btn`/`.btn--glass`); (ב) בלוק קשר קונסיירז' + קישורי רשתות
    מתויגים (אינסטגרם/פייסבוק, לא אייקון-בלבד §9); (ג) זכויות יוצרים · קישורים
    משפטיים · חזרה-לראש. לא sitemap. CSS: `css/sections/site-footer.css` +
    `mobile/css/site-footer.css` (§13). JS חזרה-לראש: `js/footer.js`.

---

## Anchor IDs (locked)

`#hero`, `#hall-portal`, `#why-gamos`, `#lounge`, `#culinary`, `#rooms`,
`#about`, `#testimonials`, `#gallery`, `#events`, `#contact`, `#routes`.
*(`#buffet` + `#shabbat-chatan` + `#kosher` הוסרו 2026-07-13 — ראה AMENDED למעלה;
הכשרות חיה כבלוק פירוט ב-#contact.)*

---

## Justification

- Hero ראשון = wow קולנועי; מכיל כעת גם הצעת ערך + CTA (ביקורת 2026-07: "המרה
  מהמסך הראשון").
- hall-portal מיד אחרי = בחירת מתחם.
- **why-gamos שלישי = צילום אמיתי + אמון + CTA לפני מסע החוויות** — היררכיה עסקית:
  מהו גאמוס → למה → חוויה.
- lounge / culinary / rooms = חוויות המתחם (בופה בתוך culinary מ-2026-07-13).
- about + testimonials = העמקת אמון; CTA אחרי המלצות.
- gallery / events = תוכן משלים (כשרות = בלוק פירוט ב-contact מ-2026-07-13).
- contact לפני routes = נקודת ההמרה; routes סוגר עם הגעה.

---

## הערת CTA (2026-07-13)

הפעולה הראשית של האתר: **"תיאום סיור ובדיקת תאריך" → גלילה חלקה ל-`#contact`**.
נקודות הופעה: ניווט (כפתור), הירו, סוף why-gamos, סוף testimonials, בר תחתון קבוע
במובייל (`/mobile/`). פעולה משנית: וואטסאפ ישיר.
