# GAMOS-SITE — תכנון מאסטר לבנייה מחדש של gamos.co.il

**Plan file:** `C:\Users\art1\.claude\plans\witty-stargazing-feather.md`
**Working dir:** `D:\משה פרוייקטים\GAMOS-SITE\`
**Live source URL:** https://gamos.co.il/
**Created:** 2026-05-28

---

## Context

המשתמש רוצה לבנות מחדש את אתר gamos.co.il (מתחם אירועים יוקרתי, גנים וריזורט) כאתר HTML/CSS/JS וונילה עם חוויית גלילה ייחודית, מבלי להשתמש במודלים תלת-ממדיים אמיתיים. ההיברידיות מורכבת מסקרול-וידאו קולנועי (hero) שמסתיים בשתי בועות-פורטל לחיצות (אולם / ריזורט) ומשם זורם לסקציות אולמות שלמות + סקציות סטטיות עם אנימציות עשירות (אקורדיונים, סליידרים, parallax, reveal-on-scroll).

הצבעים, תמונות וסטייל יחקו את האתר החי. הפונט נשאב מתמונת רפרנס (`פונט/1.2.png` — סגנון "NOMAD" סריף יוקרתי). יש כבר 13 סרטונים גולמיים מ-Seedance שצריך לתפור לסרטון hero יחיד. פרויקט קודם בנתיב `עיצוב אתר מחודש\` ננטש לחלוטין — מתחילים דף לבן, אבל מותר לשאוב תמונות שכבר עברו עיבוד.

המשתמש דרש מבנה B.L.A.S.T. (כמו בקובץ `D:\משה פרוייקטים\B.L.A.S.T. Master System Prompt.docx`), צוות של 10 סוכנים לתכנון ולפיתוח, תיקייה ייעודית `agent-plans/` שכל סוכן כותב שם את התוכנית שלו, ושימוש בסקיל `deep-research` לפאזת התכנון, `video-to-website` להירו, `frontend-design` + `weblove-motion` לאנימציות, ו-`web-scraper` לחילוץ תוכן מהאתר החי.

---

## תוצאה רצויה (Definition of Done)

1. אתר HTML/CSS/JS וונילה ב-`GAMOS-SITE/` עם פתיחה ב-`index.html`.
2. Hero scroll-driven video שתופר מ-13 הסרטונים הגולמיים, מתפקד ב-60fps בדסקטופ עם fallback לנייד.
3. שתי בועות-פורטל בסוף ההירו עם click-routing לסקציות אולם וריזורט.
4. סקציות מלאות לכל אולם + סקציות סטטיות (lounge, חדרי נופש, קולינריה, אודות, המלצות, צור קשר) עם אנימציות.
5. **כיסוי מלא של כל הלשוניות מהאתר החי gamos.co.il** — Agent 1 (Research) חייב לבצע sitemap מלא של האתר ולוודא שכל פריט בתפריט הניווט (top-bar + footer) מיוצג בעיצוב החדש כסקציית-עוגן או כדף נפרד. רשימת הלשוניות תהיה מאומתת מול המשתמש לפני שלב הHTML.
6. תמיכה מלאה ב-RTL עברית, נגישות AA, `prefers-reduced-motion` נכבד.
7. Lighthouse mobile ≥ 90 בכל ארבעת העמודים.
8. מבנה B.L.A.S.T. שלם: `CLAUDE.md`, `PLANS/`, `agent-plans/`, `architecture/`, seed files.
9. עשרה קבצי תוכניות ב-`agent-plans/` — אחד לכל סוכן.

---

## Tech Stack (LOCKED)

- **HTML5 + CSS3 + ES2022 vanilla JS** — אין React, אין Vue, אין Three.js, אין R3F, אין מודלים תלת-ממדיים.
- **GSAP + ScrollTrigger** — לקישור scroll progress ל-`video.currentTime` (טכניקת `video-to-website`).
- **Lenis** — smooth scroll בדסקטופ בלבד (`smoothTouch: false`).
- **utility libs קטנות בלבד** — debounce, mitt-style emitter אם צריך.
- **ffmpeg** — build-time לתפירת ה-13 סרטונים + יצירת variants.
- **sharp / cwebp / mozjpeg** — build-time לאופטימיזציה של תמונות.

---

## מבנה תיקיות B.L.A.S.T. (יווצר ב-Phase 0)

```
GAMOS-SITE/
├─ remotion/                          ← קיים, NOT TO TOUCH
├─ node_modules/                      ← קיים מ-remotion, אל תיגע
├─ (תמונות לאנימציית האתר/  הועברה 2026-06-09 → ../GAMOS-DOCS/)
├─ איך להפעיל.txt                     ← קיים
│
├─ CLAUDE.md                          ← Constitution (חוק)
├─ task_plan.md                       ← מאסטר-תוכנית פעילה
├─ findings.md                        ← לוג גילויים
├─ progress.md                        ← מצב phases × סוכנים
├─ README.md                          ← entry-point doc
│
├─ PLANS/                             ← תוכניות נושאיות (B.L.A.S.T.)
│  ├─ README.md                       ← קטגוריות + תבנית
│  ├─ fixes/        features/        refactors/
│  ├─ design/       performance/     research/
│  └─ archive/
│
├─ agent-plans/                       ← תוכניות לפי בעלות (NEW)
│  └─ README.md                       ← קונבנציית שמות + 10 התפקידים
│
├─ architecture/                      ← SOPs (.md בלבד)
│  ├─ section-order.md
│  ├─ tokens.md
│  ├─ motion-language.md
│  ├─ video-scrub-spec.md
│  ├─ portal-bubbles-spec.md
│  ├─ performance.md
│  ├─ rtl-and-a11y.md
│  └─ asset-inventory.md
│
├─ .tmp/                              ← workbench חולף, gitignore
│
├─ index.html
├─ css/
│  ├─ tokens.css
│  ├─ base.css        layout.css     utilities.css
│  └─ sections/
│     ├─ hero.css     portals.css
│     ├─ hall-venue.css   hall-resort.css
│     ├─ lounge.css   rooms.css
│     ├─ culinary.css  about.css
│     ├─ testimonials.css   contact.css
├─ js/
│  ├─ main.js
│  ├─ lenis.js
│  ├─ hero-video-scrub.js
│  ├─ portals.js
│  ├─ reveals.js      accordions.js   slider.js
│  └─ utils/  (rtl.js, media-query.js, debounce.js)
└─ assets/
   ├─ video/
   │  ├─ hero-master-1080.mp4
   │  ├─ hero-master-720.mp4
   │  ├─ hero-master.webm
   │  ├─ hero-poster.jpg
   │  └─ portal-loop.mp4              ← מקור: ריזורט 1/1.5.mp4
   ├─ images/
   │  ├─ halls/venue/    halls/resort/
   │  ├─ halls/lounge/   halls/rooms/
   │  ├─ culinary/        ← gallery (NOT a hall)
   │  └─ brand/           ← logo, og
   ├─ fonts/             ← Frank Ruhl Libre + Playfair + Heebo (WOFF2)
   └─ icons/             ← inline SVG sprite
