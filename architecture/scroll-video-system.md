# Scroll-Video System — אפיון רב-מופעי

> **Status:** characterization (טרם אושר; לפני עדכון Constitution §3)
> **Created:** 2026-05-29
> **Author:** main agent
> **Trigger:** המשתמש זיהה פער מתכנון: ביקש שחוויית ה-scroll-driven video תחזור **בארבעה מקומות**, אבל המאסטר-פלאן והחוקה תרגמו את זה רק ל-hero יחיד + 2 בועות. מסמך זה מאפיין את הרעיון לפני שמעדכנים את החוקה ואת הקוד.
> **Skill of record:** `video-to-website` (sticky video + scroll progress → `video.currentTime`).

---

## 1. הבקשה המקורית (מתואמת מול המשתמש 2026-05-29)

> *"רוצה להשתמש בסקיל של סרטון ל-WEB, רוצה גלילה באתר שהסרטון זז בהתאם, וזה חוזר על עצמו ב-4 מקומות."*

ארבעת המקומות (סדר ב-DOM):
1. **Hero** (פתיחה כללית — מתחם)
2. **ריזורט** — אזור הריזורט וחדרי הנופש
3. **אולם** — אולם האירועים
4. **קולינריה** — מטבח השף / מנות

> **הערה חשובה:** §3 הקיים מתאר משהו אחר — **hero יחיד** רב-שלבי (intro→scrub→outro) שמסתיים ב-2 בועות פורטל המובילות לסקציות עם תמונות סטטיות. **המסמך הזה מציע ארכיטקטורה חדשה: 4 מופעים נפרדים של scroll-video, כל אחד באזור משלו.** זו הרחבה (לא החלפה) של המודל הקיים.

---

## 2. מצב מקורות וידאו (מאומת על דיסק 2026-05-29)

| מקום | וידאו מקור | סטטוס |
|------|------------|-------|
| Hero | ✅ `סרטונים סופיים/0528.mp4` (תפור) → כבר מ-encoded ל-`assets/video/hero-master-1080.mp4` (5.9MB) ו-`720.mp4` (1.5MB) | **מוכן** |
| ריזורט | ✅ `ריזורט 1/סרטוני אנימציה/{1..13}_V{1,2}.mp4` + `1.2/1.22/1.3/1.5.mp4` (מקור עשיר) | **חומר גלם — צריך תפירה ו-encoding** |
| אולם | ❌ **רק תמונות** (`אולם 3/*.png`, 15 קבצים) — **אין וידאו** | **חוסם — דרושה החלטה** |
| קולינריה | ✅ `קולינריה 4/1.2.mp4` יחיד + 13 JPG | **מוכן (סרטון יחיד)** |

מקורות נוספים שלא מתאימים: `LAUNGE`, `חדרי נופש 2` — JPG בלבד (לא מהאזורים הארבעה הזה ממילא).

---

## 3. עקרונות ארכיטקטוניים

### 3.1 אותה טכניקה — 4 מופעים מבודדים
כל אחד מ-4 האזורים הוא **section-scroll-scrubber עצמאי**. אותה טכניקה מ-`video-to-website`:
- `<section>` עם `position: relative` ו-spacer פנימי שמכתיב אורך גלילה.
- `<video muted playsinline preload="auto">` בתוך `position: sticky; top: 0`.
- חישוב `progress = clamp((scrollY - sectionTop) / (sectionHeight - vh))` כשהסקציה ב-viewport.
- `video.currentTime = progress * duration` (RAF-throttled, delta > 0.04s).

### 3.2 השונות: hero ≠ section-scrubbers (אזורים 2-4)
**ה-hero** (אזור 1) שומר על המודל הקיים: 3 שלבים (intro → scrub → outro) עם 700vh spacer וסיום ב-2 בועות פורטל. **הסקציות 2-4** (ריזורט/אולם/קולינריה) — שלב יחיד, scrub בלבד, ללא בועות, ללא intro/outro.

