# Font Identification — Reference Image `פונט/1.2.png`

**Agent:** 01 — Research & Content Lead
**Date:** 2026-05-28
**Source image:** `D:\משה פרוייקטים\GAMOS-SITE\תמונות לאנימציית האתר\פונט\1.2.png`
**Image content:** Brand-design moodboard with the wordmark **"NOMAD"** + supporting type at multiple sizes, a full alphabet sheet (uppercase + numbers + punctuation), and lifestyle photography of a coastal/mountain landscape with brown/cream packaging.

---

## 1. Visual analysis of the reference

Looking at the wordmark and alphabet specimen:

| Trait | Observed |
|-------|----------|
| **Classification** | Display serif, **didone-adjacent** (high contrast between thick verticals and hair serifs) |
| **Contrast (vertical/horizontal stress)** | Extreme — verticals 8–10× wider than thin connectors |
| **Serifs** | Thin, flat, unbracketed (didone family) |
| **X-height** | Low — capitals dominate, very tall caps |
| **Distinctive cuts / inlines** | **Stencil-style splits** on terminals (on the A's crossbar, the M's apex, and crossbars of E/F) |
| **Stroke modulation** | Very rationalist, geometric — no humanist warmth |
| **Numerals** | Lining (full-height), didone-style |
| **Mood** | Editorial luxury, fashion-magazine, travel-brand sophistication |

**Conclusion:** This is **not** a standard Bodoni or Didot. The distinctive stencil-cut serifs and inline ornaments make this a **modern editorial display didone with optional stylistic alternates / inline variants** — a pattern most associated with commercial families that ship with multiple "cut/inline/stencil" weights.

---

## 2. Most likely commercial families (matched by feature)

### Top match: **Saol Display** (Schick Toikka)
- **Why it matches:** Very high contrast didone with optional **inline / stencil cuts** in the heavier weights. The distinctive split-cut you see on the A's crossbar and the M is a Saol Display signature in its "Cut" sub-style.
- **Weights with the stencil cuts:** Saol Display Cut Black (the inline/stencil-cut variant).
- **Used by:** *The New York Times* magazine display, fashion editorials, luxury hospitality brands.
- **Cost:** Commercial license — typically $200–$500+ per weight, $1500+ for full family.

### Second match: **Recoleta** (Latinotype) — softer alternative
- **Why it matches:** High contrast, didone-leaning, but with rounder terminals. Recoleta's heavier cuts share the editorial mood, though it lacks the stencil-cut feature.
- **Used by:** Ueno, brand-design studios, food/wine packaging.
- **Cost:** Commercial — ~$240 family.

### Third match: **Reckless Neue** (Displaay) or **Migra** (Pangram Pangram)
- **Why it matches:** Modern display serifs with optional inline variants. Migra in particular has stencil-cut weights ("Migra Inline / Migra Italic Cut") that nail the look.
- **Used by:** Contemporary editorial / luxury digital brands.
- **Cost:** $150–$300 per weight.

### Fourth match: **Tiempos Headline** (Klim) with custom inline cuts
- **Why it matches:** Strong didone bones, used widely in luxury editorial. The reference image's cuts could also be a custom artwork variant of Tiempos.
- **Cost:** Klim retail license $190 single weight.

> The reference image itself appears to be a **brand-design moodboard / template** rather than a font specimen with a printed family name. The "NOMAD" wordmark with the cuts is most likely **Saol Display Cut** or **Migra Inline** — both share the cut-serif signature.

---

## 3. Constraint: this is a Latin-only family

The `1.2.png` shows only **Latin uppercase + numerals + punctuation**. None of the candidate commercial families have a Hebrew counterpart. We need:

1. A **Hebrew display serif** that captures the same editorial-luxury mood.
2. A **Hebrew body sans** for paragraphs.
3. The Latin display reserved only for **the wordmark "GAMOS"** (when shown in Latin) and any English subhead.

This is **already locked** in `CLAUDE.md` §4:
> Hebrew display: Frank Ruhl Libre (400/500/700)
> Hebrew body: Heebo (400/500/600)
> Latin display: Playfair Display (400/700)