```

**הבחירה ב-`agent-plans/` כתיקייה אחות ל-`PLANS/`** (לא מקוננת בתוכה): `PLANS/` מאורגן לפי נושא (מה לעשות), `agent-plans/` לפי בעלות (מי עושה). זה תואם את הפרקטיקה שראיתי ב-`עיצוב אתר מחודש\` הקיים.

קונבנציית שמות לקבצי `agent-plans/`:
`agent-NN_<role-kebab>__YYYY-MM-DD_<task-kebab>.md`
דוגמה: `agent-06_hero-scrub__2026-05-28_initial-binding.md`

---

## CLAUDE.md Constitution — סעיפים נעולים

1. **§1 Mission** — בנייה מחדש של gamos.co.il כאתר עברית-RTL יוקרתי עם hero סקרול-וידאו ושתי בועות-פורטל.
2. **§2 Stack (LOCKED)** — HTML5 + CSS3 + ES2022 vanilla. תלויות מותרות: GSAP, ScrollTrigger, Lenis (desktop only). אסור: React/Vue/Three.js/R3F/3D models.
3. **§3 Hybrid Concept** — Hero stitched MP4 scrubbed by scroll → ב-progress ≈ 0.92 שתי בועות פורטל מתגלות (אולם / ריזורט) → קליק על בועה מרחיב אותה → קופץ לסקציית האולם המתאימה. קולינריה אינה אולם — היא גלריית מנות.
4. **§4 RTL + עברית** — `<html dir="rtl" lang="he">`. logical properties (`margin-inline-start`) לא physical. פונט עברי תצוגה: Frank Ruhl Libre. גוף: Heebo. Latin display: Playfair Display.
5. **§5 פלטה** — תיגזר מ-scrape של gamos.co.il (Phase 1). שלד ראשוני: deep ink `#0E0E0C`, ivory `#F5EFE6`, brass `#B89766`, sage accent. נעילה אחרי scrape.
6. **§6 B.L.A.S.T. Discipline** — כל סוכן כותב תוכנית ב-`agent-plans/` לפני קוד. כל שינוי תקבץ נושאי הולך ל-`PLANS/<category>/`. `findings.md` מתעדכן בכל גילוי. `progress.md` מסומן בכל phase gate.
7. **§7 Asset Rules** — `../GAMOS-DOCS/תמונות לאנימציית האתר/` (הועברה 2026-06-09 מ-GAMOS-SITE) ו-`remotion/` הם READ-ONLY. כל הפלט הולך ל-`assets/`.
8. **§8 Performance Budget** — LCP ≤ 2.5s 4G, CLS ≤ 0.05, INP ≤ 200ms. Hero MP4 1080p ≤ 12MB. Mobile fallback: poster + reduced-motion (אין scrub).
9. **§9 Accessibility** — WCAG 2.2 AA. visible focus 3px brass, skip-link, alt עברית, `prefers-reduced-motion` מבטל scrub + reveals.
10. **§10 Done Criteria** — Lighthouse mobile ≥ 90 בכל הצירים, RTL keyboard pass, שתי בועות עובדות, 60fps scrub בדסקטופ class-M1, mobile fallback verified.

