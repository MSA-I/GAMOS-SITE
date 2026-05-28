# Defect F-04 — `--brass` token in CSS does not match Constitution §5 lock

**Severity:** P0 (Constitution violation; brand color is wrong on entire site)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 02 (Brand & Typography)
**Affects:** Every accent color across the site

---

## Observation

`css/tokens.css` line 110 declares:
```css
--brass:          #B89766;   /* accent ראשי - יוקרה */
```

But Constitution §5 (LOCKED 2026-05-28 by Agent 01) says:
```
--brass:       #CFAE83   /* PRIMARY — מ-live (#CFAE83) ללא שינוי */
```

The token declares **`#B89766`** (deeper, more saturated brown);
the live brand color from gamos.co.il is **`#CFAE83`** (lighter,
warmer brass-cream). They are perceptibly different.

Similarly, several other tokens may diverge from §5:

| Token | tokens.css | Constitution §5 |
|-------|------------|-----------------|
| `--brass`      | `#B89766` | `#CFAE83` |
| `--ink-deep`   | `#0E0E0C` | `#1A1410` |
| `--ivory`      | `#F5EFE6` | `#F5EFE6` ✅ |
| `--brass-deep` | `#8B6F46` | `#8B6F46` ✅ |
| `--brass-glow` | `#D4B98A` | (not locked) |
| `--accent-rose`| (missing!) | `#B8576F` |
| `--cocoa`      | (missing!) | `#534133` |
| `--mist`       | (missing!) | `#E8DFD3` |

**Three tokens are missing entirely** (`--accent-rose`, `--cocoa`, `--mist`),
even though they're locked in Constitution §5.

## Root cause

`tokens.css` was published by Agent 02 in Phase 2a (early in the day) using
the *provisional* palette from `architecture/tokens.md`. Agent 01 locked the
real palette later that day in Phase 1, updating `CLAUDE.md §5` but **did not
sync the values into `tokens.css`**. Agent 02 noted the dependency in their
findings ("Brand palette block in `tokens.css §2.1` remains Provisional until
Agent 1 finishes the gamos.co.il scrape — semantic tokens reference brand,
so a single-block edit will propagate"), but the propagation never happened.

## Impact

Every accent on the site (CTAs, focus rings, eyebrows, headings, hover
states) is rendered ~4° hue off and several percentage points more
saturated than the brand. Visually noticeable next to logo. Constitution
§10.2 violation: "All hex values live in `css/tokens.css` — hard-coded values
elsewhere = bug." The values themselves are wrong — same severity.

## Recommended fix

Edit `css/tokens.css` block §2.1 to:

```css
/* ===== 2.1 Brand palette (LOCKED 2026-05-28 by Agent 01, sourced from gamos.co.il) ===== */
--brass:          #CFAE83;   /* PRIMARY — live primary */
--brass-deep:     #8B6F46;   /* hover/active */
--brass-glow:     #D4B98A;   /* glow / highlight (derived) */
--cocoa:          #534133;   /* SECONDARY — live secondary */
--ivory:          #F5EFE6;   /* surface (replaces #FFF) */
--ivory-warm:     #ECE3D3;   /* warm tint */
--mist:           #E8DFD3;   /* surface tint */
--ink-deep:       #1A1410;   /* body text (replaces #000) */
--ink-medium:     #2A2A28;   /* borders, dividers */
--accent-rose:    #B8576F;   /* CTA accent (replaces live #CC3366) */
--sage:           #7A8466;   /* tertiary accent */
--gold:           #C9A961;   /* alt accent */
```

Update §2.2 semantic tokens to wire `--cocoa` and `--accent-rose` where
relevant (e.g., heading on cream backgrounds → `--cocoa`, CTA hover → `--accent-rose`).

## Validation

- [ ] Re-run Constitution palette diff: every value in §5 matches `tokens.css §2.1`.
- [ ] Visual diff against logo: brass on `<button>` matches the brand mark.
- [ ] No new hex values in section CSS files (only `var(--*)`).

## Status

- 🔴 OPEN — 2026-05-28
