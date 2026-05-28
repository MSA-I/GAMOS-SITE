# Agent 04 — HTML / Structure

**Agent ID:** agent-04
**Role:** HTML / Structure (semantic skeleton)
**Subagent type:** backend-dev
**Skills:** semantic HTML + ARIA + JSON-LD
**Created:** 2026-05-28
**Status:** draft (blocked by Agent 1 user-approved inventory)

**Inputs:**
- `PLANS/research/full-tab-inventory.md` (signed off by user)
- `architecture/section-order.md`
- `architecture/asset-inventory.md`
- `architecture/rtl-and-a11y.md`

**Outputs:**
- `index.html` — semantic skeleton, RTL, ARIA, schema.org JSON-LD
- `js/main.js` — entry point shell

**Interfaces:**
- Agents 5, 8, 9 מסתמכים על מבנה ה-DOM הזה
- Agent 6 (Hero) צורך את DOM ה-hero בדיוק לפי `video-scrub-spec.md`
- Agent 7 (Portals) צורך את DOM ה-portals לפי `portal-bubbles-spec.md`

## 1. הקשר ומטרה

לכתוב את `index.html` כשלד semantic מלא:
- כל הסקציות מ-section-order.md בסדר הנכון
- כל הלשוניות מ-full-tab-inventory.md מיוצגות (top-nav + footer)
- RTL מלא, ARIA, JSON-LD ל-EventVenue
- Performance hints: preload poster, preload font, defer JS

## 2. צעדים

- [ ] **2.1** קריאת כל ה-architecture/*.md הרלוונטי + inventory של Agent 1
- [ ] **2.2** `<head>`:
  - meta charset, viewport, description, og tags
  - `<link rel="preload" as="image" href="/assets/video/hero-poster.jpg">`
  - `<link rel="preload" as="font" href="/assets/fonts/frank-ruhl-libre-400.woff2" type="font/woff2" crossorigin>`
  - JSON-LD `EventVenue` schema
- [ ] **2.3** `<body>` skip-link first
- [ ] **2.4** Top nav (sticky) — כל הלשוניות מ-inventory + lang toggle אם נדרש
- [ ] **2.5** `<main id="main-content">`:
  - `#hero` (per video-scrub-spec)
  - `#portals` (aside per portal-bubbles-spec)
  - `#hall-venue`, `#hall-resort` (sections גדולות)
  - `#lounge`, `#rooms`, `#culinary`, `#about`, `#testimonials`, `#gallery`,
    `#events`, `#kosher`, `#contact`
- [ ] **2.6** Footer — social links, legal, copyright
- [ ] **2.7** `<script type="module" defer src="/js/main.js"></script>`
- [ ] **2.8** `js/main.js` shell:
  - import GSAP + ScrollTrigger
  - import modules: hero-video-scrub, portals, reveals, accordions, slider, lenis
  - DOMContentLoaded → init each
- [ ] **2.9** WCAG sweep: kbd-only navigation, skip-link, focus order
- [ ] **2.10** Validate W3C HTML
- [ ] **2.11** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- `index.html` valid HTML5, RTL, no console errors.
- כל הסקציות מ-section-order.md קיימות.
- כל הלשוניות מ-full-tab-inventory.md מקושרות בנav או footer.
- JSON-LD valid (Google Rich Results Test).
- skip-link עובד.
- preload directives נכונים.

## 4. סיכונים

- Hebrew RTL bidi issues עם מספרים מעורבים בטקסט — לוודא `<bdi>` או isolation.
- Screen reader landmark redundancy — אסור double-labeling.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
