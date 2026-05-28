# Agent 05 — CSS Tokens & Layout

**Agent ID:** agent-05
**Role:** CSS Tokens & Layout
**Subagent type:** frontend-design specialist
**Skills:** frontend-design
**Created:** 2026-05-28
**Status:** draft (blocked by Agent 2)

**Inputs:**
- `css/tokens.css` (Agent 2 lock)
- `architecture/tokens.md`
- `architecture/rtl-and-a11y.md`
- `index.html` (Agent 4 skeleton)

**Outputs:**
- `css/base.css` (reset, RTL defaults, typography defaults)
- `css/layout.css` (container, grid, flex utilities)
- `css/utilities.css` (spacing helpers, sr-only, bidi)

**Interfaces:**
- כל סוכן CSS אחר משתמש בקבצים האלה כבסיס

## 1. הקשר ומטרה

ליצור את שכבת ה-CSS הבסיסית: reset, RTL defaults, typography ladder, layout
primitives, ו-utilities. הכל נגזר מ-`tokens.css` בלבד — אסור לקדד ערכים קשיחים.

## 2. צעדים

- [ ] **2.1** קריאת `css/tokens.css` + `architecture/tokens.md` + RTL spec
- [ ] **2.2** `base.css`:
  - modern reset (Andy Bell-ish)
  - `html { font-family: var(--font-body); }` כברירת מחדל
  - heading defaults (`h1..h6` עם font-display + line-height)
  - link defaults (no underline, hover with brass)
  - `:focus-visible` 3px brass ring
  - `@font-face` declarations
  - `@media (prefers-reduced-motion: reduce)` global override
- [ ] **2.3** `layout.css`:
  - `.container` (max-width container-max, padding-inline gutter)
  - `.container--narrow`, `.container--wide`
  - `.grid` (CSS grid utilities)
  - `.flex`, `.flex--center`, `.flex--between` וכו'
  - `.section` (block padding גדול לסקציה)
- [ ] **2.4** `utilities.css`:
  - spacing helpers: `.mt-{1..32}`, `.mb-{}`, `.py-{}` (logical)
  - `.sr-only` למסכי קוראים
  - `.bidi-iso` למספרים בעברית
  - `.text-{xs..hero}`
  - `.color-{ink|ivory|brass|...}`
- [ ] **2.5** smoke test: HTML דמה עם כל הסוגים → רנדור תקין
- [ ] **2.6** עדכון `findings.md` + `progress.md`

## 3. Done criteria

- 3 קבצים קיימים, מיובאים מ-`index.html` בסדר: tokens → base → layout → utilities → sections/*.
- כל ערך = `var(--*)`, אין מספרים קשיחים.
- RTL נבדק ב-Chrome devtools (`html[dir="rtl"]`).
- focus-visible נראה.

## 4. סיכונים

- Order matter — אם sections/* טוען לפני utilities, utilities לא יכולות לעקוף.
- CSS Cascade Layers (`@layer`) יכול לעזור — מומלץ.

## 5. Log

| Date       | Action  | Result |
|------------|---------|--------|
| 2026-05-28 | created | draft  |
