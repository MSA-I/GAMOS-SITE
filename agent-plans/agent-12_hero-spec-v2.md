# Agent 12 — Hero V2 Specification

**Agent ID:** agent-12
**Role:** Hero V2 Specification Writer (SPARC §Specification phase)
**Subagent type:** spec-pseudocode
**Created:** 2026-06-01
**Status:** DRAFT — awaits user answers in §9 before Agent 16 starts implementation

> **Purpose.** Replace Constitution §3 (Hybrid Concept, locked 2026-05-28) with a
> revised four-stage Hero. Same scroll-driven cinema, but *new* opening: static
> desert vista + scroll-driven title-reveal (texture-filled "GAMOS" + Hebrew
> "אירועים") *before* the master video begins to scrub. Portals reveal at the
> end as before, but with a richer hover indicator and a loading overlay
> (Agent 14) bridging the click to the destination hall.
>
> **Non-goal.** This document does not redesign the *post-hero* scroll-video
> system (the resort/venue/culinary scrubbers spec'd in
> `architecture/scroll-video-system.md`). Those remain blocked behind their
> own open questions.

---

## §1 — Stage diagram (scroll percentages, 700vh spacer retained)

The Hero is `position: sticky; top: 0; height: 100vh` over a `700vh` spacer
(unchanged from the current Constitution §3 — see §1.1 for the rationale we
keep this number rather than expanding it).

```
spacer = 700vh           viewport-height units across the spacer
─────────────────────────────────────────────────────────────────
0vh ───────────────────────────────────────────────────────── 700vh
│ A: static-bg │ B: title-reveal │ C: scrub          │ D: portals │
│ 0% .. 8%     │ 8% .. 22%       │ 22% .. 88%        │ 88% .. 100%│
│ ≈ 56vh       │ ≈ 98vh          │ ≈ 462vh           │ ≈ 84vh     │
│ ≈ 0.8s read  │ ≈ 1.4s reveal   │ ≈ 6.6s scrub      │ ≈ 1.2s     │
─────────────────────────────────────────────────────────────────
```

> Reading-time numbers assume ~700px/s wheel-scroll on a 1080p desktop
> (≈ 1vh = 10ms of scroll). They are *time budgets*, not animation timings.

### §1.1 Why 700vh (not 500vh, not 900vh)

- **700vh is already on disk.** Current `hero.css` uses `100vh` mobile + `700vh`
  desktop. Changing it is a CSS one-liner, but every percentage in the engine
  changes too — keep the spacer and only re-apportion the four stage windows.
- **Stage C (scrub) gets 462vh ≈ 6.6s of read time.** The hero master MP4 is
  ~6–8s. A 1:1 ratio (1s of scroll = 1s of video) is the cinema-correct feel
  the user wants. Going shorter (500vh) compresses the video and the cuts feel
  rushed; longer (900vh) makes the user feel "trapped".
- **Stage A (8%) ≈ 56vh ≈ 0.8s.** Just enough beat for the eye to register
  the desert before motion starts. Below 5% (≈ 0.5s) it feels like a flash.
- **Stage B (14% window) ≈ 98vh ≈ 1.4s.** Long enough for 5 letters of GAMOS
  to reveal at ~140ms cadence + 200ms breath + the Hebrew subtitle to land.
- **Stage D (12% window) ≈ 84vh ≈ 1.2s.** Two bubbles fade-in + scale-in;
  the user's scroll has natural decay so this comfortably reaches the
  `progress > 0.92` threshold that `portals.js` already listens for.

### §1.2 Stage state machine

`hero-video-scrub.js` writes `data-stage="static-bg|title-reveal|scrub|portals"`
on `.hero__sticky`. CSS uses attribute selectors to drive opacity transitions
between layers (same pattern as today, just with one more stage).

```
data-stage    progress range   active layer (opacity 1)        idle (opacity 0)
─────────────────────────────────────────────────────────────────────────────
static-bg     [0.00, 0.08)     hero__intro-bg                   video, outro, intro-overlay
title-reveal  [0.08, 0.22)     hero__intro-bg + hero__intro     video, outro
scrub         [0.22, 0.88)     hero__video                      bg, intro, outro
portals       [0.88, 1.00]     hero__outro-loop + .portals      bg, video, intro
```

