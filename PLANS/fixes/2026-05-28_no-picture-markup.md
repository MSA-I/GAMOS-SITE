# Defect F-10 — No `<picture>` markup in `index.html` (248 image files unused)

**Severity:** P0 (CLS risk + visual content missing)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owners:** Agent 04 (HTML) + Agent 08 (markup spec ready in `.tmp/hall-html-stubs.md`)
**Affects:** `#hall-venue`, `#hall-resort`, `#lounge`, `#rooms`, `#culinary`, `#gallery`

---

## Observation

`grep '<picture>' index.html` → 0 matches.

The HTML uses `<div data-placeholder="...">` empty divs in every image slot:
```html
<div class="hall__media-placeholder" data-placeholder="hall-venue-hero"></div>
<li class="culinary__item" data-placeholder="dish-1"></li>
<li class="gallery__item" data-placeholder="gallery-1"></li>
```

Yet Agent 03 successfully shipped 248 optimized images at:
- `assets/images/halls/venue/01..14.full.webp` + `.half.webp` + `.full.jpg` + `.half.jpg`
- `assets/images/halls/resort/01..17.{full,half}.{webp,jpg}` (per inventory)
- `assets/images/halls/lounge/...`
- `assets/images/halls/rooms/...`
- `assets/images/culinary/...`

These files exist on disk but **are never loaded by the page**.

Agent 08 already wrote the canonical `<picture>` markup in
`.tmp/hall-html-stubs.md` — Agent 04 needs to merge it.

## Impact

- **No images render** anywhere on the page (other than placeholder bg colors).
  The "luxury" promise of Constitution §1 cannot be visually delivered.
- **CLS risk** lurking: when Agent 04 finally adds `<img>` tags, if any forget
  `width`/`height`/`aspect-ratio`, layout shift cascades. Use the `<picture>`
  template strictly.
- **Lighthouse "Properly size images"** audit cannot fire — no images present.

## Recommended fix

Merge `.tmp/hall-html-stubs.md` into `index.html`. The canonical pattern per
`architecture/performance.md`:

```html
<picture>
  <source type="image/webp"
          srcset="/assets/images/halls/venue/01.full.webp 1920w,
                  /assets/images/halls/venue/01.half.webp 960w"
          sizes="(min-width: 768px) 100vw, 100vw">
  <source type="image/jpeg"
          srcset="/assets/images/halls/venue/01.full.jpg 1920w,
                  /assets/images/halls/venue/01.half.jpg 960w">
  <img src="/assets/images/halls/venue/01.half.jpg"
       alt="האולם הראשי בתאורה דרמטית"
       loading="lazy" decoding="async"
       width="1920" height="1080">
</picture>
```

Apply this template to:
- `#hall-venue` hero + 4–6 gallery items.
- `#hall-resort` hero + 4–6 gallery items.
- `#lounge` hero + scroll-rail children.
- `#rooms` 3 cards (suite / deluxe / classic) + masonry tail.
- `#culinary` 6 dish cells.
- `#gallery` 8 cells.

Each `alt` must be **Hebrew, descriptive**, not "image of ...". Agent 01 owns
the alt-text inventory; if not yet supplied, Agent 04 can stub with reasonable
descriptions and flag `TODO(agent-01)`.

## Validation

- [ ] `grep -c '<picture>' index.html` ≥ 25.
- [ ] Every `<img>` has explicit `width` + `height`.
- [ ] No image with empty `alt=""` unless purely decorative.
- [ ] Lighthouse: "Image elements have explicit width and height" passes.

## Status

- 🔴 OPEN — 2026-05-28
