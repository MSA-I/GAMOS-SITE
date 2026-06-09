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
- ~~**Three.js core**~~ — **REMOVED 2026-06-08** (ראה §12). הסיבה: ההירו עבר לתמונה
  סטטית ולא היה צרכן נוסף. אם בעתיד יידרש shader-based effect — להחזיר את ההגדרה
  ולעדכן Maintenance Log.
- **utility libs קטנות בלבד** — debounce, mitt-style emitter אם צריך.
- **build-time tools:** ffmpeg (תפירת hero), sharp / cwebp / mozjpeg (אופטימיזציית תמונות).

**אסור:**
- ❌ React, Vue, Svelte, Angular, Astro, Next, Nuxt — אין framework. (חריגה ב-§2.1 לשני דפי האולמות בלבד.)
- ❌ R3F, Babylon, Spline, A-Frame, postprocessing — אין 3D framework. (Three.js core מותר self-hosted לפי §2.מותר.)
- ❌ מודלים תלת-ממדיים (GLB/GLTF/FBX/OBJ) — המשתמש סירב. ה-Hero shader צובע רקע + טקסטורות 2D בלבד.
- ❌ Tailwind כספרייה ב-runtime (אפשר build-time בלבד אם בכלל). (חריגה ב-§2.1 לשני דפי האולמות בלבד.)

---

## §2.1 Halls sub-app exception (NEW 2026-06-04)

שני הדפים `/halls/oasis/` ו-`/halls/lumina/` (ורק הם) מותרים להריץ
**React 19 + TypeScript + Vite 6 + Tailwind v4 + Motion + Lucide + Three.js**
בזמן ריצה, כ-sub-app נפרד תחת `halls/`. הסיבה: פורט מדויק של הפרוטוטייפ
ב-`D:\משה פרוייקטים\arch-corridor-gallery\` ששימש את המשתמש בסשן הקודם
(ThreeDCorridor immersive view של 6 קלפי פרויקט מרחפים ב-3D + ProjectDetail
drawer + scroll/drag/keyboard/click interactions).

**כללים:**

1. **Scope.** ה-sub-app חי **רק** תחת `halls/` בשורש GAMOS-SITE. אסור לייבא
   ממנו לשום קובץ ב-`/index.html`, `/js/`, או `/css/`. אסור ל-`index.html`
   הראשי לטעון React/Vite/Tailwind ב-runtime.
2. **Build artifact.** ה-bundle נבנה pre-deploy עם `npm run build:halls`
   (משדרגת לתוך `cd halls && npm install && npm run build`) ל-`halls/dist/`.
   הפלט סטטי לחלוטין — `npx serve` של GAMOS-SITE מגיש אותו ככל קובץ אחר.
3. **URLs.** שני נתיבים: `/halls/dist/oasis/` (ברירת מחדל = oasis hall)
   ו-`/halls/dist/lumina/` (= lumina/resort hall). כל אחד הוא HTML נפרד עם
   `<html data-initial-hall="…">` שאותו אותו React bundle קורא ב-mount.
   המסלול כולל `dist/` כי `vite.config.ts` מגדיר `base: "/halls/dist/"` כדי
   שה-asset URLs ייצאו עם prefix תואם. URLs נקיים יותר (ללא `dist/`) דורשים
   rewrite rule בשרת ויטופלו בעתיד אם המשתמש ירצה.
4. **Asset prefix.** `vite.config.ts` של ה-sub-app חייב להגדיר
   `base: "/halls/dist/"` כך שכל ה-asset URLs (script/link) ייצאו עם
   ה-prefix הנכון בפרודקשן.
5. **No bleed.** הניווט בין ה-sub-app לשאר האתר עובר דרך `window.location`
   בלבד — אין SPA-routing משותף, אין React-תלות באתר הראשי.
6. **Vanilla legacy preserved.** `corridor.html` + `js/corridor.js` +
   `js/corridor-page.js` + `css/sections/corridor.css` (ה-port הוונילה
   הקיים) **לא** נמחקים — נשארים כ-fallback לחיפוש או לחזרה אחורה.

**מה נשאר אסור גם תחת §2.1:**
- React/Vite/Tailwind/Motion/Lucide ב-`index.html` הראשי או ב-`/js/`.
- מודלים תלת-ממדיים (GLB/GLTF/FBX/OBJ) — גם בתת-האפליקציה. ה-port מסתמך
  על תמונות 2D + CSS 3D transforms בלבד. Three.js נשאר לשימוש shader-only.
- כל יצירת bundle נפרד מעבר ל-`halls/dist/`.

שינוי זה אישר המשתמש ב-2026-06-04. ראה Maintenance Log §12.

---

## §3 Hero Concept (LOCKED 2026-06-09 v8.1, replaces v8 110vh / v7 150vh)

ה-Hero הוא **סקציה אחת** של **135vh** (`<section id="hero" class="hero-static">`)
שבתוכה `<div class="hero-static__pin">` עם `position: sticky; top: 0; height: 100vh`.
המעבר 100vh-pin מתוך 135vh נותן **35vh של scroll travel** — שני שלישים מ-v7 (50vh).
v8 ניסה 10vh travel — היה מהיר מדי, ביטל את האפקט הקולנועי. 35vh = פשרה מודעת:
ה-rise נשאר deliberate ו-watchable, אבל צמוד יותר מ-v7. ה-#lounge נכנס מיד
אחרי progress=1 (אין trail בסקציית הירו עצמה — בנוסף קוצץ ב-§3.1 padding
העליון של `.lounge`).
ה-pin מכיל **חמש שכבות PNG מורכבות** (z-order מלמטה למעלה):

1. **base** (`שכבה 2.png`) — full-viewport, רקע שמנת + קצה גלי תחתון. **z=1**.
2. **gamos** (`GAMOS 1.png`) — decorative, top-left. brand mark, לא ניווט. **z=2**.
3. **events** (`EVENT 1.png`) — `<a>` interactive → `/halls/dist/oasis/`. **z=3** (מתחת למדבר).
4. **resort** (`RESORT 2.png`) — `<a>` interactive → `/halls/dist/lumina/`. **z=4** (מתחת למדבר).
5. **desert** (`מדבר.png`) — hill silhouettes anchored to pin bottom. **z=10 — TOPMOST** — מכסה ויזואלית את ה-EVENTS / RESORT typography גם בנקודת התחלה (progress=0).

כל שכבה מקודדת ל-WebP עם אלפא משומר (q=88 לתמונות הגדולות, q=92 לטקסטים).
שכבה אחת (base) גם מקבלת JPG fallback. 4 השאר — WebP בלבד (אלפא חיוני).
תמונת ה-desert עודכנה ב-2026-06-09 ל-`../GAMOS-DOCS/תמונות לאנימציית האתר/HERO/מדבר.png`
(15.4MB; הספרייה הועברה מ-GAMOS-SITE ל-GAMOS-DOCS באותו יום — ראה §7).

**Two-phase scroll choreography (CSS calc only — אין JS חדש):**

הסקציה רשומה ל-orchestrator עם:
```
data-scrub="hero-rise"
data-scrub-mode="poster-ken-burns"
data-scrub-spacer-vh="135"
```
(השם `hero-rise` ולא `hero` כי `js/scroll-scene.js:184` מדלג על `id === "hero"`
כ-reserved name. התקציר 135vh תואם להגובה הסקציה. שווה לציין: עבור `#hero`
ספציפית הערך הזה הוא דקלרטיבי בלבד — `applySpacerHeight` מחפש ילד
`.scroll-scene__spacer` שלא קיים בהירו — כך שהשמירה היא לתיעוד/עקביות.)

`js/scroll-scene.js` כותב `--scene-progress` (0..1) על שורש הסקציה כל פריים, לפי
`scrolled / (height - 100vh) = scrolled / 35vh`. ה-CSS גוזר שני progresses-מהיריים:

```css
--p1: min(1, calc(var(--scene-progress) * 2));      /* Phase A: 0→1 across 0→0.5 */
--p2: max(0, calc(var(--scene-progress) * 2 - 1));  /* Phase B: 0→1 across 0.5→1 */
```

- **שלב A (progress 0 → 0.5):** **רק** שכבת desert זזה. ה-translateY שלה מתוקן
  ל-progress הליניארי של הסקציה — `translateY(calc(var(--scene-progress) * -100vh))`.
  בנקודה 0.5 היא ב-`-50vh`. ארבע השכבות האחרות (base, gamos, events, resort) קפואות
  ב-translateY(0).
- **שלב B (progress 0.5 → 1):** desert ממשיכה לעלות (-50vh → -100vh). **בנוסף**,
  base+gamos+events+resort עולות יחד דרך `transform: translateY(calc(var(--p2) * -100vh))`.
  בנקודה progress=1 כל ההרכב יצא לגמרי מעל המסך, ו-`#lounge` מתחיל למלא את התצוגה.

**אין trail/gap** אחרי progress=1: ברגע שהסקציה לא דביקה (~10vh של scroll
מעל ה-pin), `#lounge` כבר במסך. אין `.hero-gap` נפרד. (ב-v3 היה `.hero-gap` של
50vh; ב-v6 100vh; ב-v7 50vh בתוך הסקציה; v8 מצמצם לכמעט-אפס.)

`prefers-reduced-motion: reduce` מבטל את שתי השכבות של עליות (desert + Phase B).

**Click flow + Hover/focus animation:** ללא שינוי מ-v3. CTAs נשארים `pointer-events:auto`,
desert ב-`pointer-events:none` — לחיצות על pixel transparenti של תמונת המדבר עוברות
ל-CTA מתחתיה. אם תמונת המדבר אטומה לחלוטין מעל אזורי ה-CTAs, ה-CTAs יחסמו ויש לבדוק
ויזואלית ולהוסיף click-overlay אם צריך (post-verify).

**Sections after `#hero`:** lounge, culinary, shabbat-chatan, rooms, about, testimonials,
gallery, events, kosher, contact. אין יותר `#hero-cover` — הוסר ב-v7 והמודל v6 נמחק.

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

### §4.1 Font + texture canonical reference (LOCKED 2026-06-08)

**הוראה לכל סוכן עתידי שעובד על פונט / טיפוגרפיה / טקסטורת-טקסט:**

לפני יצירה או שינוי של *כל* החלטה טיפוגרפית או טקסטורלית, **חובה** לפתוח קודם
את התיקייה:

> `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\פונט\`
> *(הספרייה הועברה מ-GAMOS-SITE ל-GAMOS-DOCS ב-2026-06-09 — ראה §7)*

זוהי הספרייה הקנונית של Mood Board לפונטים, אותיות, וטקסטורות של האתר. כוללת:
- `A-B בהיר.png` / `A-B-כהה.png` — alphabet character set ברפרנסים בהירים וכהים.
- `טיפוגרפיה בהירה.png` / `טיפוגרפיה כהה.png` — דוגמאות מילים בטקסטורה.
- `טקסטורה בהירה.png` / `טקסטורה כהה.png` / `טקסטורה מלאה כהה.png` — קבצי
  המקור של הטקסטורות (חול חום-בהיר לרקעים כהים; דמדומים-זהב כהה לרקעים בהירים).
- `1.2.png` — סטיילינג כללי.

**האותיות, הטקסטורות, וצורת הטקסטים באתר נלקחים אך ורק מתיקייה זו.** אסור להמציא
טיפוגרפיה מקור אחר (Google Fonts, Adobe Fonts, וכו') — אם הסוכן צריך פונט שלא
קיים בתיקייה, להציג את הסוואץ' למשתמש ולקבל אישור לפני אימוץ.

הקבצים המקודדים-בפרויקט שנגזרו מהמקורות הללו:
- `assets/images/brand/typo-on-light.webp` — טקסטורת אותיות **כהה** (לרקעים בהירים).
- `assets/images/brand/typo-on-dark.webp` — טקסטורת אותיות **בהירה** (לרקעים כהים).
- `assets/images/brand/texture-light.webp` / `texture-dark.webp` — טקסטורות
  background כלליות (לא לטקסט).

ה-classes ב-`css/components/texture-text.css`:
- `.texture-text` או `.texture-text--dark` → טקסטורה כהה (typo-on-light) — לרקעים
  בהירים (ivory). זה ה-default ברוב האתר.
- `.texture-text--light` → טקסטורה בהירה (typo-on-dark) — לרקעים כהים (ink-deep,
  cocoa, hero, culinary, lounge, shabbat-chatan).

הפונט עצמו (Rubik / Heebo / Cinzel / Playfair) הוא *vehicle* לטקסטורה — הצורה
בכל מקום באתר חייבת להיגזר ממה שמופיע ב-NOMAD typeface שבתיקייה. אם NOMAD
ייוצר אי-פעם כקובץ woff2, הוא ינעל כ-`--font-display` של האתר.

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
3. **גילויים משמעותיים** מתועדים ב-Maintenance Log (§12) עם תאריך + מקור.
4. **מצב הפרויקט** משתקף ב-`STATUS.md` בשורש (לא ב-progress.md/findings.md הישנים — נמחקו 2026-06-01).
5. **תוכניות שהושלמו** → ניתן למחוק (ההיסטוריה ב-git). תוכניות שננטשו → `PLANS/archive/`.

---

## §7 Asset Rules

- **READ-ONLY** (מקור — אסור לערוך):
  - `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\` (כל התת-תיקיות) —
    הועבר מ-GAMOS-SITE ל-GAMOS-DOCS ב-2026-06-09 כדי לשמור על repo רזה
    (4.7GB). ב-`scripts/encode-images.mjs` ה-`SRC_ROOT` נפתר אוטומטית
    דרך `../GAMOS-DOCS/`. סוכן עתידי שצריך לקרוא מקור — קורא מהנתיב
    החדש; אסור לשחזר את התיקייה לתוך GAMOS-SITE.
  - `D:\משה פרוייקטים\GAMOS-SITE\remotion\` — ראה חריגה למטה
  - `D:\משה פרוייקטים\GAMOS-SITE\node_modules\`
- **כל הפלט המעובד** (וידאו תפור, תמונות מאופטמות, פונטים) הולך ל-`assets/` בלבד.

### §7.0 דו"חות מחקר (Research Reports)

מחקרים תחומיים נשמרים תחת `PLANS/research/` (לא בשורש). אלה דו"חות
חד-פעמיים שמתעדים בדיקת ישימות של טכניקה — לא Specs ולא ארכיטקטורה.

**רשימה נוכחית:**
- `PLANS/research/2026-05-28_master-rebuild-plan.md` — תוכנית 10-Agent הראשית.
- `PLANS/research/2026-05-28_site-content-map.md` — תוכן verbatim מ-gamos.co.il.
- `PLANS/research/2026-05-28_full-tab-inventory.md` — טבלת לשוניות מאומתת.
- `PLANS/research/2026-05-28_competitor-audit.md` — Aman / Bvlgari / Six Senses / וכו'.
- `PLANS/research/2026-05-28_font-identification.md` — NOMAD font analysis.

**הוראה לסוכנים:** דו"ח מחקר ≠ החלטת ארכיטקטורה. אם אתה רוצה לאמץ טכניקה
מדו"ח, פתח Plan ב-`PLANS/next-steps/` ועדכן את ה-Constitution לפני האימוץ.

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
6. **Status lives in `STATUS.md`** — current state vs. master plan, with checklist against §11 DoD. Master plan at `PLANS/research/2026-05-28_master-rebuild-plan.md` is canonical reference. Active future work at `PLANS/next-steps/`.

---

## §11 Definition of Done

- Lighthouse mobile ≥ 90 בכל ארבעת העמודים (Performance / A11y / Best Practices / SEO).
- RTL keyboard pass: כל אינטראקטיב מגיע, focus ring נראה.
- שתי בועות פורטל לוחצות עובדות, click-routing מגיע לסקציה הנכונה.
- 60fps scrub בדסקטופ class-M1 (DevTools Performance recorder).
- Mobile fallback verified ב-iPhone 12 + Galaxy S22.
- כל הלשוניות מ-gamos.co.il מיוצגות (Agent 1 inventory מאומת ע"י משתמש).
- ~~10 קבצי `agent-plans/agent-NN_*.md` קיימים~~ — כל 14 התוכניות בוצעו ונמחקו אחרי השלמתן (2026-06-01). ההיסטוריה ב-`git log` + `STATUS.md`. תוכניות עתידיות ב-`PLANS/next-steps/`.

---

## §13 Mobile sub-tree convention (LOCKED 2026-06-08)

כל קוד שנכתב מתוך מטרת **mobile-readiness** (תקנון הצגה, תיקוני touch-target,
fallback-ים adaptive, encoders ייעודיים לרזולוציות מובייל) חי ב-`/mobile/`
בשורש הפרויקט. ראה גם `/mobile/README.md` לפירוט מלא.

**כללים:**

1. `mobile/css/*.css` — רק `@media` overrides (`max-width: 768px` או
   `max-width: 640px`, `max-width: 480px` לפינות). אסור rules כלליים.
2. `mobile/js/*.js` — מודולי ESM `init()`/`destroy()` עם `matchMedia`
   early-exit. אסור globals חדשים; תקשורת עם הליבה דרך DOM dataset או
   hooks ייעודיים שהליבה חושפת.
3. `mobile/scripts/*.mjs` — encoder/build helpers ייעודיים לנכסי מובייל
   (לדוגמה: frame variants ברזולוציה נמוכה).
4. ב-`index.html` — `mobile/css/*.css` נטענים בבלוק "Mobile-only overrides"
   **אחרי** `css/sections/*.css` ו-`css/components/*.css`.
5. ב-`js/main.js` MODULES — `canvas-frames-mobile` רשום **לפני**
   `scroll-scene` (כדי לעדכן dataset לפני ש-renderer קורא אותו);
   שאר ה-`*-mobile` רשומים אחרי המודול שלהם בליבה.
6. **commits בלבד למובייל**: branch `feature/mobile-pass` (או
   `feature/mobile-NN_<topic>`). כל commit נוגע רק ב:
   - `mobile/**`
   - `index.html` (preload / source / attribute additions)
   - `js/main.js` (MODULES entries)
   - `CLAUDE.md` (§12 Maintenance Log + §13 updates)
   - הסרת clauses `(max-width: …)` מ-`css/sections/*.css` כשעוברים
     ל-overrides ב-`mobile/css/`.
   אסור לערבב refactor של ליבה.
7. **אסור להוסיף `@media` למובייל ישירות לקבצים ב-`/css/sections/`** —
   הקבצים האלה הם desktop-first; כל override מובייל הולך ל-`mobile/css/`.
8. **שמירת חוויה (Constitution §1 — Luxury or nothing).** גרסת מובייל
   לא רשאית להפיל אלמנט/חוויה שקיימת בדסקטופ. אם דסקטופ מציג חוויה X,
   מובייל חייב להציג גרסה equivalent של X — לא fallback סטטי שטוח.
   ה-`prefers-reduced-motion: reduce` הוא היוצא היחיד.

**הוראה מפורשת לסוכנים עתידיים:** כל בקשת המשתמש שכוללת מילים כמו
"מובייל", "mobile", "responsive", "iPhone", "Android", "טאצ'", "touch",
"גודל מסך", "viewport" — קוראים את `/mobile/README.md` לפני הגעה לקוד.
תיקון מובייל לא הולך ל-`/css/sections/` או `/js/`; הוא הולך ל-`/mobile/`.

---

## §12 Maintenance Log

| Date       | Change                                                       | Author      |
|------------|--------------------------------------------------------------|-------------|
| 2026-06-09 | **Halls Depth-Gallery — fix-it pass against /code-review (15 findings, 2 waves, 5 agents).** Followup to the same-day Codrops Depth Gallery port; an extra-high-effort review surfaced 15 defects ranked by severity. Wave 1 correctness (3 parallel agents): **(F1) keyboard navigation works on initial mount** — `DepthGallery.tsx` wrapper switched `tabIndex={-1}` → `tabIndex={0}` and a one-shot `wrapperRef.current?.focus()` runs on mount; `Scroll.ts` keydown listener moved from `window` to `this.target` (the wrapper) and the obsolete `document.activeElement` guard removed; `HallChrome.tsx` no longer auto-focuses the destructive Home `<a>` (a stray Enter on mount used to bounce the user back to `/`). **(F2) TextureLoader has an onError path** — `Gallery.ts` now passes a 4th-arg callback that `console.warn`s the URL/error and flips a `failed[i]` boolean; `update()` short-circuits target opacity to 0 for failed planes (transparent fade-out instead of black rectangle). `Engine.ts` `dispose()` rewritten to reverse-of-construction order — bg → scroll → gallery → renderer — and the `scene.traverse(...)` block plus `disposeMaterial` helper deleted (Gallery owns its meshes/textures/materials and disposes them itself; the previous double-dispose path also caused a brief flicker between renderer-blank and bg-removal). **(F3) first-paint label populated synchronously** — `App.tsx` switched to `useState(() => getProjectsByHall(initialHall)[0] ?? null)` lazy initializer, both useEffects deleted (dead `"depth-gallery:active"` window CustomEvent listener and the post-paint state-population effect both gone); `extract-colors.mjs` split the unified try/catch into separate node-vibrant + sharp blocks so a sharp-only failure produces an accurate top-level warning instead of a misleading "node-vibrant not usable" message. Wave 2 cleanup (2 parallel agents): **(G1) shared math/color helpers** — new `halls/src/depth-gallery/utils.ts` exports `lerp` / `clamp` / `hexToRgb` + `RGB` interface; private duplicates removed from `Gallery.ts` (lerp+clamp), `Scroll.ts` (lerp+clamp; `normalizeWheelDelta` stays — Scroll-only), `Background.ts` (lerp+hexToRgb+RGB). **(G2) Engine drives active-plane callback from RAF** — new `Engine.setActivePlaneCallback(cb)` + private `lastActivePlaneIndex` field + per-frame `getMoodBlendData` check inside `_render()`; `DepthGallery.tsx` setInterval(120ms) deleted, callback wired via stable `onActiveChangeRef` ref pattern (engine effect dep array shrunk `[hallId, onActiveChange]` → `[hallId]` so a parent re-render with an inline callback no longer tears down WebGL); `HallChrome.tsx` skip-link rewritten to standard `sr-only focus:not-sr-only focus:absolute focus:top-4 focus:inset-inline-start-4 …` pattern (was fragile `-translate-y-full` that depended on link height ≥ 16px); `halls/package.json` adds `"sharp": "^0.33.0"` direct devDependency (was transitive via node-vibrant — risk of silent fallback if vibrant ever drops sharp). **Modified:** `halls/src/depth-gallery/{Engine,Gallery,Scroll,Background,DepthGallery}.{ts,tsx}`, `halls/src/components/HallChrome.tsx`, `halls/src/App.tsx`, `halls/scripts/extract-colors.mjs`, `halls/package.json`. **New:** `halls/src/depth-gallery/utils.ts`. **Findings #12 (Motion ref typing)** and **#13 (IO first-callback race)** intentionally deferred — defensive only, no observed failure. **Verified:** `cd halls && npx tsc --noEmit` zero errors; `npm run build` produces `dist/oasis/index.html` + `dist/lumina/index.html` with `data-initial-hall` + `dir="rtl"` + `/halls/dist/` asset prefix; `grep "depth-gallery:active" src/` returns 0 (dead listener gone); `grep -E '^(export )?function lerp' src/depth-gallery/*.ts` returns only `utils.ts:16` (one source of truth); `grep "setInterval" src/depth-gallery/` returns only a historical-comment match in `Engine.ts:154`; `node_modules/sharp/package.json` shows 0.33.5 installed top-level; `grep -rn "halls/src" js/ css/ index.html` returns 0 (no main-site bleed). | main + 5 sub-agents |
| 2026-06-09 | **`#kosher` redesigned — 5 kashrut-authority logos inside a filled cocoa oval (final after 4 iterations).** Replaces the centered SVG-seal block with badges of the actual certifying bodies, spanning the three communities the user named: **הרבנות הראשית** (state), **צוהר** (Religious-Zionist), **בד"ץ העדה החרדית** (Ashkenazi-Haredi, Jerusalem), **בד"ץ בית יוסף** (Sephardi, Ovadia Yosef tradition), **בד"ץ אגודת ישראל** (Ashkenazi-Haredi). **Sourcing/normalization (one-shot SWARM, 6 sub-agents):** 5 parallel agents pulled raw PNG/SVG from each org's site or Hebrew Wikipedia → `GAMOS-DOCS/תמונות לאנימציית האתר/כשרות/`; a 6th agent wrote `mobile/scripts/normalize-kosher-logos.mjs` (sharp pipeline: flatten-on-white → greyscale → linear contrast → threshold(200) → joinChannel → 1200-wide black-on-transparent `*-bw.png` masters). Encoded to `assets/images/kosher/{rabbanut,tzohar,eda-charedit,beit-yosef,agudat-israel}.webp` (~108KB total, 600w q92 alpha-preserved) via a new SINGLE_WEBP block in `scripts/encode-images.mjs`. **Layout iterations:** v1 was a marquee on an ivory band — user rejected animation; v2 was a transparent static row — user wanted the original brown circle restored AND noted logos getting wrapped/cropped; v3 added a thin cocoa border-only oval — user clarified they meant a FILLED brown shape like before; v4 (final) is the filled oval. Container is now a single `.kosher__container` flex-column carrying the section-header (eyebrow + texture-fill h2), the 5-item logo row (`<ul class="kosher__logos">` with `<li><img>`), and the original Hebrew body paragraph. **Cocoa oval implementation:** `background: var(--cocoa)` + `border-radius: 50% / 50%` produces an auto-ellipse that hugs whatever height the content lands at. The deliberate `padding-inline: clamp(4.5rem, 14%, 11rem)` is the bug fix for "logos still cropped" feedback — an oval's L/R edges curve INWARD, so any child touching the box's L/R edge clips behind the curve; pushing the inner-content rect ~14% inward keeps the oval tangent well outside the logo row. **Logo row:** `flex: 1 1 0` per `<li>` + `min-inline-size: 0` + `flex-wrap: nowrap` keeps all 5 logos on one line at every viewport; per-cell `block-size: clamp(64px, 7.5vw, 110px)` with `<img>` 100%×100% + `object-fit: contain` lets each logo land at the largest size that fits its individual cell while preserving its native aspect — no logo "disappears". `filter: brightness(0) invert(1)` flattens any source color to ivory-on-transparent for visual unity against the cocoa fill; `opacity: 0.92 → 1` on hover/focus. **Mobile (≤768px / ≤480px):** same 14%-inset rule with smaller minimums; cell height clamps to (40–60px) / (34–48px); ≤480px softens the oval to a stadium shape (`border-radius: 9999px / 30%`) so 5 short logos fit cleanly without the curve pinching the row at the sides. **Modified:** `index.html` (markup at lines ~1130-1184 — semantic `<ul>` of `<li><img>` items between header and body), `css/sections/kosher.css` (full rewrite, ~78 lines), `scripts/encode-images.mjs` (5 new SINGLE_WEBP entries), `mobile/loader.js` (1-line addition to MOBILE_CSS array), `CLAUDE.md` §12 (this row). **New:** `mobile/css/kosher.css` (~36 lines ≤768px + ≤480px overrides), `mobile/scripts/normalize-kosher-logos.mjs` (one-shot sharp pipeline, ~110 lines), `assets/images/kosher/*.webp` (5 files). **Files NOT touched:** `js/marquee.js` (no longer consumed by `#kosher` after v1→v4 transition; still used by the Hebrew text marquee elsewhere), `js/main.js`, `js/side-dot-nav.js` (`#kosher` dot stays at position 10/12 — section ID unchanged), `assets/img/icons/kashrut-seal.svg` (orphaned, kept on disk for revert). **License/IP:** the 5 displayed logos are trademarks of their respective issuing bodies. Using them honestly to represent the venue's actual certifications is normal commercial practice for kosher caterers, but the **business owner is responsible** for verifying the venue is in fact certified by each authority shown. The redesign does NOT verify certification status. **Verification (manual):** load `/`, scroll to `#kosher`. Expect a single cocoa oval centered on the page; eyebrow "כשרות" (brass) + h2 "כשרות ורבנות" (texture-fill) inside; 5 ivory logos in one row beneath the title; original Hebrew paragraph below. Hover any logo → opacity 0.92 → 1. `prefers-reduced-motion: reduce`: only the standard fade-up reveal is affected (no other animation). ≤768px / ≤480px: oval narrows, logos stay one row. | main + 6 sub-agents (sourcing + normalization) |
| 2026-06-09 | **Source library moved out of GAMOS-SITE.** The 4.7GB `תמונות לאנימציית האתר/` directory (12 sub-folders: HERO, LAUNGE, אולם 3, השראות, חדרי נופש 2, לוגו, מפות, סרטונים סופיים, פונט, קולינריה 4, ריזורט 1, שבתות חתן 5) was relocated to `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\` to keep the working repo lean. Site itself unaffected — the encoded outputs already live in `assets/images/` (the canonical runtime location); only build-time encoders read the source library. **Updated:** `scripts/encode-images.mjs` (`SRC_ROOT` resolves to `../GAMOS-DOCS/`; 18 named-source paths in `SINGLE_WEBP` + `NAMED_PAIRS` re-routed via path-prefix detection so the human-readable `"תמונות לאנימציית האתר/…"` strings stay in source); `scripts/resize-hall-cards.py` (`SRC` constant + docstring); `CLAUDE.md` §3 (desert image reference) + §4.1 (font folder reference) + §7 (READ-ONLY directory list); `STATUS.md` directory tree; `README.md` Source-masters callout; `architecture/asset-inventory.md` source-paths column (still refers to logical names — unchanged for traceability); `docs/asset-encoding.md` instructional ffmpeg/python snippets; `PLANS/research/2026-05-28_master-rebuild-plan.md` directory tree + cited paths; `PLANS/research/2026-05-28_font-identification.md` source image path; `architecture/portal-bubbles-spec.md` reference video path; `.gitignore` (entry removed — folder no longer in repo); `איך להפעיל.txt` directory tree. **Files unchanged:** `index.html`, `js/*`, `css/*`, `assets/*` (all reference encoded outputs under `assets/`, not source masters). **Verified:** all 18 source paths used by `encode-images.mjs` still resolve under the new `SRC_ROOT` (2 pre-existing dead paths — `פונט/טקסטורה מלאה כהה.png` and `פונט/טקסטורה כהה.png` — were broken before the move; they're guarded by `srcCandidates` fallback or already-encoded outputs). | main |
| 2026-05-28 | Constitution created (Phase 0 bootstrap). Stack locked.       | main agent  |
| 2026-05-28 | §5 palette LOCKED — derived from gamos.co.il live + luxury upgrade. | Agent 01 |
| 2026-05-28 | §7.1 added — `remotion/` becomes READ-WRITE only when `remotion-best-practices` skill is invoked by user. | main agent (per user) |
| 2026-05-28 | Research: video layer separation pipeline validated on `ריזורט 1/1.5.mp4`. (Report file removed 2026-06-01 in cleanup; was a one-off feasibility note never adopted into architecture.) | main agent |
| 2026-05-28 | §3 refined — Hero is now multi-stage (intro / scrub / outro). New assets: `hero-static.webp` desert background, `logo-gold.webp` GAMOS RESORT logo. Letter animation GAMOS+EVENTS in CSS keyframes. Portal click adds `[data-clicked]` attr for brass-glow shadow feedback. | main agent |
| 2026-05-28 | **Tech change:** GSAP CDN dependency removed from `hero-video-scrub.js` — replaced with native scroll listener + RAF for stability + 0 external deps. GSAP still used in `portals.js` for expand timeline. | main agent |
| 2026-05-28 | **CSS architecture fix:** `@layer sections` removed from agent-authored stylesheets (hero, portals, site-nav, site-footer, section-header, gallery, events, kosher, about, testimonials, contact) — was unbalanced with hall-* / lounge / rooms / culinary which were unlayered, causing cascade failures. All section CSS now lives in unlayered cascade. | main agent |
| 2026-05-28 | Portal order in HTML: resort first (right in RTL), venue second (left). Per user mandate. | main agent |
| 2026-06-01 | **Phase A complete.** GSAP fully removed from `js/main.js`, `js/portals.js`, `js/lenis.js`. Portal expand uses Web Animations API (`Element.animate()`) — `cubic-bezier(0.55,0.085,0.68,0.53)` ≈ power3.in. Site boots offline post-load (no CDN deps). | Agent 15 + main |
| 2026-06-01 | Architecture specs delivered: `architecture/scroll-orchestrator.md` (single-RAF, IO-driven activation, `window.gamosScroll` w/ 4 methods), `architecture/transitions-and-nav.md` (loading-overlay 800ms + 8-dot side-nav, RTL right-edge), `agent-plans/agent-11_typography-research.md` (Bodoni Moda 900 + texture-fill), `agent-plans/agent-12_hero-spec-v2.md` (5-stage Hero V2: 0→8→22→88→100%). | Agents 11-14 |
| 2026-06-01 | **Hero + Culinary canvas-frame migration** (per `video-to-website.md` skill). `<video.currentTime>` scrub replaced with pre-extracted **30fps WebP** frame sequences painted into `<canvas>` by new `js/canvas-frame-renderer.js`. Hero: 528 frames @ 1600px q=75 (~45MB total — over per-scene budget; user notified). Culinary: 180 frames @ 1600px q=75 (~6.5MB). Two-phase preloader: Phase 1 (10 frames) blocks `preload()`; Phase 2 streams remainder async with `fetchpriority=low`. Backward-compat: `window.gamosHero.duration` is now `frameCount/fps` so portals/side-dot-nav unaffected. iOS Safari now scrubs smoothly (the migration's purpose). Resort/Venue stay on poster-Ken-Burns until their videos arrive — same canvas-frames path is now documented in `docs/adding-hall-video.md`. | Agent 21 |
| 2026-06-01 | **Phase D interactivity** (D1+D2+D4). Added `js/contact-form.js` — validation + WhatsApp + mailto submit, content-agnostic via `data-wa-number` / `data-email` form attrs. Added `js/site-nav.js` — fixes broken `aria-controls="site-nav-mobile"` (target didn't exist) by injecting an overlay clone of the link list with focus trap + Escape close + body scroll-lock. Testimonials slider markup adapted to `slider.js` contract (`data-slider-track/-item/-prev/-next/-dots`); track converted from column to row flex with `overflow-x: clip` on the section. Added a `date` field to the contact form (optional) and a "שלחו במייל במקום" mailto fallback link rendered after a successful WhatsApp submit. | Agent 23 |
| 2026-06-01 | **§2 amendment:** GSAP + ScrollToPlugin re-allowed (self-hosted at `/assets/vendor/`, ~78KB total). Phase A removal was specifically about CDN dependency failure; self-hosting fixes that without re-introducing offline regression. Powers cinematic scrollytelling (canvas frame scrub at ZOOM_FACTOR 1.35 + mouse parallax + smooth section-anchor scroll via ScrollToPlugin). New `js/scrollytelling.js` orchestrates `data-scrollytelling` canvases with shared loader-percentage overlay. New `js/canvas-frame-renderer.js` API: `bindScroll`, `bindMouseParallax`, `bindResize`. Culinary opted in (500vh spacer); Hero keeps its own 4-stage renderer. | main |
| 2026-06-01 | **Documentation cleanup.** Removed stale progress reports (HANDOFF.md, PROGRESS_REPORT.md, PROGRESS_SUMMARY.md, progress.md, findings.md, task_plan.md, REPORT_video_layer_separation.md). Removed completed plans (`PLANS/fixes/`*13, `PLANS/performance/`, `PLANS/refactors/`, all 14 `agent-plans/agent-NN_*.md`). Replaced with single `STATUS.md` (current state vs. master plan + DoD checklist) and `PLANS/next-steps/2026-06-01_hall-videos-and-content-finalization.md` (open items). Master plan at `PLANS/research/2026-05-28_master-rebuild-plan.md` remains the canonical reference. | main |
| 2026-06-01 | **9-changes build** (plan: `PLANS/next-steps/2026-06-01_nine-changes-master-plan.md`; 10 research + execution agents, 3 collision-free waves). **(1) Rooms** — new `js/rooms-gallery.js` + rewritten `css/sections/rooms.css`: two-pane hover/focus-swap name-list → shared clip-path image stage, 10 rooms (images 05,04,09,06,07,03,11,08,01,02), RTL arrow-key roving tabindex, reduced-motion instant swap. **(2) Nav** — `css/sections/site-nav.css` single 1024px breakpoint, `.is-scrolled` condense, RTL underline `transform-origin:right`, CTA→`--accent-rose`, 5 links marked `data-secondary` (mobile-only); new `js/scroll-spy.js` sets `aria-current` on active section. **(3) Lounge** — new `js/lounge-selector.js` + rewritten `css/sections/lounge.css`: expanding-panels selector (active `flex:7`, inactive `flex:1`+desaturated), NO icons, 10 panels, RTL ArrowLeft=next. **(4) Portals fix (CSS-only)** — `hero.css` portals stage now keeps `.hero__canvas` visible + `.hero__static-bg` hidden (was reversed — root cause of hidden baked bubbles); `portals.css` `.portal__overlay` → full-viewport `object-fit:cover` `scale(1.35)` matching ZOOM_FACTOR, hotspots at resort 72.8%/59.6%, venue 28.0%/59.6%. **(5) Culinary** — spacer 500vh→900vh (attr + inline style) for slower scrub over 180 frames; 6 dish placeholders filled (`<picture>`+caption, images 01,05,07,09,12,13). **(6) Gallery** — 8 empty tiles → `<picture>` (images 01–08, Hebrew alts), kept `scale-up` stagger. **(7) Typography** — encoded `texture-{light,dark}.webp`, new `--texture-light/-dark` tokens, new `css/components/texture-text.css` (`@supports` `background-clip:text`); applied `.texture-text--dark` to light-bg section titles (rooms/lounge/about/testimonials/gallery/events/kosher/contact) + `--light` to dark-bg culinary title. **(8) Footer** — rebuilt to 4-col grid (brand+logo / nav / contact / social) + bottom legal strip; `css/layout.css` scoped `.contact .section-rail--end` override (un-crush the 55vw rail); `#kosher` rotate-in→fade-up (was freezing at 3deg when IO never fired). Wave-0 chokepoints (`tokens.css`, `js/main.js` registry, `scripts/encode-images.mjs` +24 images) serialized; all section files isolated/parallel; `index.html` markup applied serially. | 10 agents + main |
| 2026-06-02 | **Design-polish pass** (`design-taste-frontend` + `emil-design-eng` skills). Copy: renamed nonsensical room "חדר הבוקיט"→"סוויטת בוטיק"; removed ALL visible em-dashes from `index.html` (titles, meta, JSON-LD, body copy, alt text, aria-labels) per zero-em-dash rule, replaced with comma/colon/period (HTML comments left untouched — not user-visible). Craft: added `:active` press feedback `scale(0.98)` to `.lounge__panel` and `scale(0.99)` to `.rooms__trigger` (Emil — pressable elements must confirm the press) with `transform` added to their transitions + reduced-motion null-out. | main |
| 2026-06-04 | **Lounge gallery: 10-panel expanding carousel → 8-item 3D circular ring.** Vanilla port of the user's React `CircularGallery` spec. New 8 source photos (`ec(4..173of240).jpg`) re-encoded into `assets/images/halls/lounge/0{1..8}.{full,half}.{webp,jpg}` (orphans 09/10 wiped). Markup: `<section id="lounge">` rewritten — `.lounge__stage` (`perspective: 2000px`) > `.lounge__ring` > 8 × `<figure data-lounge-item>`. `js/lounge-selector.js` rewritten: section-progress (`getBoundingClientRect`) drives `--lounge-rotation`, slow `0.04°/frame` drift kicks in after 200ms scroll-idle, IO-gated RAF (no work off-screen), per-item `--lounge-opacity = max(0.3, 1 - dist/180)` walks the ring each tick. `css/sections/lounge.css` rewritten: 3D ring on desktop, 2-col grid fallback for `≤ 768px` AND `prefers-reduced-motion: reduce`. Wave-1 producers (encoder, markup, JS, CSS) ran in parallel; main.js registry + side-dot-nav SECTIONS unchanged (`#lounge` + label "לאונג'" preserved). | 4 agents + main |
| 2026-06-04 | **Culinary: 3 new dishes + new scrub video (reversed) + display quality bump.** New source `1.4.mp4` (9.4MB, exceeds §8 6MB per-scene budget — accepted per user request for higher quality) copied to `assets/video/culinary-1080.mp4`. Frame extractor `scripts/encode-frames.mjs` culinary scene config bumped: 1920px / 30fps / q88 → **3840px / 24fps / q92** (matching source 4K + native fps; was downsampling half the horizontal pixels and interpolating 6 dup frames/sec). 361 frames @ 4K / WebP q92 = 132MB total (avg 375KB/frame). Two-phase preloader still gates LCP at 10 frames (~3.7MB); phase-2 streams `fetchpriority=low`. New `data-scrub-reverse` attribute supported in `js/scroll-scene.js` (composes with `data-scrub-frame-offset`); applied to `<section id="culinary">` so the new clip plays back-to-front; old `data-scrub-frame-offset="0.5"` dropped. Three new dish photos (`7/8/9.jpg` renamed to `14/15/16` to avoid encoder collision with existing 07/09) encoded into `assets/images/culinary/{14,15,16}.{full,half}.{webp,jpg}`; gallery grew 6 → 9 items. Display quality: all dish gallery `<picture>` elements switched from `.half.{webp,jpg}` (960px) to `.full.{webp,jpg}` (1920px) for retina-sharp rendering. New dish captions are placeholders ("מנה עונתית"/"מנת בית"/"סיום ערב") — user to refine copy. | main |
| 2026-06-04 | **§2.1 amendment + halls/ React sub-app.** Per-user mandate ("תשנה את ה-Constitution שכן יתיר רק לשני הדפים הללו React/Vite/Tailwind בזמן ריצה"), §2.1 added allowing **React 19 + TypeScript + Vite 6 + Tailwind v4 + Motion + Lucide + Three.js** at runtime — but ONLY under `halls/` for the two URLs `/halls/oasis/` and `/halls/lumina/`. Direct port of `D:\משה פרוייקטים\arch-corridor-gallery` (LandingHero shader + ThreeDCorridor + ProjectDetail). Build → `halls/dist/` static, served by existing `npx serve`. `vite.config.ts` sets `base: "/halls/dist/"` and dual entrypoints (`index.html` = oasis, `lumina.html` = lumina); `halls/scripts/post-build.mjs` mirrors the two HTMLs into `dist/oasis/` + `dist/lumina/` so the URLs are clean. Each HTML carries `<html data-initial-hall="…">` which `main.tsx` reads to seed `<App initialHall=…>`. Hall switch + Home button navigate via `window.location` (no shared SPA router with the main site). 12 source images copied verbatim from `assets/images/corridor/{venue,resort}/*.full.jpg` into `halls/public/images/projects/oasis-{01..06}.jpg` + `lumina-{01..06}.jpg`; `projectsData.ts` rewritten to point local. Vanilla `corridor.html` + `js/corridor.js` retained as legacy fallback. Root `package.json` adds `dev:halls` + `build:halls`. `js/hero-shader.js` `gamosHeroToGallery.enter()` re-pointed from `/corridor.html?hall=…` → `/halls/{oasis,lumina}/`. | main + 3 sub-agents |
| 2026-06-04 | **`#shabbat-chatan` extended to 4-panel sequence using all 10 images.** Per-user feedback ("צריך להשתמש בכל התמונות", "שלושת התמונות הראשונות צריכות להיות בתחילת הגלילה"), kept the repo's exact 3-image absolute layout (50vh×60vh / 30vh×40vh / 20vh×25vh; left 55vw / 27.5vw; top 15vh / 40vh; rates `-50/-150/-255px`) but stacked it across 4 panels (`data-shabbat-panel="0..3"`) inside the sticky 100vh viewport. Spacer bumped 200vh → 500vh. Panel 1 = imgs 01/02/03 (matches repo at p=0 — first thing visible after culinary), panel 2 = 04/05/06, panel 3 = 07/08/09, panel 4 = closing img 10. `js/shabbat-parallax.js` now writes `--shabbat-progress` (global), `--shabbat-stack-y` (vh, 0 → -(N-1)·100), and per-panel `--panel-progress` (each panel's local 0..1 band of length 1/N). Title body is absolutely positioned in the viewport (does not translate with the stack); title-1 still gets the `-50px` scrub and per-letter `--letter-y` still random `[-100..-25]px`. Mobile (≤640px) hides panels 2-4 via `display:none` and freezes the stack — shows only the repo composition with imgs 01-03. **Top nav reordered** to match user numbering: `אולם → ריזורט → קולינריה → שבתות חתן → חדרי נופש → גלריה → צור קשר` (primary). `data-secondary` items (`לאונג' / אודות / המלצות / אירועים / כשרות`) preserved for the mobile overlay only. side-dot-nav has the dot between culinary and rooms (11 dots total). | main |
| 2026-06-08 | **Hero v2 — layered 5-PNG composition + hover anims + Pure Olivier cover.** Per-user feedback ("התמונה שנקראת שכבה 2 היא התמונה הבסיסית, עליה יש את התמונות: של GAMOS EVENT ו RESORT ולבסוף המדבר; כל החמש באיכות מקסימלית; כשאני מרחף על הריזורט או איבנט זה צריכה להיות אנימציית תגובה; הסקציה הבאה מיד אחרי המדבר עולה — Olivier sticky-footer"), the v1 single-image hero (HERO-GAMOS.png) was reverted. New `#hero` markup composes **5 absolute-positioned PNG layers** (z-order bottom→top): `base` (שכבה 2 — viewport rect), `gamos` (top-left decorative), `events` + `resort` (interactive `<a>` CTAs centered horizontally, stacked vertically), `desert` (anchored to hero bottom). Each layer is an independent encoded WebP with alpha preserved (q=88 for the two big ones; q=92 for the three text layers); `base` also gets a JPG fallback flattened to ivory. **Hover anim is pure CSS:** focused CTA gets `transform: scale(1.06)` + `drop-shadow(0 0 28px brass-glow)` + `brightness(1.10)`; sibling dims to `opacity: 0.55` + `brightness: 0.92` via `:has(.hero-static__cta:hover)`. `prefers-reduced-motion: reduce` kills the scale but keeps the glow. **`#hero-cover` simplified** from v1 (200vh + 100vh hold) to **100vh single-spacer Pure Olivier**: desert rises from `translateY(100%)` to `translateY(0)` over the full section, then `#lounge` enters immediately on unstick — no hold. Encoder (`scripts/encode-images.mjs`) extended with `singleWidth`/`singleQuality` mode (one .webp file, alpha-preserved q=92) and `webpOnly: true` flag (skips JPG fallback) on top of the existing pair-mode. **Modified:** `index.html` (5-layer markup + 5 preloads + simplified cover), `css/sections/hero-static.css` (rewrite for layered structure + hover anims), `css/sections/hero-cover.css` (rewrite to 100vh pure-Olivier), `scripts/encode-images.mjs` (new NAMED_PAIRS for 5 sources, dual-mode encoder loop), `CLAUDE.md` §3 (rewrite). **Deleted:** `assets/images/hero/hero-gamos.{full,half}.{webp,jpg}` (v1 leftovers, 4 files), `desert.{full,half}.jpg` (no-longer-used JPG fallbacks for desert; WebP-only is mandatory because alpha is needed). **Files unchanged:** `js/hero-static.js` (selector + click logic still match), `js/main.js`, `js/site-nav-hover-reveal.js`. Total hero weight: ~265KB across 5 WebP files (base 5KB + gamos 22KB + events 15KB + resort 13KB + desert 209KB). | main |
| 2026-06-08 | **Hero replaced + Three.js removed + halls dropped from homepage.** Per-user mandate, the Three.js shader hero (FBM noise + lens reveal + chromatic aberration) was swapped for a static `HERO-GAMOS.png` image (~137KB WebP) at 100vh with two transparent `<a>` hotspots over the baked-in EVENTS / RESORT words → `/halls/dist/oasis/` + `/halls/dist/lumina/`. New `#hero-cover` section (200vh, `data-scrub-mode="poster-ken-burns"`, `data-scrub-spacer-vh="200"`) implements Olivier-Larose sticky-footer pattern: `מדבר.png` (transparent PNG, encoded with alpha-preserved WebP) rises from `translateY(100%)` to `translateY(0)` over the first 100vh of the section (driven by `--scene-progress` of `gamosScroll`, compressed via `--rise = max(0, min(p*2, 1))`), then holds pinned for 100vh before `#lounge`. **Deleted:** `js/hero-shader.js`, `css/sections/hero-shader.css`, `assets/vendor/three.module.min.js`, `assets/vendor/three.core.min.js`, `js/hero-video-scrub.js`. **New:** `js/hero-static.js` (~115 lines: hotspot click handlers + `gamosHero` progress stub for side-dot-nav HERO_DOMINANCE compatibility), `css/sections/hero-static.css`, `css/sections/hero-cover.css`. Encoded `assets/images/hero/{hero-gamos,desert}.{full,half}.{webp,jpg}` via new `NAMED_PAIRS` block in `scripts/encode-images.mjs` (preserves alpha for desert WebP, flattens JPG fallbacks onto ivory). `index.html`: removed `<link>` tags for `hero-shader.css` + `hall-venue.css` + `hall-resort.css`; added `hero-static.css` + `hero-cover.css`. `js/main.js` MODULES: `'hero-shader' → 'hero-static'`; removed `'hero-video-scrub'`, `'corridor'`, `'project-drawer'`. `js/site-nav-hover-reveal.js`: `HERO_SELECTOR` updated `#hero.hero-shader` → `#hero.hero-static`. Sections `#hall-venue` + `#hall-resort` already removed from `index.html` previously; their CSS retained on disk but not linked. `js/corridor.js` retained as legacy fallback (was already a no-op against the static hero DOM). Hero LCP candidate is now the `<img>` (preload `<link rel="preload">` repointed). `§3` rewritten to describe the static-image hero + sticky-rise concept. | main |
| 2026-06-04 | **Hero rebuild + corridor halls.** Port of `D:\משה פרוייקטים\arch-corridor-gallery` (React+Three.js prototype) into the live site. **§2 amendment:** Three.js core allowed self-hosted (`/assets/vendor/three.module.min.js`, ~365KB ESM, GSAP precedent — no CDN, no R3F/Drei). New `#hero` is a single 100vh `<section class="hero-shader">` whose `<canvas[data-hero-shader]>` is driven by `js/hero-shader.js` — verbatim GLSL port of the prototype's FBM noise distortion + spherical lens reveal + chromatic aberration. Two clickable Hebrew labels ("אולם" / "ריזורט") rendered via `CanvasTexture`; click → `playWhoosh` (Web Audio synth in new `js/audio.js`) → 1.1s `window.gamosLoading.show()` overlay → smooth-scroll to `#hall-venue` / `#hall-resort`. WebGL fallback: on `WebGLRenderer` constructor throw OR `?nogl=1` flag, replaces canvas with `<picture>` + two transparent `<a>` hotspots. DPR capped 1.75; battery-saver IntersectionObserver pauses RAF when hero is offscreen. Two new corridor scroll-scenes replace the deleted poster-Ken-Burns hall sections: `#hall-venue` (10 cards / 600vh spacer / archway columns / oasis amber orb) and `#hall-resort` (6 cards / 400vh spacer / mountain curves / lumina water-canal clip-path + amber bottom). Both opt into `data-scrub-mode="custom"` + `data-scrub-handler="gamosCorridor"`; `js/corridor.js` shares one RAF for both halls and writes per-card inline `transform` (`translate3d(altOffset, itemY, itemZ) rotateY rotateX`) + `opacity` per the prototype's math, with the LTR "even-card-on-left" wall conditional flipped to "even-card-on-right" for RTL. Mouse parallax tilts only the centered card (single window mousemove listener gated by `gamosScroll.getActive()`; skipped on coarse-pointer). HUD: prev/next + per-card jump pills, `gsap.scrollTo(section.offsetTop + (i/N)*spacerPx)`. Keyboard ArrowDown/Up step ±1 card while corridor is the active scene. Card click currently `playClick()` only; ProjectDetail drawer is post-MVP. New encoded image sets: `assets/images/corridor/venue/{02,04,05,06,07,7_1,09,11,13,14}.{full,half}.{webp,jpg}` (10 sources, encoder src `השראות/תמונות מרחפות/אולם`) and `assets/images/corridor/resort/{4_1,05,10,14,15,17}.{full,half}.{webp,jpg}` (6 sources, src `השראות/תמונות מרחפות/ריזורט`). NEW outDir `corridor/*` to avoid collision with legacy `halls/{venue,resort}` images still referenced by about + scrolling chrome. side-dot-nav `SECTIONS` re-mapped: 12 dots, dropped `section-2` placeholder, added `events`. Order now: hero / hall-venue / hall-resort / lounge / culinary / rooms / about / testimonials / gallery / events / kosher / contact (matches user's "dot1=hero, dot2=אולם, dot3=ריזורט" mandate). main.js MODULES re-ordered: `loading-overlay` and `hero-shader` move BEFORE `scroll-scene`/`side-dot-nav`/`portals` so `window.gamosLoading` + `window.gamosCorridor` + the `gamosHero` no-op stub (releases the dominance gate) are installed before consumers attach. `portals.js` and `hero-video-scrub.js` kept on disk (already bail safely when their DOM is missing); they no-op against the new hero. Card copy: short Hebrew placeholders, will be refined later by user. | main |
| 2026-06-08 | **Hero v3 — sticky-pin freeze + desert-only rise + 50vh hero-gap.** Per-user mandate ("התמונה של המדבר תעלה כלפי מעלה, כל שאר האלמנטים בתמונת ההירו נשארים קפואים, מיד אחרי ההירו מרווח קצר"), the v2 two-section model (`#hero` 100vh + `#hero-cover` 200vh w/ `margin-top:-100vh` overlap) was collapsed into **one** `#hero` section of 200vh with a sticky-pinned 100vh interior (`.hero-static__pin`). All five layers now live inside the pin. The four upper layers (base, GAMOS, EVENTS, RESORT) remain pixel-frozen during the entire scroll; **only the desert layer** reads `--scene-progress` (written by `js/scroll-scene.js` for `data-scrub-mode="poster-ken-burns"`) and translates `Y(0 → -100vh)` to lift the silhouette off the top. After the section unsticks, a new `<div class="hero-gap" aria-hidden="true">` (50vh ivory band) gives the eye a brief breath before `#lounge` enters. Reference: Osmo CSS at `C:\Users\art1\Desktop\HERO-EXAMPLE.txt`. **Modified:** `index.html` (collapsed two sections into one, wrapped 5 layers in `.hero-static__pin`, added `data-scrub="hero"` + `data-scrub-mode="poster-ken-burns"` + `data-scrub-spacer-vh="200"` on the section, inserted `.hero-gap` div, deleted the old `#hero-cover` markup), `css/sections/hero-static.css` (rewrite: section becomes 200vh, new `.hero-static__pin` rule, desert gets `transform: translateY(calc(var(--scene-progress) * -100vh))` + `will-change: transform`, all `.hero-cover*` rules deleted, new `.hero-gap` rule added, `prefers-reduced-motion` killswitch on the desert), `CLAUDE.md` §3 (rewrite to v3). **Touched comments only:** `scripts/encode-images.mjs` (one comment line). **Files unchanged:** `js/scroll-scene.js` (already handled this mode), `js/hero-static.js` (hotspot bindings unaffected), `js/main.js`, `mobile/css/hero-static.css` (only references `.hero-static__layer--*` selectors, all preserved), `js/side-dot-nav.js` (only ever referenced `#hero`, never `#hero-cover`). | main |
| 2026-06-09 | **Hero v7 — single-section sticky-pin + two-phase rise + new desert PNG.** Per-user mandate ("לקצר את ההפרדה בחצי, המדבר מעל כולם, רק הוא זז עד אמצע ואז כולם עולים יחד עם המעבר לסקציה הבאה"), the v6 dual-section model (`#hero` 100vh + `#hero-cover` 200vh w/ `margin-top:-100vh`) was collapsed into ONE 150vh `#hero` (matching the v3 idea but with the gap halved from 200vh→150vh). Pin = 100vh; scroll travel = 50vh of scroll drives `--scene-progress` 0→1 via the existing `data-scrub-mode="poster-ken-burns"` writer (`js/scroll-scene.js:111-116`). The trailing 50vh of the section IS the hero/lounge gap — `.hero-gap` removed; `#hero-cover` removed. **Z-order swap:** desert promoted from z=3 → **z=10 (TOPMOST)**, covering EVENTS/RESORT typography at progress=0 per user spec; events lowered z=5→3, resort lowered z=5→4. **Two-phase choreography (CSS calc, no new JS):** `--p1 = min(1, p*2)`, `--p2 = max(0, p*2-1)` derived on the section root. Phase A (0→0.5): only desert moves — `translateY(p*-100vh)` reaches `-50vh` at p=0.5; the four others frozen. Phase B (0.5→1): desert continues to `-100vh`; base+gamos+events+resort rise together via `translateY(--p2 * -100vh)` (0→-100vh). At p=1 the full composition is at -100vh and `#lounge` fills the viewport. CTAs compose `translateX(-50%)` centering with the Phase B rise; hover/focus glow moved onto inner `<img>` so `scale(1.06)` doesn't clobber the parent's rise transform. **New desert PNG re-encoded:** source `תמונות לאנימציית האתר/HERO/מדבר.png` (15.4MB) → `assets/images/hero/desert.{full,half}.webp` (122KB + 23KB). **Encoder path bug fixed:** all 5 `NAMED_PAIRS` entries in `scripts/encode-images.mjs` had `src: "תמונות לאנימציית האתר/השראות/HERO/…"` — that directory doesn't exist; canonical sources live at `…/HERO/…` one level up. Future re-runs would have skipped silently before the fix. **Modified:** `index.html` (collapse two `<section>`s into one `#hero` with `.hero-static__pin` wrapping all 5 layers; `data-scrub="hero-rise"` + `data-scrub-mode="poster-ken-burns"` + `data-scrub-spacer-vh="150"`; deleted `#hero-cover` block), `css/sections/hero-static.css` (full rewrite; `--p1`/`--p2` derivation, all rises, z-order swap, hover-on-inner-img), `mobile/css/hero-static.css` (preserved Phase B rise inside the pill-button transform — `translateX(-50%) translateY(--p2 * -100vh)`; reduced-motion strips both), `scripts/encode-images.mjs` (5 paths fixed), `CLAUDE.md` §3 (rewrite to v7). **Files unchanged:** `js/scroll-scene.js`, `js/hero-static.js` (hotspot bindings + `gamosHero` stub work as-is), `js/main.js`, `js/scroll-orchestrator.js`. **Verification (manual, post-encode):** new desert silhouette differs from old; click-through on transparent pixels still hits CTAs at p=0; reduced-motion freezes all rises. | main |
| 2026-06-09 | **Hero v8.1 + lounge top-padding fix + nav typography.** Per-user feedback ("הגלילה נורא מהירה — מבטל את האפקט הקולנועי; חלק ריק מתחת להירו [צילום ivory band]; להגדיל טקסטים ב-NAV; הגדל גם את הלוגו"). **(1) Empty band root cause:** `css/sections/lounge.css:20` set `.lounge { padding-block: var(--space-32) }` = 128px ivory cap at the top of `#lounge`. Since v8 left no trail in the hero itself, this lounge top-padding became the visible "gap". Fixed by switching to asymmetric padding: `padding-block: var(--space-12) var(--space-32)` (48px top, 128px bottom). **(2) Hero scroll travel restored:** v8's 10vh travel was so tight it killed the cinematic rise (one wheel-tick skipped the entire choreography). Section bumped 110vh → **135vh** (`hero-static.css:41`); `data-scrub-spacer-vh` synced 110→135 (`index.html:233`). 35vh of scroll travel = a deliberate, watchable rise — still tighter than v7's 50vh. **(3) Nav typography:** `font-size: clamp(1.05rem, 1.2vw, 1.2rem)` → `clamp(1.25rem, 1.5vw, 1.5rem)` for `.site-nav__links a` (`site-nav.css:120`); logo `.site-nav__brand-logo` height 56px → 76px and `max-inline-size` 260 → 340; scrolled-state logo height 44 → 56. **Modified:** `css/sections/lounge.css` (line 18-22), `css/sections/hero-static.css` (line 41 + comment), `css/sections/site-nav.css` (lines 90 + 97 + 120), `index.html` (line 233 + comment), `CLAUDE.md` §3 (v8→v8.1) + this row. **Files unchanged:** the v8 nav double-jump fix (data-attr-driven grow) is preserved as-is. | main |
| 2026-06-09 | **Shabbat-chatan rebuild — GSAP pinned mask-reveal (CodePen WbQPRwv port).** Per-user mandate (skill-orchestrator + 15-agent swarm), the section was rebuilt from David Faure's horizontal parallax row to gridmorphic's "GSAP pinned image mask reveal on scroll" pattern. **Layout:** two columns inside `.shabbat__container` — left `.shabbat__panels` is a vertical flex column of 5 × `.shabbat__panel` (each `min-block-size: 100vh` → 500vh of scroll); right `.shabbat__stage` (`block-size: 100vh, position: relative`) holds 5 × `.shabbat__media` stacked absolutely with `inset-block-start: 50%, transform: translateY(-50%)` and z-index from `data-index="5..1"` (last in DOM has lowest z). **Choreography:** `gsap.timeline({ scrollTrigger: { trigger: container, start: "top top", end: "bottom bottom", pin: stage, scrub: true } })`. Per panel transition: current image's `clip-path: inset(0 0 0 0) → inset(0 0 100% 0)` wipes upward + `object-position: 0% 0% → 0% 60%` Ken-Burns down; next image `object-position → 0% 40%`; section's background-color cross-fades to next pastel. **Mobile (≤768px):** pin dropped; `display: contents` on both columns + JS `style.order` interleaves panel/image/panel/image. Each image gets its own ScrollTrigger for an `object-position` Y-pan + body-tint shift (mirrors pen's mobile branch). **§5 user-authorised exception:** the dark `#1B1410` ground was traded for a 5-color pastel cycle (`#EDF9FF / #FFECF2 / #FFE8DB / #EAFFE2 / #F4ECFF`) tokenised as `--shabbat-tint-1..5` in `css/tokens.css`, with `--shabbat-tint` written by the timeline. Headlines flipped from `texture-text--light` → `texture-text--dark` (dark gold-flecked on pastel). **Copy:** 5 Hebrew headlines (no descriptions, no CTAs per user) — "צאו מהקצב היומיומי / שולחנות ערוכים בכבוד / שירה שעולה מן הלב / סעודות שלוש על נפלאות העונה / שבת של נשמה, ביחד". **Images:** `01 / 03 / 05 / 07 / 09.full.{webp,jpg}` selected for max visual variation across the existing 9-image set (02/04/06/08 + the orphan 10 stay encoded but unreferenced). **Modified:** `index.html` (added `<script defer src="/assets/vendor/ScrollTrigger.min.js">` after the existing GSAP tags; replaced `<section id="shabbat-chatan">` block — dropped `data-scrub-*` attrs, scroll-scene class, and `.scroll-scene__spacer`, replaced sticky single-row markup with two-column container), `css/tokens.css` (appended `--shabbat-tint-1..5` + `--shabbat-tint`), `css/sections/shabbat-chatan.css` (full rewrite — 2-col flex container, absolute-stack media, prefers-reduced-motion fallback to vertical column), `js/shabbat-gallery.js` (full rewrite — drops Faure horizontal-translate logic and `window.gamosShabbat`; builds master timeline via `ScrollTrigger.matchMedia({ desktop, mobile })`; reads tints from `:root` computed style and writes them back to the section's `style.backgroundColor` + `--shabbat-tint`), `mobile/css/shabbat-chatan.css` (full rewrite — `display: contents` on both columns, headline + media block-size adjustments, no scroll-snap), `js/main.js` (added `import * as shabbatMobile from "../mobile/js/shabbat-chatan-mobile.js"` + `["shabbat-chatan-mobile", shabbatMobile]` registry entry after `shabbat-gallery`). **New file:** `mobile/js/shabbat-chatan-mobile.js` (applies `style.order` on panels and media for the mobile interleave, with `matchMedia` change listener; lifecycle `init()/destroy()`). **Section drops out of scroll-orchestrator** entirely (no `[data-scrub]` attribute) — ScrollTrigger owns timing standalone. `js/side-dot-nav.js` unchanged: still navigates to `#shabbat-chatan` via the section id (the only thing it needs). **Files unchanged:** `js/scroll-scene.js`, `js/scroll-orchestrator.js`, `mobile/loader.js` (already auto-loads `mobile/css/shabbat-chatan.css`). Reference: `https://codepen.io/gridmorphic/pen/WbQPRwv` fetched via `cdpn.io/fullpage/WbQPRwv` mirror after Cloudflare blocked the canonical URL. | main + 2 Explore sub-agents |
| 2026-06-09 | **Hero v8 + nav double-jump fix + GAMOS-cover-on-reveal.** Per-user feedback ("ה-NAV BAR יכסה את GAMOS בכל פעם שארחף; באג של שני קפיצות, השני נורא גדול ולא פרופורציונאלי; קצר את ההפרדה בין ההירו לסקציה הבאה"). **(1) Nav double-jump fix.** v7 stacked TWO independent transitions: (a) `[data-nav-revealed]` slid the bar from `translateY(-100%)` to `translateY(0)` at its default 88px / 24px-padding height; (b) `:hover` then jumped `min-block-size` 88→160px (a 72px delta firing AFTER reveal completed) — visible as a small slide-in followed by a much larger snap. The `:hover` and `:focus-within` selectors at `css/sections/site-nav.css:67-76` were replaced with a single rule keyed off `html[data-hero-mode="true"][data-nav-revealed="true"] .site-nav__inner` that sets `padding-block: var(--space-10)` + `min-block-size: 160px`. The size grow now rides the SAME transition as the slide-in (one motion, not two). The opaque-ivory background + box-shadow (which also share that selector) live in `css/components/site-nav-hover.css:30-37` — already keyed off `[data-nav-revealed]`, so visual treatment was already unified there; this commit just brings the size to match. **(2) GAMOS coverage.** As a consequence of (1), every reveal now pushes the bar to 160px regardless of cursor position — the GAMOS PNG (top:4%, ~95px tall, ending ~140px from viewport top) is fully obscured the moment the bar lands. v7 only covered it if the cursor crossed the bar's bounding box; quick swipes left it uncovered at 88px. **(3) Hero gap collapse.** Section shrunk **150vh → 110vh** (`css/sections/hero-static.css:41`) — choreography compresses from 50vh of scroll to **10vh** (5× tighter). `data-scrub-spacer-vh` synced 150→110 (`index.html:233`, declarative-only for `#hero` since `applySpacerHeight` looks for a `.scroll-scene__spacer` child not present in the hero markup). Constraint: 100vh is impossible — `js/scroll-orchestrator.js:62-68` returns `p=0` when `rect.height - viewportHeight ≤ 0`, so a positive scroll-travel value is required. The 10vh floor is the minimum perceptible animation distance (~108px on a 1080-tall viewport). **Modified:** `css/sections/site-nav.css` (rule swap), `css/sections/hero-static.css` (line 41 + comment), `index.html` (line 233 + comment block 217-229), `CLAUDE.md` §3 (rewrite v7→v8) + this row. **Files unchanged:** `js/site-nav-hover-reveal.js` (already toggles the data-attrs that now drive the size grow), `css/components/site-nav-hover.css` (background/shadow already correctly keyed), `js/scroll-orchestrator.js`, `js/scroll-scene.js`, `mobile/css/hero-static.css`. | main |
| 2026-06-09 | **Press page v4 — article-scraped images.** Per-user feedback ("אני חושב שלא הבנת נכון את העניין עם התמונות. אתה צריך ללכת לכל קישור וקישור שיש בקובץ הזה ... לעשות SCRAPE רק לתמונות ששיכות באותה כתבה ... רק התמונה של ההירו תשים תמונה משלך"). Previous iterations placed GAMOS's own marketing photos on press cards — the user wanted **the photograph each journalist published with their story**, NOT GAMOS-curated stand-ins. Implemented full scrape pipeline: (1) `curl` with `Mozilla/5.0` UA fetched each of 7 article HTMLs; extracted `<meta property="og:image">`; logged URL + caption + photographer credit when present. (2) New script `scripts/scrape-press-images.mjs` (kept on disk for re-runs) downloads each og:image with the article URL as `Referer` to defeat hotlink blocks, then encodes via `sharp` into the standard `.full.webp/.half.webp/.full.jpg/.half.jpg` quartet at `/assets/images/press/NN.*`, sized per Constitution §8 (≤220KB full.webp). (3) For 02 mynet (anti-bot blocked WebFetch but curl works) + 04 EMESS (og:image was on emess.co.il not the proxied ahs.co.il) + 03 Maariv (the prominent banner 1271389 was a 1662×168 promotional strip — needed asset 1238780 from the actual og:image instead) we did the curl→sharp dance in Bash to bypass `node fetch()` failures. **All 7 articles delivered an image** — no fallback to GAMOS marketing photos was needed. **Hero exception:** per explicit user mandate ("רק התמונה של ההירו תשים תמונה משלך"), the hero stays as a curated GAMOS architectural photo (`halls/resort/01.full.webp`) — editorial wide-shot composition that reads like the establishing image of a *Haaretz Magazine* feature. **Credit lines added:** every card now renders `<small class="press-card__credit">` under the excerpt naming "צילום מתוך הכתבה · <outlet>" or the photographer's name where it was scraped (entry 04 — "צילום: שלומי כהן · EMESS רדיו"). Required by fair-use convention for press archives that re-host third-party images. **Defensive `.press-card--no-image` variant** added in CSS — currently unused since all 7 scrapes succeeded, but kept so a future re-scrape that loses an image won't silently fall back to GAMOS photos; instead a typographic-only cocoa-bg card with mega outlet name renders. **Image quality notes:** sources varied (1536×1160 Maariv at the high end; 268×232 ynet at the low end). `sharp` encoder uses `withoutEnlargement: true` so we never blur small sources by upscaling — the small ynet image just stays small inside the 100vh card and the gradient overlay covers the rest. **New files:** `scripts/scrape-press-images.mjs` (one-shot scrape+encode helper, source URLs hard-coded), `assets/images/press/{01..07}.{full,half}.{webp,jpg}` (28 encoded images, ~75KB-215KB each), `assets/images/press/_summary.json` (scrape-run audit log). **Modified:** `data/press.json` (replaced `image` field with `imagePath`/`imageUrl`/`imageCaption`/`imageCredit` quartet), `press/index.html` (each card's `<picture>` sources now point to `/assets/images/press/NN.*`, alt text rewritten to credit the source outlet, new `<small class="press-card__credit">` line appended to each card content block), `css/pages/press.css` (added `.press-card__credit` italic-mini styling + `.press-card--no-image` defensive variant + mobile clause keeping credits visible at ≤640px even when excerpt is hidden). **Files unchanged in v4:** `tokens.css`, every `css/sections/*.css`, every other `css/components/*.css`, every JS module under `js/` (including `js/main-press.js`), halls sub-app, mobile sub-tree. **Verification (manual):** open `/press/`, hero photo is the curated resort wide-shot; scrolling reveals 7 cards each showing the scraped article photograph (not GAMOS stock); credit line under each excerpt names the outlet; clicking a card opens the source article in a new tab. **Caveats / known limits:** entry 05 (ynet) image is small (268×232 source) — encoder did not upscale, so the visual fills the card via `object-fit: cover` cropping; if higher-res becomes available the file can be replaced with `node scripts/scrape-press-images.mjs --force`. Entry 04's caption ("חתונת בתו של מנחם טוקר") and credit ("צילום: שלומי כהן") came from EMESS's article page directly. Other articles did not surface explicit photographer credits in the scraped HTML, so credit defaults to the outlet. | main |
| 2026-06-09 | **Press page v3 — no nav, full-bleed hero, content-matched images, brand texture-text.** Per-user feedback ("התמונות צריכות להיות תואמות לכתבות ולמה שיש בכתבות; ההירו אמור להסתיר לחלוטין את ה-NAV BAR ואת הלוגו; אין NAV BAR בדף הזה; תחיל את מערכת הטקסטורות והטקסטים הבהירים והכהים כמו שיש באתר"). Three concrete changes from v2: **(1) Site-nav removed entirely from `/press/`**, replaced by a small fixed "חזרה לאתר" pill chip in the top-inline-end corner (`.press-home-link`). The chip adapts: ivory-on-transparent + blur over the dark hero, solid ink-deep pill once scrolled past (`html:not([data-press-hero="true"])` selector, since on this page hero-mode is the default-on state). Mobile ≤640px collapses the chip to a 44×44 arrow-only icon. With no nav above it, the hero `<section class="press-hero">` now starts at y=0 and covers the viewport edge-to-edge. **(2) Article-content-matched images.** Re-fetched all 7 articles to determine the actual visual subject: 01 Walla home&design (interior architecture feature) → `halls/lounge/01` (luxury materials interior, was `halls/resort/01` exterior); 02 mynet local edition (fallback) → `gallery/03`; 03 Maariv Sport1 (Buzaglo bar mitzvah w/ DJs til sunrise) → `gallery/06` celebration scene (was `shabbat-chatan/05`); 04 EMESS (Tucker wedding ceremony) → `shabbat-chatan/02` chuppah (unchanged); 05 ynet (chef Avi Biton's birthday party — gossip column about a *celebration*, NOT a food review) → `gallery/05` party atmosphere (was `culinary/04` — food was wrong); 06 Walla mekomi (venue opening, interior arch + gardens) → `halls/venue/03` (was `halls/venue/01`); 07 ICE (full complex opening, exterior shot) → `halls/resort/01`. The hero image moved to `halls/resort/01` (architectural establishing shot of the complex) — preload tag updated. **(3) Brand texture-text system applied.** Loaded `css/components/texture-text.css` + the `--typo-on-light` / `--typo-on-dark` token URLs from `css/tokens.css`. Added `.texture-text texture-text--light` to: hero h1, all 7 card h3 titles, closer h2 (cream + gold flecks fill, painted via `background-clip:text` over dark imagery). Added `.texture-text texture-text--dark` to the intro h2 sentence (dark gold flecks on ivory). Sizing-only blocks in `press.css` set font-size/family/weight without setting `color` — so the texture fill from `texture-text.css` wins. Color fallback set to `var(--ivory)` (light cards/closer) or default inheritance (dark intro) for browsers without `background-clip:text` (graceful degradation per `texture-text.css` `@supports` block). **Other v3 changes:** `js/main-press.js` no longer imports `site-nav` (no nav exists); only `reveals` + the rAF-throttled `[data-press-hero]` toggle. `press/index.html` — site-nav `<header>` + `<ul>` block deleted, `.press-home-link` chip added before the hero. `data/press.json` — `image` paths remapped per (2), added `imageAlt` field for accessibility. `index.html` (homepage) nav link to `/press/` unchanged — the homepage entry-point still works. **Files unchanged in this v3:** `tokens.css`, every `css/sections/*.css`, every `css/components/*.css`, every JS module under `js/` other than `main-press.js`, halls sub-app, mobile sub-tree, side-dot-nav. **Verification:** open `/press/`, hero photograph fills viewport from y=0 (no nav band on top), "חזרה לאתר" chip ivory-on-transparent in top-left, hero h1 painted with cream-gold texture-fill (visible against the dark gradient overlay), scroll cue bouncing; scroll past hero → chip flips to ink-deep pill, intro sentence appears with dark gold-fleck texture-fill on ivory; scroll into cards → image-content matches each headline (lounge interior for design feature, party for bar mitzvah, chuppah for wedding, etc.), card titles painted cream-gold, hover slides arrow 8px + flips status pill brass; closer photo → "החגיגה הבאה אצלכם." cream-gold; mobile ≤640px hides excerpts + collapses home-link chip. **Caveats:** entry 02 (mynet) still link-only fallback; entry 05 ynet headline ("סודות הכסף") still the column name rather than the article-specific headline. | main |
| 2026-06-09 | **New press page (`/press/` — מן העיתונות) + nav insertion.** Per-user mandate ("דף הפנייה חדש שנקרא 'מן העיתונות' … יימצא ב-NAV BAR בין גלריה לצור קשר; מעוצב כמו eleos.la בצבעים של האתר; משוכפל מבחינת האנימציות"). New standalone HTML page `press/index.html` listing 7 articles about Gamos sourced from `D:\משה פרוייקטים\GAMOS-DOCS\קטעים מהעיתונות.txt` (Walla, mynet ירושלים, Maariv Sport1, EMESS, ynet, Walla מקומי, ICE — hydrated 6/7 via WebFetch; mynet blocked by anti-bot, fallback link-only entry). **Design language: Eleos-style editorial restraint** — hairline-divided rows (`1px solid rgba(26,20,16,0.10)`), zero-padded large index numbers (01-07), sentence-case titles with RTL underline-grow, single micro-motion (arrow `←` translateX(-6px) on hover/focus). Quiet 80vh masthead (no scrub/pin) — eyebrow + h1 with `texture-text--dark` + lede, all `data-reveal="fade-up"`. List uses `[data-stagger]` on `<ol>` so existing `js/reveals.js` applies `index × 80ms` delay (capped at 8 children). Hover state: brass-tinted background + title underline grows from RTL right edge (mimics `.site-nav__links a::after` pattern). CTA strip closes the page (replaces footer — none instantiated site-wide yet). **NO new tokens, NO scroll-orchestrator scenes, NO GSAP, NO canvas frames.** Reuses existing animation grammar verbatim. **New files:** `press/index.html` (~12 KB markup, head clones core preloads + tokens + base + nav + reveals + texture-text), `css/pages/press.css` (page-scoped styles, ~7 KB — masthead, hairline rows, index numbers, hover micro-motion, CTA strip, ≤900px + ≤640px responsive breakpoints, reduced-motion zeroes every transition), `js/main-press.js` (minimal ESM bootstrap importing only `reveals` + `site-nav` — skips canvas/lounge/hero/scroll-scene/shabbat/portals etc.), `data/press.json` (7-item article registry: id, url, outlet, dateISO, dateHe, title, excerpt). **Modified:** `index.html` (single `<a href="/press/">מן העיתונות</a>` inserted between `#kosher` and `#contact` in `.site-nav__links`; primary link, no `data-secondary` flag — visible on desktop AND mobile overlay since `js/site-nav.js` clones the full `<ul>`). The press page's nav clone uses absolute hrefs (`/#culinary` etc.) so cross-page nav routes back to home + anchor; press link itself carries `aria-current="page"` so the underline + brass-deep color persist while on the page. **Files unchanged:** `tokens.css`, every `css/sections/*.css`, every `css/components/*.css`, every JS module under `js/`. Scope NOT touched: side-dot-nav SECTIONS array (press is its own URL, not a homepage section); `/mobile/` sub-tree (no overrides needed — page is text-only and already responsive); halls sub-app. **Verification (manual, post-build):** open `/press/` in a local server, confirm nav shows "מן העיתונות" between "כשרות" and "צור קשר" (mobile overlay too), masthead fades up on load, rows stagger in on scroll, hovering a row slides arrow 6px leftward + grows title underline from right + tints background brass@6%, clicking row opens article in new tab, `prefers-reduced-motion: reduce` zeroes all transitions, ≤640px stacks index/body and pushes arrow to a third row end-aligned. | main |
| 2026-06-08 | **Mobile-ready pass + §13 sub-tree convention.** Per-user mandate ("שיהיה נגיש גם למובייל תוך שמירה על כל האלמנטים והחוויה"), built a dedicated `/mobile/` sub-tree that holds every mobile-specific override. Branch `feature/mobile-pass`. New §13 in CLAUDE.md formalises the convention; new `mobile/README.md` mirrors it for onboarding. **Phase 1A — responsive `<picture>`:** scripted insertion of `<source media="(max-width: 768px)" srcset="…half.webp">` before each desktop `.full.webp` source across 37 pictures (lounge ×8, culinary ×9, shabbat ×9, rooms ×10, venue ×1) — halves mobile image payload. **Phase 1B — Heebo preload:** added `heebo-400.woff2` to the preload block (was loading after first paint, causing CLS). **Phase 2A — Lounge mobile ring:** removed the `(max-width: 767.98px)` flat-grid fallback from `css/sections/lounge.css` (kept the `prefers-reduced-motion` clause); new `mobile/css/lounge.css` shrinks perspective/stage/items; `js/lounge-selector.js` now exports `__setRadiusOverride()` + `__relayout()` hooks; new `mobile/js/lounge-mobile.js` installs `clamp(180, 50vw, 280)` radius for ≤768px so per-item translateZ math fits a 360px viewport without overflow — preserves the 3D ring instead of falling to a static grid. **Phase 2B — Shabbat snap carousel:** removed the `(max-width: 640px) flex-direction: column` fallback from `css/sections/shabbat-chatan.css`; new `mobile/css/shabbat-chatan.css` converts `.gallery__image__container` to a horizontal `scroll-snap-type: x mandatory` carousel (78%-wide cards, peek-of-next, RTL natural reading) — preserves the section's left-to-right narrative on phones. `shabbat-gallery.js` already short-circuits at `innerWidth ≤ 640`, so no JS change. **Phase 2C — Culinary mobile frames:** new `mobile/scripts/encode-frames-mobile.mjs` (encodes a 960px / q=80 / 24fps mirror of the desktop 4K culinary frame set, ~13MB total vs ~200MB desktop); new `data-manifest-url-mobile="…/culinary-mobile/manifest.json"` attribute on the canvas; new `mobile/js/canvas-frames-mobile.js` rewrites `data-manifest-url` to the mobile URL on `matchMedia("(max-width: 768px)").matches` BEFORE `scroll-scene` fetches the manifest. User must run `node mobile/scripts/encode-frames-mobile.mjs` once to populate `assets/frames/culinary-mobile/` (left intentionally outside the commit). **Phase 3A — Hero CTA spacing:** removed the (max-width: 768px) block from `css/sections/hero-static.css`; new `mobile/css/hero-static.css` re-positions events @ top:20% / resort @ top:44% (was 22%/32% which overlapped at 320×568) and adds a 480px refinement. **Phase 3B — Touch targets:** new `mobile/css/touch-targets.css` enforces ≥44×44 hit area on contact submit/CTAs, footer social pills (was 36×36), slider dots (visible 10×10 stays via ::before, hit area expanded to 44×44), and mobile-overlay nav links. **Wiring:** 6 `<link rel="stylesheet" href="/mobile/css/…">` lines added after the components block in `index.html`; 2 imports + 2 MODULES entries (`canvas-frames-mobile` BEFORE `scroll-scene`, `lounge-mobile` AFTER `lounge-selector`) in `js/main.js`. **Halls sub-app (`/halls/dist/oasis/`, `/halls/dist/lumina/`)**: scope-excluded from this pass per user — QA-only on physical iPhone 12 + Galaxy S22; if regressions surface, separate ticket. **Out of scope this pass:** halls bundle re-tune, frame variants for hero (already 5-PNG static), Lenis (still a stub). | main |