Crossfade durations between stages: **400ms `var(--ease-out-cinema)`** for
A→B (gentle), **600ms** for B→C (longer to mask the bg→video swap), **600ms**
for C→D (long to ease the deceleration into the portals reveal).

---

## §2 — Asset map

| Stage | Asset role            | Source on disk                                                                           | Pipeline target                                     | Budget |
|-------|-----------------------|------------------------------------------------------------------------------------------|-----------------------------------------------------|--------|
| A     | Static background     | `תמונות לאנימציית האתר/סרטונים סופיים/frame-1.png` (13.7 MB PNG)                          | `assets/images/brand/hero-static.webp` (NEW encode) | ≤ 80 KB |
| A     | Mobile static bg      | same source                                                                              | `assets/images/brand/hero-static-mobile.webp`        | ≤ 50 KB |
| A     | Fallback              | same source                                                                              | `assets/images/brand/hero-static.jpg`                | ≤ 100 KB |
| B     | Title texture         | `תמונות לאנימציית האתר/פונט/1.2.png` (NOMAD specimen, 2 MB) — sand/erosion fill reference | (option-dep — see §3): texture image OR SVG mask     | ≤ 30 KB |
| B     | Display font (Latin)  | font choice TBD (see §3) — current default is Playfair Display                            | `assets/fonts/<face>.woff2`                          | ≤ 30 KB |
| B     | Display font (Hebrew) | Frank Ruhl Libre (already on disk)                                                       | `assets/fonts/frank-ruhl-libre-700.woff2` (existing)  | n/a    |
| C     | Scrub video 1080p     | `סרטונים סופיים/0528.mp4` (already encoded)                                              | `assets/video/hero-master-1080.mp4` (5.9 MB ✅)      | ≤ 12 MB |
| C     | Scrub video 720p      | same                                                                                     | `assets/video/hero-master-720.mp4` (1.5 MB ✅)        | ≤ 6 MB  |
| C     | Poster (LCP)          | first frame                                                                              | `assets/video/hero-poster.jpg` (236 KB)               | ≤ 80 KB ⚠️ over budget; re-encode |
| D     | Portal-loop video     | existing                                                                                 | `assets/video/portal-loop.mp4` (276 KB ✅)            | ≤ 500 KB |

### §2.1 Encoding contract for `hero-static.webp`

```sh
# desktop (LCP candidate, must preload)
cwebp -q 78 -m 6 -mt -af -sharp_yuv \
      -resize 1920 0 \
      "frame-1.png" -o "assets/images/brand/hero-static.webp"

# mobile
cwebp -q 75 -m 6 -mt -af -sharp_yuv \
      -resize 768 0 \
      "frame-1.png" -o "assets/images/brand/hero-static-mobile.webp"

# JPEG fallback for very old browsers
mozjpeg -quality 78 -progressive -optimize \
        -outfile "assets/images/brand/hero-static.jpg" \
        "frame-1.png"
```

> Note: `assets/images/brand/hero-static.webp` is **already on disk** from a
> previous agent's earlier encode. Agent 16 must re-encode from the new
> `frame-1.png` source (which is now what the user wants — the warm desert
> with hill silhouettes — *not* whatever the previous file holds). Verify by
> visual diff before commit.

### §2.2 Re-encode `hero-poster.jpg` (over-budget)

Current poster is 236 KB; budget is ≤ 80 KB. Re-encode from MP4 first frame:

```sh
ffmpeg -i hero-master-1080.mp4 -vframes 1 -q:v 4 \
       -vf "scale=1280:-1" hero-poster.jpg
mozjpeg -quality 70 -progressive -optimize \
        -outfile hero-poster.jpg hero-poster.jpg
```

---

## §3 — Title reveal animation (Stage B)

The user's reference (`פונט/1.2.png`, NOMAD specimen) shows a **high-contrast
display serif with sand/erosion textures filling the strokes**. We need to
ship that aesthetic for "GAMOS" without a 22 MB texture-poster image.

> **Dependency on Agent 11.** Agent 11 (typography research) was supposed to
> recommend the implementation approach. As of 2026-06-01 no
> `agent-plans/agent-11_*.md` exists. This spec therefore proposes **two
> concrete alternatives** — Agent 16 (or the user) picks one before
> implementation. Both alternatives must hit the §7 budgets.

