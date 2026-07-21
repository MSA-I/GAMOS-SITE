# אימות חזותי משולב — המשך סשן ביקורת GAMOS

**Status:** done
**Category:** fixes
**Created:** 2026-07-21
**Author agent:** verification-map
**Related:** `index.html`, `mobile/index.html`, `.tmp/qa-resume.mjs`, Constitution §3/§4/§8/§9/§13

---

## 1. הקשר ומטרה

הסשן הקודם הוסיף תיקוני נגישות ופוטר, ונעצר לפני השלמת מסרי ההירו,
הבלטת הכשרות ומצבי טופס הקשר. לאחר איחוד השינויים נדרש שער קבלה אחד שבודק
את התוצאה האמיתית בדפדפן, בדסקטופ, במובייל הייעודי ובמצב reduced-motion.

## 2. תוצאה רצויה (Definition of Done)

- `npm run build:i18n` ו-`npm run build:mobile` הושלמו לפני הרצת הבדיקה.
- אפס `console.error` ואפס `pageerror` בשלושת ה-contexts.
- אין overflow אופקי, תוכן reveal אינו נשאר מוסתר, ויעדי מגע רלוונטיים בגודל 44px לפחות.
- משפט המיצוב המדויק נראה בהירו, SplitText וה-scrub ממשיכים לעבוד.
- מידע הכשרות נמצא מוקדם ב-`#why-gamos` וגם בפירוט של `#contact`.
- מצבי שגיאה והצלחה של הטופס נראים ונגישים, ללא פתיחת WhatsApp אמיתי בבדיקה.
- הפוטר שלם, נגיש, מתורגם, וכפתור החזרה למעלה עובד.
- טקסטים חדשים נבדקים ב-HE, EN ו-FR ללא נפילה לעברית בשפות הזרות.
- נשמרים צילומי hero / why-gamos / contact / footer לכל viewport רלוונטי.

## 3. אילוצים מה-Constitution

- אין שינוי ב-`js/hero-scene.js` או בכוריאוגרפיית §3 במסגרת משימת האימות.
- המובייל נבדק דרך `/mobile/` שנוצר מ-`index.html`, לא באמצעות הזרקת CSS ידנית.
- reduced-motion חייב להציג מצב סופי וקריא, ללא תוכן שקוף.
- האימות החזותי משלים assertions אוטומטיים ואינו מוחלף בהם.
- קבצי scratch נשמרים ב-scratchpad של הסשן; אין כתיבה לקבצי source.

## 4. צעדים

- [x] ליצור תוכנית אימות זו לפני כתיבת הקוד.
- [x] ליצור `.tmp/qa-resume.mjs` עם שלושת ה-contexts ושערי הקבלה.
- [x] לאחר השלמת היישום: להריץ build:i18n ו-build:mobile.
- [x] להשתמש בשרת הסטטי הקיים על פורט 8000 ולהריץ את ה-harness.
- [x] לבדוק את הצילומים מול רפרנסי הסשן הקודם ולתעד pass/fail.

## 5. סיכונים ובדיקות רגרסיה

- SplitText משנה את DOM הכותרת; בדיקת טקסט חייבת להשתמש ב-`textContent` מנורמל.
- מעבר שפה אסינכרוני; יש להמתין ל-`html[lang]` ולתרגום בפועל.
- `window.open` בטופס חייב להיות stub כדי שהבדיקה לא תיצור side effect חיצוני.
- גלילה עם Lenis אינה מיידית; assertions משתמשים ב-hook של האתר או ב-scroll native
  וממתינים לעדכון ScrollTrigger.
- תמונות section גדולות דורשות timeout סביר, אך כשלי נכס/קונסולה נשארים כשל קבלה.

## 6. אישור משתמש נדרש?

לא עבור כתיבת והרצת שער הקבלה. אישור חזותי של התוצאה הסופית נשאר אצל המשתמש.

## 7. תוצאה

- `.tmp/qa-resume.mjs`: **197/197** assertions עברו.
- contexts: desktop 1440×900, mobile 390×844, reduced-motion mobile.
- HE/EN/FR: שגיאות, success וגוף הודעת WhatsApp מותאמים לשפה הפעילה.
- screenshots נבדקו בפועל: hero, why-gamos, contact error/success ו-footer.

**Completed:** 2026-07-21
