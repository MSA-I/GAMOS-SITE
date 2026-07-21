# קומיט ופריסת סבב Impeccable לפרודקשן

**Status:** in-progress
**Category:** fixes
**Created:** 2026-07-21
**Author agent:** Codex
**Related:** `PLANS/fixes/2026-07-21_resume-impeccable-session.md`; `scripts/deploy-cloudflare.mjs`

---

## 1. הקשר ומטרה

לשמור את השינויים המאומתים מהסשן המשוחזר בקומיט אחד, לדחוף ל-`origin/main`,
ולפרוס דרך מסלול Cloudflare Pages הקיים של הפרויקט.

## 2. תוצאה רצויה (Definition of Done)

- [ ] הקומיט כולל רק קוד, מדיה ותיעוד השייכים לסבב; state מקומי לא נכנס.
- [ ] build מלא עובר לפני דחיפה.
- [ ] הקומיט נדחף בהצלחה ל-`origin/main`.
- [ ] `npm run deploy:cf:prod` מסתיים בהצלחה.
- [ ] האתר החי נטען ומציג fingerprint מהשינוי הנוכחי ללא שגיאות נכס.

## 3. אילוצים מה-Constitution

- `mobile/index.html`, `halls/dist/` ו-`rooms/dist/` נוצרים דרך ה-build בלבד.
- הפריסה משתמשת ב-pipeline הקיים; אין ספק פריסה נוסף.
- אין לצרף `.hermes/`, credentials או scratch מקומי.

## 4. צעדים

- [ ] לסקור diff, קבצים לא-מנוהלים והפניות לנכסים.
- [ ] להריץ build מלא ושערי sanity לפני staging.
- [ ] לבצע staging מפורש, לבדוק staged diff וליצור commit.
- [ ] לדחוף ולפרוס לפרודקשן.
- [ ] לאמת את ה-URL החי ולעדכן תוכנית זו ל-`done`.

## 5. סיכוני עיצוב / רגרסיות

- קובץ מקומי לא רצוי עלול להיכנס לקומיט רחב.
- build של halls/rooms עשוי לשנות artifacts נוספים; הם ייבדקו לפני commit.
- פריסת Cloudflare עלולה להצליח אך להציג cache ישן; נדרש fingerprint חי.

## 6. אישור משתמש נדרש?

לא — המשתמש ביקש במפורש commit, push ופריסה לאתר החי.
