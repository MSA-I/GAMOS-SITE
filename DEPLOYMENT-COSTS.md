# 💰 ניתוח עלויות פרודקשן — GAMOS-SITE

> **מסמך הנחיה לדיפלוי (§14).** כאשר הפרויקט עובר לדיפלוי לפרודקשן ציבורי — יש לפעול
> לפי ההמלצות במסמך זה. נכתב על בסיס סריקה אמיתית של הקודבייס (לא הערכה תיאורטית).
> **תאריך ניתוח:** 2026-07-01 (עודכן — קודם 2026-06-10). **מקור הנתונים:** מדידת דיסק
> בפועל + סימולציה של ה-allow-list ב-`scripts/deploy-cloudflare.mjs` + grep על קוד הריצה.
>
> **מה השתנה מאז 2026-06-10** (למה נדרש עדכון): ההירו עבר ל-v10 scroll-scene ופריימי
> ההירו היתומים (155MB) **נמחקו מהדיסק**; הסקציה הקולינרית **קודדה מחדש 4K→1080p**
> (209MB→40MB) במקום להיות מוחלפת ב-MP4; **הדיפלוי מומש במלואו** (`deploy-cloudflare.mjs`
> עם allow-list); נוספה תת-אפליקציית `rooms/dist`; ו-`assets/_src` תפח ל-417MB (מוחרג).

---

## 🎯 הממצא המרכזי (ללא שינוי מהותי)

**זהו אתר סטטי ב-100%.** HTML/CSS/JS וונילה + **שני** bundles של React שנבנים מראש
(`halls/dist` + `rooms/dist`). **אין backend, אין מסד נתונים, אין קוד צד-שרת, אין API
בזמן ריצה, אין אימות (auth), אין שרת מייל, ואין קריאות AI בפרודקשן.** טופס יצירת הקשר
הוא deep-link ל-WhatsApp (`wa.me`) + `mailto:` בצד-לקוח בלבד — לעולם לא נוגע בשרת.

**המשמעות:** כמעט כל קטגוריית עלות היא **$0**, וכל שאלת העלות מצטמצמת ל**משתנה אחד:
רוחב פס (CDN bandwidth)**. ועל ההוסט הנכון — גם הוא חינמי.

**סטטוס דיפלוי:** האתר **כבר חי** ב-`gamos-site.pages.dev` (Cloudflare Pages, preview).
`gamos.co.il` עדיין מצביע על אתר ה-WordPress הישן. המעבר לדומיין המותאם הוא הטריגר
ל"פרודקשן ציבורי" של המסמך הזה.

---

## 📊 מה נמדד בפועל (מספרים אמיתיים מהדיסק, 2026-07-01)

| קבוצת נכסים | גודל בדיסק | מוגש בזמן ריצה? |
|---|---|---|
| `assets/_src` | **417 MB** | ❌ **workbench מקור** — מוחרג מהדיפלוי. תפח מ-49MB. |
| `assets/images` | 110 MB | ✅ חלקית (lazy לפי סקציה). `halls/` לבד = 53MB. |
| `assets/frames/culinary` (362 WebP, 1080p) | **40 MB** | ✅ **כן** — scroll-scrub דסקטופ. *מניע העלות העיקרי.* |
| `assets/frames/culinary-mobile` (960×540) | 10 MB | ✅ כן — scrub במובייל. |
| ~~`assets/frames/hero`~~ | **נמחק** | — היה 155MB יתום; הוסר מהדיסק (ההירו = scroll-scene, §3 v10). |
| `assets/video` | 21 MB | ⚠️ ברובו יתום — רק `culinary-poster.jpg` מצורף לדיפלוי. |
| `halls/dist` React bundle | 9.5 MB (JS+CSS ~1MB gzip) | ✅ רק אם הגולש לוחץ EVENTS/RESORT |
| `rooms/dist` React bundle | 2.4 MB | ✅ רק אם הגולש נכנס מדלת ה-`#rooms` |
| `assets/fonts` + `assets/vendor` | 0.4 MB | ✅ בכל ביקור (WOFF2 + GSAP/Lenis/Leaflet/paper-shaders) |
| HTML + CSS + JS + mobile | ~1 MB | ✅ בכל ביקור |

