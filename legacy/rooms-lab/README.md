> ## ⛔ ARCHIVED (2026-06-22) — לא אושר
> ניסוי שהוחלט **לא לאשר ולא למזג**. הועבר ל-`legacy/rooms-lab/` כשמירה היסטורית
> בלבד. **לא מחובר לאתר, לא מוגש חי.** הנתיבים המוחלטים בפנים (`/rooms-lab/...`,
> `base: /rooms-lab/...`) מתייחסים ל-mount המקורי ולא עודכנו (אין צורך — לא רץ).
> סקשן ה-`#rooms` בפרודקשן נשאר כפי שהיה (play-in-place door.mp4, ללא שינוי).

# rooms-lab — דלת חדרי-נופש מגוללת + מעבר מואר (sandbox)

ניסוי מבודד (כמו `hero-lab/`) שמחליף את אנטרי הדלת של סקשן `#rooms` בגישה חדשה,
**בלי לגעת בקוד הפרודקשן**. ~~אם המשתמש יאשר — ממזגים לאתר.~~ (לא אושר — ראה באנר.)

תצוגה: מגישים את שורש הריפו ונכנסים ל-**`/rooms-lab/`**.

```bash
# מ-GAMOS-SITE/
npm run encode:door-lab     # פריימים + דגימת הצבע המואר (פעם אחת)
npm run build:rooms-lab     # עותק הגלריה (React/Vite) → rooms-lab/gallery/dist/
npx serve . -p 8000         # → http://localhost:8000/rooms-lab/
```

## מה זה

שני חצאים, על שני צידי הניווט — בדיוק כמו אנטרי הדלת המקורי, אבל הפוך מבחינת חוויה:

### צד עמוד-הדלת (`index.html` + `css/rooms-lab.css` + `js/door-scrub.js`)
- סקשן `.door-scene` עם sticky 100vh על spacer של 800vh, מיפוי גלילה→פריים ב-**ease-in**
  (`END_ACCEL=1.9` ב-`door-scrub.js` — פתיחה איטית בהתחלה, מאיצה לקראת הסוף) — **תוך כדי גלילה הדלת
  נפתחת** (canvas-frames scrub של הקליפ `video_Seedance2.0_r2v_00003_.mp4`), בדיוק
  כמו הסקשן הקולינרי. שימוש-חוזר ב-`/js/canvas-frame-renderer.js` ו-`/assets/vendor/gsap.min.js`
  של האתר (read-only) — אותו sliding-window decode + zoom + pointer-parallax.
- **בסוף הגלילה** (`progress ≥ 0.985`) ה-`.lit-veil` מציף את **הצבע המואר** ואז ניווט
  אוטומטי אל הגלריה — בלי הבזק שחור.
- `prefers-reduced-motion` / no-JS / כשל manifest → הדלת מציגה פריים סופי סטטי, וה-cue
  הוא `<a>` אמיתי שמנווט בלחיצה.

### צד הגלריה (`gallery/` — עותק מלא של `rooms/`)
- עותק 1:1 של תת-אפליקציית הקיר המעוקל, עם שני שינויים בלבד:
  1. `vite.config.ts` `base: "/rooms-lab/gallery/dist/"`.
  2. `src/intro/IntroGate.tsx` — ה-cover מתחיל מ**הצבע המואר** (`#dda86b`) במקום
     `ink-deep`, ודועך אל הקיר. כך הכניסה לגלריה מוארת, ממשיכה ישירות את ה-veil
     של עמוד הדלת — אין הבזק שחור.
- שאר הגלריה (כולל `Engine.ts` clear-color ink-deep) נשאר כפי שהוא — הקיר עצמו כהה
  בעיצוב; רק **ההנדאוף** מואר.

## הצבע המואר

`#dda86b` — האור הזהוב-חם הנראה **דרך פתח הדלת** (האור שנכנסים אליו), לא ממוצע הפריים
הכהה. זהו ערך **מאושר-משתמש** (2026-06-22) שחי כ-`LIT_COLOR` ב-`scripts/encode-door-frames.mjs`
(מקור-אמת יחיד), והסקריפט גם דוגם את אזור פתח-הדלת בפריים האחרון כ-sanity-log. אם
מחליפים צבע — מעדכנים את `LIT_COLOR` שם + `--lit` ב-`css/rooms-lab.css` +
`gallery/src/intro/IntroGate.tsx`, ובונים מחדש.

## נכסים

- `assets/frames/door/` — 193 webp (1920×1080, q90 smartSubsample) + `manifest.json` (כולל `litColor`).
- `assets/door-poster.webp` — פריים ראשון (פוסטר).
- מקור הקליפ (READ-ONLY, §7): `../GAMOS-DOCS/תמונות לאנימציית האתר/חדרי נופש 2/video_Seedance2.0_r2v_00003_.mp4`.

## ⚠️ Governance

- **§2** אוסר Lenis/CDN בליבה → הניסוי **לא** משתמש ב-Lenis; הוא משתמש חוזר במנגנון
  ה-canvas-frames + GSAP self-hosted הקיים (כמו קולינריה).
- **§2.1** — עותק הגלריה הוא תקדים-ניסוי מבודד (כמו `hero-lab/`), נשלט דרך
  `window.location` בלבד; לא מיובא לליבה. הקידום לפרודקשן הוא צעד נפרד ומתועד.
- שום שינוי ב-`index.html` הראשי / `css/` / `js/` / `assets/` — הכל תחת `rooms-lab/`
  (+ שתי שורות script ב-`package.json` השורשי: `encode:door-lab`, `build:rooms-lab`).

## Merge checklist (רק אחרי אישור)

1. קידוד פריימי הדלת אל `assets/frames/door/` (scene חדש ב-`scripts/encode-frames.mjs`,
   אולי ב-1920).
2. `index.html` `#rooms`: להחליף את הדלת-הסטטית + `js/rooms-door.js` play-in-place
   ב-scroll-scene `data-scrub-mode="canvas-frames"` (להשבית את `rooms-door.js`
   ל-self-no-op, §2.1 כלל 6).
3. `css/sections/rooms.css` `.rooms-door-veil` background → `litColor`.
4. `rooms/src/intro/IntroGate.tsx` cover background → `litColor`; `npm run build:rooms` + `build:mobile`.
5. לעדכן Constitution §3 (sections after #hero / hero concept) ו/או §2.1 + maintenance row.