---

## עשרה סוכנים — צוות תכנון + פיתוח

| # | Agent | Subagent type | Scope | Inputs | Outputs | Plan file |
|---|---|---|---|---|---|---|
| 1 | **Research & Content Lead** | researcher | deep-research + web-scraper על gamos.co.il, **sitemap מלא של כל הלשוניות (top-nav + footer + sub-pages)**, מפת תוכן, copy עברי verbatim לכל לשונית, audit מתחרים (5-7) | URL חי | `PLANS/research/site-content-map.md` (כולל טבלת כל הלשוניות), `PLANS/research/full-tab-inventory.md`, `PLANS/research/competitor-audit.md`, `architecture/asset-inventory.md` (חצי ראשון) | `agent-plans/agent-01_research-content.md` |
| 2 | **Brand & Typography** | frontend-design specialist | זיהוי הפונט מ-PNG, בחירת חלופה עברית (Frank Ruhl Libre + Playfair + Heebo), tokens של צבע/טיפו/מרווח | פלט #1, `פונט/1.2.png` | `architecture/tokens.md`, `css/tokens.css`, `assets/fonts/*` | `agent-plans/agent-02_brand-typography.md` |
| 3 | **Asset Pipeline** | coder | ffmpeg stitch של 13 הסרטונים, וידאו variants (1080/720/webm + poster), אופטימיזציה של תמונות, port של `1.5.mp4` ל-portal-loop | raw assets | `assets/video/*`, `assets/images/**`, `architecture/asset-inventory.md` (סוף) | `agent-plans/agent-03_asset-pipeline.md` |
| 4 | **HTML / Structure** | backend-dev | `index.html` semantic skeleton, ARIA, schema.org `EventVenue` JSON-LD, RTL | content #1, manifest #3 | `index.html`, `js/main.js` shell | `agent-plans/agent-04_html-structure.md` |
| 5 | **CSS Tokens & Layout** | frontend-design specialist | base/layout/utilities, responsive grid, RTL utilities | tokens #2, structure #4 | `css/base.css`, `css/layout.css`, `css/utilities.css` | `agent-plans/agent-05_css-layout.md` |
| 6 | **Hero Video-Scrub Engineer** | coder (skill: video-to-website) | implementation של `video-scrub-spec.md`: GSAP + ScrollTrigger + sticky + iOS fallback | master MP4 #3, structure #4 | `js/hero-video-scrub.js`, `css/sections/hero.css` | `agent-plans/agent-06_hero-scrub.md` |
| 7 | **Portal-Bubbles Engineer** | coder (skill: weblove-motion) | שתי בועות בסוף ההירו, click-route, expand-and-transition | spec, portal-loop, hook מ-#6 | `js/portals.js`, `css/sections/portals.css` | `agent-plans/agent-07_portals.md` |
| 8 | **Hall Sections Engineer** | frontend-design specialist | קומפוזיציה לכל אולם (אולם / ריזורט / lounge / rooms) + culinary gallery | hall images #3, copy #1 | `css/sections/hall-*.css`, hall HTML partials | `agent-plans/agent-08_halls.md` |
| 9 | **Motion Engineer (static)** | coder (skill: weblove-motion + frontend-design) | reveals, parallax, accordions, sliders ל-about/testimonials/contact/gallery | structure #4, motion-language #2 | `js/reveals.js`, `js/accordions.js`, `js/slider.js` | `agent-plans/agent-09_motion.md` |
| 10 | **QA & Performance** | tester | Lighthouse, RTL keyboard, A11y, reduced-motion, cross-browser, perf budget | full integrated site | `PLANS/performance/lighthouse-baseline.md`, defects ב-`PLANS/fixes/` | `agent-plans/agent-10_qa-performance.md` |

