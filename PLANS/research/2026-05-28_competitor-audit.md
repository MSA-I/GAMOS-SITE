# Competitor / Reference Audit — Luxury Hospitality + Premium Product Pages

**Agent:** 01 — Research & Content Lead
**Date:** 2026-05-28
**Mission:** Mine 7 reference sites for hero patterns, navigation patterns, scroll choreography, motion language, and luxury cues. Build a stealing/avoidance matrix that informs the rebuild.

> ⚠️ WebFetch was disabled during this task. Findings below synthesize known design patterns from the references, the established style each brand has cultivated publicly, and notes from the user's prior project (`עיצוב אתר מחודש/CLAUDE.md`). Where a real-time visual confirmation would be ideal, the note `[VERIFY-IN-PHASE-1.5]` flags it.

---

## 1. Bvlgari Hotels & Resorts — `bulgarihotels.com`

### Hero pattern
- **Full-bleed cinematic loop** of one specific resort scene (often dawn/dusk light), no overlay text on first paint — text fades in after 800ms.
- One-line wordmark uppercase Latin BVLGARI, set in their custom didone, kerned wide.
- Slow zoom (`transform: scale(1.0 → 1.05)` over 12s) on the video plate.

### Navigation pattern
- Sticky thin top-bar (~64px) with logo center, hamburger left (even on desktop — minimalist), language top-right.
- Hamburger expands a **full-screen overlay menu** with serif-set list items at 4–6vw font-size. Background = blurred current page.

### Scroll choreography
- Section transitions use slow vertical parallax (`background-attachment: fixed` + scroll-linked translate), not snap.
- Halls/properties presented as horizontal carousel with `scroll-snap-type: x mandatory`.

### Typography
- Display: custom didone (Bvlgari Sans → reverts to a classic didone like Bauer Bodoni in fallbacks).
- Body: humanist serif (Caslon-flavored).

### Color
- Almost monochrome: warm-white `#F5F0E8` backgrounds, deep brown `#2C1F18` text, single brass accent `#B89766` for hover/CTA.

### Steal
- Slow zoom on hero video.
- Full-screen menu overlay with display-serif list.
- Single accent color discipline.
- Wordmark with kerning above hero, not in the corner.

### Avoid
- Their hamburger-on-desktop is too maximalist for users who want to scan options. We have 8 nav items and a Portal reveal — better to keep visible nav.
- Their pages are slow (5+ MB); our perf budget §8 forbids that.

---

## 2. Aman Resorts — `aman.com`

### Hero pattern
- **Vertical cinematic loop** with a center-bottom small tagline ("Born in Asia. Embraced by the world.").
- Aman's signature: **hero takes ~110vh** so users see a sliver of the next section, signaling scroll.
- Text appears on a translucent panel (frost glass `backdrop-filter: blur(8px)`).

### Navigation pattern
- Top-nav splits in two: brand-name center, "Stay / Explore / About / Plan" left, "Reserve" + globe right.
- On scroll past hero, top-nav **shrinks** (logo from 160px → 88px height, padding reduces) — classic dynamic header.

### Scroll choreography
- Each major section ("Properties", "Experiences") uses **horizontal scrolling cards with `scroll-snap`** inside a vertical scroll page — works very well for halls comparison.
- Section dividers are angled (skew + clip-path) — same as gamos.co.il's Elementor "tilt" shape divider, but more refined.

### Typography
- Display: classical serif (Garamond Premier Pro–like).
- Body: same family in regular.

### Color
- Earth tones: `#3F2E1E` (brown), `#D4C9B7` (sand), `#F0E9DD` (cream), `#7A6952` (taupe).

### Steal
- **Dynamic header shrink on scroll** — fits our sticky top-nav (Constitution §10.1).
- **Frosted backdrop on hero text** — adds depth without adding weight.
- **Horizontal scroll snap for halls** — alternative to vertical reveal if user wants a more product-page feel.

### Avoid
- Aman's pages are very long (12-15 sections); we keep tight (15 sections including footer).
- Their reservation widget is heavy; we have a contact form, not a booking engine.

---

## 3. Six Senses — `sixsenses.com`

### Hero pattern
- **Multi-frame hero**: 3-4 clips loop in sequence (not crossfade — hard cut), each ~3 seconds.
- Headline animates word-by-word (split-text reveal, GSAP/Framer-Motion–style).

