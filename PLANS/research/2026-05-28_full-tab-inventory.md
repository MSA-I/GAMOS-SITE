# Full Tab Inventory — gamos.co.il
# רשימה מלאה של כל הלשוניות

**Agent:** 01 — Research & Content Lead
**Date:** 2026-05-28
**Status:** **🟡 Awaiting user approval** — gate חובה לפני Phase 3a (Agent 4 HTML).

---

## חוק

המשתמש דרש במפורש: *"כיסוי מלא של כל הלשוניות מהאתר החי."*
המשמעות: כל לשונית מ-top-nav, מ-footer, ומכל sub-page נכללת בקובץ הזה,
ויוצגת באתר החדש — בין אם כ-section anchor ב-homepage scroll, בין אם
כ-page נפרד.

המקור האמיתי הוא `D:\משה פרוייקטים\עיצוב אתר מחודש\Scrape\GAMOS.HTML`
(scraped 2026-05-05, ה-DOM של homepage). הוא מספיק כדי לבנות את הטבלה
המלאה.

---

## טבלה ראשית — Top-nav + Footer + Sub-pages

| # | Tab name (Hebrew) | Source URL | Position in new design | Copy summary | Asset paths | Coverage |
|--:|------------------|------------|------------------------|--------------|-------------|----------|
| 1 | **ראשי** | `https://gamos.co.il/` | `#hero` (top of `index.html`) | "גאמוס-אירועים / חווית אירועים חדשה בישראל" + body של 3 שורות | hero video תפור, logo PNG | ✅ already in hybrid concept (§3 Constitution) |
| 2 | **אודות** | `https://gamos.co.il/הסיפור-שלנו/` | `#about` section ב-homepage (anchor), פלוס link "הסיפור המלא" שיוביל לעמוד מורחב אם נדרש | "גאמוס-אירועים / חווית אירועים חדשה בישראל / גאמוס הוא קומפלקס אירועים יחודי…" | תמונה רקע מ-`ריזורט 1/לייטרום/` | ✅ in concept (`#about` is section 9 in `section-order.md`) |
| 3 | **המתחמים** (dropdown header) | `https://gamos.co.il/#` | קונטיינר של שתי בועות פורטל ב-`#portals` (Phase 4a) | אין copy ישיר — רק כותרת קליקאבילית | bubble videos (`portal-loop.mp4`) | ✅ Portal Reveal section §3.2 ב-Constitution |
| 3a | ↳ **GAMOS EVENTS** (אולם) | `https://gamos.co.il/gamos/` | `#hall-venue` סקציה מלאה אחרי הבועות | "גן אירועים עם נוף מדברי וחופה מרחפת במדבר. אולם אירועים ענק המכיל עד 1000 מוזמנים…" | `אולם 3/` (15+ PNG אופטימיזציה ל-`assets/images/halls/venue/`) | ✅ section-order.md item 4 |
| 3b | ↳ **GAMOS RESORT** (ריזורט) | `https://gamos.co.il/roof/` | `#hall-resort` סקציה מלאה אחרי האולם | "המשלב גן אירועים, חדרי אירוח, מערכת הגברה ותאורה תפריט מנצח בריכת חוף ענקית ונוף מדברי עוצר נשימה…" | `ריזורט 1/לייטרום/` 18 תמונות + `ריזורט 1/סרטוני אנימציה/` 13 וידיאו | ✅ section-order.md item 5 |
| 4 | **גלריה** | `https://gamos.co.il/גלריה/` | `#gallery` סקציה ב-homepage (mosaic mixed media) — section-order.md item 11 | אין copy ייחודי — תמונות בלבד | mix מ-`אולם 3/`, `ריזורט 1/`, `LAUNGE/`, `חדרי נופש 2/` | ⚠️ needs new section (לא מופיע ב-hybrid concept §3 במפורש) |
| 5 | **קולינריה** | `https://gamos.co.il/קולינריה/` | `#culinary` סקציה — section-order.md item 8 | "המטבח שלנו / חוויה קולינרית בלתי נשכחת / גאמוס מזמינה אתכם לצאת למסע גסטרונומי…" | `קולינריה 4/` 11 JPG (gallery) + תמונת KARELA-15 מהאתר החי | ✅ in concept (§3.5 — Static section) |
| 6 | **אירועים עסקיים** | `https://gamos.co.il/אירועים-עסקיים/` | תת-סקציה ב-`#events` (אקורדיון) — section-order.md item 12 — אחת מ-3: חתונות / בר-מצווה / **אירועי חברה** | תוכן verbatim — לא נסרק ב-2026-05-05. **TODO Phase 1.5: לסרוק עמוד.** | placeholder — ייבחר מ-`אולם 3/` | ⚠️ needs new section (events accordion) |
| 7 | **מפות התמצאות** | `https://gamos.co.il/מפות/` | תת-סקציה ב-`#contact` עם כפתור Waze + iframe map (אופציונלי) — section-order.md item 14 | אדרס: "די זהב 7, פארק ישראל מעלה אדומים" + Waze deep-link | אין media | ✅ already in `#contact` per concept |
| 8 | **צרו קשר** | `https://gamos.co.il/contact/` | `#contact` סקציה — section-order.md item 14 — טופס + פרטי קשר | "צרו קשר ונחזור אליכם בהקדם / תאריכים אחרונים בהחלט לאירועי קיץ, 2026!" + form fields + phones + email + Waze + WhatsApp | אין | ✅ in concept |
| 9 | **הצהרת נגישות** (footer-only) | `https://gamos.co.il/הצהרת-נגישות/` | עמוד נפרד `accessibility.html` (לא בתוך scroll), link מה-footer בלבד | תוכן verbatim — לא נסרק. **TODO Phase 1.5: לסרוק עמוד.** | אין | ⚠️ needs separate page |