---

## Phase Gates

```
Phase 0: Workspace bootstrap                 → unlocks everything
Phase 1: Research (deep-research)            → unlocks Brand + Asset
Phase 2: Asset pipeline + Tokens             → unlocks HTML + Hero
Phase 3: HTML + CSS skeleton                 → unlocks Halls + Motion + Portals
Phase 4: Full integration                    → QA round 1
Phase 5: QA pass + fixes                     → release candidate
```

תלויות קשות:
- Agent 6 (Hero Scrub) חסום עד Agent 3 מסיים את ה-master MP4 + poster.
- Agent 7 (Portals) חסום עד Agent 6 חושף `window.gamosHero.onProgress(cb)` או CSS variable `--hero-progress`.
- Agent 8 (Halls) חסום עד #3 (תמונות) + #1 (copy) מסיימים.
- Agent 10 פועל אחרי integration ראשון, רץ מחדש בכל gate.

---

## Critical Files to be Created

- `D:\משה פרוייקטים\GAMOS-SITE\CLAUDE.md`
- `D:\משה פרוייקטים\GAMOS-SITE\PLANS\README.md` + 7 תת-תיקיות
- `D:\משה פרוייקטים\GAMOS-SITE\agent-plans\README.md` + 10 קבצי תוכניות
- `D:\משה פרוייקטים\GAMOS-SITE\architecture\*.md` (8 קבצים)
- `D:\משה פרוייקטים\GAMOS-SITE\task_plan.md`, `findings.md`, `progress.md`
- `D:\משה פרוייקטים\GAMOS-SITE\index.html`
- `D:\משה פרוייקטים\GAMOS-SITE\css\tokens.css` + 11 stylesheets
- `D:\משה פרוייקטים\GAMOS-SITE\js\hero-video-scrub.js` + 7 modules
- `D:\משה פרוייקטים\GAMOS-SITE\assets\video\hero-master-1080.mp4` + variants
- `D:\משה פרוייקטים\GAMOS-SITE\assets\images\halls\**`
- `D:\משה פרוייקטים\GAMOS-SITE\assets\fonts\*.woff2`

## Existing Reference Files (לא לערוך, לשאוב מהם רק)

