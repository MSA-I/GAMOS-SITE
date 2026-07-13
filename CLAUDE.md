# 📜 Project Constitution — GAMOS-SITE

> **חוק.** קובץ זה הוא חוק. שינויים בקובץ זה משנים את התנהגות הפרויקט.
> תיעדכן רק כאשר משתנה: סכימה, חוק עיצובי, או אינווריאנט ארכיטקטוני.

**Plan source of truth:** `C:\Users\art1\.claude\plans\witty-stargazing-feather.md`
**Mirrored at:** `PLANS/research/2026-05-28_master-rebuild-plan.md`
**Live source:** https://gamos.co.il/

---

## §1 Mission Statement

לבנות מחדש את אתר Gamos (gamos.co.il — מתחם אירועים יוקרתי, גנים וריזורט) כאתר
**HTML/CSS/JS וונילה** עם חוויית גלילה ייחודית: hero של קומפוזיציית-תמונות סטטית
(ראה §3) ובו שני CTAs (EVENTS / RESORT) המובילים לשני דפי האולמות
(`/halls/dist/events/` + `/halls/dist/resort/` — sub-app React נפרד, §2.1), ואחריו
סקציות סטטיות עשירות באנימציה (אקורדיונים, סליידרים, parallax, reveal-on-scroll).

- **הישג:** Premium feel המעולה על האתר הקיים, חוויית גלילה קולנועית בלי 3D models.
- **דליברי:** קוד סטטי בלוקאל. דיפלוי-לקלאוד יוחלט בשלב מאוחר.
- **עקרון על:** *Luxury or nothing.* אם משהו לא משדר יוקרה — לא נכנס.

---

## §2 Stack (LOCKED 2026-05-28)

**מותר:**
- HTML5 + CSS3 (custom properties, container queries, `@layer`) + ES2022 vanilla JS modules.
- **GSAP + ScrollTrigger** — לקישור scroll progress ל-`video.currentTime` (טכניקת `video-to-website` skill),
  ל-pinned mask-reveal של `#shabbat-chatan`, **ול-v10 cinematic scroll-hero** (`js/hero-scene.js` —
  entrance timeline + ScrollTrigger scrub על 500vh; ADDED 2026-06-15, ראה §3). Self-hosted ב-`assets/vendor/`.
- **Lenis ~18KB** (REMOVED 2026-06-10, RE-ADDED 2026-07-01) — smooth scroll
  **בדסקטופ בלבד**. self-hosted ב-`/assets/vendor/lenis.min.js` (v1.3.25, אותה
  לוגיקה כמו GSAP/Leaflet — self-hosting פותר CDN-offline בלי תלות-runtime).
  **צרכן יחיד:** `js/smooth-scroll.js` — המודול הראשון ב-`MODULES` (מחווט
  `gsap.ticker` + `lenis.on("scroll", ScrollTrigger.update)` לפני שצרכני
  ScrollTrigger בונים). **Gated:** `matchMedia("(min-width: 769px)")` +
  `prefers-reduced-motion` → מובייל וגלילת-RM נשארים native (§8). ה-nav modules
  (side-dot-nav, site-nav, scrollytelling, corridor) מנתבים anchor-scroll דרך
  `window.gamosSmoothScrollTo` כדי ש-GSAP ScrollToPlugin לא יילחם ב-Lenis.
  אסור להשתמש ב-Lenis למטרה אחרת ללא הרחבת clause זה. (ההיסטוריה: היה תחילה
  no-op stub `js/lenis.js` שנמחק ב-2026-06-10; מומש במלואו ב-2026-07-01 לפי
  clause "אם יידרש smooth-scroll — להחזיר, לממש, ולתעד".)
- **Leaflet ~42KB** (ADDED 2026-06-10) — self-hosted ב-`/assets/vendor/leaflet.js`
  + `/assets/vendor/leaflet.css`, **לצורך מפת ההגעה האינטראקטיבית בלבד** (סקציית
  `#routes` — "מסלולי הגעה"). אותה לוגיקה כמו GSAP: self-hosting פותר את בעיית
  ה-CDN-offline בלי תלות-runtime בצד-שלישי. אריחי המפה נשלפים מ-CARTO/OSM (keyless)
  ונצבעים מחדש ב-CSS filter לגווני המותג. אסור להשתמש ב-Leaflet במקום אחר באתר ללא
  הרחבת clause זה. ❌ Mapbox GL JS / MapLibre (~220KB) נשארים אסורים — כבדים מדי.
- ~~**Three.js core**~~ — **REMOVED 2026-06-08**. הסיבה: ההירו עבר לתמונה
  סטטית ולא היה צרכן נוסף. אם בעתיד יידרש shader-based effect — להחזיר את ההגדרה
  ולתעד את השינוי ב-git.
- **WebGL shader לרקע ה-closer של `/press/`** (ADDED 2026-06-10, AMENDED 2026-06-10)
  — מותר ככלי-פלטפורמה (לא framework) ל-shader self-contained. מותרים שני מסלולים:
  (א) **raw WebGL1/WebGL2 vanilla** דרך `WebGLRenderingContext`; (ב) **ספריית-shader
  self-hosted, zero-dependency** — כרגע `@paper-design/shaders` (vanilla core, לא ה-React
  wrapper) שמקודקת-מראש ל-`assets/vendor/paper-shaders.module.js` (~21KB, tree-shaken
  ל-MeshGradient בלבד; PolyForm Shield license). זו אותה לוגיקה כמו GSAP/Leaflet:
  self-hosting פותר offline בלי תלות-runtime ב-CDN ובלי framework. **כרגע צרכן יחיד:**
  `js/press-shader.js` — רקע MeshGradient מונפש לסקציית ה-closer של `/press/` בלבד
  (לפי `GAMOS-DOCS/SHADER-2.txt`, נצבע לפלטת §5 במקום הניאון של המקור). זה מקיים את
  תנאי ה-Three.js-removal clause ("אם יידרש shader-based effect") **בלי** להחזיר את
  Three.js — אפס תלות-runtime, אפס מודלים תלת-ממדיים. אסור להשתמש בכלי-shader זה במקום
  אחר באתר, ואסור להוסיף ספריית-shader אחרת, ללא הרחבת clause זה.
