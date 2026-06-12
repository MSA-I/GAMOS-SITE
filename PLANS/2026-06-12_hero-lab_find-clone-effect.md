# תוכנית: שכפול נאמן של אפקט ההירו של FIND לתוך hero-lab של GAMOS

> **סטטוס:** תכנון בלבד — לא מומש. עבודה ב-sandbox בלבד (`hero-lab/`). אסור לגעת ב-production.
> **תאריך:** 2026-06-12
> **עותק-עבודה (plan-mode):** `C:/Users/art1/.claude/plans/plan-only-task-find-a-curried-lake.md`

---

## Context — למה התוכנית הזאת

המשתמש דיווח שה-preview הנוכחי של ה-hero-lab **לא נראה בכלל** כמו פרויקט המקור בתיקיית השורש. סרקתי לעומק והגעתי לאבחנה חד-משמעית:

- **פרויקט המקור של האפקט = `D:/משה פרוייקטים/findrealestate-clone`** (clone של אתר FIND Real Estate). הוא אפילו כולל מסמך טכני בשם `איך-ההירו-בנוי.md` שמפרט בדיוק את האפקט. (הערה: לפי זמן יצירה, `findrealestate-clone` נוצר אחרון (11/6 18:38) ו-`phantom-sphere-gallery` אחד-לפני (11/6 13:36). המשתמש אמר "אחד לפני האחרון" אבל **התוכן חד-משמעי** ש-findrealestate-clone הוא מקור ההירו; phantom-sphere-gallery הוא מקור גלריית החדרים, לא ההירו. אם הכוונה הייתה לפרויקט אחר — לעצור ולברר.)
- ה-`hero-lab` הנוכחי בנה את **המבנה הטכני הנכון** (8 שכבות, 500vh sticky pin, GSAP+ScrollTrigger+Lenis, fallbacks) — אבל **סטה ב-3 דרכים מהותיות** שגורמות לזה לא להיראות כמו FIND.

**התוצאה הרצויה:** hero-lab שמשכפל את האפקט של FIND בנאמנות גבוהה — סאבג'קט חתוך שעולה/גדל וממלא אותיות לוגו דרך מסכת-SVG, שני עננים נפרדים שנפרשים, עשן עולה — עם נכסי GAMOS וטקסט עברי, בתוך sandbox מבודד.

---

## איך ההירו של FIND בנוי (המקור הקנוני)

8 שכבות `position:absolute` מוערמות ב-`.hero_top` (`position:sticky; top:0; height:100vh`) בתוך `.hero_root` בגובה **500vh** (`margin-bottom:-100vh`). מאחור→קדימה:

| z | שכבה (FIND) | תוכן | תנועה בגלילה |
|---|-------------|------|----------------|
| 0 | `hero_back` | רקע שמיים (jpg, `object-fit:cover`) | scale עדין |
| 1 | `hero_house` | **תמונת סאבג'קט חתוכה** (PNG עם alpha), `top:60vh`, `transform-origin:bottom center` | `y:-40% scale:1.3` — עולה וגדל |
| 1 | `hero_composite` | **עותק שני של אותו סאבג'קט**, ממוסך דרך `mask-image` SVG בצורת אותיות הלוגו, `opacity:0` | `opacity 0→1` (מתמלא), `y:20% scale:.9` |
| 2 | `hero_clouds` | **שני עננים נפרדים** (שמאל `left:-33.72rem` + ימין `right:-33.72rem`) | `x:±15%` — נפרשים החוצה |
| 1 | `hero_logo` | קו-מתאר SVG של האותיות (`fill:transparent; stroke:#fff ~2px`), `opacity:0` | fade-out ככל שהמילוי עולה |
| 3 | `hero_smoke` | **עשן/ערפל נפרד** (PNG), `translateY(70%)` | עולה מלמטה |
| 3 | `hero_overlay` | `linear-gradient(180deg, transparent, #fff)` | דהייה לבנה תחתונה |
| top | `hero_content` | כותרת + תת + CTA | fade/lift |

**אנימציה:** timeline כניסה ב-GSAP (house scale 1.1→1 dur5 expo.out; smoke y 50%→100%; clouds stagger .2; title stagger .1) + **שני** ScrollTriggers (ראשי `scrub:0.1`, soft-entry `scrub:3`). Lenis מזין את ScrollTrigger.