### §3.1 Alternative A — SVG `<mask>` + texture image (preferred for fidelity)

- Each letter of "GAMOS" is an `<svg>` with a single `<text>` glyph filled by
  a `<pattern>` whose `<image>` is a PNG/WebP **sand texture** (~30 KB,
  derived from a region of `1.2.png` — *not* the full specimen sheet).
- Texture file: `assets/images/brand/title-texture.webp` (NEW), 1024×512,
  CC-BY-equivalent if user owns the original; otherwise generate equivalent
  texture in-house from a freely-licensed dune photograph.
- Reveal: each `<g>` letter starts with `clip-path: inset(0 100% 0 0)` (RTL
  reveal — fill animates **right-to-left** for Latin in RTL viewport, OR
  left-to-right for Latin to feel like "writing"; pick one in §9 Q1).
  Animation transitions to `inset(0 0 0 0)` over 600ms `--ease-out-cinema`,
  staggered 140ms per letter.
- "אירועים" subtitle: same `<svg>` + `<pattern>` technique, but with Frank
  Ruhl Libre 700, half size, fades-up (`translateY(24px) → 0`, opacity
  `0 → 1`) starting **140ms after the 'S' of GAMOS lands** (so the eye
  briefly notices the completed Latin word before Hebrew arrives).

**Pros:** vector-crisp at any DPR; texture is reusable across other display
elements; single 30 KB asset.
**Cons:** `<svg>` text in RTL is finicky — must set `direction="ltr"` on the
GAMOS svg explicitly so CSS `direction: rtl` on `<html>` doesn't reverse the
Latin glyph order.

### §3.2 Alternative B — CSS `background-clip: text` + texture image

- Each letter is a `<span>` with `font-family: <display>; color: transparent;
  background-image: url(title-texture.webp); background-clip: text;
  -webkit-background-clip: text;`.
- Reveal: animate `background-position` from `100% 0` to `0% 0` per letter
  (the texture appears to "blow in" from one edge), staggered 140ms.
- Subtitle: same as §3.1.

**Pros:** zero SVG; tiny CSS; same texture reused as a background variable
(`--brand-texture-url`). No RTL-direction trap.
**Cons:** `background-clip: text` is well-supported (Chrome/Edge/Safari/Firefox
all green), but **color-fallback is mandatory** — if `background-clip` fails
the text becomes invisible. Provide `color: var(--brass);` baseline.

### §3.3 Per-letter timing (both alternatives)

```
Letter   Delay (from Stage B start)   Duration
───────  ──────────────────────────   ────────
G        0 ms                         600 ms
A        140 ms                       600 ms
M        280 ms                       600 ms
O        420 ms                       600 ms
S        560 ms                       600 ms
─── (S lands at ~1160 ms) ───
אירועים  1300 ms                      700 ms (fade-up + opacity)
```

Total time-on-screen for the Stage B animation: ~2.0 s.

### §3.4 Fallback (no JS / reduced-motion)

- All letters static, fully revealed, no texture animation.
- Subtitle visible, no fade.
- Stage A still holds the desert image; Stage B is just a static composite.

---

## §4 — Scrub stage (Stage C)

### §4.1 `<video>` element

```html
<video class="hero__video"
       muted playsinline
       preload="metadata"
       poster="/assets/video/hero-poster.jpg"
       aria-hidden="true">
  <source src="/assets/video/hero-master-1080.mp4" type="video/mp4"
          media="(min-width: 768px)">
  <source src="/assets/video/hero-master-720.mp4" type="video/mp4">
</video>
```

> **Change vs current code:** `preload="metadata"` (not `"auto"`). Reason:
> the user does *not* see the video during Stage A and Stage B — that's the
> first 22% of scroll, ≈ 154vh, ≈ 2.2 s. Loading metadata-only at first
> paint frees ~6 MB of bandwidth from the LCP path; the engine fires
> `video.load()` explicitly the moment Stage A ends (`progress >= 0.06`,
> i.e. 25% of the way into the static-bg window — gives ≈ 1 s headroom
> before scrub begins, plenty for any 4G connection to fetch the file).

### §4.2 `currentTime ↔ progress` mapping

