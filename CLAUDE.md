# 📜 Project Constitution — GAMOS-SITE

> **חוק.** קובץ זה הוא חוק. שינויים בקובץ זה משנים את התנהגות הפרויקט.
> תיעדכן רק כאשר משתנה: סכימה, חוק עיצובי, או אינווריאנט ארכיטקטוני.

**Plan source of truth:** `C:\Users\art1\.claude\plans\witty-stargazing-feather.md`
**Mirrored at:** `PLANS/research/2026-05-28_master-rebuild-plan.md`
**Live source:** https://gamos.co.il/

---

## §1 Mission Statement

לבנות מחדש את אתר Gamos (gamos.co.il — מתחם אירועים יוקרתי, גנים וריזורט) כאתר
**HTML/CSS/JS וונילה** עם חוויית גלילה ייחודית: hero scroll-driven video שמסתיים
בשתי **בועות-פורטל** (אולם / ריזורט) המובילות לסקציות אולמות מלאות, ואחריהן
סקציות סטטיות עשירות באנימציה (אקורדיונים, סליידרים, parallax, reveal-on-scroll).

- **הישג:** Premium feel המעולה על האתר הקיים, חוויית גלילה קולנועית בלי 3D models.
- **דליברי:** קוד סטטי בלוקאל. דיפלוי-לקלאוד יוחלט בשלב מאוחר.
- **עקרון על:** *Luxury or nothing.* אם משהו לא משדר יוקרה — לא נכנס.

---

## §2 Stack (LOCKED 2026-05-28)

**מותר:**
- HTML5 + CSS3 (custom properties, container queries, `@layer`) + ES2022 vanilla JS modules.
- **GSAP + ScrollTrigger** — לקישור scroll progress ל-`video.currentTime` (טכניקת `video-to-website` skill).
- **Lenis** — smooth scroll בדסקטופ בלבד (`smoothTouch: false`).
- **utility libs קטנות בלבד** — debounce, mitt-style emitter אם צריך.
- **build-time tools:** ffmpeg (תפירת hero), sharp / cwebp / mozjpeg (אופטימיזציית תמונות).

**אסור:**
- ❌ React, Vue, Svelte, Angular, Astro, Next, Nuxt — אין framework.
- ❌ Three.js, R3F, Babylon, Spline, A-Frame — אין 3D engine.
- ❌ מודלים תלת-ממדיים (GLB/GLTF/FBX/OBJ) — המשתמש סירב.
- ❌ Tailwind כספרייה ב-runtime (אפשר build-time בלבד אם בכלל).

---

## §3 Hybrid Concept (LOCKED 2026-05-28)

1. **Hero:** סרטון אחד תפור (`hero-master-1080.mp4`) שמ-`currentTime` שלו מקושר
   ל-scroll progress דרך GSAP ScrollTrigger. ה-hero הוא `position: sticky` מעל
   spacer של 5×100vh.
2. **Portal Bubbles:** ב-progress ≈ 0.92 שתי בועות עגולות מתגלות (אולם / ריזורט),
   כל אחת עם `clip-path: circle()` וברקעה לולאת `portal-loop.mp4`.
3. **Click flow:** קליק על בועה → GSAP timeline שמרחיב אותה לכל הויופורט (1.0s)
   → crossfade לסקציית האולם המתאימה → smooth-scroll לפוקוס.
4. **Hall sections:** סקציות מלאות לאולם, ריזורט, lounge, חדרי נופש.
5. **Static sections:** קולינריה (גלריית מנות, **לא** אולם), אודות, המלצות, צור קשר —
   עם אנימציות מ-skills `frontend-design` + `weblove-motion`.

---

## §4 RTL + עברית

- `<html dir="rtl" lang="he">`.
- **Logical properties בלבד** — `margin-inline-start`, `padding-block-end`, וכו' —
  לא physical (`margin-left/right`).