**⚠️ כשל קריטי במקור (חובה להימנע ממנו):** ה-build של Next.js הגיש `visibility:hidden` שהוסר רק אחרי React hydration. כשחסרו קבצי route — אין hydration → **מסך לבן**. הפורט הוונילה שלנו **חייב** להישאר תמיד-נראה (אין מצב שתלוי-JS שמסתיר את ההירו).

---

## למה ה-hero-lab הנוכחי לא דומה מספיק (3 הסטיות)

1. **מסכה:** ה-hero-lab השתמש ב-`background-clip:text` על טקסט Cinzel **חי** (רך/טיפוגרפי). FIND משתמש ב-**SVG image-mask** על **עותק כפול של תמונת הסאבג'קט** (חד/גרפי). → לעבור ל-SVG mask של עותק-סאבג'קט שני.
2. **סאבג'קט:** ל-hero-lab **אין** שכבת סאבג'קט-חתוך שעולה — התמונה הראשית שלו היא מדבר full-bleed שרק נע/גדל. ל-FIND יש סאבג'קט חתוך שעולה, גדל וממלא את האותיות. → להוסיף שכבת סאבג'קט-חתוך אמיתית (מבנה האולם/ריזורט).
3. **עננים/עשן:** ה-hero-lab מחזר קובץ `cloud-band.webp` **אחד 3 פעמים** (2 עננים + ערפל). FIND משתמש ב-**שני עננים שונים + שכבת עשן נפרדת**. → לייצר 2 חיתוכי-עננים שונים + חיתוך-עשן אחד.

---

## החלטות שננעלו עם המשתמש (לבנות בדיוק לפיהן)

