# Transitions & Navigation — Architecture Spec

> **Owner:** Agent 14 (Transition + Navigation Architect)
> **Status:** LOCKED 2026-06-01
> **Implementation owner:** Agent 19
> **Related specs:**
> - `architecture/portal-bubbles-spec.md` (click flow we extend)
> - `architecture/scroll-video-system.md` (hero stage states)
> - `architecture/rtl-and-a11y.md` (logical-property + a11y rules)
> - `architecture/tokens.md` (design tokens used here)
> - `CLAUDE.md` §3 (multi-stage hero), §4 (RTL), §5 (palette), §9 (a11y), §10 (invariants)

---

## §0 Mission

This spec defines two NEW chrome-level UX systems for GAMOS-SITE:

1. **Loading Overlay** — a polished hand-off screen inserted between portal-click expand and target-section reveal (~800 ms). Masks any flash-of-unstyled-video while the destination's media loads.
2. **Side-Dot Navigation** — a vertical column of dots fixed on the **right** edge (RTL natural reading position) that mirrors scroll progress through the major sections and offers one-tap teleports.

Both systems are additive: zero breakage to current portal flow, hero scrub, or section scaffolding. Agent 19 implements per `§7` and `§15` file lists, and `§17` step order.

**Hard constraints:**
- HTML/CSS/JS vanilla only (Constitution §2).
- All visuals reference `css/tokens.css` (Constitution §10.2 — no raw hex).
- Logical properties only (Constitution §10.4 — no `left/right`, use `inset-inline-*`).
- WCAG 2.2 AA (Constitution §9).
- Honors `prefers-reduced-motion` (Constitution §8).

---

# PART A — Loading Overlay

## §1 UX Intent

The portal click flow today (`js/portals.js`) does:

```
click → setAttribute("data-clicked") → GSAP scale ×6 timeline (1.0s power3.in)
       + sibling fade out → onComplete: scrollIntoView(target) → 300ms reset
```

We insert the loading overlay **between** the GSAP timeline's `onComplete` and the `scrollIntoView`. Why:

- **Premium app feel.** Cinema brands (Aman, Bvlgari) use a held black/brand frame between scenes. We mirror that idiom on the web.
- **Mask FOUC of destination video.** Hall sections will eventually have hero videos that need 100–400 ms of metadata fetch on first visit. Without an overlay, users see a flash-of-poster or a paint stutter. With it, they see a brand frame that resolves into the section already painted.
- **Buy time for IntersectionObserver.** Side-dot active-state, reveal-on-scroll, and lazy media all hook into IO. A 600 ms hold gives IO entries time to register before the user is staring at the destination.

The overlay is **never** triggered by side-dot clicks (those are smooth-scroll only — see §16).

---

## §2 Visual Spec

