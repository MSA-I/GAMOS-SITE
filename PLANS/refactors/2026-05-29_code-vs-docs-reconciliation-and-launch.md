# GAMOS-SITE — יישור קוד↔מסמכים והבאה ל-Launch-Ready

**Status:** approved
**Category:** refactors
**Created:** 2026-05-29
**Author agent:** main
**Related:** `CLAUDE.md` §3/§8/§9/§10/§11/§12 · `PROGRESS_SUMMARY.md` · `PLANS/fixes/*` (F-01..F-13) · `PLANS/research/2026-05-28_site-content-map.md` · `.tmp/hall-html-stubs.md` · `.tmp/reveal-attribute-injections.md` · plan mirror: `C:\Users\sara\.claude\plans\recursive-puzzling-wadler.md`

---

## 1. הקשר ומטרה

המשתמש ביקש להשוות בין **הקוד הקיים** ל**מה שתוכנן** (master plan + Constitution) ול**מה שכתוב במסמך ההתקדמות** (`PROGRESS_SUMMARY.md`), ולהכין תוכנית להמשך. המטרה שנבחרה: **מוכן להשקה — DoD מלא לפי §11**.

ההשוואה חשפה שהפרויקט מתקדם בהרבה ממה שחלק מהמסמכים טוענים, אבל יש **שלוש סתירות קריטיות בין הקוד למסמכים**:

### סתירה #1 — Hero engine: המסמכים סותרים את הקוד ⚠️ קריטי
- המסמכים (`§3`, `§12`, `PROGRESS_SUMMARY.md:72,110`) טוענים ש-*"GSAP הוסר מ-hero-video-scrub.js → native scroll + RAF"*.
- בפועל `js/hero-video-scrub.js:12-15,65` עדיין מייבא GSAP מ-skypack CDN ומשתמש ב-`ScrollTrigger.create()`. **הריפקטור לא בוצע.**
- `js/main.js:12-13` מייבא GSAP ב-top-level → כשל CDN מפיל את **כל** ה-JS (hero/portals/reveals/accordions/slider).
- **החלטת משתמש:** לכבד את החוקה → מעבר ל-native scroll + RAF, הסרת GSAP לגמרי.

### סתירה #2 — markup ↔ CSS class mismatch 🔴 חוסם רינדור (לא מתועד)
שלוש סכימות BEM שונות חיות במקביל; `F-03` נטען "תוקן" אבל רק חלקית (נוצר `section-header.css`, אבל הפנים של hall/about/contact לא סונכרנו):

| סקציה | ב-`index.html` | ב-CSS | תוצאה |
|---|---|---|---|
| Halls | `.hall__media`, `.hall__features` | `hall-venue.css`: `.hall-venue__split/__gallery/__hero` | אולמות כמעט ללא עיצוב |
| About | `.about__stats`>`.about__stat`>dt/dd | `.about__stat-num/__stat-label` | סטטיסטיקות ללא עיצוב |
| Contact | `.contact__grid/__details/__channels` | `.contact__container/__info` | טופס מעוצב חלקית |

### סתירה #3 — reveal system כפול
`hall-venue.css` משתמש ב-class (`.reveal-fade-up`/`.reveal-mask`); `motion-reveals.css`+`js/reveals.js` משתמשים ב-attribute (`[data-reveal]`). לתקנן על `[data-reveal]` (ה-JS מניע אותו).

### מה שהמסמכים טוענים שחסום אבל בפועל קיים ✅
Assets על הדיסק: 8 WOFF2 (176KB), `hero-master-1080.mp4` (5.9MB), `720.mp4` (1.5MB), `portal-loop.mp4` (276KB), brand images, ו-**תמונות מאופטמות**: venue 14 / resort 17 / lounge 5 / rooms 11 / culinary 13 (`NN.full.webp`+`NN.half.webp`). מדריכי אינטגרציה ב-`.tmp/` (שמות תמונות בהם — `hero-1920.webp` — לא תואמים לדיסק; צריך `NN.full.webp`).