1. **טכניקת מסכה** = SVG image-mask נאמן ל-FIND (עותק-סאבג'קט כפול ממוסך דרך path של האותיות; **לא** `background-clip:text`).
2. **סאבג'קט ראשי** = מבנה האולם/ריזורט החתוך. ⚠️ **בלוקר שאומת:** קבצי `מחולצות/אולם` + `/ריזורט` הם בפועל **אטומים מלא** (`alpha=255`, 0% שקיפות) — לא חיתוכים. **החלטת המשתמש: להוסיף שלב background-removal** ב-build כדי לייצר alpha אמיתי.
3. **עננים/עשן** = שני עננים נפרדים + עשן נפרד (נאמן).
4. **אותיות המסכה** = `GAMOS` + `Events` ב-Cinzel (שתי שורות), משמשות גם למסכה (שכבה 3) וגם לקו-המתאר המוקף (שכבה 5).

---

## מקורות נכסים זמינים (READ-ONLY, תחת `GAMOS-DOCS\תמונות לאנימציית האתר\`)

| נכס | נתיב | מידות / alpha | תפקיד ב-FIND |
|-----|------|----------------|----------------|
| סאבג'קט אולם | `השראות/תמונות מחולצות/אולם/01..20.png` | 1920×1080, **אטום (0% שקיפות)** | מקור הסאבג'קט (אחרי הסרת-רקע) |
| סאבג'קט ריזורט | `השראות/תמונות מחולצות/ריזורט/16..32.png` | 1920×1080, **אטום** | מקור סאבג'קט חלופי |
| מדבר (שמיים שקופים) | `HERO/מדבר.png` / `מדבר-2.png` | 6240×1599, **alpha אמיתי (10% שקוף)** | מקור עננים + עשן + sky-band |
| סצנת HERO מלאה | `HERO/hf_20260611_*.png` ×3 | 2752×1536, ללא alpha | מקור רקע שמיים |
| סצנת HERO upscale | `HERO/comfy/z-image-upscaled_00001..3_.png` | 2736×1528, ללא alpha | מקור רקע שמיים (בהיר/חם) |
| לוגו מרכזי | `לוגו/לוגו מרכזי.png` | 2116×1317, **alpha (82% שקוף)** | מקור wordmark (חלופה) |
| GAMOS חתוך | `HERO/GAMOS 1.png` | 426×161, **alpha (87% שקוף)** | מקור wordmark (חלופה) |
| variants "מרחפות" | `השראות/תמונות מרחפות/אולם|ריזורט/*.png` | עד 5504×3072, **ללא alpha** | סאבג'קט גיבוי (קרופ גדול) |

נכסי production קיימים תחת `GAMOS-SITE/assets/images/hero/` (base/desert/gamos/events/resort webp) — לא בשימוש כאן כדי לא לזהם את ה-sandbox, אך זמינים לעיון.

---

## A. צינור נכסים — להרחיב את `hero-lab/scripts/build-assets.mjs`

לשמר את צורת ה-ESM הקיימת, את ה-helpers `clamp`/`smoothstep`, את פתרון `LAB`/`OUT`, ואת משמעת ה-READ-ONLY (§7). כל הפלט ל-`hero-lab/assets/` בלבד.

**A.0 קבועי מקור:**
- `SKY_SRC = HERO/comfy/z-image-upscaled_00001_.png` (2736×1528, רקע שמיים חם)
- `SUBJECT_SRC = השראות/תמונות מחולצות/אולם/13.png` (frame אולם חזק וממורכז — לבחירה סופית ויזואלית)
- `DESERT_SRC = HERO/מדבר.png` (6240×1599, שמיים שקופים — מקור עננים/עשן)

**A.1 רקע שמיים — `sky.webp` / `sky-mobile.webp`**
- מ-`SKY_SRC`: `resize(width:2000)` → `webp(q80)` → `sky.webp` (≤140KB). מובייל: `width:1080, q72` → `sky-mobile.webp` (≤**80KB** — זה ה-LCP candidate, חובה preload).

**A.2 סאבג'קט חתוך — `subject.webp` / `subject-mobile.webp` (שמירת alpha!)**
- **שלב הסרת-רקע (החלטת המשתמש):** להעביר את `SUBJECT_SRC` דרך `@imgly/background-removal-node` (או `rembg` CLI אם זמין) → buffer RGBA עם alpha אמיתי.
- אז: `sharp(buf,{raw}).trim({threshold:10})` (קרופ ל-bbox של ה-alpha) → `resize(width:1600)` → `webp(q82, alphaQuality:92)` → `subject.webp` (≤150KB); מובייל `width:900, q78` → `subject-mobile.webp` (≤70KB).
- ⚠️ **תלות dev חדשה** (נוגעת ב-`package.json` המשותף) — צריכה אישור מפורש לפני ההתקנה. אם המשתמש לא רוצה לגעת ב-package.json: fallback ל-`rembg` CLI חיצוני (אם מותקן) או הרצה חד-פעמית ידנית והנחתת הקובץ.

**A.3 שני עננים שונים — `cloud-left.webp` + `cloud-right.webp`**
- מ-`DESERT_SRC` (6240×1599 — רחב מספיק לשני קרופים **לא חופפים** → צורות שונות אמיתית, מתקן סטייה #3):
  - `cloud-left`: `extract({left:0, top:H*0.30, width:W*0.42, height:H*0.45})`
  - `cloud-right`: `extract({left:W*0.58, top:H*0.30, width:W*0.42, height:H*0.45})`
- לעשות reuse ללולאת ה-luminance-key + smoothstep הקיימת, אבל **להכפיל את ה-luma-key ב-alpha המקור** (כי השמיים כבר שקופים שם) כדי שלא יישאבו פיקסלי-רכס ל-cutout (נגד "בוץ"). לשמר את ה-warm-white push. feather לכל 4 הקצוות.
- `resize(width:1400)` → `webp(q84, alphaQuality:90)`, כל אחד ≤90KB.

**A.4 רצועת עשן עולה — `smoke.webp`**
- מ-`DESERT_SRC` רצועה תחתונה `extract({left:W*0.20, top:H*0.62, width:W*0.60, height:H*0.34})`.
- אותו keyer עם ספים נמוכים (`LO=120, HI=185`) ל-haze רך, feather אנכי כבד למעלה (`fadeTop=h*0.40`). `blur(2)` (שייקרא כעשן ולא טופוגרפיה) → `webp(q80, alphaQuality:88)`, ≤80KB.

**תקציב משוער:** ~8 קבצים, ~0.6MB דסקטופ / ~0.34MB מובייל. הקבצים הישנים (`cloud-band.webp`, `desert*.webp`) מוחלפים — להשאיר על הדיסק (sandbox, לא מזיק) או לדרוס.

---

## B. אותיות → מסכת SVG

**אילוץ שאומת:** אין `.ttf`/`.otf` של Cinzel על הדיסק (רק `cinzel-700.woff2` subset), ו-`opentype.js`/`fontkit` **לא מותקנים**. לכן build-step שמחלץ glyph→path היה דורש 2 תלויות חדשות + המרת woff2→ttf. כבד ושביר.

**המלצה: SVG inline עם `<text font-family="Cinzel">` ששימש גם כ-`<mask>` וגם כקו-מתאר מוקף — לא opentype.js, לא data-URI.**
- עובד לגמרי offline עם ה-`cinzel-700.woff2` שכבר self-hosted. אפס תלויות חדשות.
- אותה גאומטריית `<text>` מזינה גם את שכבה 3 (mask) וגם שכבה 5 (outline) → רישום מושלם (אין drift).

```html
<svg class="wordmark-svg" viewBox="0 0 1000 460" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <defs>
    <mask id="gamosLetters" maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height="460">
      <rect width="1000" height="460" fill="#000"/>
      <text x="500" y="300" text-anchor="middle" font-family="Cinzel" font-weight="700"
            font-size="300" letter-spacing="12" fill="#fff">GAMOS</text>
      <text x="500" y="430" text-anchor="middle" font-family="Cinzel" font-weight="700"
            font-size="92"  letter-spacing="40" fill="#fff">EVENTS</text>
    </mask>
  </defs>
  <!-- שכבה 3 מילוי: עותק כפול של הסאבג'קט, נראה רק דרך האותיות -->
  <image href="./assets/subject.webp" x="0" y="0" width="1000" height="460"
         preserveAspectRatio="xMidYMid slice" mask="url(#gamosLetters)"/>
</svg>
```
- שכבה 5 (outline) = אותם שני `<text>` עם `fill="transparent" stroke="#f5efe6" stroke-width="2"` ב-SVG שני (ללא mask).
- viewBox `0 0 1000 460` (≈ פרופורציות 977×423 של FIND). גודל מסך דרך CSS: `width: min(78vw, 1000px)`. (מודע: מוותרים על ה-`97.7rem` הקבוע של FIND לטובת clamp רספונסיבי — ראה סיכון 5.)
- המסכה נמדדת מחדש אחרי `document.fonts.ready` (ב-JS).

---

## C. שינויי HTML — `hero-lab/index.html`

לשמר: `dir="rtl" lang="he"`, ה-flip של no-js→js לפני first paint, `sr-only` h1, skip-link, vendors ב-defer + JS `type=module`.

- **Preload:** להחליף ל-`./assets/sky-mobile.webp` (ה-LCP candidate החדש), `fetchpriority="high"`.
- **L1 sky** (`.layer--sky`): להוסיף `<picture>` עם `sky-mobile.webp`/`sky.webp`; להשאיר את ה-gradient כ-background מאחור (אף פעם לא ריק לפני decode).
- **L2 subject** (`.layer--subject`, היה `--desert`): `<picture>` עם `subject-mobile.webp`/`subject.webp` — הסאבג'קט החתוך העולה (FIND `hero_house`).
- **L3 maskfill** (`.layer--maskfill`): להחליף את בלוק `background-clip:text` ב-**SVG inline מ-Part B** (`<image href="subject.webp" mask="url(#gamosLetters)">`) — עותק שני ממוסך (FIND `hero_composite`).
- **L4 clouds** (`.layer--clouds`): לפצל לשתי תמונות שונות — `cloud-left.webp` + `cloud-right.webp` (מתקן #3).
- **L5 outline** (`.layer--outline`): ה-SVG השני עם `<text>` מוקף (FIND `hero_logo`), opacity מ-`--p`.
- **L6 smoke** (`.layer--smoke`, היה `--fog`): `<img src="smoke.webp">` — שכבת עשן נפרדת (FIND `hero_smoke`).
- **L7 veil** (`.layer--veil`): gradient קרם/לבן (FIND `hero_overlay`).
- **L8 content**: ללא שינוי — עברית + CTAs + scroll-cue.

כל השכבות הדקורטיביות `aria-hidden="true"`; ה-`sr-only` h1 נשאר השם הנגיש.

---

## D. שינויי CSS — `hero-lab/css/hero-lab.css`

לשמר את מודל `--p`/`--enter`, ברירת-מחדל `--enter:1`, ה-flip `html.js{--enter:0}`, logical props, ובלוקי reduced-motion + no-js. להתאים למספרים של FIND:

- **L1 sky** `z:1`; `img{object-fit:cover; object-position:50% 45%}`; `scale(calc(1 + var(--p)*0.05))`.
- **L2 subject** `z:2`; `top:60vh; transform-origin:bottom center`; כניסה `scale(calc(1.1 - 0.1*var(--enter)))`; גלילה `translate3d(0, calc(var(--p)*-40%),0) scale(calc(1 + var(--p)*0.3))` (FIND house). `will-change:transform`.
- **L3 maskfill** `z:3`; SVG `width:min(78vw,1000px)`, ממורכז `display:grid;place-items:center`; **`opacity:var(--p)`** (0→1, מתמלא); `translateY(calc(var(--p)*20%)) scale(calc(1 - var(--p)*0.1))`.
- **L4 clouds** `z:4`; `.cloud{position:absolute; inset-block-end:8%; width:42%}`:
  - `.cloud--start{ inset-inline-start:-33.72%; transform:translate3d(calc((1 - var(--enter))*40% + var(--p)*15%),0,0) }`
  - `.cloud--end{ inset-inline-end:-33.72%; transform:scaleX(-1) translate3d(calc((1 - var(--enter))*45% + var(--p)*15%),0,0) }` (45% = תחושת stagger)
- **L5 outline** `z:5`; אותו גודל/transform כמו L3 (רישום נעול); **`opacity:calc(1 - var(--p)*0.85)`**; `stroke:var(--ivory); stroke-width:2`.
- **L6 smoke** `z:6`; `display:flex; align-items:flex-end; overflow:hidden`; `.smoke__img{width:130%; margin-inline-start:-15%; transform:translate3d(0, calc(70% - var(--p)*60%),0); opacity:calc(0.6 + var(--p)*0.4)}`.
- **L7 veil** `z:7`; `linear-gradient(180deg, transparent 0%, transparent 45%, rgba(245,239,230,.6) 70%, var(--ivory) 100%)`; `opacity:calc(0.5 + var(--p)*0.5)`.
- **L8 content** `z:8`; כניסה+גלילה כמו היום.

**לעדכן את בלוקי no-js + reduced-motion לשכבות החדשות** כך שדבר לא ריק/חצי-חשוף: `--p` קפוא ב-mid-state נעים — `.layer--maskfill{opacity:1}`, outline `opacity:0.18`, subject `transform:none`, שני עננים בפריים (`transform:scaleX(±1)`), smoke `translateY(20%) opacity:0.85`, veil `opacity:0.7`, `.hero_root{height:100vh; margin-block-end:0}`, `.hero_top{position:relative}`. (וידוא: מאחר ש-`--enter` ברירת-מחדל 1, `(1-var(--enter))*40%`=0 → עננים בפריים במנוחה. הסיכון היחיד הוא frame אחד עם `html.js{--enter:0}` לפני שה-JS רץ — בדיוק הסיבה ל-`showFinishedFrame()`.)

---

## E. שינויי JS — `hero-lab/js/hero-lab.js`

**המלצה: לשמר את מודל ה-ScrollTrigger-היחיד `--p`.** לא להוסיף את ה-`scrub:3` השני של FIND — מספר אחד (`--p`) מניע כל שכבה דרך `calc()`; משתנה scrubbed שני מכפיל כתיבות וסיכוני-קונפליקט עבור החלקה דקה ש-`scrub:0.6` כבר נותן. אם רוצים את תחושת ה-soft-entry — להשיג ב-CSS (עקומה מעודנת על שכבות נבחרות), לא trigger שני.

- **לשמר את timeline הכניסה `--enter`** (`gsap.to({v:0→1}, dur1.5, power3.out)`). תחושת ה-stagger מושגת דרך מכפילי-offset פר-שכבה ב-CSS (clouds 40%/45%, subject scale, content 24px) — אין צורך בשינוי JS ל-stagger.
- **לשמר כל נתיב guard:** `waitForVendors(3000)` → `showFinishedFrame()`; reduced-motion early-return; Lenis try/catch; catch-all → `showFinishedFrame()`.
- **`document.fonts.ready` הופך ל-load-bearing** למסכת ה-SVG `<text>` (Cinzel חייב להיטען לפני שגאומטריית המסכה סופית). ה-`fonts.ready.then(refresh)` הקיים מכסה זאת; להוסיף `ScrollTrigger.refresh()` אחרי הפונטים. ה-SVG mask re-rasterize אוטומטית כשהפונט מוחלף — אין סיכון blank.
- **אין סיכון blank חדש:** ברירת-מחדל `--enter:1` + no-js שומרים הכל נראה.

---

## F. תוכנית בדיקות Playwright (מתוכנן — להריץ אחרי ה-build)

סקריפט חדש `hero-lab/scripts/qa-hero-lab.mjs`, על בסיס `mobile/scripts/qa-mobile-fidelity.mjs` (פתרון Playwright מ-npx cache דרך `createRequire`, fallback `require("playwright")` — בלי לגעת ב-package.json).

- **שרת:** להניח `npx serve . -p 8000` רץ; `BASE=http://localhost:8000`, לטעון `/hero-lab/`.
- **מודל גלילה:** track 500vh; `window.scrollTo(0, (scrollHeight - innerHeight) * p)` ל-`p ∈ {0, 0.25, 0.5, 0.75, 1}`, `waitForTimeout(500)` בין צעדים (settle ל-scrub:0.6).
- **viewports:** דסקטופ `1440×900`; מובייל iPhone-12 `390×844` (`isMobile, hasTouch, deviceScaleFactor:2`).
- **צילומים:** `hero-p00/25/50/75/100@1440.png` + `@390.png` ל-`hero-lab/scripts/__shots__/` (או `D:/GAMOS-screenshots-tmp/` אם C: מלא).
- **Assertions (דרך `page.evaluate` + computed styles + `--p`):**
  1. **המסכה מתגלה עד אמצע הגלילה:** maskfill opacity ב-p=0 ≈0, ב-p=0.5 >0.4, ב-p=1 ≈1.
  2. **קו-המתאר נעלם ככל שהמילוי עולה:** outline opacity ב-p=0 ≈1, ב-p=1 ≤0.2 (הפוך-משלים ל-maskfill).
  3. **שני עננים נפרשים לקצוות מנוגדים:** `getBoundingClientRect()` — מרכז שמאל זז שמאלה, ימין ימינה בין p=0→1; ולאשר ש-`cloud-left.webp` ≠ `cloud-right.webp` (שומר נגד #3).
  4. **עשן עולה:** smoke translateY ב-p=1 שלילי יותר (גבוה) מ-p=0.
  5. **אין frame ריק בשום p:** sky `<img>` + content צבועים (`naturalWidth>0`); כשל אם ה-PNG ≥99% צבע-אחיד (blank-white guard — בדיוק הכשל של FIND).
  6. **סאבג'קט נוכח ועולה:** subject `img.naturalWidth>0`; translateY ב-p=1 שלילי יותר מ-p=0.
  7. **reduced-motion settled frame:** context `reducedMotion:"reduce"` → maskfill=1, outline≈0.18, אין console error, ההירו נראה במלואו.
  8. **no-js finished frame:** context `javaScriptEnabled:false` → `.hero_root` קרס ל-~100vh, maskfill=1, הכל נראה (ללא חצי-חשיפה).
- **השוואה מול FIND:** לצלם reference מ-`findrealestate-clone`, ולהפיק contact-sheet 2-up (`compare.png`) לאישור ויזואלי ידני.
- להדפיס טבלת PASS/FAIL כמו ב-QA הקיים.

---

## G. סיכונים

1. **alpha של הסאבג'קט (הבלוקר שנפתר):** קבצי "מחולצות" אטומים מלא → נדרש שלב background-removal (החלטת המשתמש). הסיכון הנותר: איכות החיתוך (קצוות, שיער-עץ/דשא) ותלות ה-dev שנוגעת ב-`package.json` — דורש אישור מפורש.
2. **נאמנות Cinzel→SVG:** אין TTF/OTF — המסכה תלויה ב-rendering זהה של ה-woff2 בין מנועים; `letter-spacing` + baseline צריכים כיוונון ויזואלי, והמדידה אחרי `document.fonts.ready`.
3. **בוץ בחיתוך עננים:** luminance-key מ-`מדבר.png` עלול לגרור פיקסלי-דיונה; מוקטן ע"י הכפלה ב-alpha המקור + warm-white push; צריך בדיקה ויזואלית וכיוונון `LO/HI` פר-קרופ.
4. **תאורת סאבג'קט מול רקע השמיים:** הקצה עלול להתנגש; מיתון ב-`drop-shadow` רך + gradient חם בבסיס.
5. **מתמטיקת mask-size רספונסיבית (rem מול vw):** ה-`97.7rem` הקבוע של FIND יגלוש בצר; משתמשים ב-`min(78vw,1000px)`; ה-`letter-spacing` של EVENTS צריך להתכווץ במובייל (`@media max-width:768px`).
6. **עלות GPU במובייל (§8 ≥30fps):** 7 שכבות, כמה עם `will-change`; SVG mask זול מ-data-URI אבל ה-`<image>` הכפול כבד; מיתון ע"י `*-mobile.webp` ≤900px + `will-change` מוגבל ל-transform/opacity + מדידת frame-time ב-QA.
7. **משטר §2 Lenis:** sandbox-only מתועד ב-`hero-lab/README.md`. **אסור** לקדם ל-production בלי תיקון §2 + שורת Maintenance Log §12. ה-JS כבר degrade ל-native scroll.

---

## קבצים קריטיים למימוש

- `hero-lab/scripts/build-assets.mjs` — להרחיב: sky, subject+alpha (background-removal), 2 clouds, smoke; reuse של ה-smoothstep keyer.
- `hero-lab/index.html` — markup 8 שכבות: subject + SVG-ממוסך inline + 2 cloud imgs + smoke; preload חדש.
- `hero-lab/css/hero-lab.css` — z/origin/transform פר-שכבה למספרי FIND + עדכון מסגרות no-js/reduced-motion.
- `hero-lab/js/hero-lab.js` — לשמר ScrollTrigger יחיד `--p` + timeline `--enter` + כל ה-guards; refresh אחרי פונטים.
- `hero-lab/scripts/qa-hero-lab.mjs` (חדש) — דפוס מ-`mobile/scripts/qa-mobile-fidelity.mjs`.

## אימות end-to-end

1. `node hero-lab/scripts/build-assets.mjs` → לוודא 8 הקבצים החדשים ב-`hero-lab/assets/` עם alpha תקין (subject + clouds + smoke).
2. `npx serve . -p 8000` → לפתוח `http://localhost:8000/hero-lab/` ולגלול ידנית: סאבג'קט עולה/גדל, אותיות מתמלאות בתמונה, קו-מתאר נעלם, 2 עננים נפרשים, עשן עולה, דהייה ל-`#after`.
3. `node hero-lab/scripts/qa-hero-lab.mjs` → טבלת PASS/FAIL + `compare.png` מול FIND.
4. בדיקות ידניות: reduced-motion (frame קפוא נעים), no-js (frame גמור), מובייל 390 (≥30fps, אין גלישת אותיות).

---

## הערות לאישור המשתמש (החלטות פתוחות)

- **זהות פרויקט המקור:** התוכן מצביע חד-משמעית על `findrealestate-clone` (לא `phantom-sphere-gallery`, שהוא גלריית החדרים). אם התכוונת לפרויקט אחר — לעצור ולברר.
- **תלות dev להסרת-רקע** (`@imgly/background-removal-node`) נוגעת ב-`package.json` המשותף — דורש אישור מפורש, או לחלופין הסרת-רקע ידנית חד-פעמית והנחתת `subject.webp` ל-assets.
- **קידום ל-production** הוא צעד נפרד ומאושר-במפורש בלבד (כולל תיקון §2 ל-Lenis) — לא חלק מהתוכנית הזאת.
