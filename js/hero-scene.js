/**
 * hero-scene.js — cinematic scroll-pinned hero (REBUILT 2026-06-15)
 *
 * VERBATIM PORT of the findrealestate sandbox hero GSAP code
 * (`…/findrealestate-clone - עותק/_next/static/chunks/app/(home)/page-*.js`).
 * The scrub + entrance timelines below copy the sandbox's exact tweens, targets,
 * durations, eases and positions 1:1 — only adapted from React refs to DOM
 * queries (source class names: .hero_root/.hero_top/…) and from the bundled GSAP
 * to GAMOS-SITE's self-hosted globals (window.gsap + ScrollTrigger + DrawSVGPlugin
 * + SplitText, all GSAP 3.15.0, loaded `defer` in index.html).
 *
 * Sandbox ref → element map:
 *   A = .hero_back              (sky, for the entrance scale-in)
 *   s = .hero_bg > .hero_house  (desert subject)
 *   g = .hero_composite .hero_house (composite-house copy)
 *   t = .hero_cloud:first       (left cloud)   i = .hero_cloud:last (right cloud)
 *   x = .hero_content           b = .hero_logo   c = .hero_composite
 *   f = .hero_top .hero_smoke    I = .hero_title h1 (SplitText target)
 *
 * Faithful effects restored vs. the earlier port:
 *   • drawSVG — the logo letters stroke on (A.fromTo("svg path",{drawSVG:"0%"}…)).
 *   • SplitText — the title reveals word-by-word on entrance (stagger .1).
 *
 * Also: installs window.gamosHero (onProgress over the 500vh → side-dot-nav
 * HERO_DOMINANCE + portals) and routes the composer EVENTS/RESORT CTAs to the
 * halls sub-apps (whoosh + loading overlay) via [data-hero-link].
 *
 * Constitution: §2 (GSAP only, no framework), §8/§9 (reduced-motion), §10.3.
 */

import { playWhoosh } from "./audio.js";
import { prefersReducedMotion } from "./utils/media-query.js";

const NAV_DELAY_MS = 1400;  // Hold the loading overlay long enough for the brass bar (1200ms) to fill before navigating.
const LOGO_SVG_URL = "/assets/images/hero-scene/logo.svg";
const RETURN_FLAG = "gamos-return-hall"; // set on entry → scroll back to #hall-portal

const state = {
  initialised: false,
  hero: null,
  subs: new Set(),
  lastP: -1,
  ticking: false,
  scrollHandler: null,
  refreshHandler: null,
  revealFallback: null,
  entranceStarted: false,
  tweens: [],
  triggers: [],
  splits: [],
  hotspots: [],
};

const q = (sel) => document.querySelector(sel);
const qa = (sel) => Array.from(document.querySelectorAll(sel));

/* Belt-and-braces: clear any leftover autoAlpha:0 GSAP left on the hero so a
   delayed/never-played entrance can't leave it invisible. */
function gsapForceVisible(el) {
  if (window.gsap) { try { window.gsap.set(el, { autoAlpha: 1, clearProps: "visibility,opacity" }); } catch { /* ignore */ } }
  el.style.visibility = "visible";
}

function parseSVG(text) {
  const viewBox = (text.match(/viewBox=["']([^"']+)["']/) || [])[1] || "0 0 219.78 79.53";
  const paths = [...text.matchAll(/<path[^>]*\sd=["']([^"']+)["']/g)].map((m) => m[1]);
  return { viewBox, paths };
}