- **Cloudflare Web Analytics beacon** (ADDED 2026-07-13, conversion pass —
  `PLANS/next-steps/2026-07-13_conversion-pass.md`) — סקריפט הצד-שלישי **היחיד**
  המותר ב-runtime: `static.cloudflareinsights.com/beacon.min.js` (keyless מלבד token,
  cookieless, ללא PII; §14 כבר קבע אותו כפתרון האנליטיקה ב-$0). נטען מבלוק מוערם
  ב-`index.html` עם `CF_BEACON_TOKEN_PLACEHOLDER` עד שהמשתמש יוצר token בדשבורד.
  **מגבלה מתועדת:** ה-beacon סופר pageviews + Core Web Vitals בלבד — אין לו API
  לאירועים מותאמים; אירועי CTA/טופס/עומק נאספים ב-`js/analytics.js` (וניל, אפס
  תלות, מודול MODULES רגיל) לתור מקומי `window.gamosAnalyticsQueue` עד שייבחר יעד
  אירועים (GA4/Zaraz). אסור להוסיף סקריפט צד-שלישי נוסף ללא הרחבת clause זה.
- **utility libs קטנות בלבד** — debounce, mitt-style emitter אם צריך.
- **build-time tools:** ffmpeg (תפירת hero), sharp / cwebp / mozjpeg (אופטימיזציית תמונות).

**אסור:**
- ❌ React, Vue, Svelte, Angular, Astro, Next, Nuxt — אין framework. (חריגה ב-§2.1 לשני דפי האולמות בלבד.)
- ❌ R3F, Babylon, Spline, A-Frame, postprocessing — אין 3D framework. (Three.js core מותר self-hosted לפי §2.מותר.)
- ❌ מודלים תלת-ממדיים (GLB/GLTF/FBX/OBJ) — המשתמש סירב. ה-Hero shader צובע רקע + טקסטורות 2D בלבד.
- ❌ Tailwind כספרייה ב-runtime (אפשר build-time בלבד אם בכלל). (חריגה ב-§2.1 לשני דפי האולמות בלבד.)

---

## §2.1 Halls + Rooms sub-app exception (NEW 2026-06-04, AMENDED 2026-06-11, RENAMED 2026-06-15)

> **RENAME 2026-06-15 (אישר המשתמש):** מזהי שני האולמות שונו ל-`events`/`resort`
> (היו `oasis`/`lumina` — שמות שירשו מפרויקט-מקור אחר ולא תאמו לפרויקט). השינוי
> רוחבי: ה-`hallId` בקוד React/TS, שמות קבצי התמונות (`events-NN.webp`/`resort-NN.webp`),
> מפתחות `extractedColors.json`, קבצי ה-entry (`resort.html`, `events-mobile.html`,
> `resort-mobile.html`), `vite.config.ts`/`post-build.mjs`, וה-URLs עצמם. ה-CTAs בהירו
> (EVENTS/RESORT) כבר תאמו — כעת גם ה-routing תואם.

שלושת הנתיבים `/halls/dist/events/`, `/halls/dist/resort/` ו-`/rooms/dist/`
(ושלושתם בלבד) מותרים להריץ
**React 19 + TypeScript + Vite 6 + Tailwind v4 + Motion + Lucide + Three.js**
בזמן ריצה, כ-sub-apps נפרדים תחת `halls/` ו-`rooms/`. **המימוש הנוכחי (2026-06-10):** פורט
full-fidelity של Codrops "Atmospheric Depth Gallery" (repo `houmahani/codrops-depth-gallery`)
בסקין warm-luxury של גאמוס — 8 planes מרחפים בעומק WebGL עם GLSL background,
glowing trail + sparkle particles, velocity→atmosphere, ו-editorial label.
הקוד חי ב-`halls/src/depth-gallery/` (`Engine`/`Experience`/`Gallery`/`Background`/
`Trail`/`quality` וכו'). (פורט ה-ThreeDCorridor הקודם מ-`arch-corridor-gallery`
הוחלף; השרידים הוונילה נשמרים כ-legacy — ראה כלל 6.)

**Rooms sub-app (ADDED 2026-06-11):** סקציית `#rooms` (חדרי אירוח) באתר הראשי
מציגה כעת **תמונת דלת** המקשרת אל `/rooms/dist/` — תת-אפליקציה נפרדת תחת `rooms/`
המשכפלת את אפקט גלריית התמונות של phantom.land: **קיר תמונות מעוקל (barrel curve)
ניתן-לגרירה** ב-X/Y עם אינרציה/מומנטום, תוויות-טקסט מרחפות (DOM overlay מוקרן
פר-frame), hover-lift, ורקע ink-deep כהה. הקוד חי ב-`rooms/src/wall/`
(`Engine`/`Wall`/`Drag`/`Hover`/`quality`/`utils`) + `rooms/src/components/RoomsChrome.tsx`
+ `rooms/src/roomsData.ts`. ה-Engine/Drag/quality פורקו מ-`halls/src/depth-gallery/`
(Engine lifecycle, velocity-follower, dispose order). **כרגע:** קיר של ~20 כרטיסי
פלייסהולדר (אריחי §5 מ-`rooms/scripts/make-placeholders.mjs`) כי קיימים רק 4 סוגי
חדרים אמיתיים (מודגשים); תמונות אמיתיות יוחלפו בעתיד דרך עריכת `image` ב-`roomsData.ts`
בלבד. **אין סרטון מעבר כרגע** — לחיצה על הדלת היא ניווט פשוט ללא אנימציה; ה-seam
לסרטון פתיחת-דלת עתידי בנוי ומתועד (`js/rooms-door.js` no-op לא-רשום + `rooms/src/intro/IntroGate.tsx`
pass-through; ראה `rooms/src/intro/README.md`).

**כללים:**

