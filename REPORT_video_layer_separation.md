# דו"ח מחקר — הפרדת סרטון לשכבות (Video Layer Separation)

**תאריך:** 2026-05-28
**מבצע:** main agent (Claude)
**מטרה:** לבדוק אם ניתן לפרק סרטון קיים (`ריזורט 1/1.5.mp4`) לשכבות נפרדות
(רקע / חזית / מסכה) כך שניתן יהיה לערוך אותן עצמאית בעתיד —
למשל להחליף את הרקע, להחדיר תוכן בתוך "פורטל", או להסיר אובייקטים.
**Scope:** מחקר בלבד. לא מהווה החלטת ארכיטקטורה לאתר הסופי (§2 עדיין נעול
על HTML/CSS/JS וונילה ללא frameworks).

---

## 1. שאלת המחקר

> "האם ניתן לקחת MP4 שכבר קיים ולפרק אותו לשכבות (רקע / חזית) באופן אוטומטי,
> כדי שאפשר יהיה לערוך כל שכבה בנפרד — להסיר רקע, להחליף תוכן בתוך פורטל,
> וכו'?"

---

## 2. תקציר ממצאים (TL;DR)

**כן — אפשר.** הצליח באופן end-to-end על הסרטון `1.5.mp4`:

- 241 פריימים ב-1920×1080 24fps עברו סגמנטציה אוטומטית.
- התקבלו שלוש שכבות תקפות: רקע נקי, חזית עם אלפא אמיתי, מסכת אלפא.
- הזמן הכולל לעיבוד: **~13 דקות** ל-10 שניות וידאו בלי GPU.
- כל הפלטים זמינים גם כרצפי PNG (לעריכה מלאה) וגם כווידאו (`background.mp4`,
  `foreground.webm` עם אלפא, `mask.mp4`).
- התוצאה ניתנת לחיבור חוזר ב-Remotion / AE / Premiere / DaVinci כשלוש שכבות.

**אבל — יש מגבלות איכות חשובות** (סעיף 6) שצריך לקחת בחשבון לפני שמשלבים
את הטכניקה בפרודקשן.

---

## 3. הצינור (Pipeline)

```
1.5.mp4 (1920×1080 / 24fps / 10s / 241 frames)
   │
   ▼  ffmpeg (bundled מ-remotion node_modules)
[ frames_raw/*.png ]   ← 241 PNG מקוריים, ~797MB
   │
   ▼  rembg + isnet-general-use (179MB ONNX)
[ foreground_rgba/*.png ]  ← RGBA, חזית עם אלפא, ~188MB
[ alpha_mask/*.png ]       ← Grayscale, מסכה, ~17MB
   │
   ▼  OpenCV inpainting (Telea, kernel 9px, dilate 2)
[ background_clean/*.png ] ← הרקע נקי אחרי מילוי החור, ~545MB
   │
   ▼  ffmpeg encode
background.mp4    H.264, yuv420p, CRF 16   →  ~5.8MB
foreground.mov    ProRes 4444 + alpha     →  ~219MB
foreground.webm   VP9 + alpha (yuva420p)   →  ~2.4MB
mask.mp4          H.264 grayscale          →  ~0.9MB
```

---

## 4. כלים ומיקום