### 3.3 הפרדה משאבית — חובה
חוויית scrub היא יקרה בזיכרון/CPU. כללי הפרדה:
- **Lazy-mount.** וידאו של סקציה לא-hero טוען (`preload="metadata"`) רק כשהסקציה במרחק `rootMargin: 100% 0px` מה-viewport (IntersectionObserver). חוסך RAM וקצב נתונים בטעינה ראשונית.
- **Active scrubber יחיד.** רק ה-section שה-viewport נמצא בו (או ה-hero) משדר אירועי scroll-update לוידאו שלו. שאר הוידאו ב-`pause()` מלא. מונע מ-scroll listener אחד להזיז 4 וידאו בו-זמנית.
- **Single-flight RAF.** מרכזיה אחת (`scroll-orchestrator.js` חדש) מחזיקה RAF גלובלי שמחליטה מי active ומפיצה progress רק לסקציה הפעילה.

### 3.4 §8 budgets ×4 — מימוש מציאותי
- Hero 1080p ≤12MB (קיים: 5.9MB ✅).
- כל section-video נוסף: **≤6MB** ב-1080p, **≤3MB** ב-720p, **משך 4-8s** (לולאה צמודה לגלילה הסקציה — לא סרט). לא להעמיס 4 סרטונים בני 30s שיתפסו 50MB.
- Total video footprint: יעד ≤25MB (hero 5.9 + 3 sections × ~3MB ממוצע + portal-loop 0.3).
- Posters JPG ≤80KB לכל אחד; preload רק של ה-hero poster (LCP).

### 3.5 §9 a11y — שמירה על הסטנדרט
- `prefers-reduced-motion: reduce` → **כל ה-4 scrubbers** מתחלפים בתמונת poster סטטית (וידאו מושתק/מוסר).
- iOS Safari → fallback: `autoplay muted loop playsinline` במקום scrub (כמו ב-hero היום).
- `aria-hidden="true"` על כל `<video>` (הם דקורציה); כותרות הסקציה נשארות ב-DOM הסמנטי.

### 3.6 §4 RTL / §5 צבעים / §10 modules
- אין השפעת RTL על scroll-progress (ציר block לא מושפע).
- שום צבע חדש; כל ה-overlays דרך `var(--ink-deep)` עם alpha מ-tokens.
- כל סקציה = מודול עצמאי (`init()/destroy()`); ה-orchestrator המרכזי הוא מודול אחד נוסף.

---

## 4. ארכיטקטורה (חדשה)

### 4.1 מבנה DOM — דפוס מאוחד לסקציות 2-4

```html
<section id="hall-resort" class="scroll-scene" data-scrub="resort">
  <div class="scroll-scene__spacer" aria-hidden="true"></div>   <!-- ~300vh -->
  <div class="scroll-scene__sticky">
    <video class="scroll-scene__video"
           muted playsinline preload="metadata"
           poster="/assets/video/resort-poster.jpg"
           aria-hidden="true">
      <source src="/assets/video/resort-1080.mp4" type="video/mp4"
              media="(min-width: 768px)">
      <source src="/assets/video/resort-720.mp4" type="video/mp4">
    </video>

    <div class="scroll-scene__overlay">
      <header class="section-header">
        <p class="section-header__eyebrow">ריזורט</p>
        <h2 class="section-header__title">…</h2>
        <p class="section-header__lede">…</p>
      </header>
    </div>
  </div>

  <!-- אחרי סיום ה-spacer, תוכן סטטי של הסקציה (features/cta/gallery) -->
  <div class="scroll-scene__post">…</div>
</section>
```

ה-hero נשאר עם ה-DOM המיוחד שלו (`hero__intro-bg`/`hero__video`/`hero__outro-loop`/`hero__intro`) — **לא** מאוחד עם הדפוס הזה.

### 4.2 spacer length per section
- Hero: 700vh (קיים — לא משתנה).
- ריזורט: 300vh (4-6s scrub).
- אולם: 300vh (תלוי בהחלטה — ראה §6).
- קולינריה: 250vh (סרטון 1.2.mp4 קצר).