1. **Scope.** ה-sub-apps חיים **רק** תחת `halls/` ו-`rooms/` בשורש GAMOS-SITE.
   אסור לייבא מהם לשום קובץ ב-`/index.html`, `/js/`, או `/css/`. אסור
   ל-`index.html` הראשי לטעון React/Vite/Tailwind ב-runtime. הכניסה ל-rooms
   היא דרך `<a id="rooms-door" href="/rooms/dist/">` (תמונת דלת) בסקציית `#rooms`
   בלבד; מודול הליבה היחיד שנוגע בה הוא `js/rooms-door.js` (מעבר פתיחת-דלת
   CSS-בלבד → `window.location`, אפס תלות בקוד ה-sub-app).
2. **Build artifact.** כל bundle נבנה pre-deploy: `npm run build:halls`
   (→ `halls/dist/`) ו-`npm run build:rooms` (משדרגת לתוך
   `cd rooms && npm install && npm run build` → `rooms/dist/`). הפלט סטטי
   לחלוטין — `npx serve` של GAMOS-SITE מגיש אותו ככל קובץ אחר.
3. **URLs.** Halls: שני נתיבים `/halls/dist/events/` + `/halls/dist/resort/`
   (HTML נפרד עם `<html data-initial-hall="…">` — הערכים `events`/`resort`).
   Rooms: נתיב יחיד
   `/rooms/dist/` (entry אחד, ללא `data-initial-hall` — קיר בודד). המסלול כולל
   `dist/` כי כל `vite.config.ts` מגדיר `base` תואם.
4. **Asset prefix.** `vite.config.ts` של כל sub-app חייב להגדיר `base` תואם
   (`/halls/dist/` ו-`/rooms/dist/`) כך שכל ה-asset URLs ייצאו עם ה-prefix
   הנכון בפרודקשן.
5. **No bleed.** הניווט בין כל sub-app לשאר האתר עובר דרך `window.location`
   בלבד — אין SPA-routing משותף, אין React-תלות באתר הראשי.
6. **Vanilla legacy preserved.** Halls: `corridor.html` + `js/corridor.js` +
   `js/corridor-page.js` + `css/sections/corridor.css`. Rooms: `js/rooms-gallery.js`
   + מבני `.rooms__list/.rooms__stage/.rooms__panel/.rooms__trigger` ב-
   `css/sections/rooms.css` (הגלריה הדו-פאנלית הקודמת) **לא** נמחקים —
   `js/rooms-gallery.js` עושה self-no-op כשאין `[data-rooms-stage]` ב-markup,
   כך שהחזרה אחורה היא החלפת markup אחת.

**מה נשאר אסור גם תחת §2.1:**
- React/Vite/Tailwind/Motion/Lucide ב-`index.html` הראשי או ב-`/js/`.
- מודלים תלת-ממדיים (GLB/GLTF/FBX/OBJ) — גם בתת-האפליקציות. ה-Depth Gallery
  וה-Rooms wall מסתמכים על Three.js עם textures של תמונות 2D על planes +
  shaders בלבד — אפס מודלים טעונים. (באתר הראשי Three.js עדיין אסור; ראה §2.)
- כל יצירת bundle נפרד מעבר ל-`halls/dist/` ו-`rooms/dist/`.

שינוי זה אישר המשתמש ב-2026-06-04 (halls) וב-2026-06-11 (rooms).

---

## §3 Hero Concept (LOCKED 2026-06-15 v10 — cinematic scroll-pinned scene; reverses v9 static)

**שינוי v10 (2026-06-15, אישר המשתמש במפורש):** ה-scroll choreography **הוחזר**.
המשתמש ביקש לקחת את ההירו שפותח ושוכלל ב-sandbox `findrealestate-clone - עותק`
(Next.js static export) ולהחליף בו לחלוטין את ההירו של גאמוס, ולהוסיף את הסקציה
שאחרי ההירו כסקציה חדשה בין ההירו ל-`#lounge`. זה **הופך את החלטת v9** (2026-06-10,
שבה ה-rise בוטל בגלל באגים) — ה-sandbox הוא הגרסה הנקייה של אותו אפקט-עלייה.
**הפורט הוא re-implementation וונילה, לא העתקת-קבצים** — ה-sandbox הוא React, וה-§2
אוסר framework באתר הראשי. **REBUILT 2026-06-15 (אישר המשתמש "תמחק מה שסוכן קודם
עשה הוא לא בנה טוב את זה"):** פורט קודם נמחק ונבנה מחדש כ-**העתקה מילולית 1:1** מקבצי
המקור המקומפלים של ה-sandbox (`f46e979614fc3394.css` ל-`.hero_*`, `a463080343a8b988.css`
ל-`.gamos-*`, וה-timeline המדויק מ-`page-*.js`). שתי החלטות משתמש לנאמנות-מלאה:
(א) **שמות-המחלקות מהמקור** — `.hero_root/.hero_top/.hero_bg/.hero_back/.hero_house/
.hero_composite/.hero_clouds/.hero_cloud/.hero_logo/.hero_smoke/.hero_overlay/.hero_content/
.hero_eyebrow/.hero_title/.hero_text/.hero_overlap` להירו, ו-`.gamos-hero*/.gamos-cue*`
לקומפוזר (לא namespace חדש). אומת שאין התנגשות בריפו. (ב) **הפלאגינים האמיתיים** —
`DrawSVGPlugin` (אותיות הלוגו נמשכות ב-stroke) + `SplitText` (stagger מילים בכותרת),
שניהם GSAP 3.13+ שכעת חינמיים, self-hosted ב-`assets/vendor/`. **כל ה-stack שודרג
ל-GSAP 3.15.0** (core+ScrollTrigger+ScrollToPlugin+DrawSVG+SplitText, אותה גרסה) כדי
למנוע אי-התאמת plugin/core. אומת ב-Playwright: scrub זהה ל-sandbox בכל fraction, אפס
console errors, שאר צרכני GSAP (shabbat pin, scroll-scene) תקינים.

ה-Hero הוא **סקציה אחת של 500vh** (`<section id="hero" class="hero_root">`) שבתוכה
`<div class="hero_top">` ב-`position:sticky; height:100vh` — ה-pin נעוץ ל-viewport
בזמן שגוללים 5 גבהי-מסך, ו-**GSAP ScrollTrigger** (`js/hero-scene.js`) מנפיש את השכבות
במקום את הדף. ה-`--rem` scoped (`0.5208vw` ≥768) משחזר פיקסל-מדויק את ה-`html{font-size}`
של ה-sandbox כי root של GAMOS נעול ב-16px. שכבות (z-order מלמטה למעלה, `css/sections/hero-scene.css`):

0. **back** (`sky.jpg`) — שמיים, `object-fit:cover`. **z=0**.
1. **subject** (`subject.png`) — מדבר; **עולה (`y:-40%`) וגדל (`scale:1.3`) בגלילה**. **z=1**.
1. **composite** (`subject.png`) — עותק שני של המדבר, **ממוסך ע"י אותיות הלוגו** (CSS mask
   מ-`logo.svg`, data-URI מוזרק ב-JS) → האותיות "מתמלאות" בטקסטורת המדבר. **z=1**.