*(הספרייה `תמונות לאנימציית האתר/` הועברה 2026-06-09 מ-GAMOS-SITE ל-GAMOS-DOCS — ראה Constitution §7)*
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\ריזורט 1\סרטוני אנימציה\1_V1.mp4 ... 13_V1.mp4` — מקור ל-hero
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\ריזורט 1\1.5.mp4` — רפרנס לבועות-פורטל
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\ריזורט 1\לייטרום\*.png` — תמונות ערוכות resort
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\אולם 3\*.png` — תמונות אולם
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\LAUNGE\*.jpg`
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\חדרי נופש 2\*.jpg`
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\קולינריה 4\*` (תמונות + 84MB MP4)
- `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\פונט\1.2.png` — רפרנס לסגנון פונט
- `D:\משה פרוייקטים\AI\persepolis-reimagined-mirror\` — לרפרנס דפוסים (לא להעתיק קוד)
- `D:\משה פרוייקטים\B.L.A.S.T. Master System Prompt.docx` — מסמך אב למבנה
- `D:\משה פרוייקטים\עיצוב אתר מחודש\PLANS\README.md` — תבנית `PLANS/README.md` לחקות

---

## פרטי מימוש קריטיים

### Hero Video-Scrub (טכניקת video-to-website)

- **תפירה:** ffmpeg concat demuxer של 1_V1.mp4 ... 13_V1.mp4 → `hero-master-1080.mp4`. אם codecs לא תואמים, single-pass re-encode עם libx264 CRF 22 preset slow + `+faststart` חובה.
- **Variants:** 1080p H.264 (≤12MB), 720p (≤6MB), WebM VP9, poster JPG (≤80KB).
- **Binding:** sticky hero על spacer של 5×100vh; ScrollTrigger ממפה progress 0..1 → `video.currentTime = progress * duration`. מומלץ `requestVideoFrameCallback`.
- **iOS fallback:** scrub לא יציב ב-Mobile Safari → להחליף ב-autoplay muted loop או poster crossfade. זוהה ב-Phase 4.4 של המסמך הקודם.

### Portal Bubbles

- ב-progress ≈ 0.92, שתי בועות מתגלות (scale 0 → 280px) משני הצדדים.
- כל בועה: `clip-path: circle()`, ברקע MP4 loop של `portal-loop.mp4`, brass ring חיצוני, glass-blur backdrop.
- Hover: scale 1.06. Click: GSAP timeline שמרחיב את הבועה לכל הויופורט (1.0s) + crossfade לסקציית האולם המתאימה + smooth-scroll פוקוס.
- ARIA: `role="button"`, `aria-label="עבור לאולם"` / `"עבור לריזורט"`, keyboard reachable.

### כיסוי מלא של לשוניות האתר הקיים (Mandatory Coverage Gate)

לפני שAgent 4 (HTML) מתחיל לכתוב את `index.html`, Agent 1 (Research) חייב לספק:

1. **`PLANS/research/full-tab-inventory.md`** — טבלה שמכילה:
   - שם הלשונית (עברית, כפי שמופיע באתר)
   - URL מקורי (לדוגמה `gamos.co.il/about`)
   - מיקום במבנה החדש (אנקור-סקשן `#about` או דף נפרד)
   - copy verbatim
   - תמונות + assets שלה
   - אם הלשונית כבר מכוסה ב-hybrid concept (hero+portals+halls+culinary+about+...) או דורשת תוספת.

2. **gate אישור משתמש** — המשתמש מאשר את הטבלה לפני HTML.

