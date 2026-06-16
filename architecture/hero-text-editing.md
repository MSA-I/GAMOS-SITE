# Hero text editing guide (#hero — §3 LOCKED scene)

> How to safely change the **copy, color, size, or texture** of the three text
> blocks inside `#hero` (`.hero_content`). Read this before touching them — the
> hero is §3-LOCKED and uses SplitText, which interacts with the texture fill in
> a non-obvious way.

## The three text blocks

In `index.html`, inside `<section id="hero">` → `<div class="hero_content">`:

```html
<p class="hero_eyebrow">בין השמיים למדבר</p>
<div class="hero_title" dir="rtl">
  <h1>אוויר מדברי, אור רך,<br><span class="accent">וערב ששייך רק לכם.</span></h1>
</div>
<p class="hero_text">גנים, אולם וחדרי אירוח, מול נוף שנפתח עד האופק.</p>
```

- **`.hero_eyebrow`** — kicker above the title.
- **`.hero_title h1`** — the headline. Line 1 is the bare text node; **line 2 is the
  `<span class="accent">`** (the `<br>` splits them).
- **`.hero_text`** — the subtitle below.

**To change the words:** edit the text in `index.html` only, then run
`npm run build:mobile` (regenerates `mobile/index.html` from `index.html` — see
§13). Nothing else needs touching for a pure copy change.

## Color / texture — the SplitText gotcha

All hero text styling lives in `css/sections/hero-scene.css` (search
`.hero_eyebrow` / `.hero_title`). Tokens only — **no hard-coded hex** (§5/§10.2).

Current scheme (2026-06-16, after the line swap):
- **Eyebrow + title line 2 (`.accent`)** → DARK brand texture `var(--typo-on-light)`.
- **Title line 1 (`.hero_title h1`)** → solid **brass** (`var(--brass)`), no texture.
- **Subtitle** → `var(--fg-muted)`, no texture.

**THE TRAP:** `js/hero-scene.js` runs **SplitText** on `.hero_title h1`, wrapping
every word in a `<span class="hero_word">` for the entrance stagger. Those word
spans render **on top of** the `<h1>`. A `background-clip:text` fill set only on
the `<h1>` paints the h1's own glyphs — but the word spans sitting over them are
transparent with no fill of their own, so **the text looks invisible while still
being selectable** (you can drag-select it). This bit us twice.

**THE RULE:** any `background-clip:text` texture (or solid color) for the title
**must be set on `.hero_word` too**, not just the h1/accent. The working block
(current swapped scheme — eyebrow + line 2 textured, line 1 solid brass):

```css
@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .hero_eyebrow,
  .hero_title .accent,      .hero_title .accent .hero_word {
    background-repeat: no-repeat; background-size: 100% 100%;
    background-position: center;
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    background-image: var(--typo-on-light);   /* eyebrow + line 2 → dark texture */
  }
  .hero_title h1, .hero_title h1 .hero_word {
    -webkit-text-fill-color: var(--brass);    /* line 1 → solid brass, no texture */
    background: none;
  }
}
```

To put the texture back on line 1 instead (or swap which line is textured), move
the `background-image` selectors accordingly — always keep the matching
`.hero_word` selector beside each line's selector.

- It's inside `@supports` for graceful degradation — the solid `color:` rules
  outside the block are the fallback when `background-clip:text` is unsupported.
- For a **solid** (non-texture) color on a line instead, set BOTH
  `-webkit-text-fill-color` AND `color` on the line's selector **and** its
  `.hero_word`, and `background: none` to clear any inherited texture.
- Available textures: `--typo-on-light` (dark, for light bg) / `--typo-on-dark`
  (light, for dark bg). Defined in `css/tokens.css`; never `url()` directly (§4.1).

## Size

Sizes use the hero's scoped `--rem` (`0.5208vw` ≥768px), so write `calc(N * var(--rem))`,
matching the sandbox geometry. Eyebrow is `calc(2.6 * var(--rem))`; title line is
`calc(14 * var(--rem))` desktop / `calc(5.4 * var(--rem))` mobile.

## Reduced motion

`prefers-reduced-motion: reduce` skips SplitText/entrance (no `.hero_word` spans are
animated, but they're still created). The h1-level fill covers that case, and the
final composition is shown statically. Don't rely on the entrance running.

## Checklist before you commit a hero-text change
1. Copy edited in `index.html` (not `mobile/index.html` — it's generated).
2. If you changed color/texture: the fill is on `.hero_word` too, tokens only.
3. `npm run build:mobile` ran.
4. Eyeball at desktop **and** ≤768px; confirm the text is actually visible
   (not just selectable) — the SplitText trap above.

## See also
- `architecture/hero-logo-swap.md` — replacing the animated wordmark SVG (the
  drawSVG outline + desert-fill composite).
