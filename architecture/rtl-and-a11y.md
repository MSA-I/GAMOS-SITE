# RTL & Accessibility

---

## RTL Hebrew

### HTML root
```html
<html dir="rtl" lang="he">
```

### CSS Rules

1. **Logical properties only.** השתמש ב:
   - `margin-inline-start` / `margin-inline-end` (לא `margin-left/right`)
   - `padding-block` / `padding-inline`
   - `inset-inline-start` / `inset-block`
   - `border-inline-end`
   - `text-align: start / end` (לא `left / right`)

2. **Flex / Grid:** `flex-direction: row` הופך אוטומטית ב-RTL. השתמש ב:
   - `gap` (לא `margin-right` בין children)
   - `justify-content: flex-start / flex-end` הופך אוטומטית

3. **Bidi isolation למספרים בתוך טקסט עברי:**
   ```html
   <span class="bidi-iso">053-664-4044</span>
   ```
   ```css
   .bidi-iso { unicode-bidi: isolate; direction: ltr; display: inline-block; }
   ```
   או `<bdi>` HTML element.

4. **תמונות שצריכות mirror ב-RTL** (חיצים, אייקונים מכוונים):
   ```css
   [dir="rtl"] .icon--arrow { transform: scaleX(-1); }
   ```

### Typography RTL

- `text-align: start` (= right ב-RTL).
- ניקוד עברי תקין (`font-feature-settings: "kern" 1, "liga" 1`).
- מספרים תמיד LTR בתוך עברית — `<bdi>` או `unicode-bidi: isolate`.

---

## Accessibility (WCAG 2.2 AA)

### Color Contrast

- טקסט גוף: ≥ 4.5:1 על הרקע.
- כותרות גדולות (≥ 18pt או 14pt bold): ≥ 3:1.
- UI components ו-graphical objects: ≥ 3:1.
- Agent 10 בודק עם axe-core / Lighthouse.

### Keyboard Navigation

- כל אינטראקטיב מגיע ב-Tab.
- `Tab` order = הסדר הויזואלי (RTL = ימין → שמאל).
- `:focus-visible` ring 3px brass חובה על כל focusable.
- Skip-link בתחילת `<body>`:
  ```html
  <a href="#main-content" class="skip-link">דלג לתוכן הראשי</a>
  ```
- מודלים / overlays — `Esc` סוגר.

### ARIA

- Landmarks: `<nav>`, `<main>`, `<aside>`, `<footer>`, `<section>` עם `aria-labelledby`.
- Decorative images: `alt=""`.
- Functional images: alt משמעותי בעברית.
- Buttons: text content או `aria-label`.
- Portals: `aria-label="עבור לאולם"` / `"עבור לריזורט"`.

### Screen Reader

- כותרות semantic (`<h1>` יחיד, היררכיה תקינה).
- Skip link first.
- Hidden visual content for context: `.sr-only` class.

```css
.sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden;
  clip: rect(0,0,0,0);
  white-space: nowrap;
  border: 0;
}
```

### Forms

- כל `<input>` עם `<label for="...">`.
- Error messages עם `aria-describedby`.
- Required fields עם `aria-required="true"`.
- RTL forms: text inputs RTL טבעית; אבל מספר טלפון יכול להיות LTR.

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

ב-JS:
```js
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) {
  // Skip GSAP timelines, show final states instantly.
}
```

### Live Regions

- `aria-live="polite"` ל-form success / error messages.
- אסור `aria-live="assertive"` ב-flow רגיל (interruptive).

---

## Testing Checklist (Agent 10)

- [ ] axe-core: 0 serious / critical violations.
- [ ] Tab-only: כל אינטראקטיב מגיע, focus ring נראה.
- [ ] VoiceOver (Mac): hero (poster alt) + portals (button labels) + sections (landmarks).
- [ ] NVDA (Windows): same.
- [ ] `prefers-reduced-motion: reduce` — scrub כבוי, reveals = static final state.
- [ ] RTL mirror: כל מה שמכוון (חיצים) הופך נכון.
- [ ] Color contrast Lighthouse ≥ 95.
- [ ] Skip-link עובד.
- [ ] Form labels + errors מוקראים נכון.