### 4.3 קבצי קוד חדשים

```
js/
├─ scroll-orchestrator.js   חדש — מרכז את כל ה-scroll-scenes; מחזיק RAF יחיד; מפיץ progress
├─ scroll-scene.js          חדש — מודול גנרי per-section: סורק [data-scrub], בונה sticky+scrub
├─ hero-video-scrub.js      קיים — הופך ל-consumer של scroll-orchestrator (במקום RAF משלו)
└─ portals.js               קיים — ללא שינוי

css/sections/
└─ scroll-scene.css         חדש — סגנון משותף ל-.scroll-scene/__spacer/__sticky/__video/__overlay
```

### 4.4 חוזה ה-orchestrator

```js
// scroll-orchestrator.js
window.gamosScroll = {
  register({ id, el, onProgress }),   // section מוסיפה את עצמה
  unregister(id),
  // emits: per-frame onProgress(p) ל-active scene בלבד
  // active = scene שה-vh שלה מכסה ≥50% של viewport (priority: hero תמיד active עד שעוזב)
};
```

ה-`gamosHero.onProgress` הקיים (חוזה ל-`portals.js`) נשמר כ-alias מאחורי ה-orchestrator — תאימות לאחור.

---

## 5. אסטרטגיית רינדור פר-סקציה

### 5.1 Hero (1)
ללא שינוי תפקודי. רק החלפת ה-RAF הפנימי ל-`gamosScroll.register()`. שלוש שלבים נשמרים. 700vh.

### 5.2 ריזורט (2) — `assets/video/resort-{1080,720}.mp4`
- Pipeline: לתפור 4-6 קליפים מתוך `ריזורט 1/סרטוני אנימציה/` (ב-`.tmp/concat-list-resort.txt`) → ffmpeg concat+CRF22+`+faststart` → 1080+720 variants → poster ב-`-ss 0.5`.
- אורך מטרה: 5-7s.
- תוכן: כניסה → לובי → בריכה → חדר → גן (סדר נרטיבי).

### 5.3 אולם (3) — **חוסם, דורש החלטה**
אין וידאו מקור. אופציות:
- **A. Ken Burns על PNG/JPG.** רצף 6-8 תמונות מ-`אולם 3/` עם pan+zoom איטי, מקודד כ-MP4. מחקה תחושת scrub אבל לא גמיש כמו וידאו אמיתי. נקי, מהיר, ללא תוכנה חיצונית.
- **B. Slideshow scroll-driven.** במקום וידאו, scroll מחליף תמונות (`opacity` crossfade) ב-progress. אפס וידאו, בייט-קל, 100% scrub-מדויק. לא מרגיש כמו וידאו רציף.
- **C. Remotion-rendered MP4.** להשתמש ב-`remotion/` שכבר קיים בפרויקט (read-write כשהסקיל מופעל לפי §7.1) ולרנדר הרכבה של 6-8 פריימים עם תנועה. מקצועי, אבל זמן עבודה.
- **D. דחיית האזור.** אולם נשאר עם hero-image בלבד (כמו עכשיו), עד שיהיה חומר וידאו. שאר 3 האזורים יוצאים לדרך.
- **E. AI video gen.** Seedance/Runway על תמונות אולם → קליפים סינתטיים. מהיר אבל איכות לא מובטחת.

המלצה: **A או B** — מהיר, אפס תלויות, נמצא בתחום הקיים. החלטה למשתמש (ראה §6).

### 5.4 קולינריה (4) — `assets/video/culinary-{1080,720}.mp4`
- מקור יחיד `קולינריה 4/1.2.mp4`. encoding ישיר ל-1080+720+poster, ללא concat.
- אורך מטרה: ≤6s (אם המקור ארוך יותר — `-t 6`).
- אחרי ה-scrub: רשת תמונות הקולינריה הקיימות (13 JPG) כ-Phase C1.

