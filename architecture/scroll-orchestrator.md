# Scroll Orchestrator — Architecture Spec

> **Status:** characterization (pre-implementation)
> **Created:** 2026-06-01
> **Author:** Agent 13 — Scroll Orchestrator Architect
> **Inputs:** `architecture/scroll-video-system.md` (§3.3 active-only, §4.4 contract sketch), existing `js/hero-video-scrub.js`, `js/portals.js`
> **Constitution alignment:** §2 (vanilla ESM, no frameworks), §3 (multi-stage hero preserved), §10 (modules with `init/destroy`, tokens single-source)
> **Consumers (verified by grep):** `js/portals.js` polls `window.gamosHero.onProgress`. Future: `hall-resort`, `culinary` (per `scroll-video-system.md`).

---

## §1 Mental Model

A single, vanilla-JS singleton (`window.gamosScroll`) owns **one** scroll listener and **one** `requestAnimationFrame` tick per scroll event. It maintains a registry of `scroll-scene` modules and uses an `IntersectionObserver` to decide which scene is **active** at any moment (0 or 1, never 2+). Only the active scene receives `onProgress(p)` callbacks; inactive scenes are frozen — their `<video>` is paused, `preload` may be released, no per-frame DOM math runs against them. The Hero (Agent 6's existing 3-stage logic) becomes a *consumer* of this orchestrator: it stops owning a scroll listener, keeps its `intro/scrub/outro` state-machine, and forwards orchestrator progress events to the existing `gamosHero.onProgress` subscribers (so `portals.js` is unaffected). Result: 4 scroll-driven scenes can coexist with the CPU+RAM cost of one.

---

## §2 Module Boundaries

### `js/scroll-orchestrator.js` — Singleton (NEW)
- **Owner of:** the only `window.scroll` listener (passive), the only `requestAnimationFrame` for scrub work, the registry, the active-scene IntersectionObserver, lifecycle of per-scene "near-viewport" preload observer.
- **Exposes:** `window.gamosScroll = { register, unregister, getActive, onSceneChange }`.
- **Holds no per-scene state** beyond `{ id, el, onProgress, videoEl?, spacerVh?, priority?, isActive, isNear }`. All per-scene rendering (video.currentTime, opacity, transforms) lives in the scene module.
- **Module-scoped state**, never leaks beyond `window.gamosScroll`. `destroy()` removes listeners and disconnects observers.

### `js/scroll-scene.js` — Generic per-scene driver (NEW)
- **Auto-discovery:** on `init()`, scans `document.querySelectorAll('[data-scrub]')` and binds each one.
- **DOM-shape guard:** if `.scroll-scene__spacer` / `.scroll-scene__sticky` are missing, builds them from a single `<section data-scrub="...">` (rare; most sections will ship pre-built markup). If pre-built, no DOM mutation.
- **Default `onProgress(p)`:** seeks `video.currentTime = p * duration`, throttled by `Δt > 0.04s` (matches existing hero throttle).
- **Override hook:** a section can pass `data-scrub-mode="custom"` and its own JS file calls `gamosScroll.register({ onProgress: customFn })` directly — the generic file then skips that node.
- **Activation hooks:** `onActivate(scene)` → unmute/play if needed, set `aria-busy="true"` on overlay text. `onDeactivate(scene)` → `video.pause()`, optionally `preload="none"`.

### `js/hero-video-scrub.js` — Refactored consumer (EXISTING, modified)
- **Removed:** its own `window.addEventListener('scroll')`, its own RAF (`_rafPending`), its own `computeProgress()` rect math.
- **Kept:** `INTRO_END`, `SCRUB_END`, `setStage()`, `setProgress()`, `setupReduced()`, `setupIOS()`, `--hero-progress` CSS variable, the `_listeners` Set.
- **New flow:** in `init()`, calls `window.gamosScroll.register({ id: 'hero', el: heroEl, spacerVh: 700, priority: 10, onProgress })` where `onProgress(p)` runs the existing intro/scrub/outro logic against `_video.currentTime`.
- **Compatibility:** keeps publishing `window.gamosHero.onProgress(cb)` — see §8.

---

## §3 DOM Contract

### Required for non-hero scenes (`hall-resort`, `culinary`, etc.)

```html
<section id="hall-resort" class="scroll-scene" data-scrub="resort">
  <div class="scroll-scene__spacer" aria-hidden="true"></div>
  <div class="scroll-scene__sticky">
    <video class="scroll-scene__video"
           muted playsinline preload="metadata"
           poster="/assets/video/resort-poster.jpg"
           aria-hidden="true">
      <source src="/assets/video/resort-1080.mp4" type="video/mp4"
              media="(min-width: 768px)">
      <source src="/assets/video/resort-720.mp4"  type="video/mp4">
    </video>
    <div class="scroll-scene__overlay">
      <header class="section-header">…</header>
    </div>
  </div>

  <!-- Optional: static content that follows the scrub -->
  <div class="scroll-scene__post">…</div>
</section>
```

#### Required attributes / classes

| Token | Type | Required | Purpose |
|-------|------|----------|---------|
| `.scroll-scene` | class on `<section>` | yes | identifies scene root for observers + CSS |
| `data-scrub="<id>"` | attr on `<section>` | yes | unique scene id; used as registry key |
| `data-scrub-mode="custom"` | attr | no | tells `scroll-scene.js` to skip default video binding |
| `data-scrub-spacer="450"` | attr (vh) | no | overrides default 300vh spacer |
| `.scroll-scene__spacer` | class on first child | yes | the scroll-driver block; `aria-hidden="true"` |
| `.scroll-scene__sticky` | class on second child | yes | `position: sticky; top: 0; height: 100vh;` |
| `.scroll-scene__video` | class on `<video>` | optional* | only required if scene wants the default video-scrub behavior |
| `.scroll-scene__overlay` | class | optional | text/CTA layered above the video |
| `.scroll-scene__post` | class on optional sibling | no | static content after scrub completes |

*Custom modes (e.g., image-stack crossfade for אולם) skip the video.

### Hero remains exempt
The hero keeps its existing markup (`#hero`, `.hero__sticky`, `.hero__intro-bg`, `.hero__video`, `.hero__outro-loop`, `.hero__intro`, `[data-stage]`). It registers itself with `gamosScroll` but does **not** use `.scroll-scene__*` classes. This was a deliberate decision in `scroll-video-system.md §4.1`.

---

## §4 JavaScript API

### Types

```ts
type SceneId       = string;
type SceneProgress = number; // 0..1, clamped, within scene's own scrub range

interface SceneConfig {
  id: SceneId;                                   // required, unique
  el: HTMLElement;                               // the <section> root
  onProgress(p: SceneProgress): void;            // required; called per RAF tick when active
  onActivate?(): void;                           // called when scene becomes active
  onDeactivate?(edgeProgress: SceneProgress): void; // called with terminal p (0 or 1)
  videoEl?: HTMLVideoElement;                    // if provided, orchestrator handles preload lifecycle
  spacerVh?: number;                             // optional override; default 300
  priority?: number;                             // 0..10; higher wins active-scene ties; default 0
  // Hero overrides priority to 10 because its 700vh sticky range overlaps with neighbors.
}

interface SceneHandle {
  id: SceneId;
  unregister(): void;
}

type SceneChangeCb = (active: SceneId | null, previous: SceneId | null) => void;
```

### Public API (`window.gamosScroll`)

```ts
window.gamosScroll = {
  /** Register a scene. Returns an unregister fn. Idempotent on duplicate id (warns + replaces). */
  register(cfg: SceneConfig): SceneHandle;

  /** Remove a scene (also called by SceneHandle.unregister). */
  unregister(id: SceneId): void;

  /** Currently active scene id, or null if no scene's bounds intersect the active band. */
  getActive(): SceneId | null;

  /** Subscribe to active-scene changes. Returns unsubscribe fn. */
  onSceneChange(cb: SceneChangeCb): () => void;
};
```

### Internal (not exposed)

```ts
// Per-frame: dispatch progress to active scene only.
// Pure DOM rect math, no allocations in hot path.
function _tickActive(): void;

// IO callback from "near viewport" observer; drives preload/release.
function _onNearChange(entries: IntersectionObserverEntry[]): void;

// IO callback from "active band" observer; drives onActivate/onDeactivate.
function _onActiveChange(entries: IntersectionObserverEntry[]): void;
```

---

## §5 Activation Algorithm

A scene is **a candidate to be active** when the viewport center (`window.innerHeight / 2`) falls within the scene's bounding rect on the block axis. We additionally require `intersectionRatio >= 0.5` for non-hero scenes, so that brief drive-bys don't flip activation.

### Decision rules (deterministic)

1. **Compute candidate set.** Per IO entry: `cand = entries.filter(e => e.intersectionRatio >= 0.5 && centerInRect(e))`.
2. **No candidates** → active = null. Previous active (if any) gets `onDeactivate(currentEdgeP)` where `currentEdgeP` is 0 if scrolling up out of scene, 1 if scrolling down out.
3. **One candidate** → that's active.
4. **Tie (both hero and a section overlap, or two sections overlap during a long sticky):**
   - Higher `priority` wins.
   - If equal priority, the scene whose `data-scrub` ID matches the URL hash wins (deep-link lock).
   - Otherwise the earlier-registered scene wins (DOM order proxy).
5. **Hero special-case:** hero's 700vh spacer means its rect is huge; its `priority: 10` keeps it active while still partially in view, even if a sibling is 50% intersecting near hero's tail. Hero releases active only when its own progress crosses 1.0 (i.e., user fully past the outro).

### Transition mechanics

When `getActive()` would change from `A → B`:

1. Mark `A.isActive = false`.
2. Call `A.onDeactivate(edgeP)`. Default scene driver pauses `A.videoEl`.
3. Mark `B.isActive = true`.
4. Call `B.onActivate()`. Default scene driver: if `B.videoEl.preload === 'none'`, set to `'metadata'` and wait for `loadedmetadata`; if scrub mode, do not auto-play (we drive frames via `currentTime`).
5. Notify all `onSceneChange` subscribers: `cb(B.id, A.id)`.
6. Schedule the next RAF tick — don't wait for the next scroll event, so the new scene immediately reflects current scroll position.

This is exactly 0 or 1 active scene at all times.

---

## §6 RAF + Scroll Listener Strategy

```text
window.scroll  ──► onScroll() ──► (if !_rafPending) requestAnimationFrame(_tickActive)
                                                    │
                                                    ▼
                                  active scene .onProgress(p)  ◄── ONLY one call per frame
```

### Rules

- **Exactly one** `window.addEventListener('scroll', onScroll, { passive: true })` for the whole site. Modules MUST NOT add their own scroll listeners for scrub purposes (reveals via `IntersectionObserver` is fine — they're not RAF-driven).
- `onScroll` sets `_rafPending = true` and calls `requestAnimationFrame(_tickActive)`. Subsequent scroll events while a frame is pending are coalesced to a single tick (matches the proven pattern in current `hero-video-scrub.js:71-74`).
- `_tickActive` clears `_rafPending`, asks the active scene for its progress (a `getBoundingClientRect()` call + arithmetic — same math as hero today), dispatches `onProgress(p)`, returns.
- `window.resize` is forwarded to `onScroll` (rect bounds change).
- **No active scene → no RAF.** When `_active === null`, scroll events still arrive but `_tickActive` short-circuits with zero rect math. Idle CPU at 0%.
- **No scroll → no RAF.** Standard browser behavior: no scroll event = no listener fire = no RAF.

### Hot-path discipline

- Cache `window.innerHeight` once per resize (not per frame). The per-frame math reads only the active scene's `getBoundingClientRect()`.
- No object allocation inside `_tickActive` (no `{}` literals, no `Array.prototype` methods).
- Throttle inside the scene's own `onProgress` (e.g., default video driver checks `Math.abs(video.currentTime - target) > 0.04` before assigning) — this is a *consumer* concern, not orchestrator concern.

---

## §7 Lazy Mounting + Memory Hygiene

Two `IntersectionObserver` instances per orchestrator instance:

### `_nearObserver` — preload band
- `rootMargin: '100% 0px'` (one viewport above + below).
- On `isIntersecting === true`: if scene has `videoEl` and `videoEl.preload === 'none'`, set `videoEl.preload = 'metadata'` (or `'auto'` for the hero — see below).
- On `isIntersecting === false`: set `videoEl.preload = 'none'` AND if not active, ensure `videoEl.pause()`. Browser is then free to release the decoder.

### `_activeObserver` — active band
- `threshold: [0, 0.25, 0.5, 0.75, 1]`, `rootMargin: '0px'`.
- Drives §5 activation algorithm.
- `intersectionRatio === 0` → forces deactivate (covers the case where the user scrolls fast and the scene flips from active to fully off-screen in one frame).

### Hero exception
Hero is the LCP candidate. Its video preload remains `auto` always (already the case in current markup). The orchestrator's near-observer only touches non-hero `videoEl`s by checking `if (scene.id === 'hero') return` in the preload toggling branch.

### Memory budget validation (test plan §12 ties to this)
- Mounting 4 scenes with no scroll: only 1 video (hero) has bytes loaded.
- Scrolling through all 4: 1 active + at most 1 near-active video has metadata loaded; the other 2 are `preload="none"`.
- Scrolling back to top: only hero has metadata loaded; the 3 inner scenes are all `preload="none"`.

---

## §8 Backward Compatibility — `gamosHero` API

`portals.js` already polls for `window.gamosHero.onProgress` with a 5s timeout (verified `js/portals.js:34, 76-94, 298`). Breaking this API would silently degrade the portal reveal to the IO fallback.

### Shim in `hero-video-scrub.js` (after refactor)

```js
// inside hero-video-scrub.js, replacing the current onScroll/RAF block:
const handle = window.gamosScroll.register({
  id: 'hero',
  el: _hero,
  videoEl: _video,
  spacerVh: 700,
  priority: 10,
  onProgress(p) {
    // existing logic — setStage, video.currentTime in scrub band
    let stage;
    if (p < INTRO_END)      stage = 'intro';
    else if (p < SCRUB_END) stage = 'scrub';
    else                    stage = 'outro';
    setStage(stage);

    if (stage === 'scrub' && _state.duration && _video) {
      const scrubP = (p - INTRO_END) / (SCRUB_END - INTRO_END);
      const t = scrubP * _state.duration;
      if (Math.abs(_video.currentTime - t) > PROGRESS_THROTTLE_S) {
        try { _video.currentTime = t; } catch (e) {}
      }
    }

    setProgress(p);  // <-- still fires _listeners; window.gamosHero.onProgress unchanged
  },
});
```

### Contract preserved
- `window.gamosHero.onProgress(cb)` — unchanged. Still returns an unsubscribe fn.
- `window.gamosHero.duration` / `.progress` / `.stage` — unchanged.
- `--hero-progress` CSS variable — unchanged (still set by `setProgress`).
- `[data-stage]` on `.hero__sticky` — unchanged.

### Future portals or other consumers
New consumers should subscribe via `gamosScroll.register({ id: '<scene>' , …, onProgress })` directly. `gamosHero` is kept only for legacy `portals.js`. Mark it deprecated in JSDoc; don't remove until portals migrates.

---

## §9 prefers-reduced-motion

When `matchMedia('(prefers-reduced-motion: reduce)').matches`:

1. `gamosScroll.register()` accepts the registration but the orchestrator never dispatches `onProgress(p)` for that scene's RAF path. Instead, on registration it calls `cfg.onProgress(0)` once (so the scene reaches its initial visual state), then never again.
2. `onActivate` still fires when the scene is in viewport, allowing CSS to set the "end-state" (final poster, static text fully revealed).
3. Spacer height is collapsed to `100vh` for non-hero scenes (matches the hero's `setupReduced()` precedent at `hero-video-scrub.js:96-99`). Implementation: `scroll-scene.js` reads `prefers-reduced-motion` once on init and writes `style.height` on the spacer.
4. Videos: `videoEl.removeAttribute('autoplay')`, `videoEl.pause()`, `videoEl.preload = 'none'`. Show poster only.

A live `MediaQueryList` listener should call `gamosScroll.recompute()` (an internal method) on `change` so toggling system preference doesn't require reload.

---

## §10 iOS Safari Special Handling

iOS Safari is unreliable for `currentTime` scrubbing (jitter, occasional black frames, decoder restarts). Detection mirrors the existing hero file:

```js
const isIOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
```

### Behavior on iOS

- **Scenes with `videoEl`:** orchestrator switches them to *autoplay-loop mode*. On `onActivate`, set `videoEl.loop = true`, `videoEl.muted = true`, `videoEl.play().catch(noop)`. On `onDeactivate`, `videoEl.pause()`. The orchestrator still computes and dispatches `onProgress(p)` for non-video animations the scene may run (text fades, parallax) — only the default video-currentTime driver short-circuits.
- **Spacer collapse:** non-hero scene spacers collapse to `100vh` on iOS. Scrub-driven progress would otherwise feel broken because the video isn't tracking. (Hero already does this in `setupIOS` — extend the pattern.)
- **Hero stays special:** hero's iOS path is already `setupIOS()` with timed stage transitions. That logic stays inside `hero-video-scrub.js`; it just doesn't register a `videoEl` with the orchestrator on iOS — registration happens with `videoEl: undefined` so `onProgress` is never wasted on `currentTime` math.

### Detection caveat
iPadOS 13+ reports as MacIntel with touch — the `maxTouchPoints > 1` check covers it (matches existing hero detection at line 17).

---

## §11 Implementation Order for Agent 17

1. **Create `js/scroll-orchestrator.js`** with empty registry + `register/unregister/getActive/onSceneChange` API. No observers yet. Verify `window.gamosScroll` exists in console.
2. **Add the single scroll listener + RAF tick loop**, dispatching `onProgress(p)` to whichever scene is in `_active` (initially set manually for testing).
3. **Add `_activeObserver`** (IntersectionObserver) implementing §5 activation algorithm. Test with two dummy `<section data-scrub>` elements.
4. **Add `_nearObserver`** for preload lifecycle (§7). Verify in DevTools Network that inactive videos don't download.
5. **Refactor `js/hero-video-scrub.js`** per §8 — remove its scroll listener + RAF, replace with `gamosScroll.register(...)`. Verify `gamosHero.onProgress` still works (portals reveal at p=0.92).
6. **Create `js/scroll-scene.js`** generic driver. Auto-bind `[data-scrub]` sections, install default video-scrub `onProgress`, handle reduced-motion + iOS branches per §9–§10.
7. **Wire `main.js`**: import + `init()` `scroll-orchestrator` BEFORE `hero-video-scrub`, `scroll-scene` AFTER. Order matters because hero registers with the orchestrator on init.
8. **Add `css/sections/scroll-scene.css`** with the shared `.scroll-scene/__spacer/__sticky/__video/__overlay/__post` baseline (sticky positioning, aspect-ratio fallback, overlay z-index). Tokens-only; no hard-coded colors.

> **Constraint:** do not add real scenes (resort/culinary) in this PR. They're separate Agent tasks once the orchestrator + hero refactor lands and tests pass.

---

## §12 Test Plan

### Performance (Chrome DevTools → Performance)
- Record a 10s scroll from top to bottom on M1-class hardware. Frame rate ≥ 60fps in the scrub bands. Long Tasks list contains zero entries > 50ms attributable to `_tickActive`.
- Verify only **one** `requestAnimationFrame` callback fires per frame across the whole site (search the flame chart for "RequestAnimationFrame" leaves).

### Memory (Chrome DevTools → Memory → Heap snapshots)
- Snapshot 1: page loaded, hero in view.
- Scroll to `culinary`, snapshot 2, scroll back to hero, snapshot 3.
- Repeat the round-trip 5 times. Snapshot 4 (final) should not exceed snapshot 1 by more than **5MB**. Detached HTMLVideoElement count: 0.

### Network (Chrome DevTools → Network)
- On initial load, verify only `hero-master-1080.mp4` (or 720) is requested. Other scene videos: 0 bytes.
- Scroll to within ~1 viewport of `#hall-resort`: `resort-*.mp4` request begins (Range: bytes=0-).
- Scroll past `#hall-resort` and far away: subsequent `currentTime` changes do NOT trigger new range requests (decoder is paused, file already cached or `preload="none"`).

### Lighthouse (mobile preset)
- Performance ≥ 90 on each of the 4 scrub-bearing pages.
- LCP ≤ 2.5s (hero poster).
- CLS ≤ 0.05.
- TBT ≤ 200ms.

### Functional regression
- `portals.js` reveal still triggers at p ≥ 0.92 (visual: bubbles fade in near hero outro).
- Portal click → expand → smooth scroll still works on Chrome desktop.
- iOS Safari (real device or Responsive emulator + UA spoof): hero falls back to autoplay loop, `culinary` and `resort` videos play as autoplay loops, no scrub jitter, no black frames.
- `prefers-reduced-motion: reduce`: all spacers collapsed to 100vh, no animated scrub, all final states visible. Hero portals revealed.

### Active-scene invariant
- Instrument `gamosScroll.onSceneChange` with `console.log` during a slow scroll. Assert: at every transition the previous active is non-null OR null, and the new active is exactly one id (never two ids logged for the same scroll position).

---

## §13 Risks Flagged

1. **Hero's 700vh sticky overlap with neighboring `<section>`s.** When the user is at hero's outro band (p ≈ 0.9), the next section may already intersect the viewport bottom. The §5 priority rule (hero priority=10) handles this in spec — but a bug in priority resolution would cause the hero to release active prematurely, breaking the portal reveal contract. Mitigation: add an explicit unit test asserting hero stays active until `p === 1.0` even when `intersectionRatio` of the next section reaches 0.5.
2. **iOS `maxTouchPoints` check is fragile.** A future iPad with `maxTouchPoints === 0` (Magic Keyboard only?) would be misclassified as desktop. Track this when iOS 18+ ships.
3. **Single scroll listener becomes a single point of failure.** If `_tickActive` throws (e.g., a scene's `onProgress` throws), all scenes freeze. Mitigation: wrap each `cfg.onProgress(p)` invocation in `try/catch` and `console.error` — never let one buggy scene kill the orchestrator (mirror the pattern at `hero-video-scrub.js:42-46`).
4. **Memory growth from `onSceneChange` subscribers.** If consumers register but never unregister (e.g., a popup that destroys its DOM but forgets `unsub()`), the Set grows unbounded. Mitigation: orchestrator's `destroy()` clears the Set; document the "always store + call unsub" pattern in JSDoc.
5. **CLS during async video load.** The default `<video>` element has no intrinsic size until `loadedmetadata`. If the spec's `aspect-ratio: 16/9` CSS isn't shipped, mounting a video into a sticky container will jolt layout. Mitigation: §3 contract requires `aspect-ratio` in CSS; Agent 17's CSS file enforces it.

---

## §14 Open questions deferred to Constitution / user

These are NOT blockers for the orchestrator implementation, but Agent 17 should park them with the user before adding *real* scenes:

- Default `spacerVh` value: 300 (per `scroll-video-system.md §4.2`)?
- Hero `priority` constant: locked at 10, sections all 0?
- Should `gamosScroll.onSceneChange` fire on `null → first-active` at page load, or only on transitions? (Recommendation: yes, fire on first activation; avoids consumers needing a polling fallback.)