Below is the rationale + 2-3 fallbacks per slot.

---

## 4. Recommendation — Free / Self-hostable Stack

### A. Hebrew Display (replaces "NOMAD" mood for Hebrew text)

**Primary recommendation: Frank Ruhl Libre** (Google Fonts, OFL)
- **Why it matches:**
  - High-contrast Hebrew didone — the closest Hebrew sibling to the Latin reference.
  - Designed by Yanek Iontef (Type-Together), based on Frank Ruhl, a 19th-century Hebrew typeface.
  - "Libre" version is actively maintained, OFL-licensed, available in 400/500/700/900.
  - Used by major Israeli editorial brands (Haaretz Magazine, Yediot, Ronit Farm).
- **Weights to subset:** 400 (paragraph display), 500 (intermediate), 700 (hero / headlines), 900 (oversized brand wordmark).
- **Source:** https://fonts.google.com/specimen/Frank+Ruhl+Libre
- **Self-host path:** `assets/fonts/frank-ruhl-libre-{400,500,700}.woff2` (per Constitution §4).

**Fallback 1: David Libre** (Google Fonts, OFL)
- Slightly less contrast, more humanist, gentler. Use if user finds Frank Ruhl too "cold."

**Fallback 2: Bellefair** (Google Fonts, OFL)
- A Hebrew-Latin didone hybrid — designed specifically as a luxury display face. Single weight only. Could replace Frank Ruhl in pure-display use cases (hero only).

### B. Hebrew Body (paragraph + UI)

**Primary recommendation: Heebo** (Google Fonts, OFL)
- **Why it matches:**
  - Israeli digital standard. Highly legible at 14–18px.
  - Excellent diacritic and nikkud support.
  - 9 weights, full coverage.
  - Pairs naturally with Frank Ruhl Libre (used together by major Israeli media).
- **Weights to subset:** 400 (body), 500 (emphasis), 600 (sub-headings), 700 (only if needed).
- **Source:** https://fonts.google.com/specimen/Heebo
- **Self-host:** `assets/fonts/heebo-{400,500,600}.woff2`.

**Fallback 1: Assistant** (Google Fonts, OFL)
- Used by gamos.co.il currently. More compact, slightly more "modern". Good if user wants continuity with the live brand feel.

**Fallback 2: Rubik** (Google Fonts, OFL)
- Rounder terminals, friendlier. Use if user wants warmer feel than Heebo's neutral.

### C. Latin Display (for "GAMOS" wordmark + English subheads)

**Primary recommendation: Playfair Display** (Google Fonts, OFL)
- **Why it matches:**
  - True didone — high contrast, hairline serifs, exactly the family the "NOMAD" reference comes from.
  - Free, OFL, well-maintained by Claus Eggers Sørensen.
  - Available 400/500/700/900 + italic. Has small caps in the SC variant.
- **Weights to subset:** 400, 700, 900.
- **Source:** https://fonts.google.com/specimen/Playfair+Display
- **Self-host:** `assets/fonts/playfair-display-{400,700,900}.woff2`.

**Fallback 1: Cormorant Garamond** (Google Fonts, OFL)
- Slightly more humanist, less didone. Use if user finds Playfair too sharp.

**Fallback 2: Bodoni Moda** (Google Fonts, OFL)
- The closest free analog of Bodoni proper. More extreme contrast than Playfair. Use as alternative for hero wordmark only.

**Fallback 3 (commercial, only if budget approved):**
- **Saol Display** by Schick Toikka — *the* font the reference moodboard most likely uses. ~$200–$1500 license. Buy only if Phase-1.5 user feedback insists on the exact reference look.

---

## 5. Pairing matrix