**רוחב פס לביקור** (המספר היחיד שמשפיע על עלות):
- **טעינה ראשונית (LCP):** ~3–4 MB (HTML, CSS, JS, פונטי WOFF2, vendor, שכבות ה-hero-scene — `sky/subject-webp/clouds/smoke`)
- **גלילה מלאה בדסקטופ:** **~50–70 MB** — הסקציה הקולינרית מזרימה ~40MB פריימים + תמונות lazy לפי סקציה
- **מובייל / נוטש מהיר:** ~15–30 MB (culinary-mobile 10MB + half-res images)
- **ממוצע ריאלי משוקלל:** **~30 MB/ביקור** (ירידה מ-~60MB בבנייה הישנה — הודות לקידוד-מחדש הקולינרי)

---

## 🗂️ פירוט לפי קטגוריה

### 1. אחסון (Hosting)
- **בשימוש כעת:** **Cloudflare Pages** (`gamos-site.pages.dev`) דרך `npm run deploy:cf`.
- **Free-tier:** Cloudflare Pages, Netlify, Vercel, GitHub Pages — כולם מארחים אתר סטטי בחינם.
- **המלצה (מיושמת):** **Cloudflare Pages** — חינם, CDN גלובלי מובנה, וחשוב מכל — **egress לא נמדד** גם בתוכנית החינמית.

### 2. CDN / רוחב פס — *משתנה העלות האמיתי היחיד*
- **בשימוש כעת:** Cloudflare Pages CDN (כלול חינם).
- **מגבלות Free-tier:** Cloudflare Pages = **ללא הגבלה**. Netlify = 100 GB/חודש. Vercel Hobby = 100 GB/חודש (**ללא שימוש מסחרי** — אתר עסקי דורש Vercel Pro). GitHub Pages = ~100 GB/חודש (soft cap).
- **חלופות:** Bunny.net CDN (~$0.01/GB) — האופציה בתשלום הזולה ביותר אם אי-פעם תחרגו מ-tier חינמי.

**רוחב פס לפי דרגת מבקרים (על בסיס ~30 MB/ביקור, כפי שהאתר בנוי היום):**

| מבקרים/חודש | מאופטם (15 MB/ביקור) | **כפי שבנוי (30 MB/ביקור)** | מקרה גרוע (70 MB/ביקור) |
|---|---|---|---|
| 1,000 | 15 GB | **30 GB** | 70 GB |
| 10,000 | 150 GB | **300 GB** | 700 GB |
| 50,000 | 750 GB | **1.5 TB** | 3.5 TB |
| 100,000 | 1.5 TB | **3 TB** | 7 TB |

**עלות רוחב הפס לפי הוסט (לפי עמודת ה-30 MB "כפי שבנוי"):**

| הוסט | 1k | 10k | 50k | 100k |
|---|---|---|---|---|
| **Cloudflare Pages** | **$0** | **$0** | **$0** | **$0** |
| Bunny.net (~$0.01/GB) | ~$0.30 | ~$3 | ~$15 | ~$30 |
| Vercel Pro ($20 + $0.15/GB מעל 1TB) | $20 | $20 | ~$95 | ~$320 |
| Netlify Pro ($19 + ~$55/100GB מעל 1TB) | $19 | $19 | ~$294 | ~$1,120 |
| AWS S3+CloudFront (~$0.085/GB) | ~$3 | ~$26 | ~$128 | ~$255 |

טבלה זו היא כל הניתוח: **Cloudflare Pages חינמי בכל דרגה; חריגות רוחב הפס של Netlify/Vercel הן המלכודת.**

### 3. מסד נתונים (Database)
- **בשימוש:** **אין.** אין DB בשום מקום בקוד. **$0** בכל הדרגות.