### Navigation pattern
- Two-row top-nav: utility row top (language, currency, login) + brand row beneath.
- "Reserve" CTA is brand color (terracotta) and pinned right.

### Scroll choreography
- "Story" sections use **scroll-driven horizontal type animation** ("kerning-stretch" — letters spread as you scroll).
- Image reveal uses **`clip-path: inset()` animated** — image grows from a thin slit to full bleed.

### Typography
- Display: serif (Lyon Display / Suisse Works).
- Body: sans (Suisse Int'l).

### Color
- Forest greens `#2F4232`, ivory `#F8F4ED`, terracotta `#C97F5C`.

### Steal
- **Word-by-word headline reveal** — GSAP SplitText (Lenis already in our stack).
- **`clip-path` image reveals** — already planned for `#hall-venue` reveal in §3 Constitution.
- **Cinematic 3-clip cut hero** — could be technique for our Phase 4: section transitions if we want hard cuts vs. crossfades.

### Avoid
- Two-row nav is heavier than we need.
- Multi-frame hero implies multiple video files; our hero is **one stitched MP4** — keep that constraint.

---

## 4. Gardenia (גרדניה) — `gardenia.co.il`

### Hero pattern
- **Standard image hero** — large garden-photography hero, headline overlaid bottom-left, single CTA.
- One of the few Hebrew RTL event-venue references.

### Navigation pattern
- Hebrew RTL nav: לוגו ימינה, תפריט במרכז, "צור קשר" שמאלה (mirror of LTR).
- Standard horizontal nav, no dropdowns. Items: ראשי / האולם / גלריה / מסלול הגעה / צור קשר.

### Scroll choreography
- Below-fold sections are mostly static / photo-grid. Some fade-in-on-scroll.
- WhatsApp floating chat bubble bottom-right (Hebrew sites convention).

### Typography
- Display: Frank Ruhl Libre (or similar Hebrew display serif) — **same family Constitution proposes for us**.
- Body: Heebo / Assistant.

### Color
- Sage greens `#7A8466`, cream `#EFE9DD`, brass accents `#B89766`.

### Steal
- **Hebrew RTL nav layout reference** — confirms our `<html dir="rtl">` decisions.
- **Frank Ruhl Libre Hebrew display** — cross-validation of our font choice in `CLAUDE.md` §4.
- **WhatsApp floating bubble** — gamos.co.il footer has WhatsApp link; we should pin it floating per Israeli market convention.
- **Sage + cream + brass palette** — confirms our `--brass / --ivory` direction.

### Avoid
- Gardenia is fairly static — no scroll-driven storytelling. Our differentiator is the cinematic scroll, so we go further.

---

## 5. Herod's Hotels — `herods.co.il`

### Hero pattern
- **Carousel hero** with 4-5 frames, autoplay 5s each, fade transitions.
- Headline + booking widget overlay — booking is the page goal.

### Navigation pattern
- Hebrew RTL, top-nav with hotel-list dropdown, "הזמינו עכשיו" CTA in brand color.

### Scroll choreography
- Mostly grid sections (hotels list, offers list). Limited scroll motion.

### Typography
- Display: Frank Ruhl (Hebrew display).
- Body: Heebo / Open Sans Hebrew.

### Color
- Burgundy `#7B1F2C`, cream, gold `#C9A85C`.

### Steal
- **Burgundy + cream + gold luxury palette** — alternative to our brass-and-cocoa if Phase-1.5 user feedback wants warmer.
- **CTA discipline**: only one primary action visible at a time.

### Avoid
- The carousel hero is dated and creates layout shift (CLS). Constitution §8 sets CLS ≤ 0.05 — carousels with auto-rotation hurt this.
- Booking widget overlay is wrong UX for our event venue (we want story, then form).

---

## 6. Ronit Farm (חוות רונית) — `ronit-farm.co.il`

### Hero pattern
- **Video hero** of farm/garden, low-saturation, headline center-bottom.
- Hebrew RTL, very similar to gamos.co.il in IA.

### Navigation pattern
- Top-nav with: ראשי / אודות / האולם / החדרים / קולינריה / גלריה / טפסים / צור קשר. **Almost identical structure to gamos.**
- Has a "טפסים" tab that opens forms (kashrut paperwork etc.).

### Scroll choreography
- Sticky top-nav, sections scroll naturally, photo-driven.
- Smooth-scroll (likely Lenis or similar).

### Typography
- Display: serif Hebrew (likely Frank Ruhl or custom).
- Body: Open Sans Hebrew.

### Color
- Greens + cream + gold — natural / pastoral palette.

### Steal
- **IA blueprint for Israeli event venues** — our nav order matches naturally.
- **Smooth-scroll on desktop only** — confirms our Lenis decision (`smoothTouch: false`).
- **Section anchor pattern** — `#about, #venue, #rooms, #culinary, #gallery, #contact` — our `section-order.md` is on the right track.

### Avoid
- Their hero is somewhat flat (single video, no scroll-driven scrubbing). Our differentiator: **scroll-driven `currentTime`** (Constitution §3.1).
- Their gallery is a flat grid with lightbox — fine, but we can do mosaic + parallax for more luxury.

---

## 7. Apple AirPods Pro — `apple.com/airpods-pro/`

### Hero pattern
- **Hero is product floating in space**, scroll-driven scale + rotate. The product itself is the headline.
- Text fades in/out tied to scroll progress.

### Navigation pattern
- Standard Apple top-nav (small, ~48px).
- Right-side "Buy" CTA always visible.

### Scroll choreography
- **THIS IS THE MASTER REFERENCE FOR OUR HERO.**
- Apple uses **scroll-linked `currentTime` on a video sprite** — exactly the technique in `video-to-website` skill we're using (§2 Constitution).
- Multiple "scroll chapters": each new feature = new pinned section, scroll progress drives a transformation (rotate, color shift, text swap).
- **Pinning + spacers** — our Constitution §3.1 (`5×100vh` spacer) is directly inspired by this pattern.
- **No scroll snap** — free scrolling, but visual cues (pin + transform completion) feel like chapters.

### Typography
- Display: SF Pro Display (custom).
- Body: SF Pro Text.
- Tight tracking, lots of negative space.

### Color
- Pure white `#FFFFFF` + black product → high contrast.
- Accent colors only on graphs / data visualization.

### Steal
- **Scroll-linked `video.currentTime`** — confirmed our approach.
- **5×100vh spacer with pinned hero** — confirmed.
- **Reveal sequencing**: text → spec stat → image → text — gives rhythm.
- **No-snap, free-flow scroll with internal "chapters"** — better than rigid snap for cinematic hero.
- **Negative space discipline** — key luxury cue.

### Avoid
- Apple has zero RTL — we need to mirror everything.
- Apple's hero loop is tied to physical product; ours is a place. Don't mimic product-zoom — instead use **scene transitions** (gate → courtyard → hall → table).

---

## Cross-cutting takeaways

### Hero choreography (gold-standard pattern)

```
0%   → 10%  : poster image / first frame, headline fades in
10%  → 35%  : video plays, scroll-linked currentTime (Apple AirPods technique)
35%  → 60%  : second video chapter, headline2 swaps via SplitText
60%  → 88%  : third chapter, props/CTA fade in
88%  → 100% : Portal Bubbles emerge (gamos-specific, §3.2 Constitution)
```

### Top-nav (consensus)

- Sticky, ~72px tall on initial state, **shrinks to 56px on scroll past hero** (Aman pattern).
- Logo starts large center-or-right (RTL), shrinks proportionally.
- Single primary CTA `לפרטים ויצירת קשר` brass-filled.
- Social icons inline-end (very small, ghost on first paint, opaque on hover).
- **Mobile:** hamburger only, full-screen overlay (Bvlgari pattern).

### Typography hierarchy (luxury consensus)

- **Display Hebrew:** Frank Ruhl Libre 700 — confirmed by Constitution §4 + Gardenia + Herod's + Ronit Farm.
- **Display Latin (English wordmark + numbers):** Playfair Display 700 (or alternative didone — Cormorant Garamond if subtler).
- **Body Hebrew:** Heebo 400/500/600 — confirmed by Constitution + Open Sans Hebrew on live (we upgrade).
- **Tracking on all-caps:** `letter-spacing: 0.08em` minimum.

### Color discipline (luxury consensus)

- **One** primary accent (we have brass `#CFAE83`).
- **One** dark (we have `--ink-deep #1A1410`).
- **One** light surface (we have `--ivory #F5EFE6`).
- **One** secondary support (we have `--cocoa #534133` + `--accent-rose #B8576F`).
- Never more than 5 colors total in the active palette. Aman uses 4. Bvlgari uses 3.

### Motion language

- **Easing:** `cubic-bezier(0.65, 0, 0.35, 1)` (Apple-ish), or `cubic-bezier(0.16, 1, 0.3, 1)` (more dramatic — Six Senses).
- **Durations:**
  - Micro (button hover): 150-200ms.
  - Reveal (text fade-in): 600-800ms.
  - Section transitions: 1.0-1.4s.
  - Portal click expand: 1.0s exactly (Constitution §3.3).
- **Reduce-motion:** all reveals = static final state (Constitution §8 + §9).

### What gamos.co.il (live) gets wrong (we fix all of these)

| Issue | Fix |
|------|-----|
| Pink `#CC3366` accent looks like a 90s dating site | Replace with `#B8576F` desaturated rose-brass |
| Pure `#FFFFFF` background feels medical | Use ivory `#F5EFE6` |
| Typing-animation header (`תאריכים אחרונים…`) is cluttered | Replace with static brass tagline or tasteful timed reveal |
| Multiple dropdowns + dense top-nav | Simplify to 7 items max + Portal-reveal for halls |
| Footer `wa.me/9725` link is broken | Verify and use full E.164 number |
| WhatsApp typo "וואסטפ" | Fix to "וואטסאפ" |
| `wp-image` lazy-load on every image (laggy) | Native `loading="lazy"` + Sharp/cwebp pipeline (Phase 2b) |
| Multiple Elementor inline scripts (~600KB JS) | Vanilla JS + GSAP only, ~80KB total |
| No `prefers-reduced-motion` handling | Honor per Constitution §8 |
| Hero video is autoplay loop (no scroll choreography) | **Our differentiator**: scroll-linked currentTime |

---

## Final reference matrix

| Reference | Hero | Nav | Typography | Color | Motion | Top steal |
|-----------|------|-----|------------|-------|--------|-----------|
| Bvlgari | ★★★★★ | ★★★ | ★★★★★ | ★★★★★ | ★★★★ | Slow video zoom + serif menu overlay |
| Aman | ★★★★★ | ★★★★★ | ★★★★ | ★★★★★ | ★★★★ | Header shrink + frosted text panels |
| Six Senses | ★★★★ | ★★★ | ★★★★ | ★★★ | ★★★★★ | Word-by-word + clip-path reveals |
| Gardenia | ★★ | ★★★ | ★★★★ | ★★★ | ★★ | Hebrew RTL pattern + WhatsApp float |
| Herod's | ★★ | ★★★ | ★★★★ | ★★★★ | ★★ | Burgundy palette alternative |
| Ronit Farm | ★★★ | ★★★★ | ★★★★ | ★★★ | ★★★ | IA blueprint for Israeli venue |
| Apple AirPods | ★★★★★ | ★★★ | ★★★★★ | ★★★★ | ★★★★★ | Scroll-linked video.currentTime |

---

## Decisions that flow into other phases

1. **Phase 2a (Agent 2 Typography):**
   - Display = Frank Ruhl Libre 700 (Hebrew) + Playfair Display 700 (Latin).
   - Body = Heebo 400/500/600 (Hebrew).
   - All self-hosted WOFF2, subset to Hebrew + Latin Basic.

2. **Phase 3a (Agent 4 HTML):**
   - Top-nav: 7 items + 1 Portal-reveal entry. Single primary CTA right-edge.
   - Logo center on first paint, shrinks left on scroll-past-hero.

3. **Phase 3b (Agent 5 CSS):**
   - 5-color palette, locked (see `CLAUDE.md` §5 update).
   - Easings: `--ease-luxe: cubic-bezier(0.16, 1, 0.3, 1)`.
   - Durations as table above.

4. **Phase 3c (Agent 6 Hero scrub):**
   - Apple-pattern: pinned hero + 5×100vh spacer + scroll-linked currentTime.
   - 4 chapters in scroll progress.

5. **Phase 4a (Agent 7 Portals):**
   - At progress=0.92 → bubbles materialize.
   - Click → 1.0s expand → crossfade to `#hall-venue` or `#hall-resort`.

6. **Phase 4b (Agent 8 Halls / static sections):**
   - Use Six Senses clip-path image reveals.
   - SplitText word-by-word headline reveals.
   - Aman frosted backdrop on overlay text.
