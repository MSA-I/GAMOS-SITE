# Section Order

> **חוק.** סדר הסקציות ב-`index.html` הוא הסדר ההגיוני. שינוי דורש עדכון
> הקובץ הזה תחילה. (Constitution §10.1)

**Status:** LOCKED 2026-07-13 — שוכתב מהמצב-בפועל של `index.html` (הגרסה הקודמת
הייתה Provisional מ-2026-05-28 ולא שיקפה את האתר הבנוי). באותו תאריך נוספה
סקציית `#why-gamos` (conversion pass — `PLANS/next-steps/2026-07-13_conversion-pass.md`).

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
5. **`#culinary`** — scroll-scrub קולינרי (canvas frames) + גריד מנות.
6. **`#buffet`** — רצועות פרלקסה.
7. **`#shabbat-chatan`** — pinned mask-reveal.
8. **`#rooms`** — דלת כניסה ל-sub-app חדרי האירוח.
9. **`#about`** — אודות + מונים.
10. **`#testimonials`** — קרוסלת המלצות + CTA band בסיום.
11. **`#gallery`** — masonry + lightbox משותף.
12. **`#events`** — סוגי אירועים.
13. **`#kosher`** — כשרות.
14. **`#contact`** — טופס + טלפונים + וואטסאפ (יעד ה-CTA הראשי).
15. **`#routes`** — מסלולי הגעה + מפה (reveal-pair עם contact).

---

## Anchor IDs (locked)

`#hero`, `#hall-portal`, `#why-gamos`, `#lounge`, `#culinary`, `#buffet`,
`#shabbat-chatan`, `#rooms`, `#about`, `#testimonials`, `#gallery`, `#events`,
`#kosher`, `#contact`, `#routes`.

---

## Justification

- Hero ראשון = wow קולנועי; מכיל כעת גם הצעת ערך + CTA (ביקורת 2026-07: "המרה
  מהמסך הראשון").
- hall-portal מיד אחרי = בחירת מתחם.
- **why-gamos שלישי = צילום אמיתי + אמון + CTA לפני מסע החוויות** — היררכיה עסקית:
  מהו גאמוס → למה → חוויה.
- lounge / culinary / buffet / shabbat / rooms = חוויות המתחם.
- about + testimonials = העמקת אמון; CTA אחרי המלצות.
- gallery / events / kosher = תוכן משלים.
- contact לפני routes = נקודת ההמרה; routes סוגר עם הגעה.

---

## הערת CTA (2026-07-13)

הפעולה הראשית של האתר: **"תיאום סיור ובדיקת תאריך" → גלילה חלקה ל-`#contact`**.
נקודות הופעה: ניווט (כפתור), הירו, סוף why-gamos, סוף testimonials, בר תחתון קבוע
במובייל (`/mobile/`). פעולה משנית: וואטסאפ ישיר.
