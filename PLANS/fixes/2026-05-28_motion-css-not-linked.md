# Defect F-05 — Motion CSS files exist but never linked from HTML

**Severity:** P0 (reveals/accordions/slider render unstyled)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 04 (HTML)
**Affects:** Reveal animations, accordion styling, testimonials slider

---

## Observation

Three CSS files shipped by Agent 09 in Phase 4c are **NOT** linked from
`index.html`:
- `css/sections/motion-reveals.css`
- `css/sections/motion-accordions.css`
- `css/sections/motion-slider.css`

`grep motion-` in `index.html` → zero matches.

The HTML `<head>` `<link>` block (lines 80–89) lists only 10 section CSS files:
`hero, portals, hall-venue, hall-resort, lounge, rooms, culinary, about,
testimonials, contact`.

## Impact

- **Reveals:** `js/reveals.js` toggles `.is-visible` on `[data-reveal]` elements,
  but the initial-state CSS (opacity 0, translateY) lives in the unlinked
  `motion-reveals.css`. Without it, reveals do nothing — elements render
  in their final state regardless. (Acceptable degradation, but motion is missing.)
- **Accordions:** `js/accordions.js` relies on the chevron rotation + height
  transitions in `motion-accordions.css`. Without it, accordions are functional
  (native `<details>`) but visually plain.
- **Slider:** `js/slider.js` track + dots + prev/next styles live in
  `motion-slider.css`. Without it, testimonials slider has no track flex,
  no buttons, no dots — broken layout.

The slider is the worst of the three; testimonials section essentially fails.

## Recommended fix

Edit `index.html` `<head>`, after the existing 10 section CSS links (line 89),
add:

```html
  <!-- Stylesheets: motion (reveals, accordions, slider) -->
  <link rel="stylesheet" href="/css/sections/motion-reveals.css">
  <link rel="stylesheet" href="/css/sections/motion-accordions.css">
  <link rel="stylesheet" href="/css/sections/motion-slider.css">
```

Order matters less since they target different selectors, but keeping them
after section CSS preserves cascade intent (motion is a layer on top).

## Validation

- [ ] `grep -c motion- index.html` returns 3.
- [ ] After loading, `[data-reveal]` elements have computed `opacity: 0` initially.
- [ ] Testimonials slider track has flex layout.

## Status

- 🔴 OPEN — 2026-05-28
