# Agent 08 — Hall Sections Engineer

**Agent ID:** agent-08
**Role:** Hall Sections Engineer
**Subagent type:** frontend-design specialist
**Skills:** frontend-design
**Created:** 2026-05-28
**Status:** draft (blocked by Agents 1 + 3)

**Inputs:**
- `assets/images/halls/{venue,resort,lounge,rooms}/**` (Agent 3)
- `assets/images/culinary/**` (Agent 3)
- Hebrew copy verbatim from `PLANS/research/site-content-map.md` (Agent 1)
- `architecture/section-order.md`

**Outputs:**
- `css/sections/hall-venue.css`
- `css/sections/hall-resort.css`
- `css/sections/lounge.css`
- `css/sections/rooms.css`
- `css/sections/culinary.css`
- HTML partials inserted into `index.html`

**Interfaces:**
- Agent 9 (Motion) יוסיף reveals + sliders על המבנה הזה
- Agent 7 (Portals) מצפה ש-`#hall-venue` ו-`#hall-resort` יהיו במקום

## 1. הקשר ומטרה

קומפוזיציה ויזואלית של כל הסקציות הגדולות:
- אולם — split-grid, headline + 4-6 תמונות גדולות, CTA.
- ריזורט — full-bleed hero image + accordion למתקנים + גלריית חדרים.
- Lounge — teaser carousel.
- Rooms — masonry grid עם hover-zoom.
- Culinary — gallery (לא אולם!) — תמונות מנות עם capsule labels.

כל סקציה משדרת יוקרה, generous whitespace, typography גדול.

## 2. צעדים

- [ ] **2.1** קריאת inventory + section-order + frontend-design skill recipes
- [ ] **2.2** `hall-venue.css`:
  - section padding-block גדול
  - hero image 16:9 full-bleed
  - eyebrow + title + body grid
  - feature list (2-col)
  - CTA button גדול
- [ ] **2.3** `hall-resort.css`:
  - full-bleed image
  - accordion למתקנים (interface ל-Agent 9)
  - room cards grid
- [ ] **2.4** `lounge.css`: teaser horizontal scroll-snap או simple carousel
- [ ] **2.5** `rooms.css`: masonry או CSS columns
- [ ] **2.6** `culinary.css`: gallery grid עם hover labels
- [ ] **2.7** הוספת HTML partials ל-`index.html` עם copy verbatim מ-Agent 1
- [ ] **2.8** `<picture>` עם source-set per asset-inventory
- [ ] **2.9** בדיקת RTL — flow תקין מימין לשמאל
- [ ] **2.10** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- 5 stylesheets קיימים, מיובאים ב-`index.html`.
- כל הסקציות מוצגות עם תמונות אופטימיות (full + half).
- כל copy בעברית verbatim מהשירות החי.
- RTL flow תקין.
- accordion + carousel מסומנים כ-interface ל-Agent 9 (תוסיף אינטראקטיביות).

## 4. סיכונים

- מחסור בתמונות בקטגוריה מסוימת — fallback ל-placeholder או לעבד תמונה מ-מקור אחר.
- copy שזורם ארוך מדי — לקצר עם המשתמש.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
