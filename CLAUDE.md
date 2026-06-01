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

## §3 Hybrid Concept (LOCKED 2026-05-28, refined 2026-05-28 multi-stage)

ה-Hero מורכב מ-3 שלבים שמופעלים לפי scroll progress (spacer = 7×100vh):

1. **Stage `intro` [0% .. 14%]** — `hero-static.webp` (תמונת מדבר) ברקע + אנימציית
   CSS (לא scroll-bound): GAMOS letter-by-letter (200ms-1100ms), ✦ EVENTS ✦
   subtitle (1200ms-1700ms), לוגו זהוב GAMOS RESORT (2200ms), "גלול" pulse (3200ms).

2. **Stage `scrub` [14% .. 86%]** — `hero-master-1080.mp4` (סרטון תפור) שה-`currentTime`
   שלו מקושר ל-scroll progress דרך **native scroll listener + requestAnimationFrame**
   (NOT GSAP ScrollTrigger — זה הוסר ב-2026-05-28 לאחר fail בטעינה מ-CDN). hero הוא
   `position: sticky` מעל spacer 700vh.

3. **Stage `outro` [86% .. 100%]** — scrub video fade-out, `1.5.mp4` autoplay loop
   fade-in, שתי בועות-פורטל (אולם / ריזורט) reveal.

**Stage transitions** מנוהלים ע"י `[data-stage="intro|scrub|outro"]` על
`.hero__sticky`. CSS משתמש ב-attribute selectors כדי לשלוט על `opacity` של 4 ה-layers.

4. **Portal Bubbles:** מימין = ריזורט, משמאל = אולם (ב-RTL סדר ה-source הוא resort first).
   כל בועה: `clip-path: circle()`, `portal-loop.mp4` ברקע.
5. **Click feedback (NEW 2026-05-28):** `[data-clicked]` attribute → ring 6px
   brass-glow + drop-shadow 60px זהוב (לפני GSAP expand timeline) — visual confirmation
   "selection registered".
6. **Click flow:** GSAP timeline scale ×6 (1.0s, `power3.in`) + sibling fade out →
   smooth-scroll לסקציית האולם → reset state.
7. **Hall sections:** סקציות מלאות לאולם, ריזורט, lounge, חדרי נופש.
8. **Static sections:** קולינריה (גלריית מנות, **לא** אולם), אודות, המלצות, צור קשר.

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
3. **גילויים משמעותיים** מתועדים ב-Maintenance Log (§12) עם תאריך + מקור.
4. **מצב הפרויקט** משתקף ב-`STATUS.md` בשורש (לא ב-progress.md/findings.md הישנים — נמחקו 2026-06-01).
5. **תוכניות שהושלמו** → ניתן למחוק (ההיסטוריה ב-git). תוכניות שננטשו → `PLANS/archive/`.

---

## §7 Asset Rules

- **READ-ONLY** (מקור — אסור לערוך):
  - `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\` (כל התת-תיקיות)
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

## §12 Maintenance Log

| Date       | Change                                                       | Author      |
|------------|--------------------------------------------------------------|-------------|
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