2. **clouds** (`clouds.png`) ×2 — מתפזרים שמאלה/ימינה בגלילה. **z=2**.
1. **logo** (`logo.svg`, 12 paths, viewBox `0 0 205.7 82.46`) — outline לבן (stroke)
   שמתחלף ב-crossfade ל-composite הממולא. **z=1**.
3. **smoke** (`smoke.png`) — עשן עולה מהתחתית. **z=3**.
3. **overlay** — gradient דועך ל-`--ivory` לחיבור חלק. **z=3**.
4. **content** — eyebrow + כותרת דו-שורתית + תת-כותרת (גולש מעלה + דועך בגלילה). **z=4**.
20. **cue** — pill פליז + נקודה נופלת → `#hall-portal`. **z=20**.

**סקציה `#hall-portal` (`<div class="gamos-hero">`)** יושבת **בין ההירו ל-`#lounge`** —
ה-composer האינטראקטיבי שהיה "הסקציה שאחרי ההירו" ב-sandbox: תמונת base של GAMOS
(`.gamos-hero__base`, `aspect-ratio:2048/1360`) + לוגו (`.gamos-hero__logo`) + שני CTAs
wordmark (`.gamos-hero__cta--events/--resort`) עם hover-bulge + dim-siblings (`:has()`),
prompt "לחצו כדי לבחור תצוגת אולם" (`.gamos-hero__prompt` — text + line + chevron מרצד),
ו-cue משלה (`.gamos-cue` → `#lounge`). שני ה-CTAs מנתבים ל-sub-apps האמיתיים
(`/halls/dist/events/` + `/halls/dist/resort/`) עם whoosh + loading-overlay דרך
`js/hero-scene.js` (`[data-hero-link]`); `mobile/loader.js` `applyMobileRoutes` משכתב
אותם ל-`-mobile` ב-≤768px. **`#hall-portal` חייב `position:relative; z-index:111`**
(מעל ה-`z-index:110` של ההירו) — אחרת ה-`margin-bottom:-100vh` של ההירו גורם לו לצייר
מעל הקומפוזר וה-composer "נבלע". **לקח: אסור `/* */` מקונן בתוך תגובת-CSS** — הוא סוגר
את התגובה מוקדם ובולע את חוקי ה-CSS שאחריו (בדיוק מה ששבר את `aspect-ratio` של הקומפוזר
בבנייה הראשונה).

**נכסים (2026-06-15; subject.png re-encoded 2026-06-30):** ארבע שכבות ההירו
הקולנועיות (`sky.jpg`, `subject.png`, `clouds.png`, `smoke.png`) ב-`assets/images/hero-scene/`
הועתקו **כמו שהן** מה-sandbox (החלטת משתמש). ה-subject הנראה בפועל נטען מ-WebP responsive
(`subject-1280/-1920/-2560.webp` + `subject.webp` 6240w דרך `<source srcset>`); `subject.png`
הוא **fallback ה-`<img>` בלבד** (דפדפנים מודרניים לא שולפים אותו). **ב-2026-06-30 קודד מחדש**
מ-PNG ללא-אובדן 6240×1599 (~20MB) ל-3120×800 RGBA full-color (~1.6MB, sharp resize+level9) —
~92% חיסכון, ללא banding (full 24-bit), חצי-רזולוציה מספיקה ל-fallback. זה פותר את חריגת §8
שתועדה כ-follow-up. ה-composer משתמש מחדש ב-`assets/images/hero/{gamos,events,resort}.webp`
הקיימים + `base.png`.

**`window.gamosHero` stub עבר ל-`js/hero-scene.js`** — side-dot-nav (HERO_DOMINANCE 0.85)
ו-portals מאזינים ל-`onProgress`. ה-stub מחשב progress מ-`getBoundingClientRect`
לאורך **כל ה-500vh** (`-r.top / (offsetHeight - innerHeight)`, 0..1), בלתי-תלוי
ב-GSAP. GSAP בונה timeline נפרד; אין רישום ל-`window.gamosScroll` orchestrator.

**`prefers-reduced-motion: reduce`** — ה-entrance + scrub מדלגים; ההירו מציג את
הקומפוזיציה הסופית סטטית (logo ממולא, subject במקום). רק לולאות ה-cue + prompt קופאות.

**Legacy v9 נשמר (כמו §2.1 כלל 6):** `js/hero-static.js`, `css/sections/hero-static.css`,
ו-`mobile/css/hero-static.css` **לא נמחקים** — רק מנותקים מה-`index.html` (ה-`<link>`
ו-ה-MODULES entry הוחלפו). חזרה ל-v9 = החלפת markup + link + entry אחת. ה-stub
class-agnostic, ו-`js/site-nav-hover-reveal.js` משתמש בסלקטור `#hero` (לא תלוי-מחלקה),
אז כל אחד מהשניים יכול לאכלס את `window.gamosHero` ולהסתיר את ה-site-nav.

