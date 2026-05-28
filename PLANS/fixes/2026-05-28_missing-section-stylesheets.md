# Defect F-08 — Missing section stylesheets (gallery, events, kosher, site-nav, site-footer)

**Severity:** P0 (5 sections render unstyled)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owners:** Agent 08 (gallery / events / kosher) + Agent 09 or new agent (nav / footer)
**Affects:** `#gallery`, `#events`, `#kosher`, `<header class="site-nav">`, `<footer class="site-footer">`

---

## Observation

`index.html` references the following classes — none have CSS:

| Class                          | Found in HTML                | CSS file exists?  |
|--------------------------------|------------------------------|-------------------|
| `.site-nav`, `.site-nav__*`    | `<header class="site-nav">`  | 🔴 No |
| `.site-footer`, `.site-footer__*` | `<footer class="site-footer">` | 🔴 No |
| `.gallery`, `.gallery__grid`, `.gallery__item` | `<section id="gallery" class="gallery">` | 🔴 No |
| `.events`, `.events__accordion`, `.events__item`, `.events__summary`, `.events__chevron`, `.events__content` | `<section id="events" class="events">` | 🔴 No |
| `.kosher`, `.kosher__body`     | `<section id="kosher" class="kosher">` | 🔴 No |

The `<head>` `<link>` block lists only 10 section CSS files (lines 80–89):
hero, portals, hall-venue, hall-resort, lounge, rooms, culinary, about,
testimonials, contact. **No gallery, events, kosher, site-nav, or site-footer.**

## Impact

- `<header class="site-nav">` falls back to default `<header>` block-level
  layout — no sticky positioning, no flex of brand + links, no spacing.
  The mobile burger button has no styling. Top of page looks broken.
- `<footer class="site-footer">` similarly bare — no grid, no separator,
  no brand mark, no social rail.
- `#gallery`'s 8-item grid renders as a default vertical `<ul>` of 8
  invisible `<li>` (since each `<li>` is empty `<li class="gallery__item" data-placeholder="...">`).
- `#events` accordion is functional via native `<details>`, but unstyled —
  no chevron animation, no padding, no card frame.
- `#kosher` is a single paragraph in default body color on `--ivory`.
  Probably acceptable but still off-feel.

## Recommended fix

### Step 1 — create the five missing CSS files under `css/sections/`:

| File                              | Owner    | Scope |
|-----------------------------------|----------|-------|
| `css/sections/site-nav.css`       | new agent or Agent 04 | sticky header, brand, links flex (RTL), CTA, mobile burger |
| `css/sections/site-footer.css`    | new agent or Agent 04 | grid (brand / nav / social / legal / copy), footer alt-bg |
| `css/sections/gallery.css`        | Agent 08 | masonry / 4-col grid + image hover overlays |
| `css/sections/events.css`         | Agent 08 | accordion card frame, chevron rotation, body padding |
| `css/sections/kosher.css`         | Agent 08 | brand-tinted card or banner with rabbinic seal slot |

Each file:
- Starts with `@layer sections {`.
- Uses logical properties only.
- Uses `var(--*)` tokens only.
- Honors `prefers-reduced-motion`.
- Has a header comment with owner + spec ref.

### Step 2 — link each from `index.html` `<head>`:

```html
  <link rel="stylesheet" href="/css/sections/site-nav.css">
  <link rel="stylesheet" href="/css/sections/site-footer.css">
  <link rel="stylesheet" href="/css/sections/gallery.css">
  <link rel="stylesheet" href="/css/sections/events.css">
  <link rel="stylesheet" href="/css/sections/kosher.css">
```

## Validation

- [ ] All 5 files exist under `css/sections/`.
- [ ] Each is linked in `index.html`.
- [ ] DevTools confirms styles applied (no default-only computed values).

## Status

- 🔴 OPEN — 2026-05-28
