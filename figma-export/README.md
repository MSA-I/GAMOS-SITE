# GAMOS → Figma — Runbook

מדריך להעברת אתר Gamos (HTML/CSS/JS וונילה) אל **Figma**, כדי שמעצב/ת יוכלו לעבוד
עליו עם Variables אמיתיים, פריסות, ומדיה. הצינור בריפו מייצר את כל הקלט אוטומטית;
שלב הייבוא ל-Figma עצמו הוא **ידני** — אין כלי שדוחף עיצוב קוד חי ל-Figma.

> מקור התוכנית: `C:\Users\art1\Desktop\תוכניות לאתר\FIGMA 1.PNG` + `FIGMA 2.PNG`.

---

## מה הצינור מייצר (אוטומטי)

```bash
npm run export:figma
```

מריץ שלושה סקריפטים (אפס תלויות npm, vanilla Node):

| סקריפט | פלט |
|--------|-----|
| `scripts/export-figma-tokens.mjs --self-check` | `figma-export/tokens.json` — כל הטוקנים מ-`css/tokens.css` בפורמט Tokens Studio / W3C (`$value`/`$type`), עם aliases ל-`var()` semantic |
| `scripts/export-figma-media.mjs` | `figma-export/media/` — 5 שכבות-הירו (PNG), וידאו קולינריה + 8 keyframes |
| `scripts/export-figma-images.mjs` | `figma-export/site-images/` — **מראָה** של כל תמונות האתר; **ואז מסנכרן את כל החבילה** (README + tokens + media + site-images) ל-`..\GAMOS-DOCS\FIGMA-EXPORT\` |

**רענון = מראָה מלאה:** כל הרצה בונה את `site-images/` מאפס ומסנכרנת ל-GAMOS-DOCS עם
prune — כך תמונה שמחקת מהאתר נעלמת אוטומטית מהחבילה, ותמונות חדשות נכנסות. אין צורך
בהעתקה ידנית. ⚠️ תמונות תת-האפליקציות נשאבות מ-`halls/dist/images` + `rooms/dist/images`
(הפלט הבנוי) — אם שינית תמונות-מקור שלהן, הרץ `npm run build:halls` / `build:rooms` **לפני** הרענון.

ה-screenshots פר-סקציה + מצבי-הירו נוצרים בנפרד (דורש שרת רץ):

```bash
npm run dev:fast                      # מגיש את האתר ב-http://localhost:8000
node scripts/export-screenshots.mjs   # → D:\GAMOS-screenshots-tmp\
```

מפיק 14 סקציות + 3 דפי legal + מצבי scrub של ההירו `hero-p000…hero-p100`.

> `figma-export/tokens.json`, `media/` ו-`site-images/` מוחרגים מ-git (פלט מחושב + כבד).
> הקובץ הזה (`README.md`) כן נשמר.

> **חבילת GAMOS-DOCS\FIGMA-EXPORT\** (לעיצוב, מחוץ ל-git) היא היעד הסופי שאליו
> `npm run export:figma` מסנכרן הכל. היא כוללת את `site-images/` עם **כל התמונות
> שבשימוש באתר**: `assets/images/` (root), אייקונים תחת `_misc`, ותמונות ה-sub-apps
> halls/rooms תחת `_halls-app`/`_rooms-app`. זהו כל מאגר הוויזואל לייבוא ל-Figma.

---

## ייבוא ל-Figma (ידני — צעד-אחר-צעד)

1. **הרצה מקומית:** `npm run dev:fast` → `http://localhost:8000`.
2. **התקנת תוספים ב-Figma:** [html.to.design](https://html.to.design) **Pro** (פריסות) +
   [Tokens Studio](https://tokens.studio) **Pro** (Variables). Pro נדרש כדי לייבא מ-localhost
   layered וללא watermark.
3. **ייבוא פריסה:** דרך html.to.design, על כל route בנפרד, **viewport 1440** (דסקטופ)
   ו-**390** (מובייל, דרך `/mobile/`):
   - `/` (דף הבית)
   - `/halls/dist/events/` · `/halls/dist/resort/`
   - `/rooms/dist/`
   - `/legal/privacy.html` · `/legal/terms.html` · `/legal/accessibility.html`
   - `/press/`
4. **ייבוא טוקנים:** Figma → Tokens Studio → Import → `figma-export/tokens.json` →
   Create Variables/Styles. ה-aliases (`{color.brass}` וכו') משחזרים את שכבת ה-semantic.
5. **חלקי-תנועה (מדיה):**
   - גרירת `figma-export/media/culinary.mp4` כ-**video-fill** ל-frame הקולינריה;
     ה-`culinary-keyframe-01..08.webp` משמשים כשכבות-רפרנס לפריימים מפתח.
   - הרכבת **שכבות-ההירו** כ-frame לפי סדר z (מלמטה למעלה):
     `hero-layer-0-sky` → `1-subject` → `2-clouds` → `3-smoke`, ו-`4-logo` כ-outline.
     בנו prototype עם **Smart Animate** בין מצבי ה-scrub (`hero-p000…p100`) כדי לדמות את העלייה.
   - **מעבר הדלת (`#rooms`):** אין וידאו — זו אנימציית CSS. השתמשו ב-screenshot הסטטי.
     ה-seam לסרטון עתידי מתועד ב-`rooms/src/intro/README.md`.

---

## אזהרות + צ'ק-ליסט ידני

**מה לא עובר ל-Figma אוטומטית** (דורש שחזור ידני / prototype):
- scroll-scrub של ההירו (500vh pinned) — מתקבל כסדרת מצבים סטטיים + Smart Animate.
- WebGL / Three.js (Depth Gallery ב-halls, image-wall ב-rooms) — סטטי בלבד.
- React state ותנועה דינמית ב-sub-apps.

**מה לבדוק אחרי הייבוא:**
- `dir="rtl"` — הפריסה צריכה לזרום מימין לשמאל.
- פונט עברי — Rubik (display) + Heebo (body); ודאו שלא נפל ל-fallback.
- mask-text של הלוגו (טקסט בטקסטורה דרך `background-clip`) — לרוב מגיע כתמונה שטוחה.
