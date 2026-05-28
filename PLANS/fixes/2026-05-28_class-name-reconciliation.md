# Defect F-03 — Section-header class-name mismatch (HTML ↔ CSS)

**Severity:** P0 (blocks Phase 5 ✅)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owners:** Agent 04 (HTML) + Agent 08 (Hall CSS)
**Affects:** 9 sections render with unstyled headers

---

## Symptom

`index.html` markup uses `<header class="section-header">` with children
`.section-header__eyebrow`, `.section-header__title`, `.section-header__lede`
on every static section that needs a header (`#lounge`, `#rooms`, `#culinary`,
`#about`, `#testimonials`, `#gallery`, `#events`, `#kosher`, `#contact`).

But:
- **No CSS file defines `.section-header`** (verified via `grep -r section-header css/` → no matches).
- Three section CSS files instead define their own per-section BEM blocks:
  - `css/sections/culinary.css` line 27: `.culinary__header { ... }`
  - `css/sections/lounge.css`   line 27: `.lounge__header   { ... }`
  - `css/sections/rooms.css`    line 27: `.rooms__header    { ... }`

These selectors **never match the markup** because the HTML doesn't use them.

Additionally, `css/sections/hero.css` line 86 defines `.hero__sub`, but `index.html`
line 170 uses `<p class="hero__subtitle">`. Hero subtitle is unstyled.

## Root cause

Two agents worked in parallel without aligning on a header convention.

- **Agent 04** picked a **shared component** approach: one `.section-header`
  block reusable across all sections. Sensible — but never created the CSS.
- **Agent 08** picked a **per-section BEM** approach: `.lounge__header`,
  `.rooms__header`, `.culinary__header` scoped to each section. Sensible —
  but didn't see Agent 04's shared markup.

No coordination doc resolved which one wins.

## Impact on Lighthouse / DoD

- `font-family`, `font-size`, `letter-spacing`, `text-transform`, `margin-block-end`
  — all tokens for eyebrows / titles / leads — are not applied.
- All 9 sections render with default browser typography (Times-ish), breaking
  the cinematic/luxury feel the Constitution §1 mandates.
- A11y unaffected (semantic `<header>` still works), but visual fail.
- Mobile Lighthouse Performance unaffected, **but Best Practices a11y heuristic
  may fire "low contrast" on default body text vs ivory backgrounds.**

## Recommended fix

**Option A (preferred — shared component):** Owner = Agent 04 (HTML stays
as-is) + new task for any of Agents 5/8/9.

Add a new file `css/sections/section-header.css` (or extend `css/layout.css`
under `@layer layout`) with the canonical implementation:

```css
@layer sections {
  .section-header {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    margin-block-end: var(--space-16);
    max-inline-size: var(--container-narrow);
  }
  .section-header__eyebrow {
    font-family: var(--font-body);
    font-size: var(--text-sm);
    font-weight: var(--fw-medium);
    letter-spacing: var(--tracking-eyebrow);
    text-transform: uppercase;
    color: var(--brass-glow);
    margin: 0;
  }
  .section-header__title {
    font-family: var(--font-display-he);
    font-size: clamp(var(--text-2xl), 5vw, var(--text-4xl));
    font-weight: var(--fw-regular);
    line-height: var(--lh-tight);
    letter-spacing: var(--tracking-tight);
    margin: 0;
  }
  .section-header__lede {
    font-family: var(--font-body);
    font-size: var(--text-md);
    line-height: var(--lh-snug);
    color: var(--fg-muted);
    margin: 0;
    max-inline-size: 60ch;
  }
}
```

Then **delete** `.lounge__header`, `.rooms__header`, `.culinary__header`
blocks from their per-section files (Agent 8) — they're orphans.

Also rename `.hero__sub` → `.hero__subtitle` (or vice-versa in HTML — pick one).

Then add `<link rel="stylesheet" href="/css/sections/section-header.css">` to
`index.html` `<head>`.

**Option B (alternative — per-section BEM):** Owner = Agent 04.

Edit `index.html` to replace `<header class="section-header">` blocks with
section-prefixed BEM (`<header class="lounge__header">`, etc.) for every
section. Then ship matching CSS for the missing sections (culinary already
has it; lounge/rooms already have it; about/testimonials/gallery/events/
kosher/contact need new ones). More files, more drift risk. **Not recommended.**

## Validation

- [ ] After fix, `grep -r section-header css/` shows the 4 new selectors.
- [ ] `<link>` to `section-header.css` (or wherever it lives) added in `<head>`.
- [ ] Visual smoke test in `.tmp/layout-smoke.html` style (RTL renders eyebrow,
      title, lede correctly).
- [ ] Hero subtitle picks up styling (rename either side).

## Status

- 🔴 OPEN — 2026-05-28