| כלי | גרסה | תפקיד | מיקום |
|----|------|--------|-------|
| Python | 3.14.4 | רנטיים | `C:\Python314` |
| venv | — | סביבה מבודדת | `D:\משה פרוייקטים\AI\video-layers\venv` |
| rembg | 2.0.75 | סגמנטציה (פרונט/רקע) | venv |
| onnxruntime | 1.26.0 | מנוע מודל | venv (CPU only) |
| isnet-general-use.onnx | — | המודל עצמו (179MB) | `D:\משה פרוייקטים\AI\video-layers\models\` |
| opencv-python | 4.13 | inpainting + I/O | venv |
| ffmpeg | 6.0 | extract + encode | bundled ב-`remotion/node_modules/ffmpeg-static/` |

**הסקריפטים:**
- `D:\משה פרוייקטים\AI\video-layers\segment_frames.py` — שלב הסגמנטציה.
- `D:\משה פרוייקטים\AI\video-layers\inpaint_background.py` — שלב ה-inpainting.

**הערות חשובות לסביבה Windows + עברית:**
1. נתיבים עם עברית **שוברים את `cv2.imread`/`cv2.imwrite`** — חובה
   `np.fromfile` + `cv2.imdecode` / `cv2.imencode` + `tofile`.
2. משתנה הסביבה `U2NET_HOME` הוגדר אל `D:\משה פרוייקטים\AI\video-layers\models`
   כדי למנוע הורדה אוטומטית ל-`%USERPROFILE%`.
3. ffmpeg רגיש לסדר הפריימים — חשוב `-vsync 0` ב-extract וגם `-framerate 24`
   במקום `-r 24` ב-encode כדי שלא יוסיף/ידלל פריימים.

---

## 5. מדדים מדידים (10s @ 1080p, 241 פריימים, ללא GPU)

| שלב | זמן | קצב | הערות |
|-----|-----|-----|-------|
| Frame extraction | ~5s | ~50 fps | I/O bound |
| rembg segmentation | ~6:30 | ~0.6 fps | המודל הורד פעם אחת בלבד |
| OpenCV inpainting | ~6:15 | ~0.6 fps | Telea, kernel 9px |
| Encode background.mp4 | <30s | — | x264 slow CRF16 |
| Encode foreground.mov | <60s | — | ProRes 4444 (גדול אבל איכותי) |
| Encode foreground.webm | <60s | — | VP9 alpha, מתאים ל-web |
| **סה"כ** | **~13:00** | — | בלי GPU על Ryzen-class |

**גודלי פלט:**
- וידאו דחוס מוכן (3 שכבות): **~9MB** (background + foreground.webm + mask).
- רצפי PNG מלאים (לעריכה ידנית): **~1.55GB**.
- ProRes לעריכה מקצועית: **~219MB** (אופציונלי).

**הערכת סקיילינג:**
- 1 דקה וידאו 1080p ≈ 1440 פריימים → ~80 דקות עיבוד.
- עם GPU (CUDA/onnxruntime-gpu) הסגמנטציה תיפול לפקטור 5–10×.
- ה-inpainting הוא CPU בלבד עם OpenCV; אם נדרש שיפור, יש Stable-Diffusion-Inpaint
  או LaMa שנותנים תוצאות רחוקות יותר אבל איטיים בהרבה.

---

## 6. מגבלות איכות שזוהו

1. **Mask flicker (ריצוד מסכה).** rembg מעבד כל פריים עצמאית — ללא קוהרנטיות
   זמנית. בקצוות של החזית מופיע jitter מפריים לפריים. פתרון: להחליק את
   המסכה זמנית (Gaussian בלולאה לאורך הזמן) או להשתמש במודל וידאו ייעודי
   (XMem, RVM — Robust Video Matting).

2. **Inpainting פשטני.** Telea של OpenCV מקבל רקע מטושטש סביב החור;
   על גרדיאנטים פשוטים זה עובד נהדר, על מבנים עם פרספקטיבה (אריחים, חלונות)
   הוא ייצור smear. שדרוג: LaMa או SD-inpaint, אבל הזמן עולה ~×10.

3. **Soft fringes (קצוות שיער/שקיפות).** isnet-general-use הוא מודל סגמנטציה
   די "קשה" (binary alpha). שיער דק/נצנצים יחתכו. עבור רזולוציה גבוהה כדאי
   לשקול `BiRefNet` או `Matte Anything` (SAM-Matting).

4. **בחירת אובייקט.** rembg מחלץ "כל מה שנראה foreground". אין כאן בחירה
   של אובייקט ספציפי. אם בעתיד נצטרך להפריד דווקא את "המסגרת של הפורטל"
   ולא רק חזית כללית — צריך SAM (Segment Anything) עם קליק ידני אחד פר
   shot, או מודל instance-segmentation.

5. **קודק עם אלפא בדפדפן.** רק `WebM/VP9 + yuva420p` או `MOV/HEVC + alpha`
   נתמכים. `MP4/H.264` לא תומך באלפא. ל-Remotion/web יש להשתמש ב-`.webm`.

---

## 7. תוצאות ניתנות לבדיקה

**נתיב:** `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\ריזורט 1\1.5_layers\`

```
1.5_layers/
├─ frames_raw/                ← 241 PNG מקוריים
├─ foreground_rgba/           ← 241 PNG חזית + אלפא
├─ alpha_mask/                ← 241 PNG מסכה אפור-לבן
├─ background_clean/          ← 241 PNG רקע אחרי inpaint
├─ background.mp4             ← 5.8MB — רקע בלבד (h264)
├─ foreground.mov             ← 219MB — חזית עם אלפא (ProRes 4444)
├─ foreground.webm            ← 2.4MB — חזית עם אלפא (VP9 web)
├─ mask.mp4                   ← 0.9MB — מסכה כווידאו (h264 grayscale)
└─ README.txt                 ← הוראות שימוש
```

**אימות חי ב-Remotion Studio** (`http://localhost:3000`):
- `Resort1-5-PortalLayers` — שלוש השכבות מורכבות עם תוכן באמצע.
- `Resort1-5-BackgroundOnly` — רקע נקי בלבד (אימות שאין אובייקט "תקוע").
- `Resort1-5-ForegroundOnly` — חזית עם אלפא בלבד (אימות שקיפות אמיתית).

