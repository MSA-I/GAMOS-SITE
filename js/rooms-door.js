/**
 * rooms-door.js — the #rooms door-opening transition (main-site side).
 *
 * Clicking the door (#rooms-door, a plain <a href="/rooms/dist/">) plays a
 * cinematic door-opening animation, then navigates into the rooms sub-app
 * (Constitution §2.1, third route — the phantom-style curved image wall).
 *
 * The transition: a full-viewport portal fades in over the page (ink-deep void
 * + the transparent door image centred), then the door SWINGS OPEN on its hinge
 * (rotateY about its inline edge, under CSS perspective) while the "camera"
 * pushes through (the scene scales up) — landing on a black field that hands off
 * seamlessly to the sub-app, whose IntroGate fades the wall in from the same
 * ink-deep tone. No video; pure CSS 3D.
 *
 * Honours `prefers-reduced-motion: reduce` (and modifier-clicks / middle-click)
 * by falling back to the plain navigation the <a href> already provides.
 *
 * Module contract (Constitution §3 / §10.3): ESM, exports init()/destroy(),
 * idempotent, no-ops when the door is absent.
 */

const OPEN_MS = 1450; // total before navigation (just under the 1.5s CSS timeline)

let link = null;
let onClick = null;
let portal = null;
let navTimer = null;

function prefersReducedMotion() {
  return Boolean(
    typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}

function buildPortal(doorSrc) {
  const el = document.createElement("div");
  el.className = "rooms-door-portal";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML =
    '<div class="rooms-door-portal__scene">' +
    '<span class="rooms-door-portal__glow" aria-hidden="true"></span>' +
    '<img class="rooms-door-portal__leaf" alt="" src="' +
    doorSrc +
    '">' +
    "</div>";
  return el;
}

export function init() {
  link = document.getElementById("rooms-door");
  if (!link) return; // no door on this page → no-op

  onClick = (e) => {
    // Let the browser handle modified clicks (open in new tab/window) + non-primary.
    if (
      e.defaultPrevented ||
      e.button !== 0 ||
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey
    ) {
      return;
    }
    // Reduced motion → plain navigation (no animation), as the <a href> would.
    if (prefersReducedMotion()) return;

    e.preventDefault();
    const href = link.href;
    const img = link.querySelector("img");
    const src = (img && (img.currentSrc || img.src)) || "/assets/images/rooms/door.webp";

    portal = buildPortal(src);
    document.body.appendChild(portal);
    document.body.style.overflow = "hidden"; // freeze the page during the swing
    // Force a reflow so the initial (closed) state paints before we animate.
    void portal.offsetWidth;
    portal.classList.add("is-opening");

    navTimer = window.setTimeout(() => {
      window.location.href = href;
    }, OPEN_MS);
  };

  link.addEventListener("click", onClick);
}

export function destroy() {
  if (link && onClick) link.removeEventListener("click", onClick);
  if (navTimer) window.clearTimeout(navTimer);
  if (portal && portal.parentNode) portal.parentNode.removeChild(portal);
  document.body.style.overflow = "";
  link = null;
  onClick = null;
  portal = null;
  navTimer = null;
}

export default { init, destroy };
