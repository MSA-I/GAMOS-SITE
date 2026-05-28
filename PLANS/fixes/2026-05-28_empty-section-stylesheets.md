# Defect F-09 — `about.css`, `testimonials.css`, `contact.css` are empty placeholders

**Severity:** P0 (3 critical sections render with browser defaults only)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owners:** Agent 08 (contact form/map) + Agent 09 (testimonials slider) + Agent 08 (about stats)
**Affects:** `#about`, `#testimonials`, `#contact` — three of the most conversion-critical sections

---

## Observation

Three of the 10 linked section CSS files are **empty placeholder files**, only
header comments:

`css/sections/about.css`:
```css
/* ============================================================================
   Section: #about (אודות)
   Owner: Agent 09 (Phase 4c)
   Placeholder file — populated by Agent 09.
   ============================================================================ */
```

`css/sections/testimonials.css`:
```css
/* ============================================================================
   Section: #testimonials (המלצות)
   Owner: Agent 08/09
   Placeholder file — populated downstream.
   ============================================================================ */
```

`css/sections/contact.css`:
```css
/* ============================================================================
   Section: #contact (צור קשר)
   Owner: Agent 08 (Phase 4b)
   Notes: form labels, RTL, LTR phone/email inputs via dir="ltr".
   Placeholder file — populated by Agent 08.
   ============================================================================ */
```

## Impact

### `#about`
Renders as default `<section>` with `<dl>` stats. No grid layout, no eyebrow
styling, no number emphasis. The "20+ years / 3,000+ events / 98% satisfaction"
trust-signal block reads as plain paragraph text — wasted conversion lift.

### `#testimonials`
Carousel cards render as a vertical stack. `.testimonials__track[data-slider]`
exists but without flex layout — slider JS will compute zero translate. Prev/Next
buttons render as default buttons stacked below.

### `#contact`
Form with 5 fields renders top-to-bottom unstyled. `.contact__grid` (2-column
desktop layout per `<aside>` markup) collapses. Labels and inputs have minimal
visual hierarchy. The `aside` with phone/email/address sits below the form
instead of beside it.

## Recommended fix

Each file needs a complete implementation (~80–150 lines each) using:
- `@layer sections { ... }` wrapper.
- Logical properties only.
- `var(--*)` tokens only.
- Reduced-motion override.

### `about.css` minimal scope
- `.about__body` — 2-col grid lede + stats on desktop.
- `.about__stats` — flex/grid of `<div class="about__stat">`.
- `.about__stat dt` — eyebrow style.
- `.about__stat dd` — large display number, `--text-3xl`, `--font-display-en`.

### `testimonials.css` minimal scope
- `.testimonials` section padding + alt-bg.
- `.testimonials__track` — flex with `gap` (slider JS handles `transform`).
- `.testimonial` — quote block, italic font, brass quotemark glyph.
- `.testimonials__controls` — flex right, prev/next buttons (logical
  `inset-inline-end` for RTL).

### `contact.css` minimal scope
- `.contact__grid` — 2-col desktop, 1-col mobile.
- `.contact__form` — vertical stack with logical `gap`.
- `.contact__field` — label + input pair.
- `.contact__field--full` — span both columns.
- `.contact__details` — channel list, CTA row.
- `.contact__map` — aspect-ratio holder for iframe.
- `.contact__submit` — brass primary CTA.

## Validation

- [ ] Each file has > 50 lines of real CSS.
- [ ] DevTools computed-styles diff shows distinct typography + layout vs default.
- [ ] Lighthouse a11y audit: `<label for>` linkage still intact (not regressed by CSS).

## Status

- 🔴 OPEN — 2026-05-28
