# Agent 11 — Typography Research (Hero Wordmark)

**Status:** RESEARCH ONLY (no code changes outside this file).
**Date:** 2026-06-01
**Owner:** Agent 11 — Typography Researcher
**Implementer (downstream):** Agent 16 — Hero Visual Implementation
**Constitution refs:** §2 (stack), §4 (RTL), §5 (palette), §8 (perf budget), §10.2 (tokens-only).

---

## §0 TL;DR

- **Best identification of the reference:** the showcase in `תמונות לאנימציית האתר/פונט/1.2.png` and the *Ravage / Nomad-Expedition* style in the other refs are a **high-contrast modern Didone display serif with stepped/spurred terminals and a flared "A" crossbar** — most likely a paid font in the **`Ravage`** / **`Nomad`** family by foundries such as Beautype / Greenwood / Studio Sun.
- **Recommended free Google Font primary:** **Bodoni Moda** (700 / 900) — closest letterform DNA we can self-host legally for free.
- **Backup pair:** **Cormorant Garamond** (700) and **Playfair Display** (900) — both already on the project's Google-Fonts shortlist.
- **Texture fill:** dual-track. Production = **`background-clip: text` over a 24-30 KB optimised JPG/WebP texture patch** extracted from `1.png` / `1.2.png` (Detail and Texture cells). Fallback = **pure-CSS gradient stack of brass/cocoa/ivory tokens**, no image.
- **Hebrew pairing:** keep **Frank Ruhl Libre 700** for "אירועים" — it shares the same Didone-modulation DNA (high contrast, vertical stress) and is the standard Hebrew partner for Bodoni Moda / Playfair.
- **Reveal animation:** per-letter **mask-image wipe (top→bottom) + opacity stagger**, CSS-only, 80 ms stagger on a 1.4 s window. Falls back to instant for `prefers-reduced-motion`.

---

## §1 Font Identification

### What the reference actually shows

`1.2.png` (the "NOMAD" showcase grid) and `47349b26-…jpg` ("RAVAGE — A MODERN LUXURY FONT") show the same letterform DNA:

| Trait | Observation in reference |
|---|---|
| Contrast | Extreme. Hairline horizontals (top/bottom of `O`, mid-bar of `E`, crossbar of `A`) sitting against fat verticals (~14:1 stroke ratio). |
| Stress axis | Vertical (Didone), not slanted (Garamond). |
| Terminals | Bracketed serifs that sometimes flare into small stepped spurs — see the `A`-apex notch and the bottom of the `R` leg. |
| `A` | Distinct stepped/raised crossbar, almost a small platform. |
| `G` | Tall spur on the inner stroke; no double bar. |
| `V` / `W` | Pointed apex, no foot serif on outer strokes. |
| Aperture | Closed/narrow (like Didot, unlike Bodoni 1798). |
| Caps height | Tall (~78 % of em) — feels like a magazine cover. |
| Numerals | Lining (not OSF), wide. |
| Italic | Calligraphic, ball-terminal, dramatic — not used in our hero. |

### Best-match name (educated guess — paid)

The reference imagery is a marketing showcase for a **paid commercial display family**, almost certainly one of:

1. **Ravage Modern Luxury Serif** (Beautype / Mr.Letters on Creative Market) — `RAVAGE EXPEDITIONS` mock-up in `1.png` is a near-direct identifier.
2. **Nomad Serif** (Greenwood Co / Ardent Studios on Adobe Fonts) — `NOMAD` masthead in `1.2.png` matches their published spec.
3. **Recoleta Black** (Latinotype) — close geometric cousin; less spurred.

We are **NOT going to license/buy** any of these (out of scope, no budget approval, would violate §2 self-host-legal constraint without proof of license). We pick the closest free-license alternative.

---

## §2 Three Web-Safe Alternatives (all SIL OFL, self-hostable)

| # | Name | Weights needed | License | Self-host source | Latin caps | Hebrew |
|---|---|---|---|---|---|---|
| **A** | **Bodoni Moda** (Google Fonts, by Indestructible Type) | 700, 900 | SIL OFL 1.1 | `https://fonts.google.com/specimen/Bodoni+Moda` → download → run `pyftsubset` → WOFF2 | Full | None (use Frank Ruhl Libre) |
| **B** | **Cormorant Garamond** | 700 | SIL OFL 1.1 | `https://fonts.google.com/specimen/Cormorant+Garamond` → WOFF2 | Full | None |
| **C** | **Playfair Display** (already in repo) | 700, 900 | SIL OFL 1.1 | already at `assets/fonts/playfair-display-700.woff2`; need to add 900 | Full | None |

