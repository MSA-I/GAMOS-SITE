/* ===========================================================================
   shabbat-gallery.js — GSAP pinned mask-reveal driver

   Port of CodePen WbQPRwv ("GSAP pinned image mask reveal on scroll" by
   gridmorphic). The desktop timeline pins .shabbat__stage across the parent
   .shabbat__container (5 panels × 100vh = 500vh of scroll). For each
   transition between panels: the topmost image's clip-path wipes upward
   (inset 0 → inset 0 0 100%) while its object-position pans downward
   (0% → 60%); simultaneously the next image's object-position eases to
   40%; the section's background-color cross-fades to the next pastel.

   Mobile (≤768px) drops the pin and instead attaches one ScrollTrigger per
   image for an object-position pan + body tint shift, matching the pen's
   responsive split. Mobile interleave (panel/image/panel/image) is owned
   by mobile/js/shabbat-chatan-mobile.js.

   prefers-reduced-motion: reduce → bails (no GSAP), the static CSS
   fallback in css/sections/shabbat-chatan.css renders cleanly. The MQL is
   monitored live: toggling the OS-level setting will tear down or rebuild
   the timeline without a page reload.

   Constitution §2 (vanilla + self-hosted GSAP), §4 (RTL — only block-axis
   animation, no left/right semantics), §10 (init/destroy lifecycle, no
   globals).

   Modernization pass (fixes 3, 4, 5, 6, 7, 12, 13, 14, 15):
   - Mobile ScrollTrigger window now `top bottom → bottom top` (natural
     enter-to-leave) instead of the old offset that fired post-offscreen.
   - destroy() clears every inline style GSAP wrote (clip-path,
     object-position, background-color).
   - init() is idempotent (`if (_mm) return`).
   - gsap.matchMedia() (modern API) replaces the deprecated
     ScrollTrigger.matchMedia(); _mm.revert() handles cleanup.
   - ScrollTrigger.refresh() runs on next RAF after init for layout
     stability (mobile reorder runs after this module).
   - prefers-reduced-motion is monitored via a persistent MQL listener
     so toggling the OS setting tears down or rebuilds without a reload.
   - Single unconditional gsap.registerPlugin (no dead branch).
   - Removed redundant _scrollTriggers / _tweens arrays (revert handles it).
   - Removed stale removeProperty("--shabbat-tint") (JS never wrote it).
   ========================================================================= */

const SECTION_SELECTOR = "#shabbat-chatan";
const CONTAINER_SELECTOR = ".shabbat__container";
const STAGE_SELECTOR = ".shabbat__stage";
const IMG_SELECTOR = ".shabbat__media img";

const TINT_VARS = [
  "--shabbat-tint-1",
  "--shabbat-tint-2",
  "--shabbat-tint-3",
  "--shabbat-tint-4",
  "--shabbat-tint-5",
];

let _section = null;
let _mm = null;

const _rmMQL = window.matchMedia("(prefers-reduced-motion: reduce)");
let _rmListenerInstalled = false;

function readTints() {
  // Single computed-style read per build invocation (was 5 in the old code).
  const cs = getComputedStyle(document.documentElement);
  return TINT_VARS.map((v) => (cs.getPropertyValue(v) || "").trim() || "#EDF9FF");
}

