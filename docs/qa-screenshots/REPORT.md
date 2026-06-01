# QA Visual Audit — 2026-06-01

Captured via Playwright headless (1440×900 viewport) after the fix wave
that resolved 4 critical regressions discovered by automated DOM
inspection.

## Bugs found + fixed in this round

| # | Bug | Root cause | Fix |
|---|-----|-----------|-----|
| 1 | Hero showed only black void | `.hero__sticky` placed AFTER `.hero__spacer` in HTML — sticky never engaged | Reorder: sticky first, spacer after |
| 2 | Portal bubbles appeared on every section | `<aside id="portals">` was a top-level sibling with `position:fixed` z:1000 | Move inside `.hero__sticky` as Layer D, switch to `position:absolute` |
| 3 | Stage D showed double-bubbles (canvas + real portals) | Canvas opacity stayed at 1 in `data-stage="portals"` rule | Canvas fades to 0 at Stage D so only real portals are visible |
| 4 | Portal hover glow barely visible | Single `box-shadow` was too subtle | Stronger glow chain: drop-shadow ×2 + thick brass ring + 60px aura |
| 5 | Hall-venue, hall-resort, culinary appeared empty | Same regression as #1 — spacer before sticky in 3 scroll-scenes | Reorder all 3: sticky first, spacer after, post content last |
| 6 | Section titles overflowed viewport (rooms/lounge) | Sections lacked `padding-inline: var(--gutter)`; section-header__title font-size was 5vw → too wide for narrow rails | Add gutter padding + cap title at 4vw max + `overflow-wrap: break-word` |
| 7 | Side-dot-nav appeared on visual LEFT | `inset-inline-end` resolves to physical LEFT in RTL | Switch to physical `right: 24px` for explicit right-edge anchoring |

## Visual evidence

The screenshots in this folder show the site **after** the fixes:

- `01-initial.png` — Hero Stage A (desert vista loaded, no overlays)
- `02-hero-015pct.png` — Stage B mid-reveal (GAMOS letters appearing)
- `02-hero-050pct.png` — Stage C (canvas scrub, video bubbles visible)
- `02-hero-090pct.png` — Stage D (clean portals: ריזורט + אולם)
- `03-hall-resort.png` — Hall-resort scaffold (poster + Ken-Burns)
- `03-culinary.png` — Culinary scroll-scene (canvas frame)
- `03-rooms.png` — Rooms section (heading inside viewport now)
- `03-about.png` — About + counter animations + side-dot-nav RIGHT
- `03-contact.png` — Contact form

## What still needs eyes

These need human visual confirmation in a real browser:

1. **Frame buffer smoothness** — does the hero canvas scrub at 60fps on M1?
2. **Texture inside GAMOS letters** — the sandstone fill is correct in
   the SVG mask, but visual contrast against desert backdrop should be
   verified (scrim sits behind it, but lighting may need tuning).
3. **Portal hover** — strong brass glow now applied via `:hover`; verify
   the indication is "selected" enough.
4. **Side-dot-nav scroll tracking** — the active dot should follow as
   you scroll through sections.
5. **Loading overlay between portal click → hall section** — only
   triggered by real click; Playwright auto-test doesn't exercise it.
6. **Mobile (`<768px`)** — side-dot-nav hides, layout collapses to
   single column. Not tested in this audit.

## Commits in this fix wave

```
2cc3b57  fix: lounge section missing padding-inline gutter
655c81f  fix: add padding-inline gutter to rooms + lounge sections
0076c74  fix: rooms title overflow — cap font-size at 4vw + overflow-wrap
ab15209  fix: section title overflow + side-dot-nav physical right anchor
a71dcc4  fix: scroll-scene HTML order — sticky must come before spacer
9b12611  fix: critical hero structure + portal positioning regressions
```