```
Within Stage C (progress 0.22 .. 0.88):
  scrubP = (progress - 0.22) / (0.88 - 0.22)        // 0..1 across stage
  video.currentTime = scrubP * video.duration       // linear
```

**Linear, not eased.** Cinema-correct. The video itself was edited with its
own pacing; double-easing produces a queasy float.

### §4.3 RAF throttle

Keep the existing convention: only assign `currentTime` when
`Math.abs(video.currentTime - target) > 0.04` seconds. At 60 fps that
clamps to ~24 fps of seek calls in worst case — well within Safari's
budget for non-keyframed seeks on a `+faststart` CFR MP4.

### §4.4 iOS fallback (no scrub)

- `isIOS` check (existing in `hero-video-scrub.js`).
- `_hero.querySelector('.hero__spacer').style.height = '100vh';` (collapse the
  scroll length).
- Stages collapse to a *time-based* loop:
  - 0 ms → `data-stage="static-bg"`
  - 800 ms → `data-stage="title-reveal"` (CSS keyframes still play)
  - 3200 ms → `data-stage="scrub"` + `video.loop = true; video.play()` (autoplay loop, muted)
  - 9000 ms → `data-stage="portals"` + portals fade-in
- This matches the current `setupIOS()` behavior with a +800 ms delay because
  Stage A is now its own beat, not co-located with the title.

### §4.5 `prefers-reduced-motion: reduce`

- Spacer collapses to `100vh`.
- `data-stage` jumps directly to `"portals"` after first paint
  (no scrub, no animation). User sees: desert bg + title (static) + portals.
- Same 100ms staggered fade-up reveals from `motion-reveals.css` with
  `0.01ms` durations from `tokens.css` — visible, not animated.

---

## §5 — Portals reveal + interaction (Stage D)

### §5.1 Layout (unchanged from existing portal CSS)

- Container `.portals` is `position: absolute; inset: 0; display: grid;
  grid-template-columns: 1fr 1fr; place-items: center;` over the sticky.
- Two `<button class="portal portal--{resort,venue}">` children.
- Source order: `portal--resort` first, `portal--venue` second. In RTL
  layout this places **resort on the right, venue on the left**, per
  user mandate (`CLAUDE.md §12, 2026-05-28 entry`).
- Bubble shape: `clip-path: circle(48% at 50% 50%)` with
  `aspect-ratio: 1 / 1; width: clamp(220px, 28vw, 360px);`.
- Inside each bubble: `<video class="portal__video" autoplay loop muted
  playsinline src="portal-loop.mp4">` + `<span class="portal__ring">` +
  `<span class="portal__label">`.

### §5.2 Three states (NEW — adds hover layer)

```
State      Trigger                   Visual
─────────  ─────────────────────     ───────────────────────────────────────
idle       default                    ring 2px brass; no shadow; scale(1)
hover      :hover, :focus-visible     ring 6px brass; drop-shadow(0 0 60px brass-glow @ 0.55); scale(1.04); video.playbackRate = 1.2
clicked    [data-clicked]             ring 6px brass-glow; drop-shadow(0 0 60px brass @ 0.85); scale(1.08); animation-play-state: paused on .portal__video for 80ms (snapshot freeze)
```

### §5.3 Reveal-in animation (Stage D entry)

- Container `.portals` starts at `opacity: 0; transform: scale(0.94);`.
- When `hero-video-scrub` writes `data-stage="portals"` on the sticky,
  CSS transitions `.portals { opacity: 1; transform: scale(1); }` over
  900ms `--ease-out-cinema`.
- Bubbles internally stagger: `.portal--resort` delay 100ms,
  `.portal--venue` delay 220ms (right-to-left attention path in RTL).
- **`portals.js` reveal hook stays.** It already listens to
  `gamosHero.onProgress` and toggles `.portals.is-active` at progress
  ≥ 0.92 (`REVEAL_THRESHOLD`). Tighten this to **0.88** to align with the
  Stage D boundary; otherwise the bubbles arrive 4% later than the stage
  switch.

### §5.4 Click flow (CHANGE: insert loading overlay)