### 4. אחסון קבצים (File Storage)
- **בשימוש:** קבצים סטטיים המצורפים לדיפלוי — **~175MB / ~1,650 קבצים** (סימולציית ה-allow-list ב-2026-07-01; גדל מ-~138MB עקב תוספת תמונות אולמות/חדרים אמיתיות).
- **הערה:** ~417MB `assets/_src` + ~21MB `assets/video` + פריימי הירו מוחרגים ולא נספרים.
- **עלות:** **~$0** בכל הדרגות (כלול ב-Cloudflare).

### 5. אופטימיזציית תמונות (Image Optimization)
- **בשימוש:** **בזמן build בלבד** — `sharp`/`cwebp` מקודדים מראש ל-WebP. אין שירות תמונות בזמן ריצה. **$0.**

### 6. אספקת וידאו (Video Delivery)
- **בשימוש:** אין streaming. הסקציה הקולינרית = **canvas-frames scrub** (WebP, sliding-window decode), לא `<video>`. `culinary-poster.jpg` מוגש כ-poster לפני פענוח. אין Mux / Cloudflare Stream.
- **עלות:** **$0** מעבר לרוחב פס.

### 7. שירותי מייל (Email Services)
- **בשימוש:** **אין.** טופס יצירת קשר = deep-link ל-WhatsApp + `mailto:`, שניהם צד-לקוח. **$0.**
- אם בעתיד תרצו "טופס → תיבת דואר" צד-שרת: Resend (3k/חודש חינם) או Formspree (50/חודש חינם) דרך Cloudflare Pages Function.

### 8. אנליטיקה (Analytics)
- **בשימוש:** **לא נמצא בקוד** (אין beacon ב-`index.html`).
- **המלצה:** **Cloudflare Web Analytics (חינם, פרטיות-תחילה, בלי באנר עוגיות)** — drop-in כשהאתר כבר על Cloudflare. או Plausible ($9/חודש hosted).

### 9. אימות (Authentication)
- **בשימוש:** **אין.** אין התחברות, אין חשבונות. **$0.**

### 10. שירותי AI
- **בשימוש בפרודקשן:** **אין.** AI שימש בזמן build/dev בלבד — הוצאת פיתוח, לא עלות פרודקשן חוזרת. **$0/חודש בפרודקשן.**

### 11. APIs חיצוניים
- **אריחי מפה (Map tiles):** ⚠️ **עדיין CARTO keyless dev-fallback** (`js/directions-map.js:236`) — חינמי לפיתוח אך **מפר את ToS של CARTO בפרודקשן**. **זהו ה-TODO היחיד שנותר לפני go-live.** התשתית מוכנה: קבוע `MAPTILER_KEY` ריק בשורה 233 → מלאו מפתח MapTiler (domain-locked ל-`gamos.co.il`) והקוד מתחלף אוטומטית. MapTiler = 100k טעינות/חודש חינם.
- **WhatsApp / Waze / Google Maps / Instagram / Facebook:** deep-links בלבד, חינם.
- **פונטים:** WOFF2 מאוחסנים עצמית — $0, אין תלות ב-Google Fonts.
- **Vendor libs (self-hosted):** GSAP, Lenis, Leaflet, paper-shaders — כולם static assets, $0, אפס תלות-runtime בצד-שלישי.

### 12. ניטור ולוגים (Monitoring & Logging)
- **בשימוש:** **אין.**
- **המלצה (הכל חינם):** דשבורד Cloudflare analytics + **UptimeRobot** (50 monitors חינם) + **Sentry** (5k שגיאות/חודש חינם) אם תוסיפו מעקב שגיאות JS. **$0.**

---

## 💵 שורה תחתונה

| תרחיש | עלות חודשית | הרכב |
|---|---|---|
| **מינימום ריאלי** | **~$1.25/חודש** | רק דומיין `.co.il` (~$15/שנה). Cloudflare Pages + Analytics חינם. |
| **צפוי** | **~$1–10/חודש** | דומיין + *אופציונלי* Plausible ($9). רוחב פס = $0 ב-Cloudflare, מפה = $0 (MapTiler free). |
| **מקרה גרוע** | **~$300–$1,100/חודש** | דיפלוי תמים על **Netlify/Vercel** ב-100k מבקרים → חיוב חריגת רוחב פס. **נמנע ע"י שימוש ב-Cloudflare.** |

