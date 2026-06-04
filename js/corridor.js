/**
 * corridor.js — scroll-driven 3D perspective corridor (arch-corridor-gallery port)
 *
 * Spec   : C:\Users\art1\.claude\plans\quizzical-stirring-castle.md (Phase 2)
 * Source : arch-corridor-gallery/src/components/ThreeDCorridor.tsx (lines 449–595)
 *
 * Behaviour
 * ---------
 *  - Discovers [data-corridor-hall] sections (#hall-venue, #hall-resort).
 *  - Each section opts into data-scrub-mode="custom" + data-scrub-handler="gamosCorridor".
 *    js/scroll-scene.js resolves window.gamosCorridor and calls it per RAF tick
 *    with `(p, sectionEl)`.
 *  - One shared RAF loop. Per scene:
 *      targetProgress = p * (cardCount - 1)
 *      currentProgress += (targetProgress - currentProgress) * 0.085
 *    For each card / archway / mountain, write inline transform + opacity using
 *    the prototype's verbatim math.
 *  - RTL flip: the prototype's "even-card-on-left" becomes "even-card-on-right"
 *    (inline-start in RTL).
 *  - Mouse parallax: only the centered card tilts (window mousemove gated by
 *    gamosScroll.getActive()). Skipped on coarse-pointer.
 *  - HUD: prev/next chevrons + counter "01 / 10" + jump pills. Each scrolls to
 *    section.offsetTop + i * stepPx via gsap.scrollTo.
 *  - Keyboard: ArrowDown/Right = +1 card, ArrowUp/Left = -1 card while corridor
 *    is the active scene.
 *  - Card click → window.gamosProjectDrawer.open(card.dataset.projectId).
 *
 *  - Backwards-compat shim: window.gamosHeroToGallery.enter(galleryId) is kept
 *    alive so the hero-shader.js click handler still works. Instead of doing a
 *    horizontal cinema pan, it now smooth-scrolls to the matching section.
 *
 * Public API
 * ----------
 *   window.gamosCorridor(progress, sectionEl)   — scroll-scene custom handler
 *   window.gamosHeroToGallery = { enter(id), leave() } — vertical-scroll handoff
 *
 * Constitution: §10.3 module-scoped state; §4 logical CSS (translate3d is
 * physical-pixel — RTL flip handled in JS).
 */

import { playClick } from "./audio.js";


// ---------------------------------------------------------------------------
// Tunables — verbatim from ThreeDCorridor.tsx unless noted
// ---------------------------------------------------------------------------

const SMOOTH_FACTOR = 0.085;

// Archways (oasis)
const NUM_ARCH_PAIRS    = 8;
const ARCH_DEPTH_SCALE  = 450;
const ARCH_BOUNDS       = 1800;
const ARCH_PROGRESS_MUL = 550;

// Mountains (lumina)
const MTN_COUNT         = 6;
const MTN_SPACING       = 360;
const MTN_PROGRESS_MUL  = 420;
const MTN_HEIGHTS       = [45, 58, 38, 62, 42, 54]; // vh per pair

// Cards
const CARD_Z_STEP       = 950;
const CARD_Y_STEP       = 185;
const WALL_X_DESKTOP    = 340;
const WALL_X_MOBILE     = 80;
const MOBILE_BREAKPOINT = 768;

// Mouse parallax
const PARALLAX_TILT_X   = -2;
const PARALLAX_TILT_Y   =  2;

// Hero handoff
const SECTION_BY_GALLERY = {
  a: "hall-venue",
  b: "hall-resort",
};


// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------

const state = {
  initialised: false,
  scenes: [],   // [{ section, hall, layer, cards[], ornaments, hud, ... }]
  rafId: 0,
  rafActive: false,
  mouseTilt: { x: 0, y: 0 },
  windowWidth: typeof window !== "undefined" ? window.innerWidth : 1200,
  reducedMotion: false,
  // Drag state (for the input-driven progress on corridor.html)
  isDragging: false,
  dragStartY: 0,
  dragStartProgress: 0,
  bound: {
    onMouseMove: null,
    onKeyDown: null,
    onResize: null,
    onWheel: null,
    onDragStart: null,
    onDragMove: null,
    onDragEnd: null,
    cleanups: [],
  },
};


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