### פערים שטרם נגעו בהם
248 תמונות לא מחוברות ל-DOM · אין `data-reveal` ב-HTML · טופס ללא handler · hamburger ללא JS + `aria-controls` שבור (`F-13`) · `lenis.js` stub · `favicon.svg` 404 · `hero-poster.jpg` 232KB>80KB · תוכן placeholder (נתונים אמיתיים: טל' `077-9972343`, מייל `office@gamos.co.il`, כתובת `די זהב 7, פארק ישראל מעלה אדומים`, Waze deep-link; **WhatsApp באתר החי שבור — לאמת**) · קבצי זבל בשורש (`b`, `0.92.,`, `remotion/remotion/`).

---

## 2. תוצאה רצויה (Definition of Done)

לפי `CLAUDE.md §11`:
1. Lighthouse mobile ≥90 בכל 4 הקטגוריות.
2. אתר עובד מקצה-לקצה בלוקאל **בלי תלות ב-CDN** (לנתק רשת אחרי load — חייב לעבוד).
3. שתי בועות פורטל לוחצות עובדות, click-routing מגיע לסקציה הנכונה.
4. כל סקציה מרונדרת מעוצבת (אפס markup חשוף), תמונות אמיתיות נטענות.
5. טופס "צור קשר" פותח WhatsApp/mailto עם טקסט ממולא; ולידציה חוסמת.
6. ניווט נייד עובד; `aria-expanded` מתעדכן; כל הלשוניות מהאתר החי מיוצגות.
7. RTL keyboard pass מלא, focus rings 3px brass, `prefers-reduced-motion` נכבד.
8. Console נקי: אפס 404, אפס שגיאות JS.

---

## 3. אילוצים מה-Constitution
- **§2** — אסור frameworks/3D; מותר GSAP+Lenis. **אבל** החלטת המשתמש: להסיר GSAP לטובת native (מחמיר מעבר ל-§2).
- **§4** — RTL-first, logical properties בלבד, `<bdi>` למספרים.
- **§5** — צבעים רק דרך `tokens.css`; max 5 צבעים פעילים; single accent.
- **§8** — LCP≤2.5s, CLS≤0.05, INP≤200ms, hero-poster≤80KB; mobile fallback; `prefers-reduced-motion`.
- **§9** — WCAG 2.2 AA: focus rings, skip-link, alt עברי, ARIA לפורטלים, keyboard.
- **§10** — HTML הוא האמת; tokens single-source; JS module-scoped `init()/destroy()`; RTL-first.
- **§12** — section CSS בלי `@layer sections` (cascade אחיד). כל שינוי צבע/סכימה → Maintenance Log entry.

---

## 4. צעדים

### Phase A — הסרת GSAP + הקשחת boot (חוסם, ראשון)
- [ ] **A1** `js/hero-video-scrub.js` → native scroll listener + RAF. להסיר 2 imports של skypack/gsap; להחליף `bindScrub()` בחישוב `progress = clamp((scrollY - heroTop)/(heroHeight - vh))` + `video.currentTime` ב-RAF throttle. לשמר 1:1: `window.gamosHero.onProgress`, `--hero-progress`, `--hero-scrub-progress`, `[data-stage]`, `INTRO_END`/`SCRUB_END`, `setupReduced`/`setupIOS`. `destroy()` מסיר listeners.
- [ ] **A2** `js/portals.js` → להמיר `gsap.timeline()` (195-232) ל-Web Animations API (`Element.animate()` scale 1→6, cubic-bezier≈power3.in, `onfinish`→scroll). לשמר `[data-clicked]`/hysteresis/IO-fallback. למחוק param `gsap`+`window.gsap`.
- [ ] **A3** `js/main.js` → להסיר imports של GSAP ואת `motion` handle; `init()` ללא ארגומנט.
- [ ] **A4** סנכרון מסמכים: `progress.md`/`findings.md`/`task_plan.md` למצב אמיתי; שורת Maintenance Log על ביצוע הריפקטור בפועל.

### Phase B — איחוד markup↔CSS (חוסם רינדור)
- [ ] **B1** Halls — לאמץ סכימת BEM העשירה (`hall-venue.css`/`hall-resort.css`); לשכתב markup של `#hall-venue`/`#hall-resort`/`#lounge`/`#rooms` לפי `.tmp/hall-html-stubs.md` **עם srcset לשמות אמיתיים** (`01.full.webp`+`01.half.webp`), `width`/`height` ל-CLS.
- [ ] **B2** About + Contact — לסנכרן `about.css`/`contact.css` ל-markup הקיים (`.about__stat`+dt/dd, `.contact__grid/__details/__channels`).
- [ ] **B3** reveal — לתקנן על `[data-reveal]`; להסיר class-based reveal מ-hall CSS; cascade אחיד (בלי `@layer sections`).

### Phase C — תוכן ומדיה אמיתיים
- [ ] **C1** `<picture>` לכל התמונות (venue 14/resort 17/lounge 5/rooms 11/culinary 13), webp+jpg, lazy, alt עברי.
- [ ] **C2** `data-reveal`/`data-stagger` לפי `.tmp/reveal-attribute-injections.md` (לא ל-hero/portals); חוזה slider ב-`#testimonials` (`data-slider-track/-item/-prev/-next/-dots`).
- [ ] **C3** תוכן עברי + פרטי קשר אמיתיים מ-`site-content-map.md`; תיקון typo "וואסטפ"→"וואטסאפ"; ⚠️ WhatsApp לאמת מול משתמש.
- [ ] **C4** JSON-LD — להחליף `TODO-PHONE/STREET/LAT/LNG`.
- [ ] **C5** `assets/favicon.svg` (מונוגרמה זהב על `--ink-deep`).
- [ ] **C6** `hero-poster.jpg` 232KB→≤80KB.

### Phase D — אינטראקטיביות
- [ ] **D1** `js/contact-form.js` חדש — ולידציה + WhatsApp (`wa.me/<verified>?text=`) + mailto fallback; feedback ב-`role=status`.
- [ ] **D2** `js/site-nav.js` חדש — toggle `aria-expanded`, `id="site-nav-mobile"` (מתקן F-13), Escape/link-close, focus-trap.
- [ ] **D3** Lenis — לממש desktop-only (`smoothTouch:false`, off ב-reduced-motion) או למחוק stub ולהסתמך על `scroll-behavior:smooth`.
- [ ] **D4** slider markup ב-`#testimonials` לחוזה `slider.js`.

### Phase E — לשוניות חסרות כסקציות-עוגן (החלטת משתמש: לבנות עכשיו)
- [ ] **E1** גלריה `#gallery` — רשת תמונות אמיתית (hall+culinary), lightbox קל אופציונלי.
- [ ] **E2** אירועים עסקיים — להעשיר פריט "אירועי חברה" ב-`#events`.
- [ ] **E3** הצהרת נגישות — סקציה ייעודית (`#accessibility` בפוטר); ⚠️ דורש טקסט משפטי מהמשתמש.
- [ ] **E4** מפה — `<iframe>` Google Maps lazy + קישורי Waze/Maps אמיתיים (כרגע `href="#"`).

### Phase F — QA + DoD
- [ ] ניקוי זבל: `b`, `0.92.,`, `remotion/remotion/` (לאשר לפני מחיקה).
- [ ] Lighthouse ≥90 ×4 · axe-core · keyboard-only · reduced-motion · RTL.
- [ ] cross-browser: Chrome/Firefox/Safari/iOS Safari/Android Chrome.
- [ ] אימות 5 ספי §8 + budgets.
- [ ] לסגור 13 טיקטי `PLANS/fixes/`; להעביר תוכניות שהושלמו ל-`PLANS/archive/`.

---

## 5. סיכוני עיצוב / רגרסיות
- **A1/A2** — שינוי scroll/animation engine עלול לשבור את תחושת ה-scrub או את ה-expand. בדיקה: גלילה איטית 60fps, ניתוק רשת אחרי load.
- **B1** — שכתוב markup של halls עלול לפגוע ב-anchor IDs / ARIA. לוודא שכל ה-`id` וה-`aria-labelledby` נשמרים.
- **B2/B3** — סנכרון selectors עלול להשאיר rules יתומים. לבדוק כל סקציה ויזואלית.
- **C3** — מספר WhatsApp שגוי = פנייה לאדם לא נכון. **חובה אימות** לפני wiring.
- **§8 budgets** — תמונות `<picture>` רבות עלולות לפגוע ב-LCP/CLS. `width`/`height`+lazy חובה.

## 6. אישור משתמש נדרש?
- ✅ **התקבל:** הסרת GSAP (native), יעד DoD מלא, טופס=WhatsApp+mailto, בניית לשוניות חסרות עכשיו.
- ⚠️ **נדרש במהלך הביצוע:** (א) מספר WhatsApp אמיתי [C3/D1]; (ב) טקסט הצהרת נגישות [E3]; (ג) lat/lng למפה+JSON-LD [C4/E4]; (ד) אישור מחיקת קבצי זבל [F].

---

**מקור:** קובץ זה הוא העתק הקנוני ב-`PLANS/` של תוכנית שאושרה. ה-mirror של plan-mode: `C:\Users\sara\.claude\plans\recursive-puzzling-wadler.md`.