---

## פריטים ב-footer שאינם תפריט-ניווט

| # | Element | URL/href | Position in new design | Notes |
|--:|---------|----------|-------------------------|-------|
| F1 | טלפון 1 | `tel:0779972343` | `#contact` aside | `077-9972343` |
| F2 | טלפון 2 | `tel:0778036482` | `#contact` aside | `077-8036482` |
| F3 | WhatsApp | `https://wa.me/9725` | `#contact` aside (כפתור צף + sticky) | ⚠️ **באג ב-live: רק 4 ספרות.** לבקש מהמשתמש מספר תקין. תיקון typo: "וואסטפ" → "וואטסאפ" |
| F4 | אימייל | `mailto:office@gamos.co.il` | `#contact` aside | `office@gamos.co.il` |
| F5 | כתובת | Waze deep-link | `#contact` aside + `#footer` | "די זהב 7, פארק ישראל מעלה אדומים" |
| F6 | Facebook | `https://www.facebook.com/Pavilionevetns` | `#footer` social | typo? URL שונה משם החברה — לאמת |
| F7 | Instagram | `https://www.instagram.com/gamos__event/` | `#footer` social | underscore double |
| F8 | Waze (top-bar icon) | אותו URL כמו F5 | top-nav social row | duplicated מ-F5 |
| F9 | "אתר זה נבנה ע"י לידאס" | `https://www.lead-us.co.il/` | **לא להעתיק** | אנחנו לא בנינו אצל לידאס |
| F10 | "התמונות להמחשה בלבד" | (טקסט) | קטן ב-`#footer` legal | להעתיק verbatim |

---

## פריטים שיש ב-section-order.md אבל אינם באתר החי (תוספות חדשות)

| # | Section | Why we need it | Source for content |
|--:|---------|----------------|----------------------|
| N1 | `#lounge` (sec 6) | המשתמש סיפק תמונות `LAUNGE/` בנפרד — חוויית בילוי קלה | תמונות בלבד; copy ייכתב על ידי Agent 8 ויאומת מול המשתמש |
| N2 | `#rooms` (sec 7) | המשתמש סיפק `חדרי נופש 2/` בנפרד | תמונות + copy חדש קצר |
| N3 | `#testimonials` (sec 10) | חיוני ל-trust building (Bvlgari/Aman pattern) | **TODO Phase 1.5: לבקש מהמשתמש 6-10 ציטוטים** |
| N4 | `#kosher` (sec 13) | אם יש תעודה רבנית פעילה | **TODO Phase 1.5: לבקש מהמשתמש** |
| N5 | `#events` accordion: חתונות + בר-מצווה (סעיף 12) | קיים תת-לשונית "אירועים עסקיים" ולא חתונות / ב"מ — נוסיף 3 קטגוריות | copy חדש |

---

## טבלה מאוחדת — סדר סקציות סופי ב-`index.html`

