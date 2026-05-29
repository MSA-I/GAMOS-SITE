# 🛑 HANDOFF — קרא לפני שאתה ממשיך את הפרויקט

> **לסוכן הבא:** עצור. אל תתחיל לקודד עד שתקרא את המסמך הזה במלואו ואת §3 שלו.
> פתחתי כאן את השרשור על הפרויקט הזה ב-2026-05-29. עזבתי במצב מבוקר עם **שאלות
> פתוחות שדורשות תשובת משתמש לפני שמותר להמשיך לפיתוח**. אם תדלג על השאלות,
> אתה תיישם ארכיטקטורה שעלולה לסתור את כוונת המשתמש.

---

## 1. מצב הפרויקט בקצרה (2026-05-29)

הפרויקט הוא בנייה מחדש של [gamos.co.il](https://gamos.co.il/) כאתר HTML/CSS/JS וונילה
עם חוויית גלילה קולנועית. ראה `CLAUDE.md` (Constitution) ו-`PROGRESS_SUMMARY.md`
לפרטים מלאים. בסשן הזה הושג:

- ✅ **השוואה מלאה קוד ↔ תוכנית ↔ מסמך התקדמות.** מוצעקות בשלוש סתירות קריטיות (§4 כאן).
- ✅ **תוכנית הבאה לאישור** ב-`PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md`.
- ✅ **גילוי פער ארכיטקטוני מרכזי שלא תועד באף מסמך:** המשתמש ביקש במקור scroll-video שחוזר
  **ב-4 מקומות** (Hero / ריזורט / אולם / קולינריה), אבל החוקה ו-10 הסוכנים יישמו רק hero יחיד.
  זוהי בקשה מקורית שנשמטה.
- ✅ **אפיון הרעיון** ב-`architecture/scroll-video-system.md` (לא Constitution change עדיין —
  מחכה לתשובות לשאלות הפתוחות).
- 🟡 **לא בוצע קוד עדיין.** כל ה-Phase A (הסרת GSAP) ממתין לסגירת השאלות הפתוחות,
  כי הן משנות את ה-architecture של ה-scroll engine.

---

## 2. השאלות הפתוחות (חובה לקבל תשובות לפני קוד)

חמש השאלות מ-`architecture/scroll-video-system.md §6`. **אסור להתחיל ב-Phase A
לפני שיש תשובות לפחות ל-#1, #2, #5** (אלה שמשפיעות על הארכיטקטורה).

### Q1 — אולם: איזו אסטרטגיית רינדור? (חוסם)
אין וידאו מקור לאולם — רק 15 PNG/JPG ב-`תמונות לאנימציית האתר/אולם 3/`.
אופציות (ראה `architecture/scroll-video-system.md §5.3`):
- **A. Ken Burns** — לרצף 6-8 תמונות עם pan+zoom איטי, לקודד כ-MP4 (ffmpeg `zoompan`).
- **B. Slideshow scroll-driven** — scroll מחליף תמונות בלי וידאו (opacity crossfade).
- **C. Remotion** — לרנדר הרכבה (דורש הפעלת `remotion-best-practices` skill לפי §7.1).
- **D. דחיית האזור** — אולם נשאר עם תמונה סטטית; שאר 3 אזורים יוצאים לדרך.
- **E. AI gen** — Seedance/Runway על תמונות אולם.

**המלצה:** A או B (מהיר, נמצא בתחום הקיים, אפס תלויות).

### Q2 — אורך/קצב ה-scrub
האם 300vh (~3-4s גלילה) זה ה-feel הנכון, או:
- ארוך/דרמטי: 500vh
- קצר/snap: 150vh
- אחר?

### Q3 — טקסט על הוידאו
האם הכותרות (ריזורט/אולם/קולינריה) מופיעות **על** הוידאו (כמו ב-hero) או **לפני/אחרי** (תוכן סטטי לפני/אחרי scrub)?

### Q4 — ניווט בין הסצנות
- (a) קפיצות עוגן ישירות לכל סצנה (`#hall-resort` וכו'), או
- (b) רצף לינארי (משתמש גולל דרך כל ה-4 ברצף)?

### Q5 — Mobile budget
4 וידאו = ~25MB. במובייל זה כבד.
- (a) מובייל מקבל רק poster + autoplay-loop קצר (לא scrub), המלא לדסקטופ.
- (b) מובייל מקבל את ה-scrub המלא.
- (c) מובייל מקבל גרסה דחוסה (480p, ≤2MB לוידאו).

---

## 3. אם המשתמש ענה על השאלות — מה לעשות

1. **לעדכן Constitution `CLAUDE.md` §3** (Hybrid Concept) לתאר 4 מופעי scroll-video. להוסיף שורת Maintenance Log §12.
2. **לעדכן** את התוכנית `PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md` — להוסיף **Phase B+** (וידאו pipeline ל-resort/אולם/culinary) ולקשח את **Phase A** (orchestrator מרכזי הוא חיוני יותר עכשיו).
3. **להתחיל Phase A** של התוכנית: הסרת GSAP, native scroll+RAF, בניית `scroll-orchestrator.js`. רק אז אפשר להמשיך לסקציות.

> **אזהרה:** אל תתחיל Phase B/C מהתוכנית הקיימת לפני Phase A. המסמכים טוענים ש-GSAP הוסר אבל
> זה שקר — הקוד עדיין מייבא GSAP מ-CDN ב-top-level, וכשל CDN יפיל את כל ה-JS. ראה §4 #1 כאן.

---

## 4. שלוש סתירות קוד ↔ מסמכים שגיליתי (חשוב לדעת)

### #1 — Hero engine: המסמכים סותרים את הקוד ⚠️ קריטי
- מסמכים (`Constitution §3`, `§12`, `PROGRESS_SUMMARY.md:72,110`) טוענים: *"GSAP הוסר → native scroll+RAF"*.
- **בפועל** `js/hero-video-scrub.js:12-15,65` עדיין `import gsap from skypack...` ומשתמש ב-`ScrollTrigger.create()`. הריפקטור **לא בוצע**.
- `js/main.js:12-13` מייבא GSAP top-level → כשל CDN מפיל hero/portals/reveals/accordions/slider.
- **החלטת משתמש (2026-05-29):** לכבד את החוקה → להסיר GSAP לגמרי, native scroll+RAF.

### #2 — markup ↔ CSS class mismatch 🔴 חוסם רינדור (לא תועד באף מסמך)
שלוש סכימות BEM שונות חיות במקביל; הסקציות hall/about/contact מרונדרות **כמעט ללא עיצוב**:

| סקציה | ב-`index.html` | ב-CSS | תוצאה |
|---|---|---|---|
| Halls | `.hall__media`, `.hall__features` | `hall-venue.css` מגדיר `.hall-venue__split/__gallery` | אולמות בלי עיצוב |
| About | `.about__stats` > `.about__stat` > dt/dd | `.about__stat-num/__stat-label` | סטטיסטיקות בלי עיצוב |
| Contact | `.contact__grid/__details/__channels` | `.contact__container/__info` | טופס מעוצב חלקית |

טיקט `F-03` נטען "תוקן" אבל רק חלקית.

### #3 — reveal system כפול
- `hall-venue.css` משתמש ב-class (`.reveal-fade-up`/`.reveal-mask`).
- `motion-reveals.css` + `js/reveals.js` משתמשים ב-attribute (`[data-reveal]`).
- לתקנן על `[data-reveal]`.

### Bonus — מה שהמסמכים טוענים שחסום אבל בפועל **קיים** ✅
Assets קיימים על דיסק (בניגוד ל-`progress.md`/`findings.md` הישנים): 8 פונטי WOFF2 (176KB),
hero-master MP4 (5.9+1.5MB), portal-loop (276KB), brand images, ו-**60 תמונות אולמות + 13 קולינריה**
מאופטמות (`NN.full.webp`/`NN.half.webp`).

---

## 5. החלטות המשתמש שכבר התקבלו (לא צריך לשאול שוב)

- ✅ **GSAP יוסר לגמרי** מטובת native scroll + RAF (Q של סשן זה).
- ✅ **DoD מלא** (§11) הוא היעד — לא ביניים אסתטי.
- ✅ **טופס "צור קשר" = WhatsApp + mailto בלבד**, אין backend.
- ✅ **לשוניות חסרות** (גלריה / אירועים עסקיים / נגישות / מפה) — לבנות עכשיו כסקציות עוגן.
- ✅ **התוכנית נשמרת** ב-`PLANS/refactors/`.
- ✅ **4 מקומות = Hero / ריזורט / אולם / קולינריה** (לא lounge/חדרים).
- ✅ **וידאו זמין:** Hero ✓, ריזורט (חומר גלם) ✓, קולינריה ✓. **אולם:** רק PNG → דורש Q1.

---

## 6. מפת מסמכים קריטיים — איפה לקרוא מה

| מסמך | למה זה |
|------|--------|
| `CLAUDE.md` ⭐ | Constitution. החוק. §3 לקונספט hero, §10 ל-invariants, §12 Maintenance Log. |
| `architecture/scroll-video-system.md` ⭐ NEW | האפיון של 4 ה-scroll-videos שכתבתי. **חובה קריאה לפני המשך.** |
| `PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md` ⭐ | התוכנית הראשית להמשך (לפני האפיון של 4 הסצנות). |
| `PROGRESS_SUMMARY.md` | סיכום התקדמות עד 2026-05-28 (חלקית מטעה — ראה §4 כאן). |
| `architecture/video-scrub-spec.md` | spec ה-scrub המקורי (hero בלבד). |
| `PLANS/research/2026-05-28_master-rebuild-plan.md` | תכנון המקורי של 10 הסוכנים. |
| `PLANS/research/2026-05-28_site-content-map.md` | תוכן+פרטי קשר אמיתיים מ-gamos.co.il (טל' `077-9972343`, מייל `office@gamos.co.il`, כתובת `די זהב 7, פארק ישראל מעלה אדומים`). |
| `PLANS/fixes/2026-05-28_*.md` | 13 טיקטי F-01..F-13 (חלקם מוחזקים מתוקנים אבל לא). |
| `agent-plans/agent-NN_*.md` | תוכניות 10 הסוכנים המקוריים. |
| `.tmp/hall-html-stubs.md` + `.tmp/reveal-attribute-injections.md` | מדריכי אינטגרציה מוכנים (אבל שמות תמונות בהם — `hero-1920.webp` — **לא תואמים לדיסק**; הדיסק הוא `NN.full.webp`). |
| `js/hero-video-scrub.js` | הקוד של ה-hero scrub (כרגע על GSAP — לפני ריפקטור). |
| `js/main.js` | Entry point. נשען על GSAP top-level (חולשה — צריך להסיר). |
| `index.html` | 14 anchor sections, RTL מלא. |
| `css/tokens.css` | Single source of truth לעיצוב. |

---

## 7. מה אסור לעשות (ללא אישור משתמש)

- ❌ למחוק `b`, `0.92.,`, `remotion/remotion/` (קבצי זבל אבל המשתמש לא אישר מחיקה).
- ❌ להוסיף framework / 3D / Tailwind runtime (Constitution §2).
- ❌ לכתוב ל-`remotion/` בלי הפעלה מפורשת של skill `remotion-best-practices` (Constitution §7.1).
- ❌ להפעיל את `.tmp/run-asset-pipeline.{ps1,sh}` בלי בדיקה (הוא חופף לקבצים שכבר על דיסק).
- ❌ להתחיל קוד לפני סגירת השאלות ב-§2 כאן.
- ❌ להוסיף Co-Authored-By לקומיטים (Constitution: עד שיש `attribution.commit` ב-settings.json).

---

## 8. הצעד המיידי הבא לסוכן הקורא את זה

1. אמת קריאה: `cat HANDOFF.md`, `cat architecture/scroll-video-system.md`, `cat CLAUDE.md`.
2. בדוק את הקוד עצמו לוודא שהסתירה #1 (§4) עדיין תקפה: `head -20 js/hero-video-scrub.js` — אם עדיין יש `import gsap from "https://cdn.skypack.dev/..."` — הסתירה תקפה.
3. שאל את המשתמש את 5 השאלות מ-§2 (אפשר ב-`AskUserQuestion`, אחת-אחת או בקבוצה).
4. עם תשובות → עדכן Constitution + תוכנית → התחל Phase A (הסרת GSAP).
5. **אסור לקודד לפני סעיפים 1-3.**

---

**Last update:** 2026-05-29 by main agent.
**Next agent:** ראה §8.