### §3 amendment — additive conversion block inside `.hero_content` (2026-07-13)

בעקבות הביקורת השיווקית (`GAMOS-DOCS/ביקורת שיווקית ומסקנות לשיפור אתר GAMOS.txt`)
והחלטת המשתמש המפורשת ("תוספת עדינה"), מותרת **תוספת אדיטיבית בלבד** בתוך
`.hero_content`: `<p class="hero_stats">` (שורת נתוני אמון, מספרים ב-`<bdi>`) +
`<div class="hero_ctas">` (CTA ראשי "תיאום סיור ובדיקת תאריך" → `#contact`, CTA
משני וואטסאפ; שניהם בשפת `buttons.css` — `.btn--glass` על רקע התמונה).

**גבולות ההיתר:** אפס שינוי ב-`js/hero-scene.js` timeline/scrub/entrance — הילדים
החדשים רוכבים על ה-tween הקיים של `.hero_content` (דוהים בגלילה יחד עם הכותרת;
זה מקובל כי כפתור הניווט + בר המובייל נשארים זמינים). ה-CSS מתווסף בסוף
`css/sections/hero-scene.css`, קומפקטי, ואסור לו להזיז את מיקום הכותרת המילולית.
כל שינוי נוסף בהירו עדיין דורש הרחבת §3.

**Sections after `#hero`:** hall-portal, **why-gamos** (ADDED 2026-07-13 — נקודות
אמון מוקדמות: צילום אמיתי, מונים, ציטוטים, CTA; ראה `architecture/section-order.md`),
lounge, culinary, shabbat-chatan, rooms, about, testimonials, gallery, events, kosher,
contact, routes.

---

## §4 RTL + עברית

- `<html dir="rtl" lang="he">`.
- **Logical properties בלבד** — `margin-inline-start`, `padding-block-end`, וכו' —
  לא physical (`margin-left/right`).
- מספרים בהקשר עברי נשארים LTR דרך Unicode bidi (`<bdi>` או `unicode-bidi: isolate`).
- **טיפוגרפיה (display family הוחלף ל-Rubik ב-2026-06-02 — ראה הערה ב-`css/tokens.css`):**
  - Hebrew + Latin display: **Rubik** (`--font-display-he` / `--font-display-en`) — החליף את Frank Ruhl Libre.
  - Hebrew + Latin body: **Heebo** (`--font-body`, 400/500/600).
  - Latin display flourishes: **Playfair Display** (400/700) + **Cinzel** (700, ל-EVENTS/RESORT של ההירו).
- כולם self-hosted ב-`assets/fonts/` כ-WOFF2 (`rubik-hebrew/-latin`, `heebo-400/500/600`,
  `playfair-display-400/700`, `cinzel-700`) עם `font-display: swap`. שמות המשפחה
  נגזרים מהטוקנים ב-`css/tokens.css` — אסור hard-code.

### §4.1 Font + texture canonical reference (LOCKED 2026-06-08, sources re-pointed 2026-06-10)

**הוראה מחייבת לכל סוכן עתידי שיוצר, מעדכן, או משנה טקסט / פונט / טיפוגרפיה / טקסטורת-טקסט באתר:**

הטקסטורות לטקסט (הכהה והבהירה כאחד) נמשכות **אך ורק** מהתיקייה הקנונית הזו, ומשום
מקום אחר. לפני יצירה או שינוי של *כל* החלטה טקסטורלית, **חובה** לפתוח קודם את:

> `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\פונט\`
> *(הספרייה הועברה מ-GAMOS-SITE ל-GAMOS-DOCS ב-2026-06-09 — ראה §7)*

זוהי הספרייה הקנונית של Mood Board לפונטים, אותיות, וטקסטורות של האתר. כוללת:
- `A-B בהיר.png` / `A-B-כהה.png` — alphabet character set ברפרנסים בהירים וכהים.
- `טיפוגרפיה בהירה.png` / `טיפוגרפיה כהה.png` — דוגמאות מילים בטקסטורה (היו המקור
  עד 2026-06-10; כעת fallback בלבד).
- `טקסטורה בהירה.png` / `טקסטורה כהה.png` — **קבצי המקור הפעילים** לטקסטורות הטקסט
  (2688×1520). `טקסטורה כהה 2.png` — וריאנט נוסף; `אותיות סופיות-כהה.png`,
  `א-ת-כהה.png` — סטי-אותיות נוספים.
- `1.2.png` — סטיילינג כללי.

**⚠️ אזהרת היפוך שם↔בהירות (קריטי — אומת ב-sharp stats()):** שמות הקבצים בתיקייה
**הפוכים** לבהירות בפועל. לכן ההצמדה נקבעת לפי luma מדוד, לא לפי השם. המקורות הפעילים
(החל מ-2026-06-15 — שניהם מתיקיית `פונט/`, אטומים לחלוטין, ללא flatten/modulate):
- `טקסטורה בהירה 2.png` → **luma 57 (טקסטורה חומה/כהה בפועל)** → `typo-on-light.webp` → לרקעים בהירים.
- `טקסטורה כהה 3.png` → **luma 222 (טקסטורה קרם/בהירה בפועל)** → `typo-on-dark.webp` → לרקעים כהים.
סוכן עתידי שמחליף את המקור — חייב למדוד luma ולוודא: כהה(<112)→רקע בהיר, בהיר(>153)→רקע כהה.

**הערה היסטורית:** בין 2026-06-11 ל-2026-06-15 ה-`typo-on-dark.webp` נגזר מתמונת המדבר
של ה-HERO (`…/HERO/מדבר-2.png`) עם `flatten:#D9C4A3` + `modulate brightness 2.4` כדי להבהיר
מקור כהה+שקוף. ב-2026-06-15 הוחזר למקור-פונט (`טקסטורה כהה 3.png`, כבר בהיר ואטום) לבקשת
המשתמש, וה-flatten/modulate הוסרו (היו מפוצצים את הטקסטורה החדשה ללבן). **שני הfills שוב
מקור-פונט** — מקיים את כלל §4.1 הבסיסי ("אך ורק מתיקיית פונט/") ללא חריגה.