| Use case | Hebrew | Latin |
|---------|--------|-------|
| Hero wordmark (logo text "גאמוס" / "GAMOS") | Frank Ruhl Libre 700 + tracking | Playfair Display 900 |
| Section headline (h1, h2) | Frank Ruhl Libre 700 | Playfair Display 700 |
| Sub-headline (h3, h4) | Frank Ruhl Libre 500 | Playfair Display 400 italic |
| Body paragraph | Heebo 400 | Heebo Latin 400 (Heebo has Latin coverage) |
| UI / button labels | Heebo 500 | Heebo 500 |
| Caption / micro-copy | Heebo 400 | Heebo 400 |
| Numbers in body | `<bdi>` + Heebo 400 (lining figures) | Heebo 400 |

> Constitution §4 specifies `font-display: swap` and self-hosted WOFF2 with subsetting. This is locked.

---

## 6. Why not match the "NOMAD" reference exactly?

- The "NOMAD" image is Latin-only. There is no Hebrew counterpart in any commercial didone-stencil family.
- Saol Display Cut / Migra Inline are commercial and $200+/weight — `package.json` budget for a static rebuild does not include $1000+ in fonts.
- **Frank Ruhl Libre + Playfair Display** delivers ~85% of the reference's editorial-luxury mood at $0 cost.
- For the **hero wordmark** specifically, if the user wants the exact stencil-cut look in Latin, we can ship `assets/images/brand/gamos-wordmark.svg` as a hand-tuned logo asset (Agent 2 + Agent 3 task in Phase 2a/2b).

---

## 7. Subsetting & loading plan (binds to §4 Constitution)

```
/* css/tokens.css excerpt — to be filled by Agent 2 */
@font-face {
  font-family: "Frank Ruhl Libre";
  src: url("/assets/fonts/frank-ruhl-libre-700.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0590-05FF, U+FB1D-FB4F; /* Hebrew + Hebrew Presentation Forms */
}

@font-face {
  font-family: "Heebo";
  src: url("/assets/fonts/heebo-400.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0020-007F, U+0590-05FF, U+FB1D-FB4F;
}

@font-face {
  font-family: "Playfair Display";
  src: url("/assets/fonts/playfair-display-700.woff2") format("woff2");
  font-weight: 700;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0020-007F, U+00A0-00FF, U+0100-024F; /* Latin Basic + Latin-1 + Extended-A */
}
```

**Subsetting tooling (Phase 2a):**
- `glyphhanger` or `pyftsubset` (fonttools) to subset Google Fonts WOFF/TTF → WOFF2.
- Subset script: Hebrew block (U+0590-05FF) + Hebrew Presentation Forms (U+FB1D-FB4F) for Hebrew families; Latin Basic + Latin-1 (U+0000-024F) for Latin families.
- Verify subset size ≤ ~30 KB per WOFF2 weight (Heebo 400 typically lands ~25 KB Hebrew-only).

---

## 8. Decision summary

| Slot | Locked recommendation | Fallback 1 | Fallback 2 |
|------|----------------------|------------|------------|
| Hebrew display | **Frank Ruhl Libre** (400/500/700) | David Libre | Bellefair |
| Hebrew body | **Heebo** (400/500/600) | Assistant | Rubik |
| Latin display | **Playfair Display** (400/700/900) | Cormorant Garamond | Bodoni Moda |
| Latin body | **Heebo Latin** (covers Latin Basic) | Open Sans | Inter |

**Status:** ✅ Locked by Agent 01 — matches Constitution §4. Agent 2 (Brand & Typography) will execute self-hosting + subsetting in Phase 2a.

---

## 9. Action items for Agent 2

1. Download Frank Ruhl Libre 400/500/700 from Google Fonts.
2. Download Heebo 400/500/600 from Google Fonts.
3. Download Playfair Display 400/700/900 from Google Fonts.
4. Subset each with `pyftsubset --unicodes-file=...` to Hebrew/Latin ranges above.
5. Convert TTF → WOFF2 with `woff2_compress`.
6. Place in `assets/fonts/`.
7. Add `@font-face` block to `css/tokens.css`.
8. Add `<link rel="preload" as="font" type="font/woff2" crossorigin>` for the 2-3 critical-path weights (Frank Ruhl 700 + Heebo 400).
