# Task Plan — GAMOS-SITE Master Rebuild

**Plan source of truth:** `C:\Users\art1\.claude\plans\witty-stargazing-feather.md`
**Mirror copy:** `PLANS/research/2026-05-28_master-rebuild-plan.md`
**Created:** 2026-05-28

> **קובץ זה הוא checklist תהליכי קצר-טווח.** המאסטר המלא נמצא בקובץ ה-plan.
> `findings.md` = יומן גילויים. `progress.md` = מצב phases × סוכנים.

---

## Phase 0 — Workspace Bootstrap

- [x] CLAUDE.md (Constitution)
- [x] PLANS/ עם 7 תת-תיקיות + README
- [x] agent-plans/ + README
- [x] architecture/ עם 8 קבצי SOPs
- [x] task_plan.md, findings.md, progress.md, README.md
- [x] .tmp/ (gitignored)
- [x] css/ + js/ + assets/ skeleton
- [x] העתקת תוכנית המאסטר ל-PLANS/research/

## Phase 1 — Deep Research (Agent 1)

- [ ] scrape של gamos.co.il
- [ ] `PLANS/research/site-content-map.md`
- [ ] `PLANS/research/full-tab-inventory.md` ← gate משתמש
- [ ] `PLANS/research/competitor-audit.md`
- [ ] `PLANS/research/font-identification.md`
- [ ] `architecture/asset-inventory.md` (חצי ראשון)
- [ ] עדכון פלטה ב-CLAUDE.md §5 (נעילה)

## Phase 2a — Brand & Typography (Agent 2)

- [ ] WOFF2 של Frank Ruhl Libre + Heebo + Playfair Display ב-`assets/fonts/`
- [ ] `architecture/tokens.md`
- [ ] `css/tokens.css`

## Phase 2b — Asset Pipeline (Agent 3)

- [ ] תפירת ffmpeg של 13 הסרטונים → `assets/video/hero-master-1080.mp4`
- [ ] variants: 720p, WebM, poster
- [ ] portal-loop מ-`ריזורט 1/1.5.mp4`
- [ ] אופטימיזציה של תמונות אולמות → `assets/images/halls/**`
- [ ] `architecture/asset-inventory.md` (חצי שני)

## Phase 3a — HTML / Structure (Agent 4)

- [ ] `index.html` semantic skeleton + RTL + ARIA + JSON-LD
- [ ] כל הלשוניות מ-`full-tab-inventory.md` מיוצגות
- [ ] `js/main.js` shell

## Phase 3b — CSS Layout (Agent 5)

- [ ] `css/base.css`, `css/layout.css`, `css/utilities.css`

## Phase 3c — Hero Video-Scrub (Agent 6)

- [ ] `js/hero-video-scrub.js` (skill: video-to-website)
- [ ] `css/sections/hero.css`
- [ ] iOS fallback מאומת
- [ ] Contract: `window.gamosHero.onProgress` או `--hero-progress`

## Phase 4a — Portal Bubbles (Agent 7)

- [ ] `js/portals.js` (skill: weblove-motion)
- [ ] `css/sections/portals.css`
- [ ] click-routing לאולם וריזורט
- [ ] expand-and-transition timeline

## Phase 4b — Hall Sections (Agent 8)

- [ ] `css/sections/hall-venue.css`
- [ ] `css/sections/hall-resort.css`
- [ ] `css/sections/lounge.css`, `rooms.css`, `culinary.css`
- [ ] HTML partials + תמונות

## Phase 4c — Motion (Agent 9)

- [ ] `js/reveals.js`, `js/accordions.js`, `js/slider.js`
- [ ] static sections: about, testimonials, contact, gallery
- [ ] `prefers-reduced-motion` נכבד

## Phase 5 — QA & Performance (Agent 10)

- [ ] Lighthouse mobile ≥ 90 בכל ארבעת הצירים
- [ ] RTL keyboard pass
- [ ] axe-core: 0 violations חמורות
- [ ] reduced-motion verified
- [ ] cross-browser (Chrome / FF / Safari / iOS Safari / Android Chrome)
- [ ] perf budget: hero ≤ 12MB, LCP ≤ 2.5s, CLS ≤ 0.05
- [ ] `PLANS/performance/lighthouse-baseline.md`

---

## Phase Gates

```
[Phase 0] → [Phase 1] → [Phase 2a + 2b parallel] → [Phase 3a + 3b + 3c parallel] → [Phase 4a + 4b + 4c parallel] → [Phase 5]
```

תלויות קשות:
- Phase 3c (Hero) חסום עד Phase 2b מסיים hero-master MP4.
- Phase 4a (Portals) חסום עד Phase 3c חושף את ה-hook.
- Phase 4b (Halls) חסום עד Phase 2b (תמונות) + Phase 1 (copy) מסיימים.
- Phase 5 רץ אחרי כל gate.
