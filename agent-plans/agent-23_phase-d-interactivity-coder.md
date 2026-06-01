# Agent 23 — Phase D Interactivity Coder

**Owner:** Agent 23
**Created:** 2026-06-01
**Constitution refs:** §2 stack, §9 a11y, §10 ESM modules
**Plan src:** `PLANS/refactors/2026-05-29_code-vs-docs-reconciliation-and-launch.md` Phase D (D1, D2, D4)

## Goal

Build the three remaining interactivity pieces required for launch DoD:

1. **Contact form** — validation + WhatsApp+mailto submit (`js/contact-form.js`).
2. **Mobile nav** — fix broken `aria-controls`, hamburger toggle (`js/site-nav.js`).
3. **Testimonials slider** — verify slider.js wires up; adapt markup contract.

## Findings from inspection

### Contact form (#contact)

The existing `index.html` markup uses `class="contact__form"` (NOT `.contact-form` from spec)
with these fields already present:

| Field         | name        | type   | required |
|---------------|-------------|--------|----------|
| שם מלא        | name        | text   | yes      |
| טלפון         | phone       | tel    | yes      |
| דוא"ל         | email       | email  | yes      |
| סוג אירוע     | eventType   | select | yes      |
| הודעה         | message     | textarea | no     |

**No `date` field exists.** The plan-D wording mentions a date field but the actual
markup shipped doesn't have one. To preserve the choreography (slide-right reveals
already wired), I'll **add a date input** with the same data-reveal pattern, slotted
between `eventType` and `message`. This matches spec body template
("תאריך מועדף: {date}").

The status `<p>` exists as `.contact__feedback` (NOT `.contact-form__status`). I'll
use `.contact__feedback` to avoid breaking choreography CSS. Per spec it has
`role="status" aria-live="polite"` — already correct.

The submit button currently reads "שלחו פנייה". Per spec we change to
"שלחו דרך WhatsApp" + add a fallback "שלחו במייל במקום" link.

The form lacks `data-wa-number` and `data-email` data attrs. I'll add them with
**verified** numbers from the master plan: `077-9972343` (WhatsApp number per
`PLANS/research/2026-05-28_site-content-map.md` — I read 972779972343) and
`office@gamos.co.il`. ⚠️ NOTE: the master plan §6 flags WhatsApp as "needs user
verification" so the data attribute lets the user override later without code.

### Mobile nav

Current `<header.site-nav>` has:
- `.site-nav__inner` (NOT `.site-nav__container` per the CSS — minor mismatch but
  CSS still works because `.site-nav__inner` has flex via inline + the existing CSS
  doesn't reference `.site-nav__inner` so layout is via fallback. **Skipping fix
  — out of scope. Just note.**)
- `<ul class="site-nav__links">` with 11 anchors.
- `<button class="site-nav__toggle" aria-controls="site-nav-mobile">` — but
  `#site-nav-mobile` doesn't exist (broken).

