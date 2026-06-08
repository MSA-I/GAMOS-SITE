# exports/site-content/

מיפוי מלא של תוכן האתר (טקסטים, כותרות, alt-tags, ציטוטי לקוחות, פרטי
קלפי halls, עמודי משפטיים) לסקירה ע"י מי שלא קורא קוד. הקבצים כאן הם
**artefacts** מיוצרים — לא לערוך ידנית.

## קבצים

| קובץ | תיאור |
|---|---|
| `GAMOS-SITE-תוכן.xlsx`     | ספר Excel עם 8 גיליונות RTL (סקירה · תפריט · עמוד הבית · אולם · ריזורט · המלצות · טופס · משפטיים), בעיצוב במותג. |
| `GAMOS-SITE-תוכן.docx`     | מסמך Word אחד עם תוכן עניינים, פרקים מסודרים, וטבלאות פנימיות. עוצב בצבעי גאמוס (brass/cocoa/ivory). |
| `GAMOS-SITE-תוכן-מלא.txt`  | גרסת ASCII פשוטה עם אותו תוכן — נוחה לחיפוש מהיר ב-grep / Notepad. |

## רענון אחרי שינוי תוכן

הסקריפט שמייצר את שלושת הקבצים שמור ב-`scripts/export-content.py`.
תלויות (Python): `openpyxl`, `python-docx`.

```bash
python scripts/export-content.py
```

הוא יכתוב גם לתיקייה זו וגם ל-Desktop של המשתמש הנוכחי (לנוחות).

## מקורות התוכן (source of truth)

- `index.html` — סקציות עמוד הבית (סדר DOM הוא הסדר במסמכים).
- `legal/{privacy,terms,accessibility}.html` — חלק 6 במסמכים.
- `halls/src/projectsData.ts` — 12 קלפי האולם והריזורט.
- `js/contact-form.js` — הודעות validation + feedback.
- `js/side-dot-nav.js` — תוויות ניווט הנקודות.
- `js/loading-overlay.js` — טקסט שכבת הטעינה.

עדכן את ה-source ואז הרץ את הסקריפט מחדש; אל תערוך את ה-`.xlsx`/`.docx`/`.txt`
ידנית.