function smoothScrollToY(yPx, duration = 0.7) {
  if (window.gsap && typeof window.gsap.to === "function" && window.ScrollToPlugin) {
    window.gsap.to(window, {
      duration,
      ease: "power3.inOut",
      scrollTo: { y: yPx, autoKill: false },
    });
  } else {
    window.scrollTo({ top: yPx, behavior: "smooth" });
  }
}

function smoothScrollToSelector(selector, duration = 1.0) {
  const target = document.querySelector(selector);
  if (!target) return;
  const y = target.getBoundingClientRect().top + window.scrollY;
  smoothScrollToY(y, duration);
}


// ---------------------------------------------------------------------------
// DOM construction — ornaments + brand SVG + HUD (called once per scene)
// ---------------------------------------------------------------------------

function buildOrnaments(scene) {
  const ornaments = { archways: [], mountains: [] };
  const sticky = scene.section.querySelector(".scroll-scene__sticky") || scene.layer.parentElement;

  if (scene.hall === "oasis") {
    const wrap = document.createElement("div");
    wrap.className = "corridor__archways";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < NUM_ARCH_PAIRS; i++) {
      const left = document.createElement("div");
      left.className = "corridor__archway corridor__archway--left";
      const right = document.createElement("div");
      right.className = "corridor__archway corridor__archway--right";
      wrap.appendChild(left);
      wrap.appendChild(right);
      ornaments.archways.push({ left, right, index: i });
    }
    sticky.insertBefore(wrap, sticky.firstChild);
    scene.archwaysWrap = wrap;
  } else {
    const wrap = document.createElement("div");
    wrap.className = "corridor__mountains";
    wrap.setAttribute("aria-hidden", "true");
    for (let i = 0; i < MTN_COUNT; i++) {
      const left = document.createElement("div");
      left.className = "corridor__mountain corridor__mountain--left";
      left.style.height = `${MTN_HEIGHTS[i % MTN_HEIGHTS.length]}vh`;
      const right = document.createElement("div");
      right.className = "corridor__mountain corridor__mountain--right";
      right.style.height = `${(MTN_HEIGHTS[i % MTN_HEIGHTS.length] - 2)}vh`;
      wrap.appendChild(left);
      wrap.appendChild(right);
      ornaments.mountains.push({ left, right, index: i, height: MTN_HEIGHTS[i % MTN_HEIGHTS.length] });
    }
    sticky.insertBefore(wrap, sticky.firstChild);
    scene.mountainsWrap = wrap;
  }
  return ornaments;
}

function buildHud(scene) {
  // The HTML already includes a placeholder .corridor__hud wrapper. We only
  // populate it. If absent, build from scratch.
  let hud = scene.section.querySelector(".corridor__hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.className = "corridor__hud";
    scene.section.querySelector(".scroll-scene__sticky").appendChild(hud);
  }
  hud.innerHTML = "";

  const step = document.createElement("div");
  step.className = "corridor__hud-step";

  const prev = document.createElement("button");
  prev.type = "button";
  prev.className = "corridor__hud-btn corridor__hud-btn--prev";
  prev.setAttribute("aria-label", "התמונה הקודמת");
  prev.textContent = "›"; // RTL: prev is on the right

  const counter = document.createElement("span");
  counter.className = "corridor__hud-counter";
  counter.textContent = `01 / ${String(scene.cards.length).padStart(2, "0")}`;

  const next = document.createElement("button");
  next.type = "button";
  next.className = "corridor__hud-btn corridor__hud-btn--next";
  next.setAttribute("aria-label", "התמונה הבאה");
  next.textContent = "‹";

  step.appendChild(prev);
  step.appendChild(counter);
  step.appendChild(next);

  const pillsBox = document.createElement("div");
  pillsBox.className = "corridor__hud-pills";
  pillsBox.setAttribute("role", "tablist");
  const pillEls = [];
  for (let i = 0; i < scene.cards.length; i++) {
    const p = document.createElement("button");
    p.type = "button";
    p.className = "corridor__hud-pill";
    p.setAttribute("role", "tab");
    p.setAttribute("aria-label", `עבור לפריט ${i + 1}`);
    p.dataset.index = String(i);
    p.textContent = String(i + 1).padStart(2, "0");
    pillsBox.appendChild(p);
    pillEls.push(p);
  }

  const status = document.createElement("div");
  status.className = "corridor__hud-status";
  status.innerHTML = `<span class="corridor__hud-status-dot" aria-hidden="true"></span><span>GAMOS EXHIBITION</span>`;

  hud.appendChild(step);
  hud.appendChild(pillsBox);
  hud.appendChild(status);

  // Wire events
  const onPrev = () => { playClick(); scrollToCardIndex(scene, Math.max(0, Math.round(scene.currentProgress) - 1)); };
  const onNext = () => { playClick(); scrollToCardIndex(scene, Math.min(scene.cards.length - 1, Math.round(scene.currentProgress) + 1)); };
  const onPills = (e) => {
    const t = e.target;
    if (!t || !t.dataset || t.dataset.index == null) return;
    playClick();
    scrollToCardIndex(scene, Number(t.dataset.index));
  };

  prev.addEventListener("click", onPrev);
  next.addEventListener("click", onNext);
  pillsBox.addEventListener("click", onPills);

  state.bound.cleanups.push(() => prev.removeEventListener("click", onPrev));
  state.bound.cleanups.push(() => next.removeEventListener("click", onNext));
  state.bound.cleanups.push(() => pillsBox.removeEventListener("click", onPills));

  scene.hud = { wrap: hud, prev, next, counter, pillsBox, pillEls, _lastIdx: -1 };
}