| Order | Anchor | Origin (live tab or new) | Owner agent |
|------:|--------|---------------------------|-------------|
| 1 | `#nav` | top-nav | Agent 4 |
| 2 | `#hero` | ראשי | Agent 6 |
| 3 | `#portals` | המתחמים (dropdown header) | Agent 7 |
| 4 | `#hall-venue` | GAMOS EVENTS | Agent 8 |
| 5 | `#hall-resort` | GAMOS RESORT | Agent 8 |
| 6 | `#lounge` | NEW (אין באתר החי) | Agent 8 |
| 7 | `#rooms` | NEW (משתמע מ-RESORT) | Agent 8 |
| 8 | `#culinary` | קולינריה | Agent 8 |
| 9 | `#about` | אודות (הסיפור שלנו) | Agent 8 |
| 10 | `#testimonials` | NEW | Agent 8 |
| 11 | `#gallery` | גלריה | Agent 8 |
| 12 | `#events` | אירועים עסקיים → אקורדיון | Agent 8 |
| 13 | `#kosher` | NEW (אופציונלי) | Agent 8 |
| 14 | `#contact` | צרו קשר + מפות התמצאות | Agent 4 + 8 |
| 15 | `#footer` | footer | Agent 4 |
| separate page | `accessibility.html` | הצהרת נגישות | Agent 4 |

---

## מה צריך לאשר המשתמש (Decision Matrix)

| ID | Question | Default (Agent 1 proposal) | User decision |
|---:|---------|-----------------------------|----------------|
| Q1 | האם ה-`#testimonials` נדרש? | כן — חיוני ל-luxury feel | ⬜ |
| Q2 | האם `#kosher` נדרש (סעיף 13)? | אופציונלי — אם יש תעודה | ⬜ |
| Q3 | האם `#events` (אקורדיון של 3) נדרש? | כן — הלשונית "אירועים עסקיים" קיימת באתר החי, נרחיב | ⬜ |
| Q4 | מה המספר התקין של ה-WhatsApp? | live site שבור (`9725` בלבד) | ⬜ |
| Q5 | האם `#gallery` תהיה sticky scroll mosaic או flat masonry? | masonry עם reveal-on-scroll | ⬜ |
| Q6 | "הצהרת נגישות" — האם להעתיק verbatim מהאתר החי או לכתוב מחדש? | להעתיק verbatim (legal) | ⬜ |
| Q7 | האם להוריד את ה-typing-animation header (`תאריכים אחרונים…`)? | להחליף בכותרת סטטית יוקרתית | ⬜ |
| Q8 | האם להחליף `#CC3366` (CC3366 זוועתי) ב-`#B8576F`? | כן — luxury accent | ⬜ |
| Q9 | האם המתחם הראשי הוא רק "GAMOS EVENTS" או יש כמה אולמות? | אולם אחד גדול עד 1000 איש (לפי copy) | ⬜ |
| Q10 | תוכן sub-pages שלא נסרקו (אודות מלא, גלריה, אירועים עסקיים, מפות, נגישות) — | סקרייפ נוסף ב-Phase 1.5 דרוש (WebFetch / Bash הוחזרו?) | ⬜ |

---

## Done criteria for this gate

1. ✅ הטבלה הראשית (10 שורות) מכסה את **כל** הלשוניות מ-top-nav ו-footer.
2. ✅ סודרה תוכנית מיפוי מ-tab → anchor/page ב-rebuild.
3. ✅ זוהו 5 sections חדשים שאינם באתר החי (`#lounge`, `#rooms`, `#testimonials`, `#kosher`, `#events` accordion).
4. ✅ זוהו 2 typos / באגים באתר החי (WhatsApp link, "וואסטפ").
5. ⬜ **המשתמש מאשר את הטבלה הזו** (gate חובה לפני Phase 3a).

---

## הערות סיום

- כל הלשוניות מהאתר החי (10 פריטים) **קיבלו מקום** ב-rebuild.
- "המתחמים" כ-dropdown מתורגם ל-Portal Reveal (concept §3.2) — חוויה יוקרתית יותר מ-dropdown.
- "מפות התמצאות" התמזג עם `#contact` (כי בפועל, באתר החי, "מפות התמצאות" הוא רק Waze deep-link).
- "הצהרת נגישות" נשארת עמוד נפרד (legal best practice).

> ⚠️ Agent 4 לא מתחיל לכתוב `index.html` עד שיש סימן ✅ ליד **כל** העשר השאלות (Q1–Q10) למעלה.