| Property | Value (token-referenced) | Notes |
|----------|--------------------------|-------|
| Background | `var(--ink-deep)` at `opacity: 0.96` | Warm near-black (#1A1410). Not pure black — keeps it on-palette. |
| Backdrop-filter | `blur(8px) saturate(0.9)` | Optional progressive enhancement. Falls back gracefully. |
| Centerpiece | `<img>` of brand logo | Source: `/assets/images/brand/logo-gold.webp` (existing, used in hero). Fallback `.png`. |
| Logo size | `width: 240px; height: auto;` | Match hero logo proportions (340×100 in hero, scaled down). |
| Logo entrance | `transform: scale(0.85) → scale(1)` + `opacity: 0 → 1` | 200 ms. Easing: `var(--ease-out-cinema)`. |
| Spinner | Pure CSS — single `<div>` | `1px` ring, brass color. See §2.1. |
| Spinner size | `48px × 48px` | 24 px gap below logo (= `var(--space-6)`). |
| Caption text | "טוען חוויה" | See §2.2 for typography + recommendation. |
| Stack direction | Column, center-aligned | `display: flex; flex-direction: column; align-items: center;` |
| Vertical position | Center of viewport | Use grid trick: `place-items: center` on the overlay itself. |

### §2.1 Spinner

```
.loading-overlay__spinner {
  inline-size: 48px;
  block-size: 48px;
  border: 3px solid var(--brass);
  border-top-color: transparent;
  border-radius: var(--radius-circle);
  animation: gamos-spin 1s linear infinite;
}

@keyframes gamos-spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
```

**Accessibility note.** The spinner is decorative — `aria-hidden="true"`. The `role="status"` lives on the overlay container so screen readers announce the caption text once.

### §2.2 Caption — Recommendation

**Recommended:** include the caption "טוען חוויה" (English: "Loading experience").

Rationale:
- Pure spinners on luxury sites read as "broken / generic" without context.
- "טוען" alone reads as utilitarian (banking app). Adding "חוויה" elevates to brand-voice — frames the wait as part of the journey, not friction.
- For screen readers it provides the `role="status"` payload.

**Typography:**
- Font: `var(--font-display-he)` (Frank Ruhl Libre).
- Size: `var(--text-md)` (20 px).
- Weight: `var(--fw-regular)` (400).
- Color: `var(--ivory)` at `opacity: 0.85` (slightly muted on dark).
- Margin-block-start: `var(--space-6)` (24 px gap from spinner).
- Letter-spacing: `var(--tracking-wide)` (0.05em — gives breathing room).

If user research later shows it adds noise, the caption can be hidden via CSS without changing markup (keep DOM stable for screen readers).

---

## §3 Timeline

```
t=0 ms     [trigger]      portals.js calls window.gamosLoading.show()
                          (immediately after expandPortal's GSAP timeline
                          onComplete fires, before scrollIntoView)

t=0–200 ms [fade in]      Container opacity 0 → 1 (200 ms ease-out-cinema)
                          Inner: logo scale 0.85 → 1 + opacity 0 → 1 (200 ms)
                          Spinner: rotating from t=0 (animation begins on mount)

t=200–600 ms [hold]       400 ms hold. Overlay fully opaque.
                          During this time, parent code awaits show() promise,
                          fires scrollIntoView(target), and the destination
                          section's IO entries register.

t=600–800 ms [fade out]   Container opacity 1 → 0 (200 ms ease-out-cinema)
                          Logo NOT animated on the way out — only the container
                          fades (cleaner, less to render-cost).

t=800 ms   [removed]      pointer-events: none; aria-hidden=true; visibility: hidden.
                          DOM stays in-place (NOT removed) — show() reuses it.
```

**Total visible duration:** ~800 ms (200 in + 400 hold + 200 out).
**Reduced-motion variant:** see §6.

---

## §4 DOM

Injected **once** by `init()` (see §5). Never re-injected per call.

```html
<div id="loading-overlay" class="loading-overlay" aria-hidden="true" role="status">
  <div class="loading-overlay__inner">
    <picture class="loading-overlay__logo-wrap">
      <source type="image/webp" srcset="/assets/images/brand/logo-gold.webp">
      <img class="loading-overlay__logo"
           src="/assets/images/brand/logo-gold.png"
           alt=""
           width="240"
           height="auto"
           decoding="async">
    </picture>
    <div class="loading-overlay__spinner" aria-hidden="true"></div>
    <p class="loading-overlay__text">טוען חוויה</p>
  </div>
</div>
```

**Insertion point.** End of `<body>`, just before the closing tag. Above `<footer>` is acceptable but `body` end is preferred so it sits at the top of the stacking context naturally.

**Image alt.** Empty (`alt=""`) — the logo is decorative when paired with the visible Hebrew caption. Screen readers announce the caption via `role="status"` instead.

**Logo dimensions.** `width="240" height="auto"` — Agent 19 must inline a `height` attribute even if approximate (e.g., `height="71"` if the asset's intrinsic ratio is 240×71) to prevent CLS during the fade-in (Constitution §8: CLS ≤ 0.05).

---

## §5 JavaScript API

`js/loading-overlay.js` is an **ES module** following the project's standard `init() / destroy()` shape (Constitution §10.3). It exposes a global handle for cross-module use (portals.js).

### §5.1 Module exports

```ts
// js/loading-overlay.js
export function init(): void;
export function destroy(): void;
```

`init()`:
1. Bails early if already initialized (idempotent).
2. Injects the DOM from §4 into `document.body`.
3. Reads `prefers-reduced-motion` (and watches for live changes).
4. Attaches `window.gamosLoading = { show, hide }` for portals.js.
5. Sets `state.initialised = true`.

`destroy()`:
1. Removes the DOM node.
2. Deletes `window.gamosLoading`.
3. Disconnects media-query listener.
4. Resets module state.

### §5.2 Global API

```ts
// Available after init() runs (once main.js boots).
window.gamosLoading: {
  show(opts?: ShowOpts): Promise<void>;
  hide(opts?: HideOpts): Promise<void>;
  isVisible(): boolean;
}

interface ShowOpts {
  // Resolves when overlay reaches full opacity (~200 ms).
  onShown?: () => void;
}

interface HideOpts {
  // Optional delay before fade-out begins (default 0).
  // Useful if caller wants to control hold time externally.
  delay?: number;
}
```

**Promise contract:**
- `show()` returns a Promise that resolves at `t=200ms` (full opacity reached). The optional `onShown` callback fires at the same instant.
- `hide()` returns a Promise that resolves at `t=200ms` after fade-out begins (i.e., when overlay is fully gone).
- Concurrent calls: a second `show()` while visible is a no-op (returns already-resolved Promise). A `hide()` while hiding cancels gracefully.

### §5.3 Usage pattern (portals.js call site)

Conceptual integration — **DO NOT** modify `portals.js` in this spec. Document the call shape only:

```js
// Inside expandPortal's GSAP timeline onComplete:
async () => {
  await window.gamosLoading.show();  // ~200 ms in
  scrollToTarget(target);            // begins immediately
  setTimeout(() => {
    window.gamosLoading.hide();      // 400 ms hold then fade
  }, 400);
  // Reset portal transform after total ~1100 ms (overlay covers it)
}
```

If `window.gamosLoading` is undefined (loading-overlay module not loaded), portals.js MUST fall back to the existing direct-scroll path. Defensive check: `if (window.gamosLoading?.show) { ... } else { scrollToTarget(target); }`.

### §5.4 Internal state shape

```ts
const state = {
  initialised: false,
  el: null,                  // root .loading-overlay
  visibilityState: "hidden", // "hidden" | "showing" | "visible" | "hiding"
  reducedMQ: null,
  reducedMotion: false,
  pendingHidePromise: null,
  hideTimer: null,
};
```

---

## §6 Accessibility

### §6.1 ARIA

- **`role="status"`** on the container. SR announces the caption ("טוען חוויה") once when overlay appears. Status role does NOT trap focus or steal it.
- **`aria-hidden="true"`** when invisible. Toggle to `aria-hidden="false"` (or remove) when visible. Sync with the visibility state machine in §5.4.
- **No `aria-live="assertive"`** — that would interrupt mid-utterance. `role="status"` implies `aria-live="polite"`, which is correct for a brief load message.
- **No keyboard focus stealing.** The overlay does NOT receive focus. Tab order continues to flow underneath. The user is in mid-scroll-anchor anyway, so trapping focus would feel hostile.

### §6.2 Reduced-motion variant

When `(prefers-reduced-motion: reduce)`:
- Skip both fades (instant show/hide).
- **Keep ~400 ms hold.** Why: the caption + spinner still need a visual moment for SR users (whose screen readers announce in serial), and abrupt show/hide is jarring even without animation.
- Spinner: still rotates (it's a loading indicator — informational). If users object, the spinner can be replaced with a static brass dot, but defer that to user research.
- Logo entrance: skip the scale animation, set `transform: none`.

Implementation: read `state.reducedMotion` in `show()`; if true, set `opacity: 1` immediately, then `setTimeout(hide, 400)`. The `hide()` call still respects reduced-motion (instant).

### §6.3 Focus management

When overlay is visible:
- The user's last focused element keeps focus (we don't change it).
- If the user `Tab`s while overlay is up, focus moves to the next focusable element in the document underneath. This is acceptable because the overlay is brief and non-interactive.
- If we later add a "Cancel" button to the overlay, this section needs revisiting.

---

## §7 Files Agent 19 Will Create

```
js/loading-overlay.js              [new]   ESM module, init/destroy + window.gamosLoading
css/components/loading-overlay.css [new]   All visual styles
```

**Wiring:**
- `index.html`: add `<link rel="stylesheet" href="/css/components/loading-overlay.css">` in the stylesheets block.
- `js/main.js`: import `loading-overlay.js` and call `init()` in the bootstrap sequence (BEFORE portals.js init, so `window.gamosLoading` exists when portals.js looks for it).

**Do not:**
- Inject the DOM via inline `<script>` in `index.html`. Module owns its DOM.
- Bundle the spinner CSS inside `tokens.css` or `base.css`. Component-scoped.

---

# PART B — Side-Dot Navigation

## §8 UX Intent

A vertical column of 8 tappable dots fixed on the **right edge** of the viewport at vertical-center. Each dot represents a major section. The active dot (current section in view) is filled-brass with a glow; all others are outlined-brass.

### Rationale for right-edge

Hebrew reads right-to-left. The user's gaze and thumb naturally land on the right edge. In LTR languages, side-dots typically sit on the right; in Hebrew RTL, the right edge IS the leading edge — so we keep right-edge but use logical properties (`inset-inline-end`) so the spec degrades gracefully if `dir="ltr"` is ever applied (e.g., language toggle).

### Why dots, not a sidebar nav

- Top nav already exists (`.site-nav`).
- A second textual sidebar would compete for attention.
- Dots are minimal — they say "you are here, jump anywhere" without taking visual real estate.
- Tooltip-on-hover surfaces the section name only when needed.

### Why hidden on mobile (< 768 px)

- Touch targets need 44×44 px (WCAG); 8 stacked at 44 px = 352 px column height — roughly half the iPhone 12 viewport. Too dominant.
- Mobile users have the top nav hamburger; that's the primary navigation affordance.
- Bottom-bar alternative was considered and rejected: it would conflict with future iOS Safari toolbar behavior + it's over-engineering for a luxury venue site (vs. an app).

---

## §9 Sections to Include — 8 Dots

Surveyed `index.html` and selected the 8 dots that best represent the user journey. Cap is 8 to avoid visual noise on smaller desktop viewports (1024 × 600 laptop).

| # | Hebrew Label | Anchor ID | Justification |
|---|--------------|-----------|---------------|
| 1 | פתיחה | `#hero` | Returns user to wordmark animation. Re-entry point. |
| 2 | ריזורט | `#hall-resort` | First major destination after portals. Resort = first portal in source order (RTL right). |
| 3 | אולם | `#hall-venue` | Second major destination (second portal). |
| 4 | חדרים | `#rooms` | Picked over `#lounge`. See §9.1. |
| 5 | קולינריה | `#culinary` | Distinct content type (food gallery) — high salience. |
| 6 | אודות | `#about` | Trust + brand story. |
| 7 | המלצות | `#testimonials` | Social proof. |
| 8 | צור קשר | `#contact` | Conversion / final CTA. |

### §9.1 Why `#rooms` over `#lounge`

Both are supporting sections. We picked `#rooms` because:
- `#lounge` is a teaser (brief copy + media placeholder) — it does not carry standalone informational weight.
- `#rooms` is a structured gallery (suite / deluxe / classic cards) — users actively want to evaluate accommodation.
- Conversion data from luxury venue sites typically ranks "rooms / suites" as a top-3 user intent after "halls" and "contact".
- `#lounge` is still reachable via top-nav and footer-nav; not orphaned.

### §9.2 Sections deliberately omitted from dots

- `#portals` — invisible chrome (portals reveal at hero progress 0.92, no separate section feel).
- `#lounge` — see §9.1.
- `#gallery` — overlaps with `#culinary` and `#rooms` visually; cuts noise.
- `#events` — fixed-preview gallery (2026-07-13; was an accordion); user-controlled depth.
- ~~`#kosher`~~ — retired 2026-07-13; the kashrut copy is a detail block inside `#contact`.
- `#footer` — chrome, not content.

These sections remain accessible via top-nav + footer-nav + scroll. The side-dot is a curated affordance, not a complete map.

---

## §10 Visual Spec

### §10.1 Container

```
.side-dot-nav {
  position: fixed;
  inset-block-start: 50%;
  inset-inline-end: var(--space-6);     /* 24 px from right edge in RTL */
  transform: translateY(-50%);
  z-index: var(--z-sticky);              /* below overlay (z-overlay = 1000) */
  display: flex;
  flex-direction: column;
  gap: var(--space-4);                   /* 16 px between dots */

  /* Hide on mobile */
  @media (width < 768px) {
    display: none;
  }
}
```

### §10.2 Dot

| State | Spec |
|-------|------|
| Default | `12px × 12px` circle, `1px solid var(--brass)`, fill `transparent`, transition `200ms var(--ease-out-cinema)`. |
| Hover | `transform: scale(1.3)`, fill `var(--brass)` at `opacity: 0.3`. |
| Active (`aria-current="true"`) | Fill `var(--brass)`, `box-shadow: 0 0 12px var(--brass-glow)`. |
| Focus-visible | `outline: 3px solid var(--brass); outline-offset: 4px;` (Constitution §9 — visible focus 3 px brass). |
| Active + Focus | Additive — both shadow + outline. |

```
.side-dot-nav__dot {
  inline-size: 12px;
  block-size: 12px;
  border-radius: var(--radius-circle);
  border: 1px solid var(--brass);
  background: transparent;
  transition: transform var(--dur-base) var(--ease-out-cinema),
              background-color var(--dur-base) var(--ease-out-cinema),
              box-shadow var(--dur-base) var(--ease-out-cinema);
  cursor: pointer;
  position: relative;
  display: block;
}
```

### §10.3 Tooltip (hover label)

```
.side-dot-nav__label {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-end: calc(100% + var(--space-3));   /* 12 px to the LEADING side */
  transform: translateY(-50%);
  font-family: var(--font-display-he);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: var(--tracking-eyebrow);
  color: var(--ivory);
  background: var(--ink-deep);
  padding-inline: var(--space-3);
  padding-block: var(--space-2);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms var(--ease-out-cinema);
}

.side-dot-nav__dot:hover .side-dot-nav__label,
.side-dot-nav__dot:focus-visible .side-dot-nav__label {
  opacity: 1;
}
```

**RTL note.** `inset-inline-end: calc(100% + ...)` correctly places the tooltip on the **leading** side (left of the dot in RTL Hebrew, right of the dot in LTR). This is the side the user's gaze travels TOWARD when reading — natural for label association.

### §10.4 Mobile fallback

Hide entire nav at `width < 768px`. Top nav (existing) takes over. Document this decision in `README.md` under "responsive behaviour" (Agent 19's job).

---

## §11 DOM

Injected by `init()` once (like loading-overlay), never per-section update.

```html
<nav class="side-dot-nav"
     role="tablist"
     aria-label="ניווט מהיר באתר"
     aria-orientation="vertical">
  <a href="#hero"
     class="side-dot-nav__dot"
     role="tab"
     data-section="hero"
     aria-current="true"
     aria-controls="hero">
    <span class="side-dot-nav__label">פתיחה</span>
    <span class="sr-only">נווט אל פתיחה</span>
  </a>

  <a href="#hall-resort"
     class="side-dot-nav__dot"
     role="tab"
     data-section="hall-resort"
     aria-controls="hall-resort">
    <span class="side-dot-nav__label">ריזורט</span>
    <span class="sr-only">נווט אל ריזורט</span>
  </a>

  <!-- ... 6 more dots, same pattern ... -->
</nav>
```

### §11.1 DOM rationale

- Each dot is `<a href="#...">` — graceful no-JS fallback (browsers handle hash-jump natively).
- `role="tab"` per dot is correct here despite no `tabpanel`s — the sections are the implicit panels (anchored by `aria-controls`). Some screen readers may require `role="tablist"`+`role="tab"` to read dot count ("tab 3 of 8").
- `aria-orientation="vertical"` lets screen readers know arrow keys move vertically.
- `aria-current="true"` on the active dot (mutually exclusive — only one at a time).
- `<span class="sr-only">` provides a longer, friendlier announcement for screen readers ("נווט אל ריזורט") since the visual label is terser.
- `aria-controls="<section-id>"` formally connects each dot to its section.

### §11.2 Insertion point

End of `<body>` in `index.html`. Same insertion point as loading-overlay (so chrome elements are grouped). Side-dot-nav z-index is `var(--z-sticky)` (= 100). Loading-overlay z-index is `var(--z-overlay)` (= 1000). When overlay is shown, it covers the dots. Correct.

---

## §12 Active-State Tracking

### §12.1 IntersectionObserver setup

```js
const sections = ["hero", "hall-resort", "hall-venue", "rooms", "culinary",
                  "about", "testimonials", "contact"];

const io = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        setActive(entry.target.id);
      }
    }
  },
  {
    // Active when section's middle band crosses viewport center.
    rootMargin: "-40% 0px -40% 0px",
    threshold: 0,
  }
);

sections.forEach((id) => {
  const el = document.getElementById(id);
  if (el) io.observe(el);
});
```

`setActive(id)` walks `state.dots` and toggles `aria-current` to "true" for the matching dot, removes from others.

### §12.2 Hero special-case

The hero is `position: sticky` over a 700 vh spacer (per `architecture/scroll-video-system.md`). Standard IO won't behave correctly because the section's bounding rect changes with scroll inside the sticky.

**Solution:** Subscribe to `window.gamosHero.onProgress(progress)` (same hook used by portals.js). Logic:

```js
window.gamosHero?.onProgress?.((progress) => {
  if (progress < 0.85) {
    setActive("hero");           // hero is dominant
  }
  // else: portals stage — let IO take over for hall-resort / hall-venue.
});
```

If `window.gamosHero` is unavailable (hero module failed to load, or iOS fallback), the standard IO falls back — slightly less accurate during scrub but still functional.

### §12.3 Suppression during loading-overlay

When loading-overlay is `visible` (state machine in §5.4), pause IO updates by setting a flag `state.suppressed = true`. Resume on overlay `hidden`. Why: during the 800 ms overlay window the user is mid-scroll-jump; updating the active dot mid-flight creates visible flicker as the dot transitions through intermediate sections.

```js
window.addEventListener("gamos:loading-show", () => { state.suppressed = true; });
window.addEventListener("gamos:loading-hide", () => { state.suppressed = false; });
```

Loading-overlay must dispatch these events (add to §5 contract — Agent 19 implements both modules and wires events).

---

## §13 Click → Smooth Scroll

```js
function onDotClick(event) {
  event.preventDefault();
  const dot = event.currentTarget;
  const sectionId = dot.dataset.section;
  const target = document.getElementById(sectionId);
  if (!target) return;

  // Update URL hash without browser default scroll-jump.
  history.pushState(null, "", `#${sectionId}`);

  // Smooth-scroll (or instant if reduced-motion).
  target.scrollIntoView({
    behavior: state.reducedMotion ? "auto" : "smooth",
    block: "start",
  });

  // Optimistic active-state update — IO will confirm in 1-2 frames.
  setActive(sectionId);
}
```

### §13.1 Hero click special

When user clicks the "פתיחה" dot, target is `#hero`. `scrollIntoView({block: "start"})` scrolls to the top of the hero section. Because hero has `hero__spacer` (700 vh) as its first child, this places the user back at the top — meaning the wordmark animation re-plays from `intro` stage. **This is desired.** Document it in the dot tooltip recommendation: "פתיחה" implies "experience-replay". User testing may show this is too loud — if so, add a `data-rebrand="false"` opt-out in v2.

### §13.2 No loading-overlay

Side-dot clicks **never** trigger the loading-overlay. Why: side-dot navigation is a known, intentional jump — the user is steering. The overlay's purpose is to mask portal-click ambient transition; side-dot is a deliberate teleport, smoother UX is **less** ceremony, not more.

---

## §14 Accessibility

### §14.1 ARIA roles

- `role="tablist"` on container — implies a group of related tabs.
- `role="tab"` on each dot — paired with the implicit "panel" (the section).
- `aria-orientation="vertical"` — informs SR + AT about arrow-key direction.
- `aria-current="true"` on the active dot. Mutually exclusive.
- `aria-controls="<section-id>"` — formal link to section.
- `aria-label="ניווט מהיר באתר"` on the nav — friendly group label.
- `<span class="sr-only">` per dot — full-sentence label for SR.

### §14.2 Keyboard

| Key | Behavior |
|-----|----------|
| `Tab` | Focus enters first dot; subsequent `Tab`s exit nav (focus order continues to next focusable in document). |
| `Shift+Tab` | Reverses focus through dots. |
| `ArrowDown` / `ArrowUp` | Moves focus to next/previous dot (wraps at ends). |
| `Home` | Moves focus to first dot. |
| `End` | Moves focus to last dot. |
| `Enter` / `Space` | Activates focused dot — same as click. |

Implementation: `keydown` listener on the nav container; preventDefault for Arrow/Home/End.

### §14.3 Focus ring

Per Constitution §9: `outline: 3px solid var(--brass)` + `outline-offset: 4px`. Active dot keeps the box-shadow glow; focus ring sits OUTSIDE the dot, so they don't visually conflict.

### §14.4 Reduced-motion

- `scrollIntoView({behavior: "auto"})` (instant scroll).
- Dot transitions still animate at 0.01 ms (per `tokens.css` reduced-motion override) — effectively instant but not removed.
- Tooltip fade still works at 0.01 ms — effectively instant. No issue.

### §14.5 Screen reader announcement on active change

When the user scrolls and the active dot changes, do **not** auto-announce the new section. Why: announcing on every IO change would be noise (user is intentionally scrolling). The `aria-current` change is silent — SR users can navigate via dot tab + arrow keys to inspect. If user research later shows SR users want passive announcements, add a `<div aria-live="polite" class="sr-only">` that updates with the section name. Defer.

---

## §15 Files Agent 19 Will Create

```
js/side-dot-nav.js               [new]   ESM module, init/destroy
css/components/side-dot-nav.css  [new]   All visual styles
```

**Wiring:**
- `index.html`: add `<link rel="stylesheet" href="/css/components/side-dot-nav.css">`.
- `js/main.js`: import `side-dot-nav.js` and call `init()` AFTER hero module init (so `window.gamosHero.onProgress` is available).

**Sr-only utility.** `.sr-only` already exists somewhere (likely `css/utilities.css`). Agent 19 must verify; if missing, do NOT add it inside `side-dot-nav.css` — add it to utilities.css per §10.2.

---

# PART C — Coordination

## §16 Loading-Overlay × Side-Dot-Nav Cooperation

| Scenario | Loading Overlay | Side-Dot Nav |
|----------|-----------------|--------------|
| Portal click → expand → scroll to hall | **Shown** ~800 ms | Visible underneath; active-state updates **suppressed** during overlay window. |
| Side-dot click → scroll to section | NOT shown | Active dot updates optimistically on click; IO confirms after scroll lands. |
| User manual scroll | NOT shown | IO drives active-state updates in real-time. |
| Hero scrub (no portal click yet) | NOT shown | Hero dot active via `window.gamosHero.onProgress` hook. |

### §16.1 Event contract

`js/loading-overlay.js` MUST dispatch on `window`:
- `"gamos:loading-show"` at `t=0` (overlay show begins).
- `"gamos:loading-hide"` at `t=800ms` (overlay fully removed).

`js/side-dot-nav.js` MUST listen for these events (per §12.3) and toggle `state.suppressed`.

This is the only coupling between the two modules — both can ship and test independently.

### §16.2 z-index discipline

| Layer | z-index token | Used by |
|-------|---------------|---------|
| Base content | `--z-base` (0) | Sections |
| Site nav (sticky top) | `--z-sticky` (100) | `.site-nav` (existing) |
| Side-dot nav | `--z-sticky` (100) | `.side-dot-nav` |
| Loading overlay | `--z-overlay` (1000) | `.loading-overlay` |
| (reserved) modal | `--z-modal` (2000) | future |

Side-dot nav and site-nav share `--z-sticky`. They do not visually overlap (site-nav is at top, side-dot is at vertical-center on right). If they ever do (e.g., very short viewport), site-nav DOM order wins (it appears first in DOM, so siblings later in DOM stack above when same z-index — verify; if needed, bump side-dot to `101`).

---

## §17 Implementation Order for Agent 19

Six steps. Each step is independently testable.

### Step 1 — Loading Overlay CSS + DOM injection
- Create `css/components/loading-overlay.css` with all styles from §2.
- Create `js/loading-overlay.js` skeleton with `init()` that injects DOM (§4) and `destroy()` that removes it.
- Wire in `index.html` (link CSS) and `js/main.js` (import + init early in bootstrap).
- **Test:** Open page; manually run `window.gamosLoading.show()` in console; verify visual.

### Step 2 — Loading Overlay state machine
- Implement `show() / hide() / isVisible()` per §5.
- Wire `gamos:loading-show` / `gamos:loading-hide` events per §16.1.
- Add reduced-motion variant per §6.2.
- **Test:** Console-driven `show().then(() => hide())` cycles correctly. Reduced-motion verified.

### Step 3 — Loading Overlay integration with portals.js
- Modify `js/portals.js` `expandPortal` `onComplete` to await `gamosLoading.show()` then schedule `hide()` per §5.3.
- Defensive fallback if `window.gamosLoading` undefined.
- **Test:** Click each portal; overlay appears, holds, disappears smoothly. Both reduced-motion and full-motion paths verified.

### Step 4 — Side-Dot Nav CSS + DOM injection
- Create `css/components/side-dot-nav.css` with all styles from §10.
- Create `js/side-dot-nav.js` skeleton with `init()` that injects DOM (§11) for all 8 dots from §9.
- Wire in `index.html` (link CSS) and `js/main.js` (import + init AFTER hero module init).
- **Test:** Page loads; 8 dots visible on right edge desktop; hidden on mobile; tooltips work on hover.

### Step 5 — Side-Dot Nav active-state tracking
- IntersectionObserver per §12.1.
- Hero special-case via `window.gamosHero.onProgress` per §12.2.
- Suppression listener per §12.3 + §16.1.
- **Test:** Scroll through page; active dot updates as sections cross viewport center. Trigger portal click; active-state suppressed during overlay; resumes after.

### Step 6 — Side-Dot Nav click + keyboard
- Click handler with `history.pushState` per §13.
- Keyboard handler for Tab / Arrow / Home / End / Enter per §14.2.
- Verify focus ring visible per §14.3.
- **Test:** Tab through dots; arrow-keys move focus; Enter scrolls. Reduced-motion variant: instant scroll.

After Step 6: full WCAG 2.2 AA audit pass (Constitution §11 DoD).

---

## §18 Out of Scope (Defer)

- Mobile bottom-bar nav alternative.
- Section-progress within section (e.g., inner anchors in `#about`).
- Active-dot "scrubbing" preview when user hovers without clicking.
- Customizable dot count via `data-` attribute.
- Loading-overlay variants per route (e.g., resort vs. venue brand frame).
- "Scroll memory" — restoring exact scroll position when user returns via dot.

These can be added in v2 without breaking the contracts in this spec.

---

## §19 Open Questions for User Validation

1. **Caption text.** "טוען חוויה" recommended in §2.2. User may prefer no caption (purely visual).
2. **Dot for `#rooms` vs `#lounge`.** §9.1 picks rooms. User may prefer lounge if business priority differs.
3. **Hero click re-plays the intro animation.** §13.1 — user may prefer a "soft top" (no animation re-play) — toggle is one config flag.
4. **Loading overlay duration.** 800 ms locked per user. If hall sections take longer to load real videos, may need per-target customization.

These are flagged for user input but do not block Agent 19 — defaults shipped, easy to flip later.

---

**END OF SPEC.**