function scrollToCardIndex(scene, idx) {
  const cardCount = scene.cards.length;
  if (cardCount <= 1) return;
  idx = Math.max(0, Math.min(cardCount - 1, idx));

  // corridor.html mode: no scroll spacer; set targetProgress directly so the
  // RAF lerps the active hall into the requested card.
  const isCorridorPage = !!document.getElementById("corridor-page");
  if (isCorridorPage) {
    scene.targetProgress = idx;
    return;
  }

  // index.html mode: convert idx to a scrollY position inside the section.
  const vh = window.innerHeight;
  const spacerPx = (scene.spacerVh - 100) * vh / 100;
  const p = idx / (cardCount - 1);
  const target = scene.section.offsetTop + p * spacerPx;
  smoothScrollToY(target, 0.7);
}


// ---------------------------------------------------------------------------
// Per-frame paint
// ---------------------------------------------------------------------------

function paintScene(scene, t) {
  const isMobile = state.windowWidth < MOBILE_BREAKPOINT;
  const baseWallX = isMobile ? WALL_X_MOBILE : WALL_X_DESKTOP;

  // Skip paint for offscreen halls (corridor.html sets aria-hidden on the
  // inactive section). Saves ~50% CPU during steady-state.
  if (scene.section.getAttribute("aria-hidden") === "true") return;

  // Smooth currentProgress toward targetProgress
  const diff = scene.targetProgress - scene.currentProgress;
  if (Math.abs(diff) < 0.001) {
    scene.currentProgress = scene.targetProgress;
  } else {
    scene.currentProgress += diff * (state.reducedMotion ? 1 : SMOOTH_FACTOR);
  }
  const cp = scene.currentProgress;

  // ---- Archways (oasis) ----------------------------------------------------
  if (scene.hall === "oasis") {
    for (let i = 0; i < scene.ornaments.archways.length; i++) {
      const a = scene.ornaments.archways[i];
      const initialZ = (i - 2) * ARCH_DEPTH_SCALE;
      let z = initialZ + cp * ARCH_PROGRESS_MUL;
      z = ((z + ARCH_BOUNDS * 10) % ARCH_BOUNDS) - 600;

      let opacity = 1;
      if (z < -300) opacity = clamp((z + 600) / 300, 0, 1);
      else if (z > 400) opacity = clamp((800 - z) / 400, 0, 1);

      const archY  = z * 0.16 + 40;
      const rightX = 380 + cp * 15;
      const leftX  = -380 - cp * 15;

      a.left.style.opacity = String(opacity * 0.9);
      a.left.style.transform = `translate3d(${leftX}px, ${archY}px, ${z}px) rotateY(15deg)`;
      a.right.style.opacity = String(opacity * 0.9);
      a.right.style.transform = `translate3d(${rightX}px, ${archY}px, ${z}px) rotateY(-15deg)`;
    }
  }

  // ---- Mountains (lumina) --------------------------------------------------
  if (scene.hall === "lumina") {
    const totalDepth = MTN_COUNT * MTN_SPACING;
    for (let i = 0; i < scene.ornaments.mountains.length; i++) {
      const m = scene.ornaments.mountains[i];
      const initialZ = (i - 1) * MTN_SPACING;
      let z = initialZ + cp * MTN_PROGRESS_MUL;
      z = ((z + totalDepth * 10) % totalDepth) - 700;

      let opacity = 1;
      if (z < -400) opacity = clamp((z + 700) / 300, 0, 1);
      else if (z > 450) opacity = clamp((700 - z) / 250, 0, 1);

      const scaleK = clamp(850 / (850 - z), 0.25, 3.2);
      const leftX  = -460 - i * 50;
      const rightX =  460 + i * 50;
      const yOffset = 180 + z * 0.11;

      m.left.style.opacity = String(opacity * 0.95);
      m.left.style.transform = `translate3d(${leftX}px, ${yOffset}px, ${z}px) rotateY(15deg) scale(${scaleK})`;
      m.right.style.opacity = String(opacity * 0.95);
      m.right.style.transform = `translate3d(${rightX}px, ${yOffset}px, ${z}px) rotateY(-15deg) scale(${scaleK})`;
    }
  }

  // ---- Cards ---------------------------------------------------------------
  // "Active" check: which scene is currently in view + receiving input.
  //  - On index.html: ask scroll-orchestrator (one of the scroll-scenes).
  //  - On corridor.html: read <main data-active-hall="..."> and match scene.hall.
  let isCorridorActive = false;
  const page = document.getElementById("corridor-page");
  if (page) {
    isCorridorActive = page.dataset.activeHall === scene.hall;
  } else if (window.gamosScroll && window.gamosScroll.getActive) {
    isCorridorActive = window.gamosScroll.getActive() === scene.id;
  }

  for (let i = 0; i < scene.cards.length; i++) {
    const card = scene.cards[i];
    const deltaProgress = i - cp;
    const itemZ = -deltaProgress * CARD_Z_STEP;

    if (itemZ > 1200 || itemZ < -2200) {
      card.style.opacity = "0";
      card.style.pointerEvents = "none";
      continue;
    }

    let opacity = 1;
    if (itemZ < -800) opacity = clamp((itemZ + 1800) / 1000, 0, 1);
    else if (itemZ > 200) opacity = clamp((980 - itemZ) / 780, 0, 1);

    const isTarget = Math.round(cp) === i;
    const bounceY = Math.sin(t / 2000 + i) * 10;

    const tiltX = (isTarget && isCorridorActive) ? state.mouseTilt.x * PARALLAX_TILT_X : 0;
    const tiltY = (isTarget && isCorridorActive) ? state.mouseTilt.y * PARALLAX_TILT_Y : 0;

    // RTL flip: even index → inline-start (right) → POSITIVE x (vs. prototype LTR convention).
    const isEven = i % 2 === 0;
    const wallX = isEven ? +baseWallX : -baseWallX;

    const activeFactor = clamp(1 - Math.abs(deltaProgress), 0, 1);
    const altOffset = wallX * (1 - activeFactor * 0.4);

    const itemY = deltaProgress * -CARD_Y_STEP + bounceY;

    const baseRotationY = isEven ? -50 : +50; // inverted with the X flip
    const rotationY = baseRotationY * (1 - activeFactor * 0.72) + tiltX;

    card.style.opacity = String(opacity);
    card.style.pointerEvents = opacity > 0.4 ? "auto" : "none";
    card.style.transform =
      `translate(-50%, -50%) ` +
      `translate3d(${altOffset}px, ${itemY}px, ${itemZ}px) ` +
      `rotateY(${rotationY}deg) rotateX(${tiltY}deg)`;
    card.style.zIndex = String(100 - Math.round(Math.abs(deltaProgress) * 10));

    if (isTarget) card.setAttribute("data-active", "true");
    else card.removeAttribute("data-active");
  }

  // ---- HUD counter + active pill ------------------------------------------
  if (scene.hud) {
    const idx = clamp(Math.round(cp), 0, scene.cards.length - 1);
    if (scene.hud._lastIdx !== idx) {
      scene.hud._lastIdx = idx;
      scene.hud.counter.textContent =
        `${String(idx + 1).padStart(2, "0")} / ${String(scene.cards.length).padStart(2, "0")}`;
      for (let i = 0; i < scene.hud.pillEls.length; i++) {
        if (i === idx) scene.hud.pillEls[i].setAttribute("aria-current", "true");
        else scene.hud.pillEls[i].removeAttribute("aria-current");
      }
    }
  }

  scene.section.style.setProperty("--corridor-progress", String(cp));
  scene.section.style.setProperty("--corridor-active-index", String(Math.round(cp)));
}


