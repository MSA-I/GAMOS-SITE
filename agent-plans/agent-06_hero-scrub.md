# Agent 06 — Hero Video-Scrub Engineer

**Agent ID:** agent-06
**Role:** Hero Video-Scrub Engineer
**Subagent type:** coder
**Skills:** video-to-website
**Created:** 2026-05-28
**Status:** draft (blocked by Agent 3 master MP4)

**Inputs:**
- `architecture/video-scrub-spec.md`
- `assets/video/hero-master-1080.mp4` (Agent 3)
- `assets/video/hero-master-720.mp4` (Agent 3)
- `assets/video/hero-poster.jpg` (Agent 3)
- `index.html` skeleton with `#hero` (Agent 4)
- `css/tokens.css` (Agent 2)

**Outputs:**
- `js/hero-video-scrub.js` — module with `init({ heroEl, videoEl })`
- `css/sections/hero.css`
- iOS detection + fallback path
- Public API: `window.gamosHero.onProgress(cb)` + CSS variable `--hero-progress`

**Interfaces:**
- **חוזה ל-Agent 7:** `window.gamosHero.onProgress(cb)` + CSS variable
- Agent 10 בודק 60fps + iOS fallback

## 1. הקשר ומטרה

לבנות את ה-hero scroll-driven: scroll progress 0..1 → `video.currentTime`.
בלי חיכוך, 60fps, עם iOS fallback וה-reduced-motion path.

## 2. צעדים

- [ ] **2.1** קריאת `video-scrub-spec.md` במלואו
- [ ] **2.2** `css/sections/hero.css`:
  - `.hero` רקע
  - `.hero__spacer { height: 500vh; }`
  - `.hero__sticky { position: sticky; top: 0; height: 100vh; }`
  - `.hero__video` object-fit cover
  - `.hero__overlay` עם title (z-index gradient)
- [ ] **2.3** `js/hero-video-scrub.js`:
  - import gsap + ScrollTrigger
  - `init()` מחכה ל-`loadedmetadata`
  - יוצר ScrollTrigger עם `scrub: true`
  - onUpdate: throttled currentTime (delta > 0.04)
  - publish CSS variable `--hero-progress`
  - publish JS API `window.gamosHero.onProgress`
- [ ] **2.4** iOS detection + fallback (autoplay loop, no scrub)
- [ ] **2.5** Reduced-motion path
- [ ] **2.6** Performance audit:
  - DevTools Performance recording → 60fps verification
  - אם < 60fps: throttle harder או הקטן spacer
- [ ] **2.7** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- 60fps scrub בדסקטופ M1/Ryzen-class.
- iOS Safari → autoplay loop fallback verified ב-real device (Agent 10).
- `--hero-progress` updates smooth.
- Reduced-motion → poster shown, no scrub, no errors.
- אין memory leaks (test scroll up + down 5x).

## 4. סיכונים

- VFR ב-MP4 → seeking לא מדויק → לדרוש מ-Agent 3 CFR.
- `requestVideoFrameCallback` לא נתמך ב-Firefox/Safari → fallback to currentTime polling.
- Throttle אגרסיבי מדי → frame skipping ויזואלי.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