**האותיות, הטקסטורות, וצורת הטקסטים באתר נלקחים אך ורק מתיקייה זו.** אסור להמציא
טיפוגרפיה מקור אחר (Google Fonts, Adobe Fonts, וכו') — אם הסוכן צריך פונט שלא
קיים בתיקייה, להציג את הסוואץ' למשתמש ולקבל אישור לפני אימוץ.

הקבצים המקודדים-בפרויקט שנגזרו מהמקורות הללו (encoder: `scripts/encode-images.mjs`
`SINGLE_WEBP`; תמיד דרך `npm run encode:images` או `node scripts/encode-images.mjs`):
- `assets/images/brand/typo-on-light.webp` — טקסטורת טקסט **כהה/חומה** (luma 57, מ-`טקסטורה בהירה 2.png`, החל מ-2026-06-15) — לרקעים בהירים.
- `assets/images/brand/typo-on-dark.webp` — טקסטורת טקסט **בהירה/קרם** (luma 222, מ-`טקסטורה כהה 3.png`, החל מ-2026-06-15) — לרקעים כהים.
- `assets/images/brand/texture-light.webp` / `texture-dark.webp` — טקסטורות
  background כלליות (לא לטקסט; legacy, לא בשימוש ב-markup).

ה-classes ב-`css/components/texture-text.css` (single source of truth דרך הטוקנים
`--typo-on-light` / `--typo-on-dark` ב-`css/tokens.css` — אסור hard-code של url):
- `.texture-text` או `.texture-text--dark` → טקסטורה כהה (typo-on-light) — לרקעים
  בהירים (ivory). זה ה-default ברוב האתר.
- `.texture-text--light` → טקסטורה בהירה (typo-on-dark) — לרקעים כהים (ink-deep,
  cocoa, hero, culinary, lounge, shabbat-chatan, press).

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

הצבעים נכתבים ב-`architecture/tokens.md` ו-`css/tokens.css` ע"י Agent 02. שינוי צבע אחרי הנעילה דורש עדכון Constitution + commit מתועד ב-git.

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

1. **כל סוכן כותב תוכנית ב-`PLANS/<category>/` לפי כללי `PLANS/README.md` לפני
   שהוא רץ קוד.** (תיקיית `agent-plans/` בוטלה ונמחקה 2026-06-22 — כל התוכניות,
   כולל של סוכנים, חיות תחת `PLANS/`.)
2. **שינויים נושאיים מובנים** הולכים ל-`PLANS/<category>/` לפי כללי `PLANS/README.md`.
3. **גילויים משמעותיים** מתועדים ב-commit message ב-git עם תאריך + מקור (היסטוריית השינויים חיה ב-`git log`, לא בקובץ החוק).
4. **מצב הפרויקט** משתקף ב-`STATUS.md` בשורש (לא ב-progress.md/findings.md הישנים — נמחקו 2026-06-01).
5. **תוכניות שהושלמו** → ניתן למחוק (ההיסטוריה ב-git). תוכניות שננטשו → `PLANS/archive/`.
6. **ניקוי קבצי-זבל לפני commit/push (LOCKED 2026-06-16, הוראת המשתמש).** כל
   סוכן **חייב** למחוק כל קובץ ארעי/scratch שהוא יצר במהלך עבודתו לפני שהוא
   מסיים — קבצי QA זמניים (`.tmp-*.mjs`, `*.qa.*`), screenshots חד-פעמיים,
   logs, פלטי-בדיקה, וכל דבר שאינו חלק מהדליברי. ה-scratch היחיד המותר הוא
   תחת `.tmp/` (gitignored). **לפני `git commit`/`git push`:** הרץ
   `git status` וודא שאין קבצים לא-מכוונים ב-staging או ב-working tree; הפרויקט
   חייב להישאר נקי ומוכן-לדיפלוי. אסור לעשות `git add .` עיוור — הוסף **רק** את
   הקבצים ששייכים לשינוי שלך (ראה §14 לגבי מה מודר מהדיפלוי).

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
5. **All plans live in `PLANS/`** — including agent plans. (תיקיית `agent-plans/`
   בוטלה ונמחקה 2026-06-22; אין יותר ארגון-לפי-בעלות נפרד.)
6. **Status lives in `STATUS.md`** — current state vs. master plan, with checklist against §11 DoD. Master plan at `PLANS/research/2026-05-28_master-rebuild-plan.md` is canonical reference. Active future work at `PLANS/next-steps/`.

---

## §11 Definition of Done

- Lighthouse mobile ≥ 90 בכל ארבעת העמודים (Performance / A11y / Best Practices / SEO).
- RTL keyboard pass: כל אינטראקטיב מגיע, focus ring נראה.
- שתי בועות פורטל לוחצות עובדות, click-routing מגיע לסקציה הנכונה.
- 60fps scrub בדסקטופ class-M1 (DevTools Performance recorder).
- Mobile fallback verified ב-iPhone 12 + Galaxy S22.
- כל הלשוניות מ-gamos.co.il מיוצגות (Agent 1 inventory מאומת ע"י משתמש).
- ~~10 קבצי `agent-plans/agent-NN_*.md` קיימים~~ — כל 14 התוכניות בוצעו ונמחקו אחרי השלמתן (2026-06-01); תיקיית `agent-plans/` עצמה בוטלה ונמחקה 2026-06-22. ההיסטוריה ב-`git log` + `STATUS.md`. תוכניות עתידיות (כולל של סוכנים) ב-`PLANS/` (למשל `PLANS/next-steps/`).

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
   - `CLAUDE.md` (§13 updates)
   - הסרת clauses `(max-width: …)` מ-`css/sections/*.css` כשעוברים
     ל-overrides ב-`mobile/css/`.
   אסור לערבב refactor של ליבה.
7. **אסור להוסיף `@media` למובייל ישירות לקבצים ב-`/css/sections/`** —
   הקבצים האלה הם desktop-first; כל override מובייל הולך ל-`mobile/css/`.
8. **שמירת חוויה (Constitution §1 — Luxury or nothing).** גרסת מובייל
   לא רשאית להפיל אלמנט/חוויה שקיימת בדסקטופ. אם דסקטופ מציג חוויה X,
   מובייל חייב להציג גרסה equivalent של X — לא fallback סטטי שטוח.
   ה-`prefers-reduced-motion: reduce` הוא היוצא היחיד.

### §13 amendment — sanctioned core edit for the shabbat pin (2026-06-11)

חוק §13 קובע שכל קוד מובייל חי ב-`/mobile/` ואסור לגעת בליבה (חוץ מהסרת
clauses של `(max-width:…)` לפי כלל 6). ב-2026-06-11 (פאס "זהה-לדסקטופ במובייל")
זוהה **מקרה יחיד** שבו אי-אפשר להשיג נאמנות-מלאה דרך `/mobile/` בלבד:
סקציית `#shabbat-chatan`. ה-pin הנעוץ + mask-reveal חי בלעדית בענף
`(min-width:769px)` של `js/shabbat-gallery.js` (`gsap.matchMedia`), ואין שום
seam של CSS/DOM/loader שיכול לאלץ אותו לרוץ ב-390px בלי לערוך את הקובץ הזה.

**הכרעת המשתמש: נאמנות > §13 self-containment בנקודה הזו.** האישור (מפורש,
2026-06-11) מתיר עריכת-ליבה כירורגית: לקרוס את ה-`matchMedia` split כך
שה-`buildDesktopTimeline` ירוץ בכל הרוחבים (`(min-width:1px)`), לפרוש את
`buildMobileTimeline`, ולהסיר את `shabbat-chatan-mobile` מ-`js/main.js` (+ מחיקת
`mobile/js/shabbat-chatan-mobile.js`). ה-fit לרוחב-צר נשאר ב-`mobile/css/`. זהו
**החריג היחיד** המאושר; כל סקציה אחרת נשארת §13-clean. כלל 8 (no flat fallback)
מתקיים כעת ל-shabbat בדסקטופ ובמובייל גם יחד.

**הוראה מפורשת לסוכנים עתידיים:** כל בקשת המשתמש שכוללת מילים כמו
"מובייל", "mobile", "responsive", "iPhone", "Android", "טאצ'", "touch",
"גודל מסך", "viewport" — קוראים את `/mobile/README.md` לפני הגעה לקוד.
תיקון מובייל לא הולך ל-`/css/sections/` או `/js/`; הוא הולך ל-`/mobile/`.

### §13 amendment — dedicated mobile entry document `/mobile/index.html` (2026-06-15)

חוק §13 קובע שכל קוד המובייל חי ב-`/mobile/` כ-`@media` overrides על אותו
`index.html` יחיד (אין דף-מובייל נפרד). ב-2026-06-15, לבקשת המשתמש המפורשת
("גרסת-מובייל נפרדת לאתר — index משלה, לא התאמת הקוד הקיים"), נוסף **דף-כניסה
ייעודי למובייל**: `/mobile/index.html`. זה מרחיב את §13 בלי לסתור את רוחו, לפי
תקדים §2.1 (entry-HTML נפרד + ניתוב `window.location`, ללא SPA-bleed).

**כללי החריגה:**

1. **`mobile/index.html` הוא build artifact — לעולם לא נערך ידנית.** הוא נוצר
   מ-`index.html` (מקור-אמת יחיד) ע"י `scripts/build-mobile-index.mjs` דרך
   `npm run build:mobile` (גם חלק מ-`npm run build`). הטרנספורם מינימלי: (א)
   מוסיף `data-view="mobile"` ל-`<html>`; (ב) מסיר את בלוק ה-`MOBILE-REDIRECT`
   (כדי שהדף לא יקפיץ את עצמו); (ג) מוסיף באנר "GENERATED — DO NOT EDIT". כל
   השאר זהה-בית ל-`index.html`. **אפס דריפט** — שינוי תוכן/סקציה נעשה פעם אחת
   ב-`index.html` וזורם אוטומטית למובייל ב-build הבא.

2. **`/mobile/css/*` + `mobile/loader.js` נשארים מקור-האמת של המובייל.** הדף
   הייעודי טוען בדיוק את אותה שכבת-מובייל (loader מזריק את 9 קבצי ה-CSS, half
   images, hero tap zones, culinary-mobile manifest, `overflow-x:clip` ל-sticky,
   ≥44px targets). אסור לשכפל לוגיקת-מובייל לתוך `mobile/index.html` עצמו.

3. **ניתוב צד-לקוח יחיד, מאושר כעריכת-ליבה.** בלוק `<!-- MOBILE-REDIRECT:START
   … END -->` ב-`<head>` של `index.html` (סקריפט inline זעיר) מעביר מבקרי
   `(max-width:768px)` ל-`/mobile/` עם `location.replace` לפני צbiור, ומכבד
   `sessionStorage['gamos-force-desktop']` ל-opt-out עתידי. דסקטופ (≥769px)
   = no-op. זו אותה לוגיקה כמו תקדים `applyMobileRoutes()` ב-loader (viewport-
   gated, client-side, desktop untouched), וזו **עריכת-הליבה היחידה** המאושרת
   ב-`index.html` מעבר לשורת ה-loader הקיימת.

4. **כל שאר §13 בתוקף.** קוד-מובייל חדש עדיין הולך ל-`/mobile/` (CSS overrides +
   loader patches), לא ל-`/css/sections/` או `/js/`. כלל 8 (no flat fallback) +
   "preserve experience" בתוקף — הדף הייעודי מציג את אותן 12 הסקציות, לא גרסה
   מצומצמת.

**הוראה לסוכנים עתידיים:** לעולם אל תערוך את `mobile/index.html` ידנית — ערוך
את `index.html` + שכבת `/mobile/` והרץ `npm run build:mobile`. אם משנים את מבנה
ה-`<head>` של `index.html` (במיוחד בלוק ה-MOBILE-REDIRECT), ודא שהמחולל עדיין
מזהה ומסיר אותו (regex ב-`scripts/build-mobile-index.mjs`).

### §13 note — mobile fixed CTA bar (2026-07-13)

במסגרת ה-conversion pass נוסף **בר פעולה תחתון קבוע** במובייל (≤768px): טלפון /
וואטסאפ / "תיאום סיור" (→ `#contact`). מומש §13-clean: `mobile/css/cta-bar.css`
(media-query בלבד, טוקנים, safe-area) + `injectCtaBar()` ב-`mobile/loader.js`
(מוזרק לפני ה-lang FAB כדי ש-i18n וה-anchor-binding יתפסו אותו). ה-FAB של השפה
הוסט מעל הבר. אין נגיעה בליבה. פירוט ב-`/mobile/README.md`.

---

## §14 Deployment cost discipline (LOCKED 2026-06-10)

**מסמך מקור:** `DEPLOYMENT-COSTS.md` בשורש הפרויקט (עותק-ראי גם ב-`D:\משה פרוייקטים\GAMOS-DOCS\DEPLOYMENT-COSTS.md`).

**הוראה מחייבת.** כאשר הפרויקט עובר ל**דיפלוי לפרודקשן ציבורי** — סוכן/משתמש
**חייב** לפתוח קודם את `DEPLOYMENT-COSTS.md` ולפעול לפי ההמלצות בו. המסמך מבוסס על
סריקה אמיתית של הקודבייס (לא הערכה תיאורטית) ומתעדכן אם הארכיטקטורה משתנה.

**טריגרים** (עברית + English): "דיפלוי", "deploy", "production", "פרודקשן",
"לעלות לאוויר", "go live", "hosting", "אחסון", "CDN", "עלויות", "costs", "Cloudflare",
"Netlify", "Vercel" — כל אחד מאלה מחייב קריאת `DEPLOYMENT-COSTS.md` לפני פעולה.

**ההמלצות המחייבות בקצרה (הפירוט המלא במסמך):**

1. **הוסט: Cloudflare Pages.** האתר סטטי ב-100% (אין backend/DB/auth/AI בזמן ריצה).
   Cloudflare Pages = egress ללא הגבלה → רוחב פס $0 בכל דרגת מבקרים. **אסור** לדפלוי
   ל-Netlify/Vercel בלי לאשר מודעות לחריגות רוחב הפס (יכול להגיע ל-~$800–$2,800/חודש
   ב-100k מבקרים) — זו "המלכודת" שהמסמך מזהיר מפניה.
2. **שני תיקונים חובה לפני העלייה לאוויר:**
   - **(א)** ✅ **בוצע 2026-06-16 (עודכן באותו יום).** ה-scrub הקולינרי **נשאר
     canvas-frames** (האפקט הקולנועי המקורי: zoom 1.35 + pointer-parallax +
     money-shot start) — אך תוקן ה-OOM שגרם לקריסה. **שורש הבעיה:** ה-renderer טען
     בלהיטות את כל 361 הפריימים בו-זמנית (351 בקשות, ~11GB ImageBitmaps של 4K) → (1)
     הטאב קרס מ-OOM; (2) מבול הבקשות חנק את ה-connection-pool וכל שאר תמונות ה-lazy
     נתקעו אפורות. **התיקון:** `js/canvas-frame-renderer.js` עבר ל-**sliding-window
     decode** — מחזיק רק ~9 פריימים (דסקטופ) / ~17 (מובייל) מפוענחים סביב ה-frame
     הנוכחי, שולף-לפי-דרישה תוך כדי scroll, ומשחרר (`bitmap.close()` + `AbortController`)
     את השאר. זיכרון peak: ~11GB → ~70MB. בנוסף קודדו פריימי הדסקטופ מחדש 4K→1080p
     (`scripts/encode-frames.mjs` width 3840→1920, q90): 209MB→~42MB, אפס אובדן נראה
     (ה-canvas מצייר בגודל viewport ממילא). **הערה — ניסיון-ביניים שנזנח:** ב-2026-06-16
     נוסה תחילה להחליף ל-`<video>` (`culinary-h264-1080.mp4`, H.264 — כי המקור HEVC/4K
     לא מתנגן בדפדפנים), אבל זה איבד את ה-zoom/parallax/money-shot **וגם לא עושה scrub
     ב-iOS** (`video.currentTime` חסום שם). לכן הוחזר ל-canvas-frames, שהוא היחיד
     שעובד ב-iOS. ה-`culinary-h264-1080.mp4` נשאר בדיסק כ-fallback לא-בשימוש.
   - **(ב)** ✅ **בוצע.** היתומים מוחרגים מהדיפלוי דרך allow-list ב-`scripts/deploy-cloudflare.mjs`:
     `assets/frames/hero` (155MB), `assets/_src` (49MB), כל `assets/video/` חוץ מ-2 קבצים
     נדרשים, `docs/` (כולל zip של 30MB שחורג ממגבלת 25MiB/קובץ של Cloudflare), ועוד.
     הפלט המדופלוי: ~138MB / 772 קבצים (היה ~500MB).
3. **אריחי מפה:** להחליף את ה-CARTO keyless (מפר ToS בפרודקשן) ב-**MapTiler free tier** עם מפתח — ה-CSS recolor אגנוסטי לספק, drop-in.
4. **שאר השירותים** (אנליטיקה, ניטור, טפסים, מייל) — כולם בעלות $0 דרך free-tier
   (Cloudflare Web Analytics, UptimeRobot, WhatsApp/`mailto`). הפירוט במסמך.

**עלות צפויה בפרודקשן:** ~$1–15/חודש (בעיקר דומיין). אם בעתיד יתווסף backend אמיתי
(CMS / הזמנות צד-שרת / חשבונות / AI) — יש לעדכן את `DEPLOYMENT-COSTS.md` ולהעריך מחדש.