```
1. user clicks .portal
2. button.setAttribute('data-clicked', '')           ← visual confirmation (state #3)
3. portals.js GSAP timeline: scale → 6, sibling fade out, EXPAND_DURATION = 1.0s
4. AT timeline `onStart + 300ms`:                    ← NEW — fires *during* expand, not after
       window.gamosLoading.show({ target: '#hall-resort' })
   ─ Agent 14 supplies window.gamosLoading.show(opts):
     ─ inserts <div class="loading-overlay"> over body
     ─ shows logo-gold + "טוען..." + spinner
     ─ minimum visible time: 600ms
5. AT GSAP timeline complete:
       scrollToTarget(target)                        ← existing behavior
6. After scroll lands (scrollend event OR 800ms timeout):
       window.gamosLoading.hide()
   loading-overlay fades out 400ms
   button.removeAttribute('data-clicked')
   button.classList.remove('is-expanding')
   .portals.is-leaving classList removed
```

> Why fire the overlay during expand (step 4), not after (step 5)? Because the
> expand animation's last 300 ms is already a brass blur (per
> `power3.in` easing) — the user's eye accepts the overlay as the natural
> "next frame" of the expand, instead of seeing a hard cut to a new layer.

### §5.5 Loading overlay surface area (Agent 14's domain)

Agent 14 is responsible for `js/loading-overlay.js` and `css/sections/
loading-overlay.css`. This spec only defines the **contract**:

```js
window.gamosLoading = {
  show({ target, label = 'טוען...', minDuration = 600 }): Promise<void>,
  hide(): Promise<void>,
  isVisible(): boolean,
};
```

If `window.gamosLoading` is not present at click time, `portals.js` falls
through to the current behavior (direct scrollIntoView, no overlay) — **no
hard dependency**, this is progressive enhancement.

---

## §6 — Accessibility

- **Skip-link first focusable** (`<a class="skip-link" href="#main-content">`)
  — already in `index.html:106`. Verify focus-visible style (3 px brass ring)
  on `:focus-visible`.
- **Each portal is `<button type="button">`** with bilingual aria-label:
  - Resort: `aria-label="עבור לריזורט וחדרי האירוח"` (existing; keep).
  - Venue: `aria-label="עבור לאולם האירועים"` (existing; keep).
- **Hover/focus parity.** The hover state in §5.2 must be triggered by
  `:focus-visible` *as well as* `:hover`, so keyboard users see the same
  brass-glow ring before pressing Enter.
- **Keyboard.** Tab order: skip-link → site-nav links → site-nav CTA →
  hero (skipped — `aria-hidden` on decorative layers, intro overlay is
  `aria-hidden="false"` but contains no interactive content) → portal
  resort → portal venue → next section. Enter activates portal click.
- **`prefers-reduced-motion: reduce`** behavior:
  - Spacer collapses to 100vh.
  - All four stages render simultaneously composited as a single still:
    desert bg + texture-filled GAMOS title (static) + visible portals.
  - Click skips GSAP timeline → instant `scrollIntoView({ behavior: 'auto' })`.
  - Loading overlay hides itself immediately (no minDuration).
- **Screen-reader narration.** `<h1 id="hero-title">` carries
  `"GAMOS אירועים"` text content (visible glyphs are decorative-styled but
  remain *real text* under both alternatives in §3 — never replaced by
  `<img>` or pure SVG paths).
- **Alt text.** Hero static bg `<img alt="">` (decorative, the desert is
  brand atmosphere not content). Logo `<img alt="גמוס — לוגו">` (existing).

---

## §7 — Performance budget

Hard limits the implementation must hit (per `CLAUDE.md §8` + LCP target).

| Asset                              | Limit       | Current        | Action                |
|------------------------------------|-------------|----------------|-----------------------|
| `hero-static.webp` (desktop)       | ≤ 80 KB     | unknown (re-encode) | Encode from new frame-1.png |
| `hero-static-mobile.webp`          | ≤ 50 KB     | unknown        | Encode 768px wide     |
| `hero-static.jpg` (fallback)       | ≤ 100 KB    | unknown        | Encode at q=78         |
| `title-texture.webp`               | ≤ 30 KB     | NEW            | Crop region from 1.2.png |
| `hero-master-1080.mp4`             | ≤ 12 MB     | 5.9 MB ✅      | (no change)           |
| `hero-master-720.mp4`              | ≤ 6 MB      | 1.5 MB ✅      | (no change)           |
| `hero-poster.jpg`                  | ≤ 80 KB     | 236 KB ❌      | Re-encode (see §2.2)  |
| `portal-loop.mp4`                  | ≤ 500 KB    | 276 KB ✅      | (no change)           |
| **Total Hero footprint (desktop)** | **≤ 7 MB**  | est. ~7.2 MB   | Re-encode poster brings it under |

