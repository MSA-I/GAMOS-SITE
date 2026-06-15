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

const NAV_DELAY_MS = 350;
const LOGO_SVG_URL = "/assets/images/hero-scene/logo.svg";

const state = {
  initialised: false,
  hero: null,
  subs: new Set(),
  lastP: -1,
  ticking: false,
  scrollHandler: null,
  revealFallback: null,
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
    try { window.gamosLoading && window.gamosLoading.show(); } catch { /* ignore */ }
    const target = link.href;
    setTimeout(() => { window.location.href = target; }, NAV_DELAY_MS);
  };
  link.addEventListener("click", handler);
  state.hotspots.push([link, handler]);
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

  if (prefersReducedMotion()) {
    // Show final composition statically (logo filled), no scrub. (§8/§9)
    hero.style.visibility = "visible";
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
  const A = gsap.timeline();
  A.to([house, compHouse], { y: "-40%", scale: 1.3, duration: 1 }, 0);
  A.to(smoke,   { y: "0%",  duration: 1 }, 0);
  A.to(cloudL,  { x: "-15%", duration: 1 }, 0);
  A.to(cloudR,  { x: "15%",  duration: 1 }, 0);
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
  const r = gsap.timeline({ paused: true });
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
  // the GSAP entrance autoAlpha (0→1). That's fragile: if GSAP is slow/absent —
  // or the play() is delayed past first paint — the hero stays invisible. We
  // reveal up-front so it can NEVER get stuck hidden; the entrance timeline's
  // `fromTo(autoAlpha:0→1)` still re-hides → fades in when it plays (same beat),
  // and a 600ms fallback force-reveals if the timeline never ran at all.
  hero.style.visibility = "visible";
  state.revealFallback = setTimeout(() => {
    if (hero.style.visibility !== "visible") hero.style.visibility = "visible";
    gsapForceVisible(hero);
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
