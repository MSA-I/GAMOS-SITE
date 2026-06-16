# Hero logo swap guide (#hero wordmark — §3 LOCKED scene)

> How to safely replace the **animated wordmark logo** in `#hero` — the letters
> that stroke-on (drawSVG) then crossfade to a desert-texture fill. Read this
> before swapping the SVG. The mechanism is non-obvious but the swap itself is a
> **pure asset replacement** when done right.

## What the logo is and how it animates

Two layers, both driven by `js/hero-scene.js`, both built from the **same single
SVG file** `assets/images/hero-scene/logo.svg`:

1. **`.hero_logo`** — an outline `<svg>` injected into the empty `<div class="hero_logo">`.
   CSS makes the paths `fill:transparent; stroke:#fff`, and **DrawSVGPlugin** strokes
   them on (0%→100%) during the scrub. This is the white-outline "drawing" phase.
2. **`.hero_composite`** — a second copy of the desert subject (`.hero_house`),
   masked by a `mask-image` data-URI built from the **same** SVG paths. As the
   outline fades, this fades in → the letters appear "filled" with the desert.

`applyLogo(svgText)` in `js/hero-scene.js` (the `LOGO_SVG_URL` fetch) does all of it:
- `parseSVG()` grabs the `viewBox` and **every** `<path d="…">` via regex (across
  any number of `<g>` groups — group nesting is irrelevant).
- Injects `<svg viewBox="…"><g fill="currentColor">…paths…</g></svg>` into `.hero_logo`.
- Builds a `data:image/svg+xml` mask (`fill:%23000`) and sets it as `mask-image` /
  `-webkit-mask-image` on `.hero_composite`.
- The per-path `fill="…"` in the source SVG is **ignored** — JS forces the fill
  (`currentColor` for the outline, black for the mask). So the source can keep
  whatever editor fill it shipped with (`#1d1d1b`, etc.).

## THE KEY INVARIANT — why a different aspect ratio is safe

Both layers letterbox the SVG into the **same box** with the **same fit**:
- `.hero_logo` `<svg>` is `width:100%; height:100%` of its box → default
  `preserveAspectRatio="xMidYMid meet"`.
- `.hero_composite` `mask-size` is set **equal to the `.hero_logo` box dims** at
  every breakpoint, `mask-position:center`, default meet.

Because the outline and the mask fit the **identical SVG into identical boxes the
identical way**, the filled letters always coincide pixel-for-pixel with the
outlined letters — **no matter what the SVG's aspect ratio is**. A 2.49:1 logo and
a 2.76:1 logo both just sit centered in the box at full height; only the side
padding changes. **So you do NOT need to touch CSS to swap in a logo of a
different aspect ratio.** (History: the 2026-06-16 swap from viewBox
`0 0 219.78 79.53` → `0 0 205.7 82.46` changed zero CSS and registered perfectly.)

`css/sections/hero-scene.css` documents the matching rule near the `.hero_composite`
`mask-size` (look for the "mask-size MUST equal the .hero_logo box" comment).
**If you ever change one, change the other** — at both the mobile base and the
`@media (min-width:768px)` desktop override. There are **no** `.hero_logo` /
`.hero_composite` overrides in `mobile/css/` (mobile inherits the base).

## How to swap the logo (the normal case)

1. The source SVG must live in the READ-ONLY assets root (§7), e.g.
   `D:\משה פרוייקטים\GAMOS-DOCS\תמונות לאנימציית האתר\HERO\`. **Do not edit it there.**
2. Copy it verbatim over the single-source file (this is the only place it's read):
   ```bash
   cp "<source>.svg" "assets/images/hero-scene/logo.svg"
   ```
   No re-encode — it's vector. No JS edit. No second copy to sync (`logo.svg` is
   referenced only by `LOGO_SVG_URL` in `js/hero-scene.js`; the HTML just has an
   empty `<div class="hero_logo">` that JS fills).
3. Update the viewBox/path-count note in `CLAUDE.md` §3 (the only doc that states
   it verbatim) so the Constitution stays truthful.

That's it for the common case. The letters will draw on and fill exactly as before.

## When you DO need CSS (rare)

Only if QA shows the new wordmark reads **too narrow / too wide / mis-sized** —
i.e. you want to change how much of the box width the word occupies, or its height.
Then recompute the box to the new aspect, keeping **`mask-size === .hero_logo box`**
and re-centering via `left`. In `css/sections/hero-scene.css`:
- Desktop (`@media min-width:768px`): `.hero_logo` `width`/`height` + `left`, and the
  matching `.hero_composite` `mask-size`.
- Mobile base: the same four values at the smaller scale.
Keep `top`/`left` as `calc(50% - (½·width · var(--rem)))` so it stays centered.
Stroke too heavy? Halve `.hero_logo svg path { stroke-width }` (desktop ~0.5px,
mobile ~0.75px) until it's a hairline.

## Verify after a swap

`hero-lab/scripts/qa-hero-lab.mjs` tests the **separate `/hero-lab/` sandbox**
(its own `wordmark.svg`), **NOT** this main-site logo — it will pass regardless of
this change. To actually verify, screenshot the real hero with Playwright
(already installed): `npx serve . -p 8000`, load `/`, scroll `#hero.hero_root` to
fractions of `(offsetHeight - innerHeight)` and shot at ~0.35 (outline drawing),
~0.55 (fill crossover complete), 1.0. Confirm: letters draw on as a hairline,
fill with desert at crossover, centered, **no distortion/clipping**, no console
errors. Repeat at 390px (`/mobile/`) — note mobile uses slower 460vh pacing, so
the fill completes later in the scroll. Put any scratch script under `.tmp/` and
delete it before committing (§6 rule 6).

## See also
- `architecture/hero-text-editing.md` — the headline copy/color/texture (incl. the
  SplitText `.hero_word` trap).
- `skills/gamos-hero-effect` (global skill) — the original build of this effect on
  the Next.js sandbox; `swap_logo.py` there automates the sandbox's 3-place edit
  (the vanilla site doesn't need it — `applyLogo()` is dynamic).