// ---------------------------------------------------------------------------
// RAF coordinator (one loop, all scenes)
// ---------------------------------------------------------------------------

function rafTick(t) {
  for (const scene of state.scenes) {
    paintScene(scene, t);
  }
  state.rafId = requestAnimationFrame(rafTick);
}

function startRaf() {
  if (state.rafActive) return;
  state.rafActive = true;
  state.rafId = requestAnimationFrame(rafTick);
}

function stopRaf() {
  if (!state.rafActive) return;
  state.rafActive = false;
  if (state.rafId) cancelAnimationFrame(state.rafId);
  state.rafId = 0;
}


// ---------------------------------------------------------------------------
// Scrub handler — exposed as window.gamosCorridor for scroll-scene.js
// ---------------------------------------------------------------------------

function handleScrub(p, sectionEl) {
  const scene = state.scenes.find((s) => s.section === sectionEl);
  if (!scene) return;
  const cardCount = scene.cards.length;
  if (cardCount <= 1) {
    scene.targetProgress = 0;
    return;
  }
  scene.targetProgress = clamp(p, 0, 1) * (cardCount - 1);
}


// ---------------------------------------------------------------------------
// Hero → corridor cinema pan + navigate to corridor.html
// Maps `galleryId` ("a"/"b") → `?hall=oasis|lumina` and slides #hero out to
// the LEFT (RTL: this is the "מסך זז ימינה" perception — the page slides
// rightward as the hero tile exits to the left). Then location.href so the
// browser loads /corridor.html, where corridor-page.js plays the matching
// "enter from right" timeline.
// ---------------------------------------------------------------------------

