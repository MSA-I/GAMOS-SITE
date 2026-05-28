# Defect F-11 — No `data-reveal` / `data-stagger` attributes on any DOM element

**Severity:** P1 (motion polish missing; site loads & works)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 04 (HTML; spec ready in `.tmp/reveal-attribute-injections.md`)
**Affects:** All scroll-reveal animations

---

## Observation

`grep 'data-reveal' index.html` → 0 matches.
`grep 'data-stagger' index.html` → 0 matches.

But:
- `js/reveals.js` looks for `[data-reveal]` and `[data-stagger]`.
- `css/sections/motion-reveals.css` defines initial states keyed on
  `[data-reveal="fade"]`, `[data-reveal="fade-up"]`, `[data-reveal="mask"]`,
  `[data-reveal="scale"]`.
- Agent 09 left the integration list at `.tmp/reveal-attribute-injections.md`.

Agent 04's findings entry says: "Need Agent 04 to inject `data-reveal`
attributes (see `.tmp/...md`) so reveals actually fire on static sections."
This was never executed.

## Impact

Every section appears in its final state instantly when scrolled into view.
No fade-in, no stagger, no mask — visual polish missing. Functionally fine,
but the cinematic feel from §1 is reduced.

## Recommended fix

Read `.tmp/reveal-attribute-injections.md` (Agent 09's handoff) and apply each
listed attribute in `index.html`. Typical patterns:

```html
<!-- Hall section header -->
<header class="hall__header">
  <p class="hall__eyebrow" data-reveal="fade">אולם</p>
  <h2 class="hall__title" data-reveal="fade-up">…</h2>
  <p class="hall__lede" data-reveal="fade-up">…</p>
</header>

<!-- Stats cluster: stagger the children -->
<dl class="about__stats" data-stagger>
  <div class="about__stat" data-reveal="fade-up">…</div>
  <div class="about__stat" data-reveal="fade-up">…</div>
  <div class="about__stat" data-reveal="fade-up">…</div>
</dl>

<!-- Image masks -->
<picture data-reveal="mask"> … </picture>
```

Per `architecture/motion-language.md`:
- Stagger cap = 8 children (enforced in `reveals.js`).
- Use `fade-up` for text, `mask` for images, `scale` sparingly for callouts.

## Validation

- [ ] At least 30 elements have `data-reveal`.
- [ ] Lists with > 1 item that animate together have `data-stagger` on parent.
- [ ] DevTools verifies `is-visible` class lands as user scrolls (manual smoke).
- [ ] `prefers-reduced-motion: reduce` shows everything visible immediately.

## Status

- 🟡 OPEN — 2026-05-28 (P1 — does not block functional QA)