הפער בין "צפוי" ל"מקרה גרוע" הוא **פונקציה של בחירת ההוסט**. עם Cloudflare Pages (מיושם) —
האתר רץ במחיר של דומיין. (המקרה-הגרוע ירד מ-$800–$2,800 ל-$300–$1,100 מאז שהקולינרי קודד
מחדש 209MB→40MB.)

---

## ✅ ערימת הפרודקשן המומלצת (חסכונית) — סטטוס יישום

| שכבה | בחירה | עלות | סטטוס |
|---|---|---|---|
| **Host + CDN** | **Cloudflare Pages** (egress ללא הגבלה, edge גלובלי) | **$0** | ✅ מיושם (`deploy:cf`) |
| **DNS** | Cloudflare | $0 | ⏳ בעת חיבור הדומיין |
| **אנליטיקה** | Cloudflare Web Analytics | $0 | ⬜ לא נוסף עדיין |
| **אריחי מפה** | MapTiler free tier (עם מפתח) — מחליף CARTO keyless | $0 | ⬜ **TODO לפני go-live** |
| **טפסים** | WhatsApp/`mailto` (אם צריך מייל צד-שרת → Pages Function + Resend) | $0 | ✅ מיושם |
| **ניטור** | UptimeRobot + דשבורד Cloudflare | $0 | ⬜ לא נוסף עדיין |
| **דומיין** | `gamos.co.il` | ~$15/שנה (~$1.25/חודש) | ⏳ עדיין WordPress ישן |
| **סה"כ** | | **~$1–2/חודש** | |

---

## 🔧 מה שכבר בוצע (היו "תיקוני חובה" במסמך הקודם)

1. ✅ **הסקציה הקולינרית הכבדה תוקנה.** לא הוחלפה ב-MP4 (זה איבד zoom/parallax ולא עשה
   scrub ב-iOS), אלא **קודדה מחדש 4K→1080p** (209MB→40MB דסקטופ, 10MB מובייל) + מעבר
   ל-**sliding-window decode** ב-`js/canvas-frame-renderer.js` שפתר את ה-OOM. חתך את
   הממוצע-לביקור מ-~60MB ל-~30MB.
2. ✅ **היתומים מוחרגים מהדיפלוי** דרך ה-allow-list ב-`scripts/deploy-cloudflare.mjs`:
   `assets/_src` (417MB), `assets/video` (חוץ מ-`culinary-poster.jpg`), ו-`assets/frames/hero`
   (שגם נמחק פיזית מהדיסק). הפלט: ~175MB במקום ~1GB.
3. ✅ **Cloudflare Pages נבחר ומיושם** — לא Netlify/Vercel.

## 🚧 מה שנותר לפני "פרודקשן ציבורי" בדומיין מותאם

1. ⬜ **מפתח MapTiler** — להחליף את CARTO keyless (מפר ToS). התשתית drop-in (`MAPTILER_KEY`).
2. ⬜ **Cloudflare Web Analytics** — snippet אחד ב-`index.html` (אופציונלי, $0).
3. ⬜ **UptimeRobot monitor** על ה-URL (אופציונלי, $0).
4. ⏳ **חיבור הדומיין** `gamos.co.il` ל-Cloudflare (deploy production branch).

---

## ⚠️ הערה חשובה

ניתוח זה מבוסס על מצב ה-repo בפועל ב-2026-07-01. אם בעתיד יתווספו פיצ'רים של backend —
CMS, מערכת הזמנות צד-שרת, חשבונות משתמש, קונסיירז' AI — אלה מכניסים עלויות נמדדות אמיתיות
ויש להעריך מחדש. כפי שהקודבייס עומד היום, אף אחד מהם לא קיים.
