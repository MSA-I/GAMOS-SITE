# Performance Budget & Strategy

> **חוק.** כל סוכן אחראי לעמוד בתקציב הביצועים שלו. Agent 10 (QA) אוכף.

---

## Core Web Vitals Targets

| Metric | Target (4G mobile) | Target (Desktop) |
|--------|--------------------|--------------------|
| LCP    | ≤ 2.5s             | ≤ 1.5s             |
| CLS    | ≤ 0.05             | ≤ 0.05             |
| INP    | ≤ 200ms            | ≤ 100ms            |
| TTI    | ≤ 4.0s             | ≤ 2.0s             |

---

## Asset Budgets

| Asset                      | Limit         | Notes                              |
|----------------------------|---------------|------------------------------------|
| Hero MP4 1080p             | ≤ 12 MB       | If larger: CRF 24 or 24 fps        |
| Hero MP4 720p              | ≤ 6 MB        |                                    |
| Hero poster JPG            | ≤ 80 KB       | LCP candidate                      |
| Portal-loop MP4            | ≤ 2 MB        | 2-4 sec loop                       |
| Hall image (full @1920w)   | ≤ 240 KB WebP | JPEG fallback ≤ 320 KB             |
| Hall image (half @960w)    | ≤ 90 KB       |                                    |
| Total fonts                | ≤ 200 KB      | WOFF2 + subsetting                 |
| GSAP + ScrollTrigger       | ≤ 70 KB gz    |                                    |
| Lenis                      | ≤ 7 KB gz     | Desktop only                       |
| App JS (own code)          | ≤ 30 KB gz    |                                    |
| App CSS                    | ≤ 40 KB gz    |                                    |
| **Page weight @ start**    | **≤ 2 MB**    | Hero MP4 streams progressively     |

---

## Loading Strategy

### Critical Path
1. `<link rel="preload" as="image" href="hero-poster.jpg">` — LCP candidate.
2. `<link rel="preload" as="font" href="frank-ruhl-libre.woff2">` — display.
3. Inline critical CSS (above-fold) ב-`<head>`.
4. `<link rel="preload" as="video">` ל-hero אופציונלי (אבל יקר).

### Deferred
- GSAP / ScrollTrigger — `defer`.
- Lenis — defer + load only on desktop.
- Hero MP4 — `preload="auto"` רק על breakpoints מוצדקים; אחרת `preload="metadata"`.
- Hall images — `loading="lazy"` כל מי שמתחת לקיפול.

### Mobile-Specific
- Hero MP4 = 720p variant.
- Lenis disabled.
- Scrub disabled (poster + autoplay loop).
- Parallax disabled.
- Portal bubbles smaller (180px instead of 280px).

---

## Image Strategy

`<picture>` עם source-sets:

```html
<picture>
  <source type="image/webp"
          srcset="/assets/images/halls/venue/01.full.webp 1920w,
                  /assets/images/halls/venue/01.half.webp 960w"
          sizes="(min-width: 768px) 100vw, 100vw">
  <source type="image/jpeg"
          srcset="/assets/images/halls/venue/01.full.jpg 1920w,
                  /assets/images/halls/venue/01.half.jpg 960w">
  <img src="/assets/images/halls/venue/01.half.jpg"
       alt="..." loading="lazy" decoding="async"
       width="1920" height="1080">
</picture>
```

`width` + `height` חובה למניעת CLS.

---

## Video Strategy (Hero)

- HTTP Range requests: ה-server חייב לתמוך (סטנדרט).
- `+faststart` flag ב-ffmpeg.
- אם ה-hosting אינו תומך Range → השתמש ב-streamable container.
- Service worker לא נדרש בשלב זה (אופטימיזציה עתידית).

---

## Lighthouse Score Targets

| Pillar          | Mobile | Desktop |
|-----------------|--------|---------|
| Performance     | ≥ 90   | ≥ 95    |
| Accessibility   | ≥ 95   | ≥ 95    |
| Best Practices  | ≥ 95   | ≥ 95    |
| SEO             | ≥ 95   | ≥ 95    |

---

## Monitoring (post-launch, optional)

- Web Vitals JS library + analytics endpoint.
- Real-user monitoring of LCP / CLS / INP per device class.