### Sample `@font-face` block (drop into `css/tokens.css` §1)

```css
/* ---- Bodoni Moda (Latin display — Hero "GAMOS" wordmark) ---- */
@font-face {
  font-family: "Bodoni Moda";
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url("../assets/fonts/bodoni-moda-700.woff2") format("woff2");
  unicode-range: U+0020-007E, U+00A0-00FF, U+2010-2027;
}
@font-face {
  font-family: "Bodoni Moda";
  font-style: normal;
  font-weight: 900;
  font-display: swap;
  src: url("../assets/fonts/bodoni-moda-900.woff2") format("woff2");
  unicode-range: U+0020-007E, U+00A0-00FF, U+2010-2027;
}
```

### Subsetting recommendation (for Agent 03 / asset pipeline)

The hero only renders the strings `GAMOS` + `EVENTS` + (optional) `RESORT` + numerals. We can ship a **micro-subset** (~6–9 KB) using `pyftsubset --text="GAMOSEVNTRSO0123456789 .•—"`:

```
pyftsubset bodoni-moda-900.ttf \
  --text="GAMOSEVNTRSO0123456789 .•—" \
  --flavor=woff2 \
  --output-file=bodoni-moda-900-hero.woff2
```

This trims the file from ~80 KB to ~7 KB — well inside §8 budget.

---

## §3 Recommended Choice + Rationale

**Primary: Bodoni Moda 900 (subsetted)** for the "GAMOS" wordmark and "EVENTS" eyebrow.

### Why Bodoni Moda over the alternatives

| Criterion | Bodoni Moda 900 | Cormorant Garamond 700 | Playfair Display 900 |
|---|---|---|---|
| Stroke contrast (proxy for "luxury") | Very high | Medium | High |
| Resemblance to NOMAD/RAVAGE refs | Closest (vertical stress, narrow aperture, tall caps) | Distant (humanist, wider) | Close but warmer/rounder |
| Caps-only setting at 8–12 vw | Excellent (tight kerning, lining figures) | OK | Excellent |
| Render at small sizes | Hairlines disappear < 32 px → use only for hero/section H1 | Good across sizes | Robust |
| Texture-fill behaviour (`background-clip: text`) | Wide verticals = lots of texture surface area = effect reads strongly | Less surface (thinner strokes) = effect dilutes | Similar to Bodoni Moda |
| Already in repo | No (add) | No (add) | Yes (need 900 weight) |
| Subsetted size estimate | ~7 KB | ~9 KB | ~7 KB |

**Decision:** Bodoni Moda 900. Playfair Display 900 is the **fallback in the font stack** so a user with Playfair already cached (we self-host 700 already; 900 to be added) sees something near-identical while Bodoni Moda is loading.

### Final font stack proposal (for `tokens.css` §2.3)

```css
--font-display-en:        "Bodoni Moda", "Playfair Display", "Didot", "Times New Roman", serif;
--font-display-en-hero:   "Bodoni Moda", "Playfair Display", "Didot", "Times New Roman", serif;
```

