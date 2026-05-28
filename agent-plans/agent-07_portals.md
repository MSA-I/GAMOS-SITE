# Agent 07 — Portal-Bubbles Engineer

**Agent ID:** agent-07
**Role:** Portal-Bubbles Engineer
**Subagent type:** coder
**Skills:** weblove-motion
**Created:** 2026-05-28
**Status:** draft (blocked by Agent 6 hook)

**Inputs:**
- `architecture/portal-bubbles-spec.md`
- `assets/video/portal-loop.mp4` (Agent 3)
- `js/hero-video-scrub.js` exposes `window.gamosHero.onProgress` (Agent 6)
- `index.html` `.portals` markup (Agent 4)
- Reference video: `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\ריזורט 1\1.5.mp4`

**Outputs:**
- `js/portals.js` — module with `init({ progressApi })`
- `css/sections/portals.css`

**Interfaces:**
- צורך מ-Agent 6: `window.gamosHero.onProgress`
- מתחבר לסקציות `#hall-venue` ו-`#hall-resort` (Agent 8)

## 1. הקשר ומטרה

שתי בועות עגולות מופיעות בסוף ה-hero, מובילות לסקציות אולם וריזורט.
clip-path circle, brass ring, glass blur, hover scale, click expand timeline.

## 2. צעדים

- [ ] **2.1** קריאת `portal-bubbles-spec.md` ובדיקת `1.5.mp4` כרפרנס
- [ ] **2.2** `css/sections/portals.css` per spec
- [ ] **2.3** `js/portals.js`:
  - `init()` מחבר ל-`window.gamosHero.onProgress`
  - ב-progress > 0.92 → `.is-active` class
  - click handler → expand timeline
  - keyboard (Tab + Enter/Space) handler
- [ ] **2.4** Mobile fallback:
  - אם iOS → `IntersectionObserver` על תחילת `#hall-venue` או על סוף ה-hero spacer
  - smaller bubbles (180px)
  - vertical-stacked
- [ ] **2.5** Reduced-motion: reveal מיידי, click → smooth-scroll פשוט (אין expand)
- [ ] **2.6** A11y check: aria-label, focus-visible, Tab order
- [ ] **2.7** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- שתי בועות מופיעות אחרי 92% מה-hero.
- Hover scales 1.06, ring intensifies.
- Click → expand 1s → smooth-scroll לסקציה הנכונה.
- Tab → Enter עובד.
- Mobile + reduced-motion verified.

## 4. סיכונים

- Click race condition: אם הסוכן צריך להמתין שה-section תהיה מוכנה (מתי שאר ה-css נטען).
- `clip-path: circle()` ביצועים — לא אמור להיות בעיה ב-modern browsers.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
