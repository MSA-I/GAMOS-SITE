# Defect F-12 — `js/lenis.js` is still a TODO stub

**Severity:** P1 (smooth-scroll missing on desktop; not blocking)
**Date opened:** 2026-05-28
**Discovered by:** Agent 10
**Owner:** Agent 09
**Affects:** Desktop smooth-scroll feel

---

## Observation

`js/lenis.js` is 14 lines:

```js
export function init() {
  console.log("lenis: TODO (Agent 09)");
}

export function destroy() {}
```

This module is imported and `init()`-ed by `main.js` on every page load,
which means **every visitor's console gets a `console.log` noise message**.

Constitution §2 lists Lenis explicitly as the desktop smooth-scroll backbone.
It is not optional for the cinematic feel.

## Impact

- Desktop scrolling uses native browser scroll (jankier on heavy pages,
  especially with sticky hero + GSAP ScrollTrigger).
- A `console.log` in production = Best-Practices Lighthouse demerit.
- Constitution §2 violation.

## Recommended fix

Implement per `architecture/animation-and-motion.md` (or
`PLANS/research/.../motion-language.md`) with:

```js
import Lenis from "https://cdn.skypack.dev/lenis@1.0.42";

let _lenis = null;
let _rafHandle = 0;

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = matchMedia("(pointer: coarse)").matches;

export function init() {
  // Constitution §2: desktop only, smoothTouch false.
  if (reduceMotion || isTouch) return;

  _lenis = new Lenis({
    duration: 1.2,
    easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothTouch: false,
    smoothWheel: true,
  });

  function raf(time) {
    _lenis?.raf(time);
    _rafHandle = requestAnimationFrame(raf);
  }
  _rafHandle = requestAnimationFrame(raf);
}

export function destroy() {
  if (_rafHandle) cancelAnimationFrame(_rafHandle);
  _lenis?.destroy();
  _lenis = null;
  _rafHandle = 0;
}
```

Make sure to add a stub for `prefers-reduced-motion` live listener if needed
(matches the pattern in `portals.js`).

## Validation

- [ ] `init()` does nothing on touch devices.
- [ ] `init()` does nothing under `prefers-reduced-motion: reduce`.
- [ ] Desktop scroll feels eased / lerped vs default snap.
- [ ] No `console.log` in production code.
- [ ] `destroy()` cancels RAF and tears down Lenis.

## Status

- 🟡 OPEN — 2026-05-28 (P1)