### §7.1 LCP candidate

`hero-static.webp` is the LCP candidate (it's the first painted full-bleed
content). It **must** be `<link rel="preload" as="image" type="image/webp"
href="/assets/images/brand/hero-static.webp" fetchpriority="high">` in
`<head>`. Currently `index.html:32` preloads `hero-poster.jpg` instead —
**Agent 16 must swap this** when implementing.

### §7.2 Frame budget

- 60 fps scrub on M1/Ryzen-class desktop (Constitution §8 hard requirement).
- ≥ 30 fps on iPhone 12+ / Galaxy S22+ (iOS path uses autoplay loop, not
  scrub, so this is naturally met).
- Title reveal (Stage B) must not allocate per-letter (no per-letter
  `<canvas>` or `getImageData`). Both alternatives in §3 are GPU-composited.

---

## §8 — Implementation contract for Agent 16

### §8.1 Files Agent 16 will edit

```
index.html                           — #hero markup, preload tag swap
css/sections/hero.css                — add 4-stage CSS attribute selectors,
                                        remove old "intro" stage rules
js/hero-video-scrub.js               — add Stage A, rename "intro" → "static-bg",
                                        rename "outro" → "portals", switch
                                        preload="auto" → "metadata" + explicit
                                        load() at progress ≥ 0.06
```

### §8.2 Files Agent 16 will create

```
assets/images/brand/hero-static.webp           — re-encoded from new frame-1.png
assets/images/brand/hero-static-mobile.webp    — 768px variant
assets/images/brand/hero-static.jpg            — fallback
assets/images/brand/title-texture.webp         — sand texture (cropped from 1.2.png)
                                                 [iff Alternative A or B in §3 needs it]
```

### §8.3 New CSS custom properties

| Property                  | Type     | Range  | Owner                | Consumer                            |
|---------------------------|----------|--------|----------------------|-------------------------------------|
| `--hero-progress`         | number   | 0..1   | hero-video-scrub.js  | (existing) — any JS-free reveal     |
| `--hero-stage`            | enum     | 0..3   | hero-video-scrub.js  | hero.css attribute selectors        |
| `--hero-letter-progress`  | number   | 0..1   | hero-video-scrub.js  | hero.css per-letter mask animations |
| `--hero-portals-visible`  | bool     | 0 / 1  | hero-video-scrub.js  | portals.css fade-in                 |

> `--hero-stage` is *also* exposed as `data-stage="…"` on `.hero__sticky` for
> CSS attribute selectors; the numeric form is for downstream JS that wants
> a fast scalar comparison without string matching.

### §8.4 API to preserve (backward compatibility)

```js
window.gamosHero = {
  onProgress(cb): () => unsubscribe,    // existing
  duration: number,                      // existing — video.duration
  progress: number,                      // existing — 0..1
  stage: "static-bg" | "title-reveal" | "scrub" | "portals",  // string changed; portals.js doesn't read this
};
```

> Renaming `intro|scrub|outro` → `static-bg|title-reveal|scrub|portals` is
> safe because `portals.js` only reads `progress` (a number), not `stage`
> (a string). No breaking change downstream.

### §8.5 New API to add

```js
window.gamosHero = {
  // ... existing ...
  titleProgress: number,                 // 0..1, derived from progress within Stage B
  portalsVisible: boolean,               // true once data-stage === "portals"
};
```

`titleProgress` lets future modules drive in-letter effects (e.g. parallax on
the texture inside the glyphs) from the same scroll source.

### §8.6 Compatibility with `js/portals.js`

- `portals.js` polls for `window.gamosHero.onProgress` (5s timeout, 100ms
  interval) — unchanged.
- `REVEAL_THRESHOLD = 0.92` → **change to 0.88** (Stage D start).
- `HIDE_THRESHOLD = 0.88` → **change to 0.86**.
- Hysteresis margin stays 2pp.
- Click flow gains the loading-overlay step (§5.4); if `window.gamosLoading`
  is absent, fall through to the existing direct scroll.

