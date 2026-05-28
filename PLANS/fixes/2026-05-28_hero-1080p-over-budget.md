# Defect F-01 — Hero MP4 1080p exceeds 12 MB budget

**Severity:** P1 (perf risk; doesn't break page)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 03 (Asset Pipeline)
**Affects:** LCP, TTFB-to-LCP contention

---

## Observation

`assets/video/hero-master-1080.mp4` is **~13 MB**, against a budget of **≤ 12 MB**
(`architecture/performance.md` row 1, Constitution §8).

Overrun: ~8% / ~1 MB. Not catastrophic — but it cascades:

1. The hero video is `preload="auto"` (`index.html` line 156) → entire 13 MB
   begins streaming on page load.
2. On 4G (~5 Mbit/s real throughput), 13 MB = ~21 s of bandwidth.
3. The hero **poster** (LCP candidate, 72 KB) streams in parallel — but the
   browser favors `fetchpriority="high"` only for the preload directive, while
   the `<video preload="auto">` competes once the HTML body parses.
4. Net effect: poster paints 200–600 ms later than ideal on cold load,
   pushing LCP toward 2.6–3.0 s on Moto G4 4G — over budget.

## Recommended fix

### Path A — re-encode at higher CRF (preferred; preserves visual quality at smaller size)

Re-run Agent 3's pipeline (`.tmp/run-asset-pipeline.ps1`) with:

```bash
ffmpeg -i hero-master-1080.mp4 \
  -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an \
  hero-master-1080-v2.mp4
```

CRF 24 instead of 22 → ~25–35% smaller, ~10 MB target. Quality loss imperceptible
in scroll-driven scrub mode (frames flash by).

### Path B — accept 13 MB tradeoff IF Path C is also taken

Change `index.html` line 156:

```html
<!-- before -->
<video class="hero__video" muted playsinline preload="auto" ...>

<!-- after -->
<video class="hero__video" muted playsinline preload="metadata" ...>
```

`preload="metadata"` tells the browser to fetch only the moov atom (~256 KB
with `+faststart` flag set). The full video streams progressively as the user
scrolls. LCP recovers fully — poster paints unimpeded.

**Tradeoff:** First scroll-frame may stutter for 100–300 ms while the first
seek range buffers. Acceptable for the cinema-grade vibe.

### Path C (recommended combined) — both A and B

Re-encode to ≤ 10 MB **and** drop `preload` to `metadata`. Yields the smoothest
LCP path with minimal perceived stutter.

## Validation

- [ ] After re-encode, file size ≤ 12 MB (Path A target ≤ 10 MB).
- [ ] If Path B/C used, verify hero scroll-scrub is still smooth at first
      interaction (Agent 06 manual recheck).
- [ ] Re-run Lighthouse predicted LCP — target < 2.5 s mobile.

## Status

- 🔴 OPEN — 2026-05-28