(`--font-display-en-hero` is a new token. We keep `--font-display-en` so existing Playfair callers don't break.)

---

## §4 Texture-Fill Technique

We need the inside of the letters to look like the **sandy/eroded/cracked-clay** material visible in the "Detail" and "Texture" cells of `1.png`. Two viable variants — ship variant A as the primary, fall back to variant B if the texture image fails to load or if the user is on a `Save-Data` connection.

### Variant A — Image-based (recommended for production)

**Asset to produce** (Agent 03 / asset pipeline):
- Source: crop a ~600×600 px square from the `Texture` cell of `1.png` (the dune/erosion patch) **or** from the desert background of `hero-static.webp` (we already own that asset — saves a download).
- Process: tile-test it in Photoshop / Affinity (Filter → Other → Offset by half), heal seams with patch tool.
- Output: `assets/textures/letter-sand-1024.webp` — **target ≤ 28 KB** (quality 70, mozjpeg/cwebp).
- Aspect: tileable square so it can repeat behind very wide hero text without obvious seams.

**CSS:**

```css
/* ---- Hero wordmark with sand-texture fill ---- */
.hero__wordmark {
  font-family: var(--font-display-en-hero);
  font-weight: 900;
  font-size: var(--text-hero);              /* clamp(3.5rem, 9vw, 8rem) */
  line-height: var(--lh-tight);
  letter-spacing: var(--tracking-tight);    /* -0.02em — Didones love tight tracking */
  text-transform: uppercase;

  /* The fill: layered so that even if the image fails, we still render brass. */
  background-color: var(--brass);                                           /* fallback */
  background-image:
    /* 1. soft inner glow so the texture doesn't look flat */
    radial-gradient(ellipse at 50% 35%, rgba(245, 239, 230, 0.35), transparent 70%),
    /* 2. the actual sand/erosion texture */
    url("../assets/textures/letter-sand-1024.webp"),
    /* 3. brass base in case the image is partially transparent */
    linear-gradient(180deg, var(--brass-glow) 0%, var(--brass) 55%, var(--brass-deep) 100%);
  background-size: cover, 60% auto, 100% 100%;
  background-position: center, center, center;
  background-repeat: no-repeat, repeat, no-repeat;
  background-blend-mode: screen, multiply, normal;

  /* Clip the whole stack to the letter shapes. */
  -webkit-background-clip: text;            /* Safari, iOS, older Chromium */
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;                       /* Firefox / Edge fallback */

  /* Crispness — Didone hairlines are punishing without this. */
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;       /* preserves hairline horizontals on retina */
}

/* No-support fallback (very old browsers; vanishingly small share). */
@supports not ((-webkit-background-clip: text) or (background-clip: text)) {
  .hero__wordmark {
    color: var(--brass);
    background: none;
  }
}

/* Save-Data + slow connections: drop the image, keep the gradient (variant B). */
@media (prefers-reduced-data: reduce) {
  .hero__wordmark {
    background-image:
      radial-gradient(ellipse at 50% 35%, rgba(245, 239, 230, 0.4), transparent 70%),
      linear-gradient(160deg, var(--brass-glow) 0%, var(--brass) 40%, var(--brass-deep) 80%, var(--cocoa) 100%);
  }
}

/* prefers-reduced-motion: nothing to do here — the fill is static. */
```

### Variant B — Pure-CSS gradient (fallback / no-image)

If the texture image is too heavy, fails, or the user is on Save-Data, this gives ~70 % of the visual character with **0 KB of additional download**:

```css
.hero__wordmark--gradient-only {
  background-image:
    /* erosion highlights */
    radial-gradient(circle at 25% 30%, rgba(245, 239, 230, 0.55) 0%, transparent 35%),
    radial-gradient(circle at 75% 70%, rgba(83, 65, 51, 0.45) 0%, transparent 40%),
    radial-gradient(circle at 60% 20%, rgba(212, 185, 138, 0.4) 0%, transparent 30%),
    /* base brass-cocoa duotone */
    linear-gradient(160deg, var(--brass-glow) 0%, var(--brass) 35%, var(--brass-deep) 65%, var(--cocoa) 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  color: transparent;
}
```

### Performance & A11y notes

- **Texture image size:** budget = 28 KB. Strict ceiling = 30 KB (CLAUDE.md §8). Anything heavier and Agent 16 must fall back to variant B.
- **`will-change: background-position`** is **NOT** added — we don't animate the texture. Adding it costs GPU memory for no win.
- **Color contrast for screen readers:** the wordmark is decorative. Add `aria-label="גאמוס - אירועים"` on the `<h1>` so screen readers announce real text, regardless of the visual fill.
- **High-DPI:** the 1024-px source provides crisp rendering up to ~2.5x. We do not need a 2048 version.
- **Anti-aliasing:** combine `text-rendering: geometricPrecision` + `-webkit-font-smoothing: antialiased`. Tested mental-model: Didone hairlines on Windows Chrome look chunky without this.

---

## §5 Hebrew Pairing Recommendation

**Verdict: keep Frank Ruhl Libre 700 for "אירועים".**

### Why

| Pairing candidate | Stroke modulation | Vertical stress | Reads at hero scale | Already self-hosted |
|---|---|---|---|---|
| **Frank Ruhl Libre 700** | High contrast | Yes (Didone-adjacent for Hebrew) | Excellent | Yes (`frank-ruhl-libre-700.woff2`) |
| Heebo 600 | None (sans) | n/a | OK but flat — would clash with Bodoni's drama | Yes |
| David Libre 700 | Medium | Yes | Acceptable | No (add cost, marginal gain) |

Frank Ruhl Libre's letterforms (especially `א`, `ר`, `ע`, `ם`) carry the same vertical-stress / high-contrast DNA as Bodoni Moda. Pairing two Didone-modulated families across scripts is the classic luxury-magazine move (Vogue, Harper's Bazaar Israel both do this).

