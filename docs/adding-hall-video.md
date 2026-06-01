# Adding a video to a hall scene

This is the upgrade path for `#hall-resort`, `#hall-venue`, and any future
section that ships as a **scaffold** (`data-scrub-mode="poster-ken-burns"`)
and later receives a real video.

The current scaffolds in `index.html` use a poster image driven by a
CSS-only Ken-Burns. Replacing it with a video is a **two-line edit per
section**: swap the `<picture>` for a `<video>`, then remove one attribute.

---

## Step 1 — Encode the video

Encode at 1080p (desktop) and 720p (mobile fallback), plus a JPG poster.
Per Constitution §8 the budgets are: **1080p ≤ 12 MB, 720p ≤ 6 MB,
poster JPG ≤ 80 KB.**

```bash
# 1080p — desktop
ffmpeg -y -i source.mp4 \
  -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -preset slow -crf 23 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -an -movflags +faststart \
  assets/video/<scene>-1080.mp4

# 720p — mobile fallback
ffmpeg -y -i source.mp4 \
  -c:v libx264 -profile:v main -pix_fmt yuv420p \
  -preset slow -crf 24 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -an -movflags +faststart \
  assets/video/<scene>-720.mp4

# Poster — first decent-looking frame, scaled to 1920x1080, q=4 (visually q≈82)
ffmpeg -y -i source.mp4 -ss 00:00:01.5 -frames:v 1 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" \
  -q:v 4 \
  assets/img/<scene>-poster.jpg
```

Replace `<scene>` with `resort`, `venue`, `culinary`, etc. See
`docs/asset-encoding.md` for poster-only encoding via `pillow` if `ffmpeg`
isn't on PATH.

---

## Step 2 — Edit `index.html`

In `index.html`, find the section by id (`id="hall-<scene>"`) and locate
the `<picture class="scroll-scene__poster">` block. Replace it with a
`<video class="scroll-scene__video">` and remove the
`data-scrub-mode="poster-ken-burns"` attribute from the `<section>`:

**Before** (scaffold):

```html
<section id="hall-resort" class="scroll-scene hall-resort"
         data-scrub="resort"
         data-scrub-mode="poster-ken-burns"      <!-- ❶ remove this line -->
         data-scrub-spacer-vh="300"
         style="--scene-spacer: 300vh;"
         aria-labelledby="hall-resort-title">
  <div class="scroll-scene__spacer" aria-hidden="true"></div>

  <div class="scroll-scene__sticky">
    <picture class="scroll-scene__poster" aria-hidden="true">      <!-- ❷ replace this <picture>... -->
      <source srcset="/assets/img/resort-poster.webp" type="image/webp">
      <img src="/assets/img/resort-poster.jpg" alt=""
           width="1920" height="1080" loading="lazy" decoding="async">
    </picture>                                                       <!-- ❷ ...with the <video> below -->
    ...
  </div>
</section>
```

**After** (real video):

```html
<section id="hall-resort" class="scroll-scene hall-resort"
         data-scrub="resort"
         data-scrub-spacer-vh="300"
         style="--scene-spacer: 300vh;"
         aria-labelledby="hall-resort-title">
  <div class="scroll-scene__spacer" aria-hidden="true"></div>

  <div class="scroll-scene__sticky">
    <video class="scroll-scene__video"
           muted playsinline preload="metadata"
           poster="/assets/img/resort-poster.jpg"
           aria-hidden="true">
      <source src="/assets/video/resort-1080.mp4" type="video/mp4"
              media="(min-width: 768px)">
      <source src="/assets/video/resort-720.mp4" type="video/mp4">
    </video>
    ...
  </div>
</section>
```

That's it. The `scroll-scene` module auto-detects `<video>` vs `<picture>`
on init and switches mode accordingly:

- `data-scrub-mode="poster-ken-burns"` → CSS-driven `--scene-progress`.
- _no_ `data-scrub-mode` _and_ `<video.scroll-scene__video>` present →
  `video.currentTime = p * duration` (RAF-throttled).

You do **not** need to touch `js/scroll-scene.js`,
`js/scroll-orchestrator.js`, or `css/sections/scroll-scene.css`.

---

## Step 3 — Verify

1. `npx serve` (or any static server) and load the page.
2. Scroll through the section. The video should `currentTime`-scrub
   smoothly with the sticky stage. You should see no flicker between the
   poster (used while metadata loads) and the first video frame.
3. Throttle to "Slow 4G" in DevTools → Network. The video request should
   only start when the section is within ~1 viewport of the active area.
4. iOS Safari (real device or UA spoof): the orchestrator switches to
   autoplay-loop mode automatically. Spacer collapses to 100vh.
5. `prefers-reduced-motion: reduce`: video is hidden via CSS, only the
   poster (preserved as `<video poster=...>`) is shown.

---

## Notes

- The poster encoded for the scaffold (`<scene>-poster.{webp,jpg}`) is
  re-used as the `<video poster="...">` so users see the same image
  regardless of mode. Keep both files on disk.
- If a section needs a custom scrub effect (image-stack crossfade,
  parallax, etc.) instead of standard video scrub, set
  `data-scrub-handler="<windowFnName>"` on the `<section>` and define
  `window.<windowFnName> = (p, sectionEl) => { ... }`. The
  `scroll-scene` module routes `onProgress(p)` to that function instead.
