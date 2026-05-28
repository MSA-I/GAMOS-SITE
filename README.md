# GAMOS-SITE

אתר עברית-RTL יוקרתי לבנייה מחדש של [gamos.co.il](https://gamos.co.il/) —
מתחם אירועים יוקרתי, גנים וריזורט.

---

## תיאור הפרויקט

GAMOS-SITE הוא פרויקט בנייה-מחדש מלא של אתר Gamos הקיים, המתמקד בחוויית
משתמש קולנועית: hero מבוסס scroll-driven video שמסתיים בשתי **בועות-פורטל**
(אולם / ריזורט) המובילות לסקציות אולמות מלאות, ולאחריהן סקציות סטטיות
עשירות באנימציה (אקורדיונים, סליידרים, parallax, reveal-on-scroll).

הפרויקט נכתב ב-**HTML/CSS/JS וונילה** ללא frameworks וללא 3D engines —
חוויה יוקרתית מבוססת על קוד נקי, GSAP/ScrollTrigger ו-Lenis בלבד.

### חוויית המשתמש

- **Hero scroll-driven:** סרטון אחד תפור מקליפי מקור, שה-`currentTime`
  שלו מקושר ל-scroll progress דרך GSAP ScrollTrigger.
- **Portal Bubbles:** ב-92% מההירו, שתי בועות עגולות (אולם / ריזורט)
  נחשפות עם `clip-path: circle()` ולולאת וידאו ברקע.
- **Click → Hall:** קליק על בועה מרחיב אותה לכל הויופורט (1.0s),
  עושה crossfade לסקציית האולם המתאימה ומבצע smooth-scroll לפוקוס.
- **Static sections:** קולינריה, אודות, המלצות, צור קשר —
  כל סקציה עם אנימציות עשירות ומיקרו-אינטראקציות.

### עקרון על

> **Luxury or nothing.** אם משהו לא משדר יוקרה — לא נכנס.

---

## Stack טכנולוגי

**מותר:**
- HTML5 + CSS3 (custom properties, container queries, `@layer`)
- ES2022 vanilla JS modules
- **GSAP + ScrollTrigger** — קישור scroll progress ל-`video.currentTime`
- **Lenis** — smooth scroll בדסקטופ בלבד (`smoothTouch: false`)
- **Build-time tools:** ffmpeg (תפירת hero), sharp / cwebp / mozjpeg
  (אופטימיזציית תמונות)

**אסור:**
- React, Vue, Svelte, Angular, Astro, Next, Nuxt — אין framework
- Three.js, R3F, Babylon, Spline, A-Frame — אין 3D engine
- מודלים תלת-ממדיים (GLB/GLTF/FBX/OBJ)
- Tailwind כספרייה ב-runtime

---

## דרישות מקדימות

לפני התחלת הפיתוח, ודא שמותקנים אצלך:

- **Node.js** (גרסה 18 ומעלה) — נדרש עבור local server ו-build tools
- **npm** או **pnpm** — מנהל חבילות
- **ffmpeg** — לתפירת סרטון ה-hero ואופטימיזציה
  - Windows: `winget install ffmpeg`
  - macOS: `brew install ffmpeg`
- **דפדפן מודרני:** Chrome / Edge / Firefox / Safari (גרסה אחרונה)

---

## התקנה

1. **שכפול הריפו:**
   ```bash
   git clone https://github.com/MSA-I/GAMOS-SITE.git
   cd GAMOS-SITE
   ```

2. **התקנת תלויות פיתוח (אם נדרש):**
   ```bash
   # לרוב לא נדרש — האתר וונילה ולא דורש תלויות runtime.
   # אם בעתיד יתווספו build scripts:
   npm install
   ```

3. **הוספת מקורות מדיה:**
   הפרויקט אינו כולל את קבצי המקור הכבדים (תמונות גולמיות, סרטוני
   רזולוציה גבוהה) בריפו. הם נשמרים מקומית בתיקייה הבאה (READ-ONLY):
   ```
   GAMOS-SITE/תמונות לאנימציית האתר/
   ```
   קבצי המדיה המעובדים (compressed) ייווצרו לתוך `assets/video/`
   ו-`assets/images/` באמצעות סקריפטי build (TBD ב-Phase 1).

---

## הפעלה (פיתוח מקומי)

לאחר שכפול הריפו, פתח את האתר באמצעות שרת מקומי קל:

```bash
# אופציה 1: serve (npx — לא דורש התקנה גלובלית)
npx serve .

# אופציה 2: http-server
npx http-server -p 3000

# אופציה 3: Python (אם מותקן)
python -m http.server 3000
```

לאחר מכן פתח בדפדפן: `http://localhost:3000`

> **חשוב:** פתיחה ישירה של `index.html` כ-`file://` עלולה לשבור את
> מודולי ה-JS (CORS / module loading). השתמש תמיד ב-local server.

---

## מבנה הפרויקט

```
GAMOS-SITE/
├─ CLAUDE.md            ← Constitution (חוק הפרויקט)
├─ README.md            ← מסמך זה
├─ task_plan.md         ← checklist phases
├─ findings.md          ← יומן גילויים מהפיתוח
├─ progress.md          ← מצב phases נוכחי
│
├─ index.html           ← entry point
├─ css/                 ← tokens, base, layout, sections
│   ├─ tokens.css       ← single-source-of-truth לערכים ויזואליים
│   ├─ base.css         ← reset + טיפוגרפיה
│   ├─ layout.css       ← grid + spacing
│   └─ sections/        ← styling per-section
├─ js/                  ← ES modules (init/destroy pattern)
│   ├─ main.js          ← bootstrap
│   ├─ scroll-hero.js   ← GSAP scroll-driven video
│   ├─ portals.js       ← bubble interactions
│   └─ sections/        ← logic per-section
├─ assets/              ← media מעובד (gitignored — generated)
│   ├─ video/           ← hero + portal loops
│   ├─ images/          ← compressed (webp/avif)
│   ├─ fonts/           ← self-hosted WOFF2
│   └─ icons/           ← SVG sprites
│
├─ architecture/        ← SOPs ומסמכי ארכיטקטורה
├─ PLANS/               ← תוכניות נושאיות (B.L.A.S.T. layers)
├─ agent-plans/         ← תוכניות לפי בעלות (10 סוכנים)
└─ remotion/            ← subproject נפרד (gitignored — heavy media)
```

---

## חוקי פיתוח

הפרויקט פועל לפי **Constitution** מחייב — ראה `CLAUDE.md`. עקרונות עיקריים:

1. **HTML הוא האמת.** סדר הסקציות ב-`index.html` הוא הסדר ההגיוני.
2. **Tokens are single-source.** כל ערך ויזואלי נגזר מ-`css/tokens.css`.
   ערך מוקלד-קשיח ב-CSS אחר = באג.
3. **JS is module-scoped.** ESM modules עם `init(el)` + `destroy()`. אין globals.
4. **RTL First.** הכל עובר תחילה ב-`dir="rtl"` עם logical properties בלבד
   (`margin-inline-start`, לא `margin-left`).
5. **Plans live in `PLANS/`** + agent plans ב-`agent-plans/`.

---

## Performance Budget

יעדים מחייבים — האתר לא נחשב "Done" עד שהם מתקיימים:

- **LCP** ≤ 2.5s על Slow 4G
- **CLS** ≤ 0.05
- **INP** ≤ 200ms
- **Hero scrub:** 60fps בדסקטופ M1/Ryzen, ≥ 30fps באייפון 12+ / Galaxy S22+
- **Hero MP4 1080p** ≤ 12MB; **720p** ≤ 6MB; **poster JPG** ≤ 80KB
- **Lighthouse mobile** ≥ 90 בכל הקטגוריות (Performance / A11y / Best Practices / SEO)

---

## נגישות (WCAG 2.2 AA)

- Visible focus rings (3px brass)
- Skip-link כ-first focusable
- Alt text עברי לכל תמונה משמעותית
- ARIA roles ל-portals
- Keyboard reachability מלא: Tab → Enter
- כיבוד `prefers-reduced-motion: reduce`

---

## תיעוד נוסף

- **Constitution:** `CLAUDE.md` (חוק הפרויקט — לקריאה לפני שינויים)
- **Master plan:** `PLANS/research/2026-05-28_master-rebuild-plan.md`
- **Architecture SOPs:** `architecture/*.md`
- **יומן גילויים:** `findings.md`
- **התקדמות phases:** `progress.md`
- **הוראות הפעלה ישנות:** `איך להפעיל.txt` (Remotion)

---

## רישיון

Proprietary — כל הזכויות שמורות ל-Gamos.