הסטודיו רץ עם hot-reload — כל שינוי בפרופס מתעדכן בלייב בדפדפן.

---

## 8. השלכות על האתר הסופי

האתר הראשי **לא** משתמש ב-Remotion ב-runtime — Remotion הוא כלי תפירה
build-time בלבד (§2). המשמעות עבור הצינור הזה:

- **בפרודקשן** — האתר ייצרך **רק** את `foreground.webm` (~2.4MB) ואת
  `background.mp4` (~5.8MB) כשני tags `<video>` רגילים, או יחבר אותם
  build-time ל-MP4 אחד עם שכבת פורטל מובנית.
- **שכבת ה"פורטל" באמצע** — תהיה DIV / SVG / Canvas רגיל ב-HTML, ממוקם
  z-index בין שני הסרטונים, כדי לקבל את אפקט הפורטל בלי שום framework.
- **תקציב §8 (Performance Budget):** שני סרטוני ה-1080p ביחד = ~8.2MB,
  גבולי ל-12MB cap. אם ייצרך — אפשר לקודד ב-720p (~50% חיסכון).

**המלצה:** הצינור הזה ראוי לסקציית ה-hero (סרטון 1.5 → פורטלים),
אבל רק אם **חוזרים על הבדיקה על סרטון אחר** עם תנועת מצלמה אינטנסיבית
יותר כדי לוודא שהמסכה לא ריצדת. אם כן — להוסיף שלב החלקה זמנית.

---

## 9. סטטוס Constitution

- §7 הורחב עם §7.1 — `remotion/` הוא READ-WRITE רק כשהמשתמש מפעיל את
  הסקיל `remotion-best-practices`.
- §12 Maintenance Log עודכן.
- ה-`1.5_layers/` נשמר תחת `תמונות לאנימציית האתר/` (READ-ONLY) באישור
  מפורש של המשתמש למחקר זה. התיקייה לא תשמש כמקור פרודקשן —
  בעת אינטגרציה לאתר, יש להעתיק/לקודד מחדש ל-`assets/`.

---

## 10. המלצות להמשך

1. **לפני שיוצרים אותו דבר על סרטון ארוך** — להריץ benchmark של 1 דקה
   כדי לאמת זמן + זיכרון.
2. **אם יידרש שיפור איכות** — לבחון:
   - `RVM` (Robust Video Matting) במקום rembg → קוהרנטיות זמנית מובנית.
   - `LaMa` במקום OpenCV inpaint → רקע איכותי יותר.
   - `SAM 2` עם prompt אחד → דיוק גבוה במיוחד לאובייקט ספציפי.
3. **GPU acceleration** — להתקין `onnxruntime-gpu` בנפרד (לא דרך rembg)
   ו-CUDA 12 כדי להוריד את הסגמנטציה ל-~30 שניות לעשר שניות וידאו.
4. **לתעד את הצינור כסקריפט אחד** (`pipeline.py`) שמקבל path → מוציא
   תיקיית layers, אם מחליטים שזה כלי שגרתי בפרויקט.

---

## 11. Definition of Done — מחקר זה

- [x] הסרטון פורק לשכבות מאומתות.
- [x] שלוש השכבות מתחברות חזרה ב-Remotion ונראות בלייב ב-localhost:3000.
- [x] תוצאות שמורות ובלתי-תלויות בסביבת הדב (קיימות גם כ-PNG וגם כווידאו).
- [x] הצינור מתועד עם זמני עיבוד ומגבלות איכות.
- [x] CLAUDE.md עודכן (§7.1 + Log).
- [x] דו"ח זה נכתב.

**מסקנה:** הטכניקה ישימה ומספיק טובה ל-MVP. שדרוגי איכות אופציונליים
ידרשו GPU או מודלים כבדים יותר.