const HALL_BY_GALLERY = { a: "oasis", b: "lumina" };

function heroEnter(galleryId) {
  const hall = HALL_BY_GALLERY[galleryId];
  if (!hall) return;
  const url = `/corridor.html?hall=${hall}`;

  // Reduced-motion or no GSAP: skip pan, navigate immediately.
  if (state.reducedMotion || !window.gsap || typeof window.gsap.to !== "function") {
    location.href = url;
    return;
  }

  const heroEl = document.getElementById("hero");
  if (!heroEl) {
    location.href = url;
    return;
  }

  // Lock body scroll + stop Lenis so the pan animates cleanly without
  // background scroll bleed.
  document.body.style.overflow = "hidden";
  if (window.lenis && typeof window.lenis.stop === "function") {
    try { window.lenis.stop(); } catch { /* ignore */ }
  }

  window.gsap.to(heroEl, {
    x: "-100%",
    duration: 0.85,
    ease: "expo.inOut",
    onComplete: () => { location.href = url; },
  });
}

function heroLeave() {
  // No-op: corridor.html has its own Home button that navigates to "/".
  location.href = "/";
}


// ---------------------------------------------------------------------------
// Init / destroy
// ---------------------------------------------------------------------------

export function init() {
  if (state.initialised) return;
  if (typeof document === "undefined") return;

  state.reducedMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Always expose handoff API so hero-shader.js works even before sections
  // exist in DOM.
  window.gamosCorridor = handleScrub;
  window.gamosHeroToGallery = { enter: heroEnter, leave: heroLeave };

  const sections = document.querySelectorAll("section[data-corridor-hall]");
  if (sections.length === 0) {
    state.initialised = true; // keep the API stubs alive
    return;
  }

  for (const section of sections) {
    const layer = section.querySelector(".corridor__layer");
    if (!layer) continue;
    const cards = Array.from(layer.querySelectorAll(".corridor__card"));
    if (cards.length === 0) continue;

    const hall = section.dataset.corridorHall === "lumina" ? "lumina" : "oasis";
    const id = section.dataset.scrub || section.id || `corridor-${hall}`;
    const spacerVh = Number(section.dataset.scrubSpacerVh) || (hall === "oasis" ? 600 : 400);

    const scene = {
      id,
      hall,
      section,
      layer,
      cards,
      spacerVh,
      currentProgress: 0,
      targetProgress: 0,
      ornaments: { archways: [], mountains: [] },
      hud: null,
    };

    scene.ornaments = buildOrnaments(scene);
    buildHud(scene);

    // Card click → drawer
    for (const card of cards) {
      const onClick = () => {
        playClick();
        const projectId = card.dataset.projectId;
        if (projectId && window.gamosProjectDrawer && typeof window.gamosProjectDrawer.open === "function") {
          window.gamosProjectDrawer.open(projectId);
        }
      };
      card.addEventListener("click", onClick);
      // Keyboard activate (Enter / Space) — cards have tabindex="0" in the markup.
      const onKey = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      };
      card.addEventListener("keydown", onKey);
      state.bound.cleanups.push(() => card.removeEventListener("click", onClick));
      state.bound.cleanups.push(() => card.removeEventListener("keydown", onKey));
    }

    state.scenes.push(scene);
  }

  // Mouse parallax — single window listener; only active card responds.
  state.bound.onMouseMove = (e) => {
    state.mouseTilt.x = (e.clientX - window.innerWidth / 2) / (window.innerWidth / 2);
    state.mouseTilt.y = (e.clientY - window.innerHeight / 2) / (window.innerHeight / 2);
  };
  const coarse = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
  if (!coarse) {
    window.addEventListener("mousemove", state.bound.onMouseMove, { passive: true });
  }

  // ---- Active-scene picker -------------------------------------------------
  // On corridor.html: read <main data-active-hall="…"> and match scene.hall.
  // On index.html:    ask scroll-orchestrator (.getActive() returns scene.id).
  function getActiveScene() {
    const page = document.getElementById("corridor-page");
    if (page) {
      return state.scenes.find((s) => s.hall === page.dataset.activeHall) || null;
    }
    if (window.gamosScroll && window.gamosScroll.getActive) {
      const activeId = window.gamosScroll.getActive();
      return state.scenes.find((s) => s.id === activeId) || null;
    }
    return null;
  }

  // ---- Keyboard arrows step ±1 card --------------------------------------
  state.bound.onKeyDown = (e) => {
    const tag = (document.activeElement && document.activeElement.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || tag === "select") return;
    if (document.documentElement.getAttribute("data-drawer-open") === "true") return;
    const scene = getActiveScene();
    if (!scene) return;

    if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault();
      stepCardOnScene(scene, +1);
    } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault();
      stepCardOnScene(scene, -1);
    }
  };
  window.addEventListener("keydown", state.bound.onKeyDown);

  // ---- corridor.html-only inputs: wheel + drag drive targetProgress ------
  // On index.html, scroll-orchestrator drives targetProgress via gamosCorridor.
  // On corridor.html, we don't have scroll — wheel/drag map directly.
  const isCorridorPage = !!document.getElementById("corridor-page");
  if (isCorridorPage) {
    state.bound.onWheel = (e) => {
      if (document.documentElement.getAttribute("data-drawer-open") === "true") return;
      const scene = getActiveScene();
      if (!scene) return;
      e.preventDefault();
      const delta = e.deltaY * 0.0018;             // wheel sensitivity (prototype line 132)
      scene.targetProgress = clamp(scene.targetProgress + delta, 0, scene.cards.length - 1);
    };
    window.addEventListener("wheel", state.bound.onWheel, { passive: false });

    state.bound.onDragStart = (e) => {
      if (document.documentElement.getAttribute("data-drawer-open") === "true") return;
      const scene = getActiveScene();
      if (!scene) return;
      const target = e.target;
      // Don't hijack drag if the press started inside a card (let card click work).
      if (target && target.closest && target.closest(".corridor__hud, .corridor__card-meta-cta, .corridor__hall-arrow, .corridor__home-btn")) return;
      const clientY = ("touches" in e) ? e.touches[0].clientY : e.clientY;
      state.isDragging = true;
      state.dragStartY = clientY;
      state.dragStartProgress = scene.targetProgress;
    };
    state.bound.onDragMove = (e) => {
      if (!state.isDragging) return;
      const scene = getActiveScene();
      if (!scene) return;
      const clientY = ("touches" in e) ? e.touches[0].clientY : e.clientY;
      const deltaY = state.dragStartY - clientY;
      const sensitivity = 0.0025;                  // drag sensitivity (prototype line 154)
      scene.targetProgress = clamp(state.dragStartProgress + deltaY * sensitivity,
                                   0, scene.cards.length - 1);
    };
    state.bound.onDragEnd = () => {
      state.isDragging = false;
    };
    window.addEventListener("mousedown",  state.bound.onDragStart, { passive: true });
    window.addEventListener("mousemove",  state.bound.onDragMove,  { passive: true });
    window.addEventListener("mouseup",    state.bound.onDragEnd,   { passive: true });
    window.addEventListener("mouseleave", state.bound.onDragEnd,   { passive: true });
    window.addEventListener("touchstart", state.bound.onDragStart, { passive: true });
    window.addEventListener("touchmove",  state.bound.onDragMove,  { passive: true });
    window.addEventListener("touchend",   state.bound.onDragEnd,   { passive: true });
  }

  // Resize tracking
  state.bound.onResize = () => { state.windowWidth = window.innerWidth; };
  window.addEventListener("resize", state.bound.onResize, { passive: true });

  // Helper: when corridor.html drives via wheel/drag, no scroll → use the
  // direct targetProgress jump instead of scrollToCardIndex (which only
  // works in scroll mode).
  state.stepCardOnScene = stepCardOnScene;
  function stepCardOnScene(scene, direction) {
    if (isCorridorPage) {
      scene.targetProgress = clamp(Math.round(scene.currentProgress) + direction,
                                   0, scene.cards.length - 1);
      playClick();
    } else {
      scrollToCardIndex(scene, Math.max(0, Math.min(scene.cards.length - 1,
                                                    Math.round(scene.currentProgress) + direction)));
    }
  }

  startRaf();
  state.initialised = true;
}