- מספרים בהקשר עברי נשארים LTR דרך Unicode bidi (`<bdi>` או `unicode-bidi: isolate`).
- **טיפוגרפיה (LOCKED Phase 1, ייאומת ע"י Agent 2):**
  - Hebrew display: **Frank Ruhl Libre** (400/500/700)
  - Hebrew body: **Heebo** (400/500/600)
  - Latin display: **Playfair Display** (400/700)
- כולם self-hosted ב-`assets/fonts/` כ-WOFF2 עם subsetting + `font-display: swap`.

---

## §5 פלטה (LOCKED 2026-05-28 by Agent 01)

הפלטה נגזרה משילוב של:
1. הצבעים האמיתיים מ-DOM של gamos.co.il (Firecrawl extract — `BRANDING.JSON` ב-`עיצוב אתר מחודש/Scrape/`).
2. עקרון §1 ("Luxury or nothing") — שדרוג של הגוונים הזולים באתר החי לכיוון יוקרתי.

```
--brass:       #CFAE83   /* PRIMARY — מ-live (#CFAE83) ללא שינוי */
--brass-deep:  #8B6F46   /* hover/active — נגזר ידנית */
--cocoa:       #534133   /* SECONDARY — מ-live (#534133) ללא שינוי */
--ivory:       #F5EFE6   /* surface — מחליף #FFFFFF הזול של live */
--ink-deep:    #1A1410   /* body text — warm near-black, מחליף #000000 */
--accent-rose: #B8576F   /* CTA accent — מחליף #CC3366 הזוועתי של live */
--mist:        #E8DFD3   /* surface tint — light fade */
```

### החלטות שדרוג מהאתר החי

| live | new | reason |
|------|-----|--------|
| `#FFFFFF` | `#F5EFE6` ivory | Pure white feels medical/cheap. Ivory adds warmth. |
| `#000000` | `#1A1410` ink-deep | Warm near-black aligns with brass+cocoa palette. |
| `#CC3366` | `#B8576F` accent-rose | The live pink looks like a 90s dating site. Desaturated rose-brass = luxury. |
| `#3F444B` (button-secondary text) | `#1A1410` ink-deep | Single ink token; eliminate noise. |

### Discipline

- **Maximum 5 active colors at any one time** (per competitor audit — Aman 4, Bvlgari 3).
- **Single accent.** `--accent-rose` reserved for primary CTA hover state. Never compete with `--brass`.
- **No gradients** unless mathematically defined from these tokens (e.g., `linear-gradient(--ivory, --mist)`).
- **All hex values live in `css/tokens.css`** — hard-coded values elsewhere = bug (§10.2).

הצבעים נכתבים ב-`architecture/tokens.md` ו-`css/tokens.css` ע"י Agent 02. שינוי צבע אחרי הנעילה דורש עדכון Constitution + Maintenance Log entry.

---

## §6 B.L.A.S.T. Discipline

מבנה הפרויקט מותאם ל-B.L.A.S.T. Master System Prompt
(`D:\משה פרוייקטים\B.L.A.S.T. Master System Prompt.docx`):

| B.L.A.S.T. Layer       | Static-Site Adaptation                         |
|------------------------|------------------------------------------------|
| **Architecture SOPs**  | `architecture/*.md` — design SOPs              |
| **Navigation Layer**   | `index.html` (semantic structure)              |
| **Tools Layer**        | `css/*.css` + `js/*.js` modules                |
| **Intermediates**      | `.tmp/` (mockups, scratch, gitignored)         |
| **Payload Destination**| Local browser → cloud (TBD)                    |

### חוקים תהליכיים:

1. **כל סוכן כותב תוכנית ב-`agent-plans/agent-NN_*.md` לפני שהוא רץ קוד.**
2. **שינויים נושאיים מובנים** הולכים ל-`PLANS/<category>/` לפי כללי `PLANS/README.md`.
3. **`findings.md`** מתעדכן בכל גילוי משמעותי (סוכן או main).
4. **`progress.md`** מסומן בכל phase gate שעובר.
5. **תוכניות שהושלמו** → `PLANS/archive/` (לא נמחקות).

---

## §7 Asset Rules

- **READ-ONLY** (מקור — אסור לערוך):
  - `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\` (כל התת-תיקיות)
  - `D:\משה פרוייקטים\GAMOS-SITE\remotion\` — ראה חריגה למטה
  - `D:\משה פרוייקטים\GAMOS-SITE\node_modules\`
- **כל הפלט המעובד** (וידאו תפור, תמונות מאופטמות, פונטים) הולך ל-`assets/` בלבד.

### §7.0 דו"חות מחקר (Research Reports)

מחקרים תחומיים נשמרים כקבצי `REPORT_*.md` בשורש `GAMOS-SITE/`. אלה דו"חות
חד-פעמיים שמתעדים בדיקת ישימות של טכניקה — לא Specs ולא ארכיטקטורה.

**רשימה:**
- `REPORT_video_layer_separation.md` (2026-05-28) — אימת שניתן לפרק MP4
  קיים לשכבות (background / foreground+alpha / mask) באופן אוטומטי דרך
  rembg + OpenCV inpainting + ffmpeg. ראה דו"ח לפרטים, מגבלות איכות,
  והמלצות לאינטגרציה אפשרית בסקציית ה-hero.

**הוראה לסוכנים:** דו"ח מחקר ≠ החלטת ארכיטקטורה. אם אתה רוצה לאמץ טכניקה
מדו"ח, פתח Plan ב-`PLANS/` ועדכן את ה-Constitution לפני האימוץ.

### §7.1 חריגת Remotion (LOCKED 2026-05-28 by user)

**הוראה מהמשתמש:** הנתיב `D:\משה פרוייקטים\GAMOS-SITE\remotion\` הוא **READ-WRITE**
**רק כאשר המשתמש מבקש במפורש להשתמש בסקיל `remotion-best-practices`** (או טריגר
שווה-ערך כגון `/remotion-best-practices`). בכל הקשר אחר הנתיב נשאר READ-ONLY כפי
שהוגדר ב-§7.

**הערה לסוכנים אחרים:** אל תכתבו ל-`remotion/` באופן יזום. רק אם המשתמש הפעיל
את הסקיל המופיע למעלה — זה משחרר את ההרשאה לעריכה. אחרי הסשן ההרשאה לא נשארת
פתוחה אוטומטית; כל פעולת כתיבה דורשת טריגר חדש או אישור מפורש.

---

## §8 Performance Budget

- **LCP** ≤ 2.5s על Slow 4G (poster image הוא ה-LCP candidate; preload חובה).
- **CLS** ≤ 0.05 (כל media עם aspect-ratio מוגדר).
- **INP** ≤ 200ms.
- **60fps** scrub בדסקטופ M1/Ryzen-class. **≥ 30fps** באייפון 12+ / Galaxy S22+.
- **Hero MP4 1080p** ≤ 12MB; **720p** ≤ 6MB; **poster JPG** ≤ 80KB.
- **Mobile fallback:** scrub כבוי, autoplay muted loop או poster crossfade.
- **`prefers-reduced-motion: reduce`** → scrub כבוי, reveals = static final state.

---

## §9 Accessibility (WCAG 2.2 AA)

- Visible focus rings 3px brass.
- Skip-link כ-first focusable.
- Alt text עברי לכל תמונה משמעותית.
- ARIA roles ל-portals (`role="button"` + `aria-label`).
- Screen-reader-only headlines לסקציות ויזואליות-בלבד.
- Keyboard reachability: כל אינטראקטיב Tab→Enter עובד.
- `prefers-reduced-motion` נכבד (ראה §8).

---

## §10 Architectural Invariants

1. **HTML הוא האמת.** סדר הסקציות ב-`index.html` הוא הסדר ההגיוני.
   שינוי = עדכון `architecture/section-order.md` תחילה.
2. **Tokens are single-source.** כל ערך ויזואלי נגזר מ-`css/tokens.css`.
   ערך מוקלד-קשיח ב-CSS אחר = באג.
3. **JS is module-scoped.** ESM modules עם `init(el)` + `destroy()`. אין globals.
4. **RTL First.** הכל עובר תחילה ב-`dir="rtl"`. בדיקת LTR אחרי.
5. **Plans live in `PLANS/`** + **agent plans live in `agent-plans/`**.

---

## §11 Definition of Done

- Lighthouse mobile ≥ 90 בכל ארבעת העמודים (Performance / A11y / Best Practices / SEO).
- RTL keyboard pass: כל אינטראקטיב מגיע, focus ring נראה.
- שתי בועות פורטל לוחצות עובדות, click-routing מגיע לסקציה הנכונה.
- 60fps scrub בדסקטופ class-M1 (DevTools Performance recorder).
- Mobile fallback verified ב-iPhone 12 + Galaxy S22.
- כל הלשוניות מ-gamos.co.il מיוצגות (Agent 1 inventory מאומת ע"י משתמש).
- 10 קבצי `agent-plans/agent-NN_*.md` קיימים, כל אחד עם DoD מוגדר.

---

## §12 Maintenance Log

| Date       | Change                                                       | Author      |
|------------|--------------------------------------------------------------|-------------|
| 2026-05-28 | Constitution created (Phase 0 bootstrap). Stack locked.       | main agent  |
| 2026-05-28 | §5 palette LOCKED — derived from gamos.co.il live + luxury upgrade. | Agent 01 |
| 2026-05-28 | §7.1 added — `remotion/` becomes READ-WRITE only when `remotion-best-practices` skill is invoked by user. | main agent (per user) |
| 2026-05-28 | Research: video layer separation pipeline validated on `ריזורט 1/1.5.mp4`. See `REPORT_video_layer_separation.md`. | main agent |