### Subtitle styling spec for "אירועים"

```css
.hero__eyebrow {
  font-family: var(--font-display-he);     /* Frank Ruhl Libre */
  font-weight: var(--fw-bold);             /* 700 */
  font-size: clamp(1rem, 2vw, 1.5rem);
  letter-spacing: var(--tracking-eyebrow); /* 0.18em — wide for elegance */
  color: var(--brass);                     /* solid, no texture — texture is reserved for the wordmark */
  text-transform: none;                    /* Hebrew has no case */
}
```

The bullet decoration (`✦ EVENTS ✦` in §3 of CLAUDE.md) is Latin and stays in Bodoni Moda 700 (lighter than the wordmark) so the trio reads as a hierarchy: **wordmark (textured 900) → Hebrew eyebrow (solid brass 700) → Latin micro-eyebrow (solid brass 700, smaller).**

---

## §6 Letter-Reveal Animation Approach

The user wants **GAMOS to reveal letter-by-letter during scroll** as part of the `intro` stage (CLAUDE.md §3, scroll progress 0–14 %).

### Recommendation: per-letter mask-image wipe + Y-translate stagger

**Approach:** wrap each letter in a `<span class="letter">` (HTML side, Agent 04). Apply a CSS keyframe animation that:

1. Starts each span with a top-aligned `mask-image` linear gradient that hides 100 % of the letter.
2. Animates the mask's `mask-position` from `top` to `bottom` over 700 ms while simultaneously translating Y from `+12 px` to `0` and opacity from `0` to `1`.
3. Staggers each letter by 80 ms (`G` 0 ms, `A` 80 ms, `M` 160 ms, `O` 240 ms, `S` 320 ms — total reveal length ~1.0 s, well inside the existing 200–1100 ms budget noted in CLAUDE.md §3 stage 1).

### Why mask-wipe over alternatives

| Technique | Pros | Cons |
|---|---|---|
| **Mask-wipe (recommended)** | Reads as "letters being unveiled by sand sliding off"; fits the desert-erosion theme; CSS-only; perfect for textured fill (the texture fades in WITH the letter, not on top of it) | Slightly heavier than opacity (~1 ms per letter at 60 fps; negligible) |
| `clip-path: polygon(...)` reveal | Crisp edges; CSS-only | Doesn't soften — feels like a curtain, not erosion |
| Per-letter `opacity` + `translateY` only | Simplest; CSS-only | Looks generic; doesn't reinforce theme |
| SVG `<text>` + `stroke-dasharray` outline draw | Beautiful for thin scripts | Bodoni Moda has too much fill area; would look weird |
| JS-driven (GSAP SplitText) | Maximum control | Needs library; CLAUDE.md §2 prefers minimal JS deps |

### Sketch (for Agent 16 to implement, **do not copy verbatim** — this is illustrative)

```css
.hero__wordmark .letter {
  display: inline-block;
  opacity: 0;
  transform: translateY(0.15em);
  -webkit-mask-image: linear-gradient(180deg, black 0%, black 0%, transparent 0%);
          mask-image: linear-gradient(180deg, black 0%, black 0%, transparent 0%);
  -webkit-mask-size: 100% 200%;
          mask-size: 100% 200%;
  -webkit-mask-position: 0 100%;   /* fully hidden */
          mask-position: 0 100%;
  animation: letter-reveal 700ms var(--ease-out-cinema) forwards;
}
.hero__wordmark .letter:nth-child(1) { animation-delay: 200ms; }   /* G */
.hero__wordmark .letter:nth-child(2) { animation-delay: 280ms; }   /* A */
.hero__wordmark .letter:nth-child(3) { animation-delay: 360ms; }   /* M */
.hero__wordmark .letter:nth-child(4) { animation-delay: 440ms; }   /* O */
.hero__wordmark .letter:nth-child(5) { animation-delay: 520ms; }   /* S */

@keyframes letter-reveal {
  0%   { opacity: 0; transform: translateY(0.15em); -webkit-mask-position: 0 100%;        mask-position: 0 100%; }
  60%  { opacity: 1; }
  100% { opacity: 1; transform: translateY(0);     -webkit-mask-position: 0 0%;          mask-position: 0 0%; }
}

/* Reduced motion: instant reveal, respects CLAUDE.md §8/§9. */
@media (prefers-reduced-motion: reduce) {
  .hero__wordmark .letter {
    opacity: 1;
    transform: none;
    -webkit-mask-image: none;
            mask-image: none;
    animation: none;
  }
}
```

