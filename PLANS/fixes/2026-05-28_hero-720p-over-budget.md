# Defect F-02 — Hero MP4 720p exceeds 6 MB budget by 60%

**Severity:** P0 (mobile perf — direct violation of Constitution §8)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 03 (Asset Pipeline)
**Affects:** Mobile LCP, mobile bandwidth, mobile fallback path

---

## Observation

`assets/video/hero-master-720.mp4` is **~9.6 MB**, against a budget of
**≤ 6 MB** (`architecture/performance.md` row 2).

Overrun: **+60%** — far beyond budget tolerance. This is the variant served to
mobile devices via `<source media="(min-width: 768px)">` cascade — the most
performance-sensitive class.

## Why it matters

- Mobile is bandwidth-constrained (3G/4G/spotty 5G). 9.6 MB = ~16 s on 5 Mbit
  4G; on 1 Mbit 3G that's 76 s — user has scrolled away long before the
  video loads.
- iOS Safari fallback path in `js/hero-video-scrub.js` (`setupIOS`) uses
  `loop + autoplay + muted` — the entire video loops, so the larger size
  re-streams repeatedly on cellular. Real cost > 9.6 MB.

## Recommended fix

Re-encode 720p at **CRF 26** (vs current likely CRF 23) and consider also
trimming the video to the first 8–10 s loop (the iOS path doesn't need
the full scroll-bound footage).

```bash
# Option A — same content, higher CRF
ffmpeg -i hero-master-1080.mp4 \
  -vf scale=-2:720 \
  -c:v libx264 -crf 26 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an \
  hero-master-720-v2.mp4

# Option B — shorter loop variant for iOS only
ffmpeg -i hero-master-1080.mp4 \
  -t 8 -vf scale=-2:720 \
  -c:v libx264 -crf 24 -preset slow -pix_fmt yuv420p \
  -movflags +faststart -an \
  hero-master-720-loop.mp4
```

Option A targets ~5 MB. Option B targets ~3 MB and gives the iOS fallback
a tighter loop (better visual rhythm than a randomly-truncated middle).

## Validation

- [ ] File size ≤ 6 MB.
- [ ] Mobile Lighthouse run predicts LCP < 2.5 s.
- [ ] Visual QA: scrub still feels cinematic on iPhone 12 + Galaxy S22.

## Status

- 🔴 OPEN — 2026-05-28
