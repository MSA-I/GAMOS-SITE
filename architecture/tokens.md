# Design Tokens

> **חוק.** כל ערך ויזואלי נגזר מ-`css/tokens.css`. ערך מוקלד-קשיח ב-CSS אחר = באג.
> הקובץ הזה הוא ה-spec; `css/tokens.css` הוא ה-implementation.

**Status:** LOCKED 2026-05-28 by Agent 02 (Brand & Typography).

> Implementation: `css/tokens.css` (Agent 02). Spec ↔ implementation parity is
> required — any divergence is a bug. Brand palette below is **Provisional**
> until Agent 1 ships the gamos.co.il scrape; when locked, update the brand
> block in `tokens.css` only — semantic tokens reference brand and will follow.

---

## Colors (Provisional)

### Brand
```
--ink-deep:        #0E0E0C    /* רקעים כהים, כותרות */
--ink-medium:      #2A2A28    /* מסגרות עדינות */
--ivory:           #F5EFE6    /* רקע ברירת מחדל בהיר */
--ivory-warm:      #ECE3D3    /* warm tint */
--brass:           #B89766    /* accent ראשי - יוקרה */
--brass-deep:      #8B6F46    /* hover/active */
--brass-glow:      #D4B98A    /* glow / highlight */
--sage:            #7A8466    /* accent משני */
--gold:            #C9A961    /* alt accent */
```

### Semantic
```
--bg:              var(--ivory)
--bg-alt:          var(--ivory-warm)
--bg-dark:         var(--ink-deep)
--fg:              var(--ink-deep)
--fg-muted:        #6B6B68
--fg-on-dark:      var(--ivory)
--accent:          var(--brass)
--accent-hover:    var(--brass-deep)
--border:          rgba(14, 14, 12, 0.12)
--border-strong:   rgba(14, 14, 12, 0.24)
--shadow-soft:     0 8px 24px rgba(14, 14, 12, 0.06)
--shadow-strong:   0 24px 60px rgba(14, 14, 12, 0.16)
```

> **Lock pending (palette only):** Agent 1 ישלוף את הצבעים האמיתיים מ-gamos.co.il
> ויעדכן את הקובץ הזה ואת הבלוק `2.1 Brand palette` ב-`css/tokens.css`.
> מבנה הטוקנים עצמו (טיפוגרפיה / spacing / motion / radii / z-index) **נעול**.

---

## Typography

### Families
```
--font-display-he:  "Frank Ruhl Libre", "David Libre", "Times New Roman", serif
--font-display-en:  "Playfair Display", "Times New Roman", serif
--font-body:        "Heebo", "Arial", sans-serif
--font-mono:        ui-monospace, "Menlo", monospace
```

### Scale (modular ratio 1.250)
```
--text-xs:    0.75rem        /* 12px */
--text-sm:    0.875rem       /* 14px */
--text-base:  1rem           /* 16px */
--text-md:    1.25rem        /* 20px */
--text-lg:    1.563rem       /* 25px */
--text-xl:    1.953rem       /* 31px */
--text-2xl:   2.441rem       /* 39px */
--text-3xl:   3.052rem       /* 49px */
--text-4xl:   3.815rem       /* 61px */
--text-hero:  clamp(3.5rem, 9vw, 8rem)   /* 56-128px */
```

### Weights
```
--fw-regular:  400
--fw-medium:   500
--fw-semibold: 600
--fw-bold:     700
```

### Line heights
```
--lh-tight:    1.05      /* כותרות גדולות */
--lh-snug:     1.2       /* כותרות בינוניות */
--lh-normal:   1.5       /* גוף */
--lh-loose:    1.7       /* פסקאות ארוכות */
```

### Letter spacing
```
--tracking-tight:   -0.02em
--tracking-normal:  0
--tracking-wide:    0.05em
--tracking-eyebrow: 0.18em   /* uppercase eyebrow */
```

---

## Spacing (4px base scale)

```
--space-1:   0.25rem    /* 4px */
--space-2:   0.5rem     /* 8px */
--space-3:   0.75rem    /* 12px */
--space-4:   1rem       /* 16px */
--space-6:   1.5rem     /* 24px */
--space-8:   2rem       /* 32px */
--space-12:  3rem       /* 48px */
--space-16:  4rem       /* 64px */
--space-24:  6rem       /* 96px */
--space-32:  8rem       /* 128px */
```

---

## Radii

```
--radius-sm:    4px
--radius-md:    8px
--radius-lg:    16px
--radius-xl:    24px
--radius-pill:  9999px
--radius-circle: 50%
```

---

## Layout

```
--container-max:    1320px
--container-narrow: 880px
--container-wide:   1480px
--gutter:           clamp(1rem, 4vw, 2.5rem)
```

---

## Motion

### Durations
```
--dur-fast:    160ms
--dur-base:    240ms
--dur-slow:    360ms
--dur-deluxe:  600ms
--dur-cinema:  1000ms
```

### Easings
```
--ease-out-cinema: cubic-bezier(0.2, 0.8, 0.2, 1)
--ease-in-cinema:  cubic-bezier(0.7, 0, 0.84, 0)
--ease-out-back:   cubic-bezier(0.34, 1.56, 0.64, 1)
--ease-linear:     linear
```

---

## Z-Index Scale

```
--z-base:       0
--z-content:    10
--z-sticky:     100
--z-overlay:    1000
--z-modal:      2000
--z-toast:      3000
```

---

## Fonts — self-host map (LOCKED 2026-05-28 by Agent 02)

WOFF2 only, `font-display: swap` mandatory, total budget ≤ 200KB combined.

| File (in `assets/fonts/`)        | Family             | Weight | Coverage         |
|----------------------------------|--------------------|--------|------------------|
| `frank-ruhl-libre-400.woff2`     | Frank Ruhl Libre   | 400    | Hebrew + Basic Latin |
| `frank-ruhl-libre-500.woff2`     | Frank Ruhl Libre   | 500    | Hebrew + Basic Latin |
| `frank-ruhl-libre-700.woff2`     | Frank Ruhl Libre   | 700    | Hebrew + Basic Latin |
| `heebo-400.woff2`                | Heebo              | 400    | Hebrew + Latin   |
| `heebo-500.woff2`                | Heebo              | 500    | Hebrew + Latin   |
| `heebo-600.woff2`                | Heebo              | 600    | Hebrew + Latin   |
| `playfair-display-400.woff2`     | Playfair Display   | 400    | Latin only       |
| `playfair-display-700.woff2`     | Playfair Display   | 700    | Latin only       |

`@font-face` declarations live in `css/tokens.css` §1 with `unicode-range`
hints so the browser only fetches faces whose glyphs are actually rendered.