3. **רשימה משוערת מסקירת gamos.co.il** (ייאומת ע"י Agent 1, לא נעול):
   - דף הבית
   - אודות / מי אנחנו
   - אולמות (אולם מרכזי, אולם נוסף)
   - ריזורט / חדרי אירוח
   - גלריה (תמונות + וידאו)
   - תפריט / קולינריה / שף
   - אירועים (חתונות, בר/בת מצווה, ימי הולדת, אירועי חברה)
   - המלצות / לקוחות מספרים
   - חדשות / בלוג (אם קיים)
   - צור קשר / הזמנת סיור
   - ניווט (Waze) + מפה
   - הסכמת הכשרות / רבנות
   - פוטר: רשתות חברתיות, תקנון, זכויות יוצרים

כל פריט שיתגלה ב-scrape ולא נמצא ברשימה הזאת — Agent 1 מוסיף אותו, מסמן TBD לעיצוב, ומציג למשתמש.

---

### זיהוי הפונט

ה-PNG מציג "NOMAD" — Display Serif יוקרתי בסגנון didone-leaning עם ball terminals מעודנים. PNG אינו ניתן להמרה ישירה ל-WOFF (אין כלי אמין PNG→font). אסטרטגיה:
1. **Latin display:** Playfair Display (חינמי, OFL) — הכי קרוב לקונטרסט הוויזואלי.
2. **Hebrew display:** Frank Ruhl Libre — סטנדרט תעשייתי לאתרי יוקרה עבריים.
3. **Hebrew body:** Heebo — קריא, תואם לעברית מודרנית.
4. כולם self-hosted ב-`assets/fonts/` כ-WOFF2 עם subsetting (Hebrew + Latin Basic + numerals), `font-display: swap`. סך הכול ≤ 200KB.

ב-`PLANS/research/2026-05-28_font-identification.md` Agent 1 יציע להשוות עם תמונת הרפרנס ויאשר עם המשתמש לפני הנעילה.

### תפירת ffmpeg (פסאודו)

```bash
# 1. בניית concat list
echo "file '1_V1.mp4'" > list.txt ... "file '13_V1.mp4'" >> list.txt

# 2. master 1080p
ffmpeg -f concat -safe 0 -i list.txt \
  -c:v libx264 -crf 22 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an \
  hero-master-1080.mp4

# 3. 720p variant
ffmpeg -i hero-master-1080.mp4 -vf scale=-2:720 -c:v libx264 -crf 23 ...

# 4. poster
ffmpeg -ss 0.5 -i hero-master-1080.mp4 -vframes 1 -q:v 2 hero-poster.jpg
```

---

## Verification — בדיקה מקצה לקצה

### ידני
1. פתיחת `index.html` ב-Chrome desktop → עברית RTL מוצגת ב-Frank Ruhl Libre, אין FOUT.
2. גלילה דרך ה-hero → frames מתקדמים חלק ב-60fps (DevTools Performance recorder).
3. בסוף ה-hero → שתי בועות מופיעות עם portal-loop רץ בתוכן.
4. קליק על "אולם" → expand animation → הגעה לסקציית אולם בפוקוס.
5. קליק על "ריזורט" → אותו flow לסקציית ריזורט.
6. המשך גלילה: lounge → rooms → culinary gallery → about → testimonials (slider) → contact (form RTL).

### אוטומטי
- Lighthouse mobile (4G, Moto G4): **≥ 90** Performance / Accessibility / Best Practices / SEO.
- WebPageTest: poster preloaded, MP4 progressive download עם Range requests.
- axe-core: 0 violations חמורות.
- Tab-only: כל אינטראקטיב מגיע, focus ring 3px brass.
- VoiceOver/NVDA: hero (alt poster), portals (button announcements עם destination).
- `prefers-reduced-motion: reduce` → scrub כבוי, posters מוצגים, reveals = static final.
- Cross-browser: Chrome / Firefox / Safari (mac+iOS) / Edge / Android Chrome. iOS Safari → loop fallback.

### תקציבי ביצועים
- Hero 1080p ≤ 12MB; 720p ≤ 6MB; poster ≤ 80KB.
- משקל עמוד total בתחילת אינטראקציה ≤ 2MB.
- LCP ≤ 2.5s 4G; CLS ≤ 0.05; INP ≤ 200ms.

---

## העתקת התוכנית הזו לפרויקט (Phase 0 — first action)

הצעד הראשון של Phase 0 הוא להעתיק את התוכנית הזו ל-2 מיקומים בתוך הפרויקט:

1. `D:\משה פרוייקטים\GAMOS-SITE\PLANS\research\2026-05-28_master-rebuild-plan.md` — עותק מלא בקטגוריית research של B.L.A.S.T.
2. `D:\משה פרוייקטים\GAMOS-SITE\task_plan.md` — distillation מקוצר עם checkboxes לכל phase, כך שהמעקב התהליכי נשאר ב-root.

המקור הקאנוני נשאר ב-`C:\Users\art1\.claude\plans\witty-stargazing-feather.md` (קובץ ה-plan של ה-harness), ולכל שני העותקים יש header שמפנה אליו.

---

## איך מריצים את ה-10 סוכנים

**שלב הbootstrap (Phase 0)** — main agent (Claude) יוצר את כל המבנה ב-Write/Edit ידני (אין צורך לסוכנים).

**שלב הPLANS (Phase 1 deep-research)** — שיגור 4 סוכנים במקביל בקריאה אחת:
- Agent 1 (Research) רץ ראשון solo עם skill `deep-research`.
- אחרי שמסיים: Agents 2, 3 רצים במקביל.

**שלב הקוד (Phases 2-4)** — שיגור batches של עד 4 סוכנים במקביל לפי תלות:
- Batch A: Agent 4 (HTML) + Agent 5 (CSS) + Agent 6 (Hero Scrub) — כשה-master MP4 מוכן.
- Batch B: Agent 7 (Portals) + Agent 8 (Halls) + Agent 9 (Motion) — כשהשלד מוכן.
- Batch C: Agent 10 (QA) — solo בסוף כל gate.

כל סוכן כותב את התוכנית שלו ב-`agent-plans/agent-NN_*.md` לפני שהוא מתחיל להריץ קוד, וגם מעדכן `findings.md` + `progress.md` בסוף.
