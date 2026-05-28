# Defect F-13 — Mobile-menu `aria-controls` references nonexistent ID

**Severity:** P1 (a11y — Lighthouse a11y audit fires "ARIA references valid IDs")
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 04
**Affects:** Screen-reader UX on mobile

---

## Observation

`index.html` line 132–133:

```html
<button class="site-nav__toggle" type="button"
        aria-label="פתח תפריט"
        aria-controls="site-nav-mobile"
        aria-expanded="false">
```

`grep id="site-nav-mobile"` in `index.html` → **0 matches**.

The button claims to control an element that does not exist. WCAG/ARIA spec:
`aria-controls` must reference an existing element ID.

## Impact

- Screen-reader announces "menu, controls site-nav-mobile" when focused;
  user activates → nothing happens, no element to announce as "expanded".
- Lighthouse a11y audit: "ARIA IDs are unique and valid" fails — costs ~3
  Lighthouse a11y points.
- axe-core: "aria-valid-attr-value" or "aria-controls invalid value".

## Recommended fix

Two parts:

### Part 1 — declare the mobile-menu container

Right after the `<header class="site-nav">` block (or inside it if it should
inherit positioning), add:

```html
<nav id="site-nav-mobile" class="site-nav__mobile" aria-label="ניווט נייד" hidden>
  <ul class="site-nav__mobile-links" role="list">
    <li><a href="#hall-venue">אולם</a></li>
    <li><a href="#hall-resort">ריזורט</a></li>
    <li><a href="#lounge">לאונג'</a></li>
    <li><a href="#rooms">חדרי נופש</a></li>
    <li><a href="#culinary">קולינריה</a></li>
    <li><a href="#about">אודות</a></li>
    <li><a href="#testimonials">המלצות</a></li>
    <li><a href="#gallery">גלריה</a></li>
    <li><a href="#events">אירועים</a></li>
    <li><a href="#kosher">כשרות</a></li>
    <li><a href="#contact">צור קשר</a></li>
  </ul>
</nav>
```

`hidden` attribute = closed by default. JS toggles `hidden` and flips
`aria-expanded` on the button.

### Part 2 — wire JS toggle behavior (Agent 04 or new module)

Either inline in `main.js` or a tiny module `js/site-nav.js` exporting `init()`:

```js
const btn = document.querySelector(".site-nav__toggle");
const menu = document.getElementById("site-nav-mobile");
if (btn && menu) {
  btn.addEventListener("click", () => {
    const open = btn.getAttribute("aria-expanded") === "true";
    btn.setAttribute("aria-expanded", String(!open));
    btn.setAttribute("aria-label", open ? "פתח תפריט" : "סגור תפריט");
    menu.hidden = open;
  });
}
```

## Validation

- [ ] axe-core: 0 violations on `aria-controls`.
- [ ] Screen-reader: focusing the burger announces a meaningful target.
- [ ] Click toggles visible / hidden + flips `aria-expanded`.

## Status

- 🟡 OPEN — 2026-05-28 (P1)