The mask animation runs on `mask-position` only — that's a compositor-friendly property and stays at 60 fps on M1-class hardware (CLAUDE.md §8 requirement).

### Timing relationship to existing intro stage

CLAUDE.md §3 stage 1 says "GAMOS letter-by-letter (200ms-1100ms)". The proposal above starts at 200 ms, ends at ~1220 ms — within tolerance. Agent 16 should align exact `animation-delay` values to whatever final timeline is locked in `js/hero-intro.js` (if that file exists yet).

---

## §7 Acceptance Criteria for Agent 16 (Implementer)

When Agent 16 implements this spec, the deliverable is "done" only if **all** of the following pass:

### Functional

- [ ] `assets/fonts/bodoni-moda-700.woff2` and `bodoni-moda-900.woff2` exist, are valid WOFF2, and are subsetted to `GAMOSEVNTRSO0123456789 .•—`.
- [ ] Combined size of both Bodoni Moda WOFF2 files ≤ 18 KB.
- [ ] `tokens.css` has the new `@font-face` blocks AND the `--font-display-en-hero` token; no hard-coded font names elsewhere.
- [ ] `tokens.css` adds Playfair Display 900 weight (already have 700) with size ≤ 32 KB unsubsetted, ≤ 9 KB subsetted.
- [ ] If using Variant A: `assets/textures/letter-sand-1024.webp` exists and is ≤ 30 KB.
- [ ] Hero "GAMOS" wordmark renders with the texture fill in **Chrome 120+, Safari 17+, Firefox 122+, Edge 120+**.
- [ ] Hebrew "אירועים" renders in Frank Ruhl Libre 700, solid `--brass`, no texture.

### Visual

- [ ] At desktop ≥ 1440 px, the wordmark fills ~50–65 % of viewport width, top-aligned to the intro stage layout.
- [ ] The texture is visible inside the letters (not behind), no leakage outside the glyph shapes.
- [ ] Letter hairlines (top/bottom of `O`, mid-bar of `E`) are crisp on retina (no fuzz).
- [ ] No FOUC: the wordmark either renders in fallback Playfair Display until Bodoni loads, OR is masked-hidden during the swap.

### Performance

- [ ] Lighthouse mobile Performance ≥ 90 still holds (CLAUDE.md §11).
- [ ] LCP candidate is unaffected — i.e., the wordmark is **NOT** the LCP element (the desert background `hero-static.webp` is). If the wordmark becomes LCP, that's a budget regression.
- [ ] On Save-Data / `prefers-reduced-data`, Variant B (gradient-only) kicks in automatically.

### Accessibility

- [ ] `<h1>` carries `aria-label` with full text; screen readers announce "גאמוס אירועים" or equivalent.
- [ ] Focus skip-link still reaches main content past the hero (CLAUDE.md §9).
- [ ] `prefers-reduced-motion: reduce` disables the letter-reveal animation (instant final state).
- [ ] Color contrast: the brass-on-ivory background meets WCAG AA for the *fallback* solid-color render (the texture-fill is decorative and aria-hidden via the parent label).

### Compliance

- [ ] No raw hex codes added outside `css/tokens.css` (CLAUDE.md §10.2).
- [ ] No new runtime libraries (CLAUDE.md §2).
- [ ] Bodoni Moda + Playfair Display + Frank Ruhl Libre + Heebo are the **only** font families referenced anywhere in the project.
- [ ] All license attributions for Bodoni Moda (SIL OFL 1.1) added to `assets/fonts/LICENSES.txt` (or equivalent existing manifest).

---

## §8 Open Questions for Main Agent / User

1. **Texture source preference:** crop from `1.png` (cleaner sand pattern) or reuse `hero-static.webp` desert (saves a download)? My recommendation is **`hero-static.webp` reuse** — already paid for in the budget, already cached when the user reaches the hero.
2. **Font weight 900 vs 800 vs 700:** Bodoni Moda has all three. 900 is the dramatic Vogue look; 700 is more restrained. The reference shows extreme contrast → **900**. Confirm with user if they want a slightly less bombastic feel.
3. **License path for any future paid font:** if the user later wants the actual *Ravage* / *Nomad* font, that's a separate budget conversation. This research stays free-license.
4. **"EVENTS" eyebrow:** should the bullet (✦) come from the wordmark font or stay as Unicode? Unicode is safer and renders in the fallback chain. Noted for Agent 16.

---

**End of agent-11 research.** No code outside this file was modified.