/* ------------------------------------------------ window.gamosHero stub ----- */
function computeProgress() {
  if (!state.hero) return;
  const r = state.hero.getBoundingClientRect();
  const h = window.innerHeight || 1;
  const travel = Math.max(1, state.hero.offsetHeight - h);
  const p = Math.max(0, Math.min(1, -r.top / travel));
  if (Math.abs(p - state.lastP) < 0.005) return;
  state.lastP = p;
  state.subs.forEach((cb) => { try { cb(p); } catch { /* swallow */ } });
}
function onScroll() {
  if (state.ticking) return;
  state.ticking = true;
  requestAnimationFrame(() => { computeProgress(); state.ticking = false; });
}
function installGamosHeroStub() {
  if (window.gamosHero && typeof window.gamosHero.onProgress === "function") return;
  window.gamosHero = {
    onProgress(cb) {
      if (typeof cb !== "function") return () => {};
      state.subs.add(cb);
      try { cb(state.lastP < 0 ? 0 : state.lastP); } catch { /* swallow */ }
      return () => { state.subs.delete(cb); };
    },
    get duration() { return 0; },
    get progress() { return state.lastP < 0 ? 0 : state.lastP; },
    get stage() { return state.lastP >= 0.85 ? "released" : "active"; },
    get titleProgress() { return 1; },
    get portalsVisible() { return false; },
  };
}

/* ------------------------------------------------- composer CTA routing ----- */
function bindHotspot(link) {
  const handler = (event) => {
    event.preventDefault();
    const isResort = link.dataset.heroLink === "resort";
    try { playWhoosh(isResort); } catch { /* best-effort */ }
    try { window.gamosLoading && window.gamosLoading.show({ hall: isResort ? "resort" : "events" }); } catch { /* ignore */ }
    // Remember to land back on the composer when the user returns from the halls
    // sub-app (back-link → /#hall-portal). The pinned 500vh hero shifts offsets,
    // so native hash-scroll lands wrong; restoreScrollToPortal() handles it on load.
    try { sessionStorage.setItem(RETURN_FLAG, "1"); } catch { /* private mode */ }
    const target = link.href;
    setTimeout(() => { window.location.href = target; }, NAV_DELAY_MS);
  };
  link.addEventListener("click", handler);
  state.hotspots.push([link, handler]);
}

/* Returning from the halls sub-app? Scroll back to the composer instead of the
   page top. The sub-app back-link lands us on "/#hall-portal"; the flag was set on
   entry in bindHotspot above. We scroll explicitly because the pinned 500vh hero
   above shifts offsets, so native hash-scroll lands wrong. */
function restoreScrollToPortal() {
  let flagged = false;
  try {
    flagged = sessionStorage.getItem(RETURN_FLAG) === "1";
    if (flagged) sessionStorage.removeItem(RETURN_FLAG);
  } catch { /* private mode → skip */ }
  if (!flagged) return;

  const jump = () => {
    const target = document.getElementById("hall-portal");
    if (!target) return;
    // Instant (not smooth) — a smooth scroll through the 500vh pinned hero is long
    // and janky. Land directly on the composer.
    target.scrollIntoView({ block: "start" });
  };
  // Wait for layout + GSAP pins to settle so the offset is correct, then jump.
  const run = () => requestAnimationFrame(() => window.setTimeout(jump, 350));
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run, { once: true });
}

