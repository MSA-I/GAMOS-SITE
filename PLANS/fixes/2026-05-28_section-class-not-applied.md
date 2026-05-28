# Defect F-06 — `.section` / `.section--*` modifier classes never applied

**Severity:** P0 (every section loses its global `padding-block`)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 04 (HTML)
**Affects:** Vertical rhythm across all 14 sections

---

## Observation

`css/layout.css` lines 34–58 define a complete `.section` system:

```css
.section          { padding-block: var(--space-32); position: relative; }
.section--tight   { padding-block: var(--space-16); }
.section--loose   { padding-block: calc(var(--space-32) + var(--space-16)); }
.section--flush   { padding-block: 0; }
.section--dark    { background: var(--bg-dark); color: var(--fg-on-dark); }
.section--alt     { background: var(--bg-alt); }
```

But `index.html` never applies `.section` to any `<section>`:

```html
<section id="hall-venue" class="hall hall--venue" ...>
<section id="lounge" class="lounge" ...>
<section id="culinary" class="culinary" ...>
...
```

Each section adds its own `padding-block` inside the per-section CSS file,
but inconsistently:
- `hall-venue.css`: `padding-block: var(--space-32)` ✅
- `culinary.css`: `padding-block: var(--space-32)` ✅
- `about.css`: empty placeholder — **no padding** 🔴
- `testimonials.css`: empty placeholder — **no padding** 🔴
- `contact.css`: empty placeholder — **no padding** 🔴
- `gallery.css`: file does not exist — **no padding** 🔴
- `events.css`: file does not exist — **no padding** 🔴
- `kosher.css`: file does not exist — **no padding** 🔴

Result: `#about`, `#testimonials`, `#contact`, `#gallery`, `#events`, `#kosher`
collapse with zero vertical padding — content butts up against the previous section.

Additionally, `.section--alt` (used to alternate background colors for visual
rhythm) is never applied, so all sections share the same `--ivory` background.
Constitution §1's "luxury or nothing" feel relies on this rhythm; without it,
the page reads flat.

## Recommended fix

Edit `index.html` to apply `.section` (and modifiers where appropriate) to
every `<section>`:

```html
<section id="hall-venue" class="section hall hall--venue" ...>
<section id="hall-resort" class="section section--alt hall hall--resort" ...>
<section id="lounge" class="section lounge" ...>
<section id="rooms" class="section section--alt rooms" ...>
<section id="culinary" class="section section--dark culinary" ...>
<section id="about" class="section about" ...>
<section id="testimonials" class="section section--alt testimonials" ...>
<section id="gallery" class="section gallery" ...>
<section id="events" class="section section--alt events" ...>
<section id="kosher" class="section kosher" ...>
<section id="contact" class="section contact" ...>
```

Modifier choices above are recommended — alternating `--alt` and `--dark` for
visual rhythm. Final picks are an editorial decision (Agent 04 + Agent 08 align).

⚠️ Note: `culinary.css` already paints `--ink-deep` background — using
`.section--dark` would double-up. Either drop `--dark` for `#culinary`
or strip the bg from `culinary.css`. Recommendation: drop `--dark` for now,
it's redundant.

## Validation

- [ ] Every `<section id="...">` in `index.html` has `class` containing `section`.
- [ ] DevTools computed styles show `padding-block: 8rem` (or `--space-32`).
- [ ] Visual QA: alternating background bands visible.

## Status

- 🔴 OPEN — 2026-05-28