export function destroy() {
  if (!state.initialised) return;
  stopRaf();

  for (const off of state.bound.cleanups) {
    try { off(); } catch { /* ignore */ }
  }
  state.bound.cleanups = [];

  if (state.bound.onMouseMove) window.removeEventListener("mousemove", state.bound.onMouseMove);
  if (state.bound.onKeyDown) window.removeEventListener("keydown", state.bound.onKeyDown);
  if (state.bound.onResize) window.removeEventListener("resize", state.bound.onResize);

  for (const scene of state.scenes) {
    if (scene.hud && scene.hud.wrap) {
      // Clear contents but leave the wrapper in place (caller may re-init).
      scene.hud.wrap.innerHTML = "";
    }
    if (scene.archwaysWrap && scene.archwaysWrap.parentNode) {
      scene.archwaysWrap.parentNode.removeChild(scene.archwaysWrap);
    }
    if (scene.mountainsWrap && scene.mountainsWrap.parentNode) {
      scene.mountainsWrap.parentNode.removeChild(scene.mountainsWrap);
    }
  }

  if (window.gamosCorridor === handleScrub) {
    try { delete window.gamosCorridor; } catch { window.gamosCorridor = undefined; }
  }
  if (window.gamosHeroToGallery && window.gamosHeroToGallery.enter === heroEnter) {
    try { delete window.gamosHeroToGallery; } catch { window.gamosHeroToGallery = undefined; }
  }

  state.scenes = [];
  state.bound.onMouseMove = null;
  state.bound.onKeyDown = null;
  state.bound.onResize = null;
  state.initialised = false;
}