/* ----------------------------------------------------- logo outline+mask ---- */
function applyLogo(svgText) {
  const { viewBox, paths } = parseSVG(svgText);
  if (!paths.length) return;
  const inner = paths.map((d) => `<path d="${d}"></path>`).join("");

  // outline svg (drawSVG strokes these paths on; CSS makes them transparent-fill + white-stroke)
  const logoBox = q(".hero_logo");
  if (logoBox) {
    logoBox.innerHTML =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"><g fill="currentColor">${inner}</g></svg>`;
  }
  // mask data-URI for the composite (verbatim shape as the sandbox CSS embeds)
  const maskSVG =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><g fill='%23000'>${inner.replace(/"/g, "'")}</g></svg>`;
  const uri = "data:image/svg+xml;utf8," + encodeURIComponent(maskSVG);
  const comp = q(".hero_composite");
  if (comp) {
    comp.style.setProperty("-webkit-mask-image", `url("${uri}")`);
    comp.style.setProperty("mask-image", `url("${uri}")`);
  }
}

/* ------------------------------------------------------- GSAP timelines ----- */
function buildTimelines() {
  const gsap = window.gsap;
  const hero = state.hero;

  // elements (sandbox refs → DOM, source class names)
  const back      = q(".hero_back");                       // A
  const house     = q(".hero_bg > .hero_house");           // s
  const compHouse = q(".hero_composite .hero_house");      // g
  const clouds    = qa(".hero_clouds .hero_cloud");
  const cloudL    = clouds[0];                             // t
  const cloudR    = clouds[1];                             // i
  const content   = q(".hero_content");                    // x
  const logo      = q(".hero_logo");                       // b
  const comp      = q(".hero_composite");                  // c
  const smoke     = q(".hero_top .hero_smoke");            // f
  const titleH1   = q(".hero_title h1");                   // I

  if (!gsap) {
    // No GSAP: reveal the static composition so the hero is never invisible.
    hero.style.visibility = "visible";
    return;
  }

  // Register the now-free plugins if present (graceful if a build lacks them).
  const ScrollTrigger = window.ScrollTrigger;
  const DrawSVGPlugin = window.DrawSVGPlugin;
  const SplitText     = window.SplitText;
  const plugins = [ScrollTrigger, DrawSVGPlugin, SplitText].filter(Boolean);
  if (plugins.length) gsap.registerPlugin(...plugins);
  const hasDrawSVG = !!DrawSVGPlugin;

  // Mobile stability: the dynamic browser toolbar (iOS Safari / Chrome-Android)
  // resizes innerHeight on EVERY scroll. Unchecked, ScrollTrigger re-measures and
  // the pinned hero "jumps" while the scrub desyncs — the "everything feels broken
  // on a real phone" report. ignoreMobileResize tells ScrollTrigger to skip those
  // toolbar-driven refreshes (a genuine orientationchange still re-measures), and
  // it pairs with the mobile `.hero_top{height:100svh}` override (mobile/css/
  // hero-scene.css) so the pin height itself is toolbar-stable. (fixing-motion-
  // performance §4 — scroll-linked motion must not thrash on resize.)
  if (ScrollTrigger && typeof ScrollTrigger.config === "function") {
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  if (prefersReducedMotion()) {
    // Show final composition statically (logo filled), no scrub. (§8/§9)
    // init() seeds the hero at autoAlpha:0 for the entrance fade; with no entrance
    // here we must restore it to fully visible, not leave it invisible.
    gsap.set(hero, { autoAlpha: 1 });
    gsap.set([logo], { opacity: 0 });
    gsap.set([comp], { opacity: 1 });
    if (house) gsap.set(house, { opacity: 1 });
    return;
  }

  // ---- scrub timeline (VERBATIM from sandbox page.js) ----
  // A.to([s,g],{y:"-40%",scale:1.3,duration:1},0); A.to(f,{y:"0%",d:1},0);
  // A.to(t,{x:"-15%",d:1},0); A.to(i,{x:"15%",d:1},0);
  // A.to(x,{y:"20%",scale:.9,d:1},0); A.to(x,{opacity:0,d:.2},0);
  // A.to(b,{opacity:1,d:.01},.1); A.fromTo("svg path",{drawSVG:"0%"},{drawSVG:"100%",d:.3},.1);
  // A.to(b,{opacity:0,d:.2},.28); A.to(c,{opacity:1,d:.1},.3); A.to(s,{opacity:0,d:.1},.3); A.add(()=>{},1);
  //
  // MOBILE AMPLITUDE BRANCH (§13 sanctioned core edit — like the shabbat pin;
  // a GSAP inline transform can't be overridden from CSS): the sandbox's
  // -40%/scale1.3 desert rise assumes a WIDE viewport. On a tall, narrow phone
  // that lifts the desert off-screen long before the logo letters finish filling
  // (composite op→1 by ~0.3), so the letters fill against empty sky. Reducing the
  // rise + cloud drift on ≤768px keeps the desert in frame through the reveal.
  // Desktop (≥769px) stays byte-identical (ternaries collapse to the originals).
  const isNarrow = window.matchMedia && window.matchMedia("(max-width: 768px)").matches;
  const HOUSE_Y     = isNarrow ? "-55%" : "-40%";
  const HOUSE_SCALE = isNarrow ? 1.2    : 1.3;
  const CLOUD_X     = isNarrow ? "9%"   : "15%";
  const A = gsap.timeline();
  A.to([house, compHouse], { y: HOUSE_Y, scale: HOUSE_SCALE, duration: 1 }, 0);
  A.to(smoke,   { y: "0%",  duration: 1 }, 0);
  A.to(cloudL,  { x: "-" + CLOUD_X, duration: 1 }, 0);
  A.to(cloudR,  { x: CLOUD_X,       duration: 1 }, 0);
  A.to(content, { y: "20%", scale: 0.9, duration: 1 }, 0);
  A.to(content, { opacity: 0, duration: 0.2 }, 0);
  A.to(logo,    { opacity: 1, duration: 0.01 }, 0.1);
  if (hasDrawSVG && logo) {
    A.fromTo(logo.querySelectorAll("svg path"),
      { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.3 }, 0.1);
  }
  A.to(logo,  { opacity: 0, duration: 0.2 }, 0.28);
  A.to(comp,  { opacity: 1, duration: 0.1 }, 0.3);
  A.to(house, { opacity: 0, duration: 0.1 }, 0.3);
  A.add(() => void 0, 1);

  const st = ScrollTrigger.create({
    trigger: hero, animation: A, start: "top top", end: "bottom top", scrub: 0.1,
  });
  state.tweens.push(A);
  state.triggers.push(st);

  // Re-measure once the layout is final. The mobile pass injects /mobile/css/
  // hero-scene.css as a runtime <link> (async), so at trigger-build time the
  // composer/pin geometry can still be the desktop layout; and a real
  // orientationchange changes the box. Both must re-pin the start/end, or the
  // scrub maps against stale offsets (composer overlap / desync). We refresh on
  // window load (covers the async mobile CSS) and on orientationchange — NOT on
  // every resize (ignoreMobileResize already filters toolbar churn).
  if (ScrollTrigger && typeof ScrollTrigger.refresh === "function") {
    state.refreshHandler = () => { try { ScrollTrigger.refresh(); } catch { /* ignore */ } };
    if (document.readyState === "complete") {
      requestAnimationFrame(state.refreshHandler);
    } else {
      window.addEventListener("load", state.refreshHandler, { once: true });
    }
    window.addEventListener("orientationchange", state.refreshHandler, { passive: true });
  }

  // ---- entrance timeline (VERBATIM from sandbox; paused → play() after 200ms) ----
  // r.fromTo(root,{autoAlpha:0},{autoAlpha:1,d:.6},0);
  // r.add(splitReveal(I,{duration:2,stagger:.1}),0);          ← SplitText word stagger
  // r.from(A,{scale:1.1,d:5,ease:expo.out},0);
  // r.from(t,{y:"50%",d:3,ease:expo.out},0); r.from(i,{y:"100%",d:4,ease:expo.out},.1);
  // r.from([s img,g img],{opacity:0,d:.6},.2); r.from([s img,g img],{y:"10%",d:3,ease:expo.out},.2);
  //
  // immediateRender:false on every entrance tween — GSAP `from`/`fromTo` apply
  // their start-state at BUILD time by default, which would re-hide the hero
  // (autoAlpha:0) the instant this paused timeline is created and leave it stuck
  // if play() is ever delayed (e.g. headless/slow). With immediateRender:false
  // the start-states are applied only when the timeline plays → the hero stays
  // at its natural VISIBLE state until the entrance actually runs.
  const NR = { immediateRender: false };
  const r = gsap.timeline({ paused: true, onStart: () => { state.entranceStarted = true; } });
  r.fromTo(hero, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, immediateRender: false }, 0);

  // SplitText word-stagger on the title (the sandbox's z4 helper). Falls back to
  // a whole-block fade if SplitText is unavailable.
  if (titleH1 && SplitText) {
    try {
      const split = new SplitText(titleH1, { type: "words", wordsClass: "hero_word" });
      state.splits.push(split);
      r.fromTo(split.words, { opacity: 0 }, { opacity: 1, duration: 2, stagger: 0.1, immediateRender: false }, 0);
    } catch {
      r.from(q(".hero_title"), { ...NR, opacity: 0, duration: 1, ease: "power3.out" }, 0);
    }
  } else if (q(".hero_title")) {
    r.from(q(".hero_title"), { ...NR, opacity: 0, duration: 1, ease: "power3.out" }, 0);
  }

  if (back)   r.from(back,   { ...NR, scale: 1.1, duration: 5, ease: "expo.out" }, 0);
  if (cloudL) r.from(cloudL, { ...NR, y: "50%",  duration: 3, ease: "expo.out" }, 0);
  if (cloudR) r.from(cloudR, { ...NR, y: "100%", duration: 4, ease: "expo.out" }, 0.1);
  const houseImgs = [
    house && house.querySelector("img"),
    compHouse && compHouse.querySelector("img"),
  ].filter(Boolean);
  if (houseImgs.length) {
    r.from(houseImgs, { ...NR, opacity: 0, duration: 0.6 }, 0.2);
    r.from(houseImgs, { ...NR, y: "10%", duration: 3, ease: "expo.out" }, 0.2);
  }
  state.tweens.push(r);
  setTimeout(() => requestAnimationFrame(() => r.play()), 200);
}

/* ---------------------------------------------------------------- init ----- */
export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  document.querySelectorAll("#hall-portal [data-hero-link]").forEach(bindHotspot);
  restoreScrollToPortal();

  const hero = document.querySelector("#hero.hero_root");
  if (!hero) {
    state.lastP = 1;
    installGamosHeroStub();
    state.initialised = true;
    return;
  }

  state.hero = hero;
  installGamosHeroStub();

  // The sandbox leaves the section visibility:hidden and reveals it solely via
  // the GSAP entrance autoAlpha (0→1). That's fragile (stuck-invisible if GSAP
  // is slow/absent), but force-revealing to FULL opacity up-front was worse: the
  // entrance only plays after an async logo fetch + a 200ms setTimeout, so the
  // hero painted opaque for ~260ms and then snapped to autoAlpha:0 and faded back
  // in — a visible blink-off on every load. Instead we SEED the entrance start
  // state (autoAlpha:0 = laid-out but invisible) so the hero never paints at full
  // opacity before the fade; the entrance's fromTo(autoAlpha:0→1) starts from the
  // identical state → one seamless fade, no snap. The 600ms fallback still
  // force-reveals — but ONLY if the entrance never started (the real stuck case),
  // so it can't collide with an in-progress fade.
  if (window.gsap) { try { window.gsap.set(hero, { autoAlpha: 0 }); } catch { hero.style.visibility = "visible"; } }
  state.revealFallback = setTimeout(() => {
    if (!state.entranceStarted) gsapForceVisible(hero);
  }, 600);

  fetch(LOGO_SVG_URL)
    .then((res) => res.text())
    .then((txt) => { applyLogo(txt); buildTimelines(); })
    .catch(() => { hero.style.visibility = "visible"; buildTimelines(); });

  state.scrollHandler = onScroll;
  window.addEventListener("scroll", state.scrollHandler, { passive: true });
  requestAnimationFrame(computeProgress);

  state.initialised = true;
}

export function destroy() {
  if (state.revealFallback) { clearTimeout(state.revealFallback); state.revealFallback = null; }
  if (state.scrollHandler) {
    window.removeEventListener("scroll", state.scrollHandler);
    state.scrollHandler = null;
  }
  if (state.refreshHandler) {
    window.removeEventListener("load", state.refreshHandler);
    window.removeEventListener("orientationchange", state.refreshHandler);
    state.refreshHandler = null;
  }
  state.hotspots.forEach(([el, handler]) => el.removeEventListener("click", handler));
  state.hotspots = [];
  state.triggers.forEach((t) => { try { t.kill(); } catch { /* ignore */ } });
  state.triggers = [];
  state.tweens.forEach((t) => { try { t.kill(); } catch { /* ignore */ } });
  state.tweens = [];
  state.splits.forEach((s) => { try { s.revert(); } catch { /* ignore */ } });
  state.splits = [];
  state.subs.clear();
  state.hero = null;
  state.lastP = -1;
  state.initialised = false;
}
