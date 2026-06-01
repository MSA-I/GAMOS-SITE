# Agent 20 — Static Sections Choreographer

> **Owner:** Agent 20
> **Date:** 2026-06-01
> **Phase:** Motion language for non-scroll-scene sections.

## Mission
Apply *weblove-motion* aesthetic to the static (non-scroll-scene) sections so
they feel as premium as the scroll-cinema sections, but with a **distinct motion
language** — so the user never confuses one zone for the other.

## Sections in scope
- `#about`
- `#testimonials`
- `#gallery`
- `#events`
- `#kosher`
- `#contact`

## Sections OUT of scope
- `#hero`, `#portals`, `#hall-venue`, `#hall-resort`, `#culinary` (scroll-scene)
- `#lounge`, `#rooms` (handled by Agents 6/8 with their own animation systems)

## Choreography table

| Section          | Entrance type    | Detail | Direction tag |
|------------------|------------------|--------|---------------|
| `#about`         | `slide-right`    | Stats → counter animation | RTL: enters from natural reading start |
| `#testimonials`  | `clip-reveal`    | Section frame reveals top→bottom | Vertical wipe |
| `#gallery`       | `scale-up`       | Items stagger 100ms | Pulse-in |
| `#events`        | `slide-left`     | Accordion items stagger | Mirror to about |
| `#kosher`        | `rotate-in`      | Subtle 3deg + fade | Calm "stamp" |
| `#contact`       | `slide-right`    | Form fields stagger | Mirror about (last → first symmetry) |

Marquee inserted **between #culinary and #about** as horizontal text band:
`"אירועים יוקרתיים · חתונות חלום · ימי הולדת בלתי נשכחים · ריזורט · אולם · גן · ספא · "`

## New reveal types added to `js/reveals.js` + `motion-reveals.css`
- `slide-left`   — translateX(-40px) → 0
- `slide-right`  — translateX(40px) → 0  *(in RTL, "right" still means physical right; use logical inset-inline-start instead — see CSS notes)*
- `scale-up`     — scale(0.92) + fade
- `clip-reveal`  — clip-path: inset(0 0 100% 0) → inset(0 0 0 0) (top→bottom wipe)
- `rotate-in`    — rotate(3deg) + scale(0.97) + fade
- `counter`      — JS-driven textContent number anim

## New files
- `js/marquee.js` — pure CSS scrolling marquee initializer (sets duration via inline custom property, respects reduced-motion)
- `js/counters.js` — IntersectionObserver-driven number counter
- `css/components/marquee.css` — marquee styling

## Modified files
- `js/reveals.js` — extend (no breaking changes; existing `fade-up`/`fade`/`mask`/`scale` keep working)
- `css/sections/motion-reveals.css` — add new variants
- `css/sections/about.css`, `events.css`, `testimonials.css`, `contact.css`, `gallery.css`, `kosher.css` — add `.section-rail` utility, larger headings, padding for marquee
- `index.html` — add `data-reveal` + `data-stagger` attributes; insert marquee block between `#culinary` and `#about`; wrap stat numbers in `<span class="stat-number" data-value="…">`
- `js/main.js` — register `marquee` and `counters` modules

## Mockup phase (Step 8)
Create self-contained previews in `.tmp/weblove-mockups/`:
- `about-preview.html` — slide-right + counter
- `events-preview.html` — slide-left + accordion stagger
- `testimonials-preview.html` — clip-reveal
- `gallery-preview.html` — scale-up grid stagger
- `contact-preview.html` — slide-right form stagger
- `kosher-preview.html` — rotate-in
- `marquee-preview.html` — horizontal scroll standalone
- `all-sections-preview.html` — chained walkthrough

User reviews mockups, signals "good", then we apply to real files.

## DoD
- 6 mockup files + 1 combined exist in `.tmp/weblove-mockups/`.
- `js/reveals.js` supports all new variants with no regressions.
- `js/marquee.js` + `js/counters.js` exist with `init()/destroy()` contract.
- `index.html` has `data-reveal` attributes on the static sections.
- `prefers-reduced-motion` short-circuits all animations to final state.
- Marquee is inserted between `#culinary` and `#about`.
- About section's stats animate counters on intersection.
- Mobile collapses rails to single-column.
- Constitution §2 (no frameworks), §4 (RTL/logical), §5 (tokens), §8 (perf), §9 (a11y) respected.
- Final implementation committed (without `.tmp/`).

