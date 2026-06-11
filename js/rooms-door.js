/**
 * rooms-door.js — the #rooms door-opening transition (main-site side).
 *
 * Clicking the door (#rooms-door, a plain <a href="/rooms/dist/">) plays the
 * producer's door-opening clip IN PLACE — an OPAQUE H.264 MP4 (door.mp4, cropped
 * tight to the casing so there's no white background; the door opens onto a BLACK
 * void that STAYS black) layered exactly over the still door, right where it sits
 * in the #rooms section. It does NOT open a separate fullscreen player. When the
 * clip ends (or skip), a brief full-viewport ink-deep veil fades in and we
 * navigate to the rooms sub-app (Constitution §2.1, third route — the
 * phantom-style curved wall); the clip's black void + the sub-app's ink-deep boot
 * make the handoff seamless.
 *
 * A small "דלגו" skip link + Esc/Enter jump straight to the veil + navigation.
 * `prefers-reduced-motion: reduce`, modified/non-primary clicks, and any playback
 * failure all fall back to the plain <a href> navigation — the entry never breaks.
 *
 * Module contract (Constitution §3 / §10.3): ESM, exports init()/destroy(),
 * idempotent, no-ops when the door is absent.
 */

const VIDEO_MP4 = "/assets/images/rooms/door.mp4";
const VIDEO_POSTER = "/assets/images/rooms/door-poster.webp";
const VEIL_MS = 560; // ink-deep veil fade before navigation

let link = null;
let onClick = null;
let video = null;
let veil = null;
let skipBtn = null;
let onKeyDown = null;
let navTimer = null;
let done = false; // single-fire guard for ended/skip → navigate

function prefersReducedMotion() {
  return Boolean(
    typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
}

export function init() {
  link = document.getElementById("rooms-door");
  if (!link) return; // no door on this page → no-op

  onClick = (e) => {
    // Let the browser handle modified / non-primary clicks (open in new tab).
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
    // Reduced motion → plain navigation (no clip), as the <a href> would.
    if (prefersReducedMotion()) return;

    e.preventDefault();
    playInPlace(link.href);
  };

  link.addEventListener("click", onClick);
}

function navigate(href) {
  if (done) return;
  done = true;
  // Ink-deep veil fades in over the whole page, then navigate. The sub-app
  // boots on the same ink-deep tone, so there's no flash on arrival.
  veil = document.createElement("div");
  veil.className = "rooms-door-veil";
  document.body.appendChild(veil);
  void veil.offsetWidth; // reflow so the fade transition runs
  veil.classList.add("is-on");
  navTimer = window.setTimeout(() => {
    window.location.href = href;
  }, VEIL_MS);
}

function playInPlace(href) {
  done = false;

  // Overlay the door video exactly over the still door image (same box). The
  // clip is OPAQUE (cropped tight to the casing, opening onto a black void —
  // the void stays black, you enter the dark gallery). object-fit:contain keeps
  // it aligned with the still cut-out underneath (which we hide once it plays).
  video = document.createElement("video");
  video.className = "rooms-door__video";
  video.muted = true;
  video.defaultMuted = true;
  video.setAttribute("playsinline", "");
  video.setAttribute("preload", "auto");
  video.setAttribute("poster", VIDEO_POSTER);
  // No native controls / PiP / remote-playback chrome — this is a transition,
  // not a player.
  video.controls = false;
  video.disablePictureInPicture = true;
  video.setAttribute("controlslist", "nodownload noremoteplayback noplaybackrate");
  video.disableRemotePlayback = true;
  video.innerHTML = `<source src="${VIDEO_MP4}" type="video/mp4">`;
  // The link is the positioning context for the overlay.
  link.classList.add("is-playing");
  link.appendChild(video);

  // Skip link, anchored to the section (bottom of the door).
  skipBtn = document.createElement("button");
  skipBtn.type = "button";
  skipBtn.className = "rooms-door__skip";
  skipBtn.textContent = "דלגו ←";
  link.appendChild(skipBtn);

  // Hide the still door image ONLY once the video is actually rendering its
  // first frame — so there's no blank gap during decode start, and no "two
  // doors". The clip's first frame (the poster) is the same closed door, so the
  // swap is seamless.
  video.addEventListener(
    "playing",
    () => link.classList.add("is-video-ready"),
    { once: true },
  );

  const finish = () => navigate(href);
  video.addEventListener("ended", finish, { once: true });
  skipBtn.addEventListener("click", (ev) => {
    ev.preventDefault();
    ev.stopPropagation();
    finish();
  });

  onKeyDown = (ev) => {
    if (ev.key === "Escape" || ev.key === "Enter") {
      ev.preventDefault();
      finish();
    }
  };
  window.addEventListener("keydown", onKeyDown);

  // Play. If it rejects (autoplay blocked, decode error), don't strand the
  // user — navigate straight to the wall.
  const p = video.play();
  if (p && typeof p.catch === "function") {
    p.catch(() => navigate(href));
  }
}

export function destroy() {
  if (link && onClick) link.removeEventListener("click", onClick);
  if (onKeyDown) window.removeEventListener("keydown", onKeyDown);
  if (navTimer) window.clearTimeout(navTimer);
  if (video && video.parentNode) video.parentNode.removeChild(video);
  if (skipBtn && skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn);
  if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
  link?.classList.remove("is-playing");
  link = null;
  onClick = null;
  video = null;
  skipBtn = null;
  veil = null;
  onKeyDown = null;
  navTimer = null;
  done = false;
}

export default { init, destroy };