function buildDesktopTimeline(gsap, ScrollTrigger) {
  const stage = _section.querySelector(STAGE_SELECTOR);
  const container = _section.querySelector(CONTAINER_SELECTOR);
  const imgs = Array.from(_section.querySelectorAll(IMG_SELECTOR));
  if (!stage || !container || imgs.length === 0) return;

  // Defensive z-index: DOM order is data-index="5..1"; topmost image
  // (imgs[0], data-index="5") must paint above its successors so its
  // clip-path wipe reveals imgs[1] beneath. Inline z-index follows DOM
  // order regardless of image count (defense for future panel changes).
  imgs.forEach((img, i) => {
    const fig = img.closest(".shabbat__media");
    if (fig) fig.style.zIndex = String(imgs.length - i);
  });

  // Initial state: all images fully visible, anchored top.
  gsap.set(imgs, { clipPath: "inset(0px 0px 0px 0px)", objectPosition: "0% 0%" });

  const tints = readTints();

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: container,
      start: "top top",
      end: "bottom bottom",
      pin: stage,
      pinSpacing: false,
      scrub: true,
      invalidateOnRefresh: true,
    },
  });

  // Per-transition: image[i] wipes up + pans down to 60%, image[i+1] pans
  // to 40% as it's revealed, section background cross-fades to tints[i+1].
  // The DOM order is data-index="5..1" meaning imgs[0] is the topmost.
  // Panel 1 → panel 2 reveals imgs[1], etc. We iterate over all but the last.
  for (let i = 0; i < imgs.length - 1; i++) {
    const sub = gsap.timeline();

    sub.to(_section, {
      backgroundColor: tints[i + 1],
      duration: 1.5,
      ease: "power2.inOut",
    }, 0);

    sub.to(imgs[i], {
      clipPath: "inset(0px 0px 100% 0px)",
      objectPosition: "0% 60%",
      duration: 1.5,
      ease: "none",
    }, 0);

    sub.to(imgs[i + 1], {
      objectPosition: "0% 40%",
      duration: 1.5,
      ease: "none",
    }, 0);

    tl.add(sub);
  }
}

function buildMobileTimeline(gsap, ScrollTrigger) {
  const imgs = Array.from(_section.querySelectorAll(IMG_SELECTOR));
  if (imgs.length === 0) return;

  gsap.set(imgs, { objectPosition: "0% 60%" });
  const tints = readTints();

  imgs.forEach((image, index) => {
    const inner = gsap.timeline({
      scrollTrigger: {
        trigger: image,
        // Natural enter-to-leave window — was "top-=70% top+=50%" /
        // "bottom+=200% bottom" which fired only after the image scrolled
        // offscreen. The Ken-Burns pan + tint now run as each image
        // crosses the viewport.
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    inner.to(image, {
      objectPosition: "0% 30%",
      duration: 5,
      ease: "none",
    });
    inner.to(_section, {
      // 5-image cap — defensive clamp in case markup grows beyond the
      // 5 declared --shabbat-tint-N tokens.
      backgroundColor: tints[Math.min(index, tints.length - 1)],
      duration: 1.5,
      ease: "power2.inOut",
    });
  });
}

function onRMChange(e) {
  if (e.matches) {
    destroy();
  } else if (!_mm) {
    init();
  }
}

function ensureRMListener() {
  if (_rmListenerInstalled) return;
  _rmListenerInstalled = true;
  _rmMQL.addEventListener("change", onRMChange);
}

export function init() {
  // Idempotency guard — bail if a build is already live.
  if (_mm) return;

  _section = document.querySelector(SECTION_SELECTOR);
  if (!_section) return;

  // Install the RM listener exactly once for the page lifetime, even if
  // we bail immediately due to REDUCED_MOTION. That way toggling RM off
  // later re-enters init() and builds the timeline.
  ensureRMListener();
  if (_rmMQL.matches) {
    _section = null;
    return;
  }

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  if (!gsap || !ScrollTrigger) {
    console.warn("[shabbat-gallery] GSAP or ScrollTrigger missing — skipping init.");
    _section = null;
    return;
  }

  // GSAP's registerPlugin is itself idempotent — single unconditional call.
  gsap.registerPlugin(ScrollTrigger);

  _mm = gsap.matchMedia();
  _mm.add("(min-width: 769px)", () => buildDesktopTimeline(gsap, ScrollTrigger));
  _mm.add("(max-width: 768px)", () => buildMobileTimeline(gsap, ScrollTrigger));

  // Refresh on next frame so triggers measure post-layout — covers the
  // case where mobile-mobile.js (or any later module) shifts layout via
  // style.order / display changes after this module initialized.
  requestAnimationFrame(() => {
    try { ScrollTrigger.refresh(); } catch { /* ignore */ }
  });
}

export function destroy() {
  if (_mm) {
    try { _mm.revert(); } catch { /* ignore */ }
    _mm = null;
  }
  if (_section) {
    Array.from(_section.querySelectorAll(IMG_SELECTOR)).forEach((img) => {
      img.style.removeProperty("clip-path");
      img.style.removeProperty("-webkit-clip-path");
      img.style.removeProperty("object-position");
    });
    _section.style.removeProperty("background-color");
  }
  _section = null;
}