**Approach: full-screen overlay.** I'll inject `<div id="site-nav-mobile"
class="site-nav__mobile" hidden>` once on init() containing a clone of the link
list. Mobile-only via CSS `@media (max-width: 900px)`. Toggle the `hidden`
attribute + `is-open` class on toggle. Lock body scroll while open.

### Testimonials slider

`<div class="testimonials__track" data-slider="testimonials">` is the track AND
has `data-slider`. But `slider.js` expects:
- `data-slider` on the **root** (which contains track + controls + dots).
- `data-slider-track` on the **child** element holding items.
- `data-slider-item` on each item.
- `data-slider-prev`, `data-slider-next` on buttons.
- `data-slider-dots` on a container element.

**Fix:** move `data-slider` to the `<section id="testimonials">` (the natural root),
add `data-slider-track` to `.testimonials__track`, `data-slider-item` to each
`.testimonial`, `data-slider-prev/next` to the existing prev/next buttons, and
add a new `<div data-slider-dots>` inside `.testimonials__controls`.

Also: `slider.js` is **already wired in `js/main.js`** as the `slider` import →
runs in the MODULES array. No new wire-up needed for slider itself.

## Plan

### Part A — `js/contact-form.js`
- `init()` finds `<form.contact__form>` (no `.contact-form` exists).
- Reads `data-wa-number` + `data-email` from the form.
- On submit (preventDefault):
  - Validate name, phone (Israeli regex), email regex, eventType.
  - Show inline error in/below each field via injected `<span role="alert">`.
  - Build URL-encoded WhatsApp body (Hebrew, no auto-newline normalization).
  - `window.open('https://wa.me/...', '_blank', 'noopener')`.
  - Show `.contact__feedback` success.
  - Render an inline `<a>` "שלחו במייל במקום" link below the submit button on
    success — clicking opens mailto with same body.
- `destroy()` removes listeners + injected elements.

### Part B — `js/site-nav.js`
- `init()` finds `.site-nav__toggle` + `.site-nav__links`.
- Builds `<div id="site-nav-mobile" class="site-nav__mobile" hidden>` containing
  a cloned link list. Appends to `<body>` (so it can overlay above sticky nav).
- Wires:
  - Toggle click → toggle `aria-expanded`, `hidden`, `is-open` on button + on
    overlay; toggle `nav-open` class on `<html>` for scroll-lock.
  - Link click inside overlay → close.
  - Escape key → close.
  - Focus trap: tab cycles toggle → first link → … → last link → toggle.
- Match-icon X via `.site-nav__toggle.is-open` class.
- `destroy()` removes everything.

CSS additions to `css/sections/site-nav.css`:
- `.site-nav__mobile` overlay (full-screen, backdrop-filter, z-index above sticky).
- `.site-nav__mobile[hidden]` already collapses (browser default).
- `.site-nav__toggle.is-open` rotation/X animation (transform on bars).
- `html.nav-open { overflow: hidden; }`
- All within mobile breakpoint or guarded.

### Part C — Testimonials markup
- Move `data-slider="testimonials"` from `.testimonials__track` to `<section id="testimonials">`.
- Add `data-slider-track` to `.testimonials__track`.
- Add `data-slider-item` to each `.testimonial`.
- Add `data-slider-prev` / `data-slider-next` to existing buttons.
- Add `<div data-slider-dots class="testimonials__dots"></div>` after `.testimonials__controls`.

### Part D — Wire main.js
- Import `contactForm` + `siteNav`. Add to MODULES array order: after slider, before marquee/counters.

### Part E — Tests (manual local browser)
Documented in commit + report.

### Part F — Commit
`feat: contact form (WhatsApp+mailto) + mobile nav (hamburger)`

## Definition of Done

- [ ] `js/contact-form.js` exists with init/destroy and validation + WhatsApp + mailto fallback.
- [ ] `js/site-nav.js` exists with toggle + overlay + focus trap + Escape.
- [ ] CSS additions to `site-nav.css` for `.site-nav__mobile` + `.is-open` + `html.nav-open`.
- [ ] `index.html` has `data-wa-number` + `data-email` on `<form.contact__form>`,
  date field added, submit button text updated, slider data-attrs on testimonials.
- [ ] `js/main.js` imports both modules and lists in MODULES array.
- [ ] One commit, message exactly `feat: contact form (WhatsApp+mailto) + mobile nav (hamburger)`.
- [ ] Hero/portals/scroll-scenes untouched.

## Risks / Notes

- **WhatsApp number 972779972343** is from the master plan content-map. User flagged
  WhatsApp as "needs verification" — using as default. The `data-wa-number` HTML
  attribute makes it trivial to swap.
- **Date field** is added (not required by markup but required by spec body
  template). Marked optional (no `required`) so existing validation doesn't block
  on it.
- **Focus trap minimal**: keydown listener only when overlay is open; releases on close.
