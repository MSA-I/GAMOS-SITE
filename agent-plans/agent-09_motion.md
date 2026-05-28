# Agent 09 — Motion Engineer (static sections)

**Agent ID:** agent-09
**Role:** Motion Engineer (static sections)
**Subagent type:** coder
**Skills:** weblove-motion + frontend-design
**Created:** 2026-05-28
**Status:** draft (blocked by Agent 4 + 8)

**Inputs:**
- `architecture/motion-language.md`
- `index.html` skeleton (Agent 4)
- Hall sections + static sections (Agent 8)

**Outputs:**
- `js/reveals.js` — IntersectionObserver-based reveal patterns
- `js/accordions.js` — accessible accordion (Agent 8 hooks)
- `js/slider.js` — touch + keyboard slider for testimonials/gallery

**Interfaces:**
- Agent 8 חושף DOM hooks (`.reveal`, `.accordion`, `.slider`)
- Agent 10 בודק reduced-motion + keyboard

## 1. הקשר ומטרה

אנימציות ל-static sections: about, testimonials, contact, gallery, plus
accordions ב-resort/events ו-sliders ב-testimonials/gallery.

## 2. צעדים

- [ ] **2.1** קריאת `motion-language.md` + skill `weblove-motion` recipes
- [ ] **2.2** `js/reveals.js`:
  - IntersectionObserver עם `rootMargin: "-15% 0px"`
  - className-based: `.reveal-fade-up`, `.reveal-fade`, `.reveal-mask`, `.reveal-scale`
  - stagger 80ms בין children עם `[data-stagger]`
  - reduced-motion → instant final state
- [ ] **2.3** `js/accordions.js`:
  - `<details>` או custom button + region pattern
  - `aria-expanded` toggle
  - keyboard (Enter/Space) opens
  - smooth-height with `height: auto` via FLIP technique
- [ ] **2.4** `js/slider.js`:
  - touch swipe (PointerEvent)
  - arrow keys
  - prev/next buttons
  - dots
  - autoplay אופציונלי עם pause-on-hover
- [ ] **2.5** Parallax על desktop בלבד (אם מתאים) — ScrollTrigger
- [ ] **2.6** Reduced-motion paths לכל אחד
- [ ] **2.7** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- 3 modules קיימים, מיובאים מ-`main.js`.
- reveals פעילים בכל סקציה רלוונטית.
- accordions A11y תקין (axe-core 0 violations).
- slider עובד touch + keyboard + mouse.
- reduced-motion → all instant.

## 4. סיכונים

- Slider performance על mobile — לוודא passive event listeners.
- Accordion height transition flicker — להשתמש ב-FLIP או `interpolate-size`.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