---

## 6. החלטות פתוחות למשתמש

לפני שמתחילים לקודד צריך החלטה על:

1. **אולם — איזו אסטרטגיה (5.3)?** A (Ken Burns) / B (Slideshow scroll) / C (Remotion) / D (דחייה) / E (AI gen).
2. **אורך/קצב ה-scrub בסקציות 2-4** — האם 300vh (אורך בינוני, ~3-4 שניות-גלילה) זה ה-feel שאתה רוצה, או ארוך יותר (דרמטי, 500vh) / קצר יותר (150vh, סנאפ)?
3. **טקסט-overlay על וידאו הסקציות** — האם הכותרות (ריזורט/אולם/קולינריה) מופיעות **על** הוידאו (כמו ב-hero) או **לפני/אחרי** (תוכן סטטי שמופיע אחרי scrub)?
4. **נווט בין הסצנות** — האם אחרי ה-hero יש קפיצות-עוגן ישירות לכל סצנה (`#hall-resort` וכו'), או שהמשתמש גולל לינארית דרך כל ה-4 ברצף?
5. **mobile budget** — בדסקטופ 4 וידאו = ~25MB. במובייל זה כבד. האם מקבלים שבמובייל 3 הסקציות הפנימיות יציגו רק poster + autoplay-loop קצר (לא scrub), והמלא יישמר לדסקטופ?

---

## 7. השפעה על התוכנית הקיימת (`PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md`)

המסמך הזה **משנה את Phase B ו-Phase C** של התוכנית הקיימת:
- **Phase A** (הסרת GSAP, native scroll+RAF) — נשאר חוסם וראשון. דווקא הופך **קריטי יותר** כי ה-orchestrator המרכזי דורש שליטה מלאה ב-scroll loop.
- **Phase B** (איחוד markup↔CSS) — מתרחב: סקציות `#hall-resort`, `#culinary` (ואולי `#hall-venue`) הופכות ל-`.scroll-scene` ולא רק hall-image.
- **Phase B+** (חדש) — pipeline וידאו לסקציות 2-4: encoding (`resort-{1080,720}.mp4` + posters), Ken-Burns/slideshow לאולם.
- **Phase C** (תוכן) — נשאר אבל בסקציות עם scrub, ה-`<picture>` הסטטיות יורדות אחרי ה-scrubber (במקום במקומו).
- **Constitution §3** — דורש עדכון: לתאר 4 מופעי scroll-video במקום אחד, להוסיף את ה-orchestrator כעקרון §10.

---

## 8. סיכוני ביצוע

- **Performance regression** — 4 וידאו במקום 1 = 4× זיכרון פוטנציאלי. ה-active-only orchestrator (§3.3) חיוני; בלעדיו זה מתפוצץ.
- **Scroll-jacking feel** — 4 sticky scrubbers ברצף יכולים להרגיש "ברציף סרטים". אורך spacer קצר יחסית (250-300vh) ופתח חופשי בין הסצנות (תוכן רגיל) חיוניים.
- **iOS / mobile** — scrub שביר ב-Safari mobile; חובה fallback per-section. גם dataplan: מובייל בא לאתר במקום ש-25MB וידאו לא נטענים אוטומטית.
- **CLS** — sticky+spacer יכול להזיז תוכן בעת mount/unmount של וידאו. `width`/`height` על `<video>` + `aspect-ratio` חובה.
- **Maintainability** — המסמך הזה מבוא; כל החלטה ב-§6 ממקדת את הסקופ. ההמלצה: לא להתחיל לקודד עד שכל 5 ההחלטות סגורות.

---

## 9. הצעד הבא

1. המשתמש מאשר/בוחר ב-§6 (5 החלטות).
2. אני מעדכן את `CLAUDE.md` §3 (Constitution change → Maintenance Log) ואת `PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md` עם Phase B+ ו-Phase A מקושח.
3. רק אחרי אישור ה-Constitution change — מתחילים Phase A (ל-orchestrator).
