# Intro / door-opening transition

The `#rooms` door (main site) plays a **door-opening transition** on click, then
navigates into this sub-app (`/rooms/dist/`).

## How it works today (CSS, no video)

Two pieces, on the two sides of the navigation:

### Main-site side — the swing
- `js/rooms-door.js` (registered in `js/main.js` MODULES) intercepts the door
  click, mounts a full-viewport portal (`.rooms-door-portal` in
  `css/sections/rooms.css`), plays the door swing (`rotateY` on its hinge under
  CSS `perspective`) while the scene pushes forward + dims to black, then
  `window.location.href = "/rooms/dist/"` once the timeline ends (~1.05s).
- `prefers-reduced-motion: reduce` → the JS skips the animation and lets the
  plain `<a href>` navigate immediately.

### Sub-app side — the reveal
- `IntroGate.tsx` keeps the WebGL wall mounted from the first frame, with an
  ink-deep cover over it that **fades out on mount** — so the page opens on the
  same dark tone the door portal ended on, then dissolves to the curved wall.
  No flash. Reduced motion → cover starts hidden (instant).

## FUTURE — swap the CSS swing for a real door-opening MP4 (optional)

The architecture already supports this with no structural change:
1. Encode the clip per Constitution §8 (≤6MB 1080p) → `rooms/public/intro/door.mp4`
   (ships at `/rooms/dist/intro/door.mp4`), + a poster.
2. Main-site side: in `js/rooms-door.js`, replace the CSS portal with a fullscreen
   `<video autoplay muted playsinline>` and navigate on its `ended` event.
3. Sub-app side: in `IntroGate.tsx`, render the same `<video onEnded={reveal}>`
   over `{children}` and gate `revealed` on `ended` (the wall stays mounted
   behind it, so WebGL is already warm). Honor reduced-motion → skip the video.

Nothing else moves.
