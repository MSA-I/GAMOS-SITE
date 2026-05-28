# Hero Video-Scrub Specification

> Implementation of the `video-to-website` skill: linking scroll progress to
> `<video>.currentTime` for a cinematic scroll-driven hero.

---

## Requirements

- 60fps on M1/Ryzen-class desktop.
- Smooth on Chrome/Firefox/Safari desktop.
- **iOS Safari:** unreliable for currentTime scrub on remote video → use fallback.
- Honor `prefers-reduced-motion: reduce`.

---

## Source Asset

- **Master:** `assets/video/hero-master-1080.mp4` (תפור מ-13 sub-videos ע"י ffmpeg).
- **720p variant:** `assets/video/hero-master-720.mp4` (mobile / slow connections).
- **Poster:** `assets/video/hero-poster.jpg` (≤ 80KB) — preloaded `<link rel="preload">`.

### Codec requirements
- H.264 baseline/main profile.
- `+faststart` flag (moov atom front-loaded) — חובה לscrub.
- Constant frame rate (CFR) — pass `-r 30` if VFR detected.
- pix_fmt yuv420p לתאימות מקסימלית.
- אודיו מוסר (`-an`) — hero is silent.

---

## DOM Structure

```html
<section id="hero" class="hero">
  <div class="hero__spacer" aria-hidden="true"></div>
  <div class="hero__sticky">
    <video class="hero__video" muted playsinline preload="auto"
           poster="/assets/video/hero-poster.jpg">
      <source src="/assets/video/hero-master-1080.mp4" type="video/mp4"
              media="(min-width: 768px)">
      <source src="/assets/video/hero-master-720.mp4" type="video/mp4">
    </video>
    <div class="hero__overlay">
      <h1 class="hero__title">...</h1>
    </div>
  </div>
</section>
```

---

## CSS Spec

```css
.hero {
  position: relative;
  /* spacer מכתיב את אורך ה-scroll. 5 viewport-heights. */
}
.hero__spacer {
  height: 500vh;
  pointer-events: none;
}
.hero__sticky {
  position: sticky;
  top: 0;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}
.hero__video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
```

---

## JS Spec

### Pseudocode
```js
import { gsap } from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";

const video = document.querySelector(".hero__video");
const hero  = document.querySelector("#hero");

// Wait for metadata
await new Promise(r => video.readyState >= 1
  ? r()
  : video.addEventListener("loadedmetadata", r, { once: true }));

const duration = video.duration;
const progressEvent = new EventTarget();

ScrollTrigger.create({
  trigger: hero,
  start: "top top",
  end: "bottom bottom",
  scrub: true,                    // עוקב אחרי scroll position
  onUpdate(self) {
    const t = self.progress * duration;
    if (Math.abs(video.currentTime - t) > 0.04) {
      video.currentTime = t;
    }
    document.documentElement.style.setProperty("--hero-progress", self.progress);
    progressEvent.dispatchEvent(
      new CustomEvent("progress", { detail: self.progress })
    );
  }
});

window.gamosHero = {
  onProgress(cb) { progressEvent.addEventListener("progress", e => cb(e.detail)); },
  duration
};
```

### Performance optimizations

1. **`requestVideoFrameCallback`** when supported (Chromium):
   ```js
   if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
     // use instead of seeking
   }
   ```

2. **Throttle currentTime writes** — only set if delta > 0.04s (≈ 1 frame at 30fps).

3. **Decode pause:** force `video.pause()` once on init; let scrub control time.

---

## iOS Safari Fallback

iOS Safari has unreliable scrub for network-loaded video. Detection:

```js
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
```

If `isIOS`:
1. Replace `<video>` with autoplay muted loop:
   ```html
   <video autoplay loop muted playsinline> ... </video>
   ```
2. Hide spacer; hero is just a single 100vh static autoplay clip.
3. Skip ScrollTrigger binding entirely.
4. Portal bubbles still appear via separate `IntersectionObserver`-driven CSS class.

---

## Reduced-Motion Path

```js
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) {
  // Show poster as static <img>; hide <video>.
  // Skip ScrollTrigger.
  // Reveal portals immediately (no scroll-bound).
}
```

---

## Performance Budget

- Hero MP4 1080p: **≤ 12MB**. If larger, drop CRF to 24 or fps to 24.
- Poster: **≤ 80KB**.
- Decode budget: 16ms / frame (60fps).
- No `requestAnimationFrame` extra loops besides ScrollTrigger's internal.

---

## Done Criteria (Agent 6 deliverable)

1. `js/hero-video-scrub.js` exports an `init(options)` function.
2. `css/sections/hero.css` provides spacer + sticky + video layout.
3. iOS detection branch documented + tested on real iPhone (Agent 10).
4. `--hero-progress` CSS variable exposed for Agent 7 to consume.
5. `window.gamosHero.onProgress(cb)` JS API exposed for Agent 7.
6. `prefers-reduced-motion` path verified — poster shown, no scrub.