### §8.7 Test plan

- **Stage transition smoke test.** Hard-scroll to each stage boundary and
  assert `data-stage` attribute matches expectation (Cypress / manual
  DevTools).
- **Title reveal at 60 fps.** DevTools Performance recorder during Stage B;
  no long tasks > 50 ms; no forced layouts inside the animation frame.
- **Reduced-motion path.** Toggle OS-level setting; verify spacer = 100vh,
  all stages visible at first paint, no scrub seek attempts in console.
- **iOS Safari path.** Real device test (iPhone 12+); video autoplays muted
  loop; portals appear at ~9s; click expands → loading overlay → scroll
  lands.
- **Keyboard pass.** Tab to portal-resort, Enter; loading overlay appears;
  focus returns to first heading of #hall-resort after scroll.
- **LCP measurement.** Lighthouse mobile (Slow 4G); LCP ≤ 2.5s with
  `hero-static.webp` as the LCP element.

---

## §9 — Open questions for the user

These block Agent 16 from starting implementation. Recommend asking the user
all six in a single batch (matches the HANDOFF.md AskUserQuestion convention).

1. **Title-reveal direction.** When "GAMOS" letters reveal in Stage B, do
   the textures wipe in **left-to-right** (writing motion, feels Latin) or
   **right-to-left** (matches RTL flow)? Either is defensible.
2. **Title implementation.** Alternative A (SVG `<mask>` + texture) or
   Alternative B (CSS `background-clip: text`)? A is more flexible, B is
   simpler. Default if unspecified: B.
3. **Hebrew subtitle font.** "אירועים" subtitle — keep **Frank Ruhl Libre
   700** (current display Hebrew) or pick a different display face that
   *visually* mirrors the new GAMOS texture-serif aesthetic? (E.g. a hairline
   contemporary Hebrew like *Mada* or *Assistant Light 200*.) If user has
   no preference: keep Frank Ruhl Libre.
4. **Scrub end behavior at Stage D.** When portals appear (progress 0.88+),
   does the scrub video **freeze on its last frame** (pause at
   currentTime = duration) and the portal-loop fades over it, OR does the
   scrub video **fade out completely** revealing the static portal-loop
   beneath? Current Constitution §3 implies the latter (fade out + loop
   in); user's verbal vision implies the former ("at the end of the video
   two portals appear" — i.e. last frame is the portal frame). Need
   confirmation.
5. **Static→video crossfade duration.** A→B was 400ms, B→C was 600ms.
   The B→C crossfade is the most visible (desert image dissolves into the
   first frame of the video). Is **600ms** right, or longer (1000ms,
   "deluxe") for extra drama, or shorter (300ms, snappy)?
6. **Texture asset source.** §3 calls for a sand-texture image (`title-
   texture.webp`, ≤ 30 KB) cropped from `פונט/1.2.png`. Confirm the user
   owns the rights to that PNG (it appears to be a font specimen sheet).
   If not, Agent 16 must generate an equivalent texture in-house (e.g.
   render dunes via Perlin noise + warm-light overlay) — adds ~1 day to
   the timeline.

---

## §10 — Done criteria (Definition of Done for this spec)

- [x] All four stages defined with exact percentage boundaries and
      time-budget rationale.
- [x] Asset map covers every file under `assets/` that the hero touches.
- [x] Title-reveal animation has two viable alternatives with pros/cons.
- [x] Scrub mapping, RAF throttle, iOS fallback, reduced-motion path all
      specified.
- [x] Portal hover state added (the user's NEW requirement).
- [x] Click → loading overlay → scroll flow documented with Agent 14 contract.
- [x] Performance budget table with current vs limit + actions.
- [x] Implementation contract names exact files, exact CSS variables, and
      exposes a non-breaking API surface for Agent 16.
- [x] Open questions are concrete and answerable in <30s each.

---

## §11 — Log

| Date       | Action                                              | Result |
|------------|-----------------------------------------------------|--------|
| 2026-06-01 | Spec V2 drafted by Agent 12 (SPARC §Specification). | DRAFT — pending §9 user answers. |
