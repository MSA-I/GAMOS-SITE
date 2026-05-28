# Defect F-07 — Section CSS files not wrapped in `@layer sections`

**Severity:** P1 (specificity / utility-override hygiene)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owners:** Agent 07 (`portals.css`), Agent 08 (5 hall files), Agent 09 (3 motion files)
**Affects:** Cascade order — utilities cannot override section rules cleanly

---

## Observation

`base.css`, `layout.css`, `utilities.css` all declare:

```css
@layer base, layout, utilities, sections;
```

…signaling the intended cascade order. Then `hero.css` correctly wraps:

```css
@layer sections {
  .hero { ... }
}
```

…but **only `hero.css` does this**. Verified via
`grep '@layer sections' css/sections/*.css`:

```
css/sections/hero.css:9:@layer sections {
css/sections/hero.css:125:}  /* @layer sections */
```

All other section CSS files (`portals.css`, `hall-venue.css`, `hall-resort.css`,
`lounge.css`, `rooms.css`, `culinary.css`, `motion-reveals.css`,
`motion-accordions.css`, `motion-slider.css`) write rules at the unlayered
default level.

## Impact

Unlayered rules **win over** layered rules at the same specificity. So any
utility class (`.mt-8`, `.text-center`, etc.) — which lives in `@layer utilities`
— **cannot override** rules in section files without `!important`. Defeats the
entire purpose of the layered cascade Agent 5 set up.

Concrete example: a developer adds `<h2 class="culinary__title text-center">`
expecting `text-center` to override the `text-align` baked into
`.culinary__title`. It won't, because `.culinary__title` is unlayered (wins).

Right now `utilities.css` works around this with `!important` on every utility
— functional, but defeats the principle.

## Recommended fix

Wrap each affected file's body in `@layer sections { ... }`:

```css
/* css/sections/portals.css */

@layer sections {

.portals { ... }
.portal { ... }
/* ... */

}  /* @layer sections */
```

Files to update (9 total):
1. `css/sections/portals.css`
2. `css/sections/hall-venue.css`
3. `css/sections/hall-resort.css`
4. `css/sections/lounge.css`
5. `css/sections/rooms.css`
6. `css/sections/culinary.css`
7. `css/sections/motion-reveals.css`
8. `css/sections/motion-accordions.css`
9. `css/sections/motion-slider.css`

Trivial change — single `@layer sections {` at top, single `}` at bottom.

## Validation

- [ ] `grep '@layer sections {' css/sections/*.css` returns 10+ matches (one per file).
- [ ] Utility classes override section rules without `!important` (manual test).

## Status

- 🟡 OPEN — 2026-05-28 (P1 — utilities currently work via `!important` so no
  visible regression today, but Constitution §10.2 hygiene at risk)
