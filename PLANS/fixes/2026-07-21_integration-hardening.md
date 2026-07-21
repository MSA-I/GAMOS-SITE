# הקשחת אינטגרציית פוטר ו-Leaflet

**Status:** done
**Category:** fixes
**Created:** 2026-07-21
**Author agent:** Codex diff-audit
**Related:** `CLAUDE.md` §4, §8, §9, §10.2; `css/sections/site-footer.css`; `js/directions-map.js`; `PRODUCT.md`; `DESIGN.md`

---

## 1. הקשר ומטרה

לאחר שחזור סשן העבודה נמצאו ערכי CSS לוגיים שאינם תקניים בפוטר, פערי תיעוד מול הטוקנים החדשים, ומרוץ אפשרי בין טעינת CSS ו-JS של Leaflet. המטרה היא להקשיח את האינטגרציה בלי לשנות markup, תוכן, mobile artifact או שפה חזותית.

## 2. תוצאה רצויה (Definition of Done)

- פס ההפרדה בפוטר משתמש ב-gradient תקני וסימטרי.
- קווי ה-hover בפוטר גדלים מתחילת כיוון הקריאה ב-RTL וב-LTR באמצעות ערך תקני.
- `PRODUCT.md` ו-`DESIGN.md` תואמים ל-`--fg-muted: #5E5E5B`, hover בצבע cocoa וטבעת focus דו-גונית.
- המפה נבנית רק לאחר ש-CSS ו-JS של Leaflet מוכנים; הכשל ניתן לניסיון חוזר והאתחול נשאר lazy ו-idempotent.
- `node --check` ו-`git diff --check` ממוקד עוברים ללא שגיאה.

## 3. אילוצים מה-Constitution

- logical properties ו-RTL-first לפי §4; במקרה של API שאינו תומך ב-logical keyword יש להשתמש בערך תקני תלוי-`dir`.
- אין לפגוע ב-lazy loading ובתקציב הביצועים של §8.
- focus נשאר token-driven ובניגודיות AA לפי §9.
- ערכי צבע חזותיים נגזרים מטוקנים; מסמכי התיעוד משקפים את `css/tokens.css` לפי §10.2.
- אין שינוי ב-`index.html`, ב-contact/i18n או בשכבת mobile.

## 4. צעדים

- [x] לתקן gradient ו-transform origins ב-`css/sections/site-footer.css`.
- [x] להקשיח את תיאום טעינת Leaflet ב-`js/directions-map.js`.
- [x] לסנכרן את `PRODUCT.md` ואת `DESIGN.md` עם מערכת הנגישות הפעילה.
- [x] להריץ בדיקות תחביר ו-whitespace ממוקדות ולעיין ב-diff הסופי.

## 5. סיכוני עיצוב / רגרסיות

- כיוון underline שגוי בשפות LTR אם משתנה הכיוון לא יוגדר על `<html dir>`.
- בניית מפה כפולה עקב callbacks מקבילים או callback מאוחר אחרי `destroy()`.
- retry שלא עובד אם נשארו nodes כושלים ב-`<head>`.
- שינוי מסמכים מעבר לסנכרון הערכים עלול להרחיב scope ללא צורך.

## 6. אישור משתמש נדרש?

לא — מדובר בהקשחת תיקונים שכבר אושרו, ללא שינוי חזותי מכוון.

**Completed:** 2026-07-21
