/**
 * encode-rooms-door.mjs — encode the door-opening video for the #rooms entry.
 *
 * The door plays IN PLACE, right where the still door image sits in the #rooms
 * section. The clip opens into a BLACK void (you enter the dark gallery) — that
 * black MUST STAY black (per the user), exactly like the source.
 *
 * Source (READ-ONLY, lives outside the repo per §7):
 *   ../GAMOS-DOCS/תמונות לאנימציית האתר/חדרי נופש 2/סרטון אנימציית פתיחת דלת.mp4
 *
 * NO transparency / NO colorkey. The studio backdrop is WHITE around the door,
 * and the door's own casing/lintel are the SAME pure white [255] — so white
 * can't be chroma-keyed without eating the frame. Instead we just CROP tight to
 * the casing's outer edge (measured non-white bbox in the 1268×1632 source:
 * x 372–912, y 162–1546), which removes the white margin entirely. What's left
 * is a clean rectangle: cream casing + door, opening onto the black void. Encoded
 * as an OPAQUE H.264 MP4 (smaller than VP9, plays everywhere incl. Safari).
 *
 * Speed: ×3 (user request) — `setpts=PTS/3` bakes it in (~7.04s → ~2.35s).
 *
 * Output → assets/images/rooms/door.mp4 (TRACKED — `assets/video/` is gitignored).
 *
 * Run:  npm run encode:rooms-door   (ffmpeg on PATH, Constitution §8).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = resolve(
  ROOT,
  "..",
  "GAMOS-DOCS",
  "תמונות לאנימציית האתר",
  "חדרי נופש 2",
  "סרטון אנימציית פתיחת דלת.mp4",
);
const OUT_DIR = resolve(ROOT, "assets", "images", "rooms");

const SPEED = 3; // ×3 (setpts = PTS / SPEED) → ~2.35s
// (No HEIGHT/downscale — native cropped resolution preserves the cream gradient.)
// Crop INSIDE the solid casing (no white rim). Measured solid-casing bounds on
// the source (2026-06-11 re-export): L377 R905 T163 B1534 — we cut 3px inside
// each so the edge lands on opaque cream, never on the white/anti-aliased fringe.
// NO downscale: encode at the native cropped resolution so the smooth cream
// gradient isn't softened/banded (that — plus CRF — was the "color change").
const CROP = "crop=522:1364:380:166"; // w:h:x:y (even), inside the solid casing

function ffmpeg(args) {
  execFileSync("ffmpeg", args, { stdio: ["ignore", "inherit", "inherit"] });
}
function sizeMB(p) {
  return (statSync(p).size / (1024 * 1024)).toFixed(2);
}

function main() {
  if (!existsSync(SRC)) {
    console.error(`[rooms-door] source missing: ${SRC}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  const outMp4 = resolve(OUT_DIR, "door.mp4");
  const poster = resolve(OUT_DIR, "door-poster.webp");

  console.log("[rooms-door] encoding door.mp4 (opaque H.264, crop only, no downscale, ×3, crf16) …");
  ffmpeg([
    "-y", "-i", SRC,
    // Crop only — NO scale → no YUV↔RGB resample that would shift/band the cream.
    "-vf", `setpts=PTS/${SPEED},${CROP},format=yuv420p`,
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-preset", "slow", "-crf", "16", // near-visually-lossless (user: don't reduce quality)
    // NO colour tags. The source is FULL-range + untagged; an earlier attempt to
    // "stabilize" with `-color_range tv -colorspace bt709 …` made the browser apply
    // a limited→full bt709 EXPANSION to already-full-range pixels, pulling the cream
    // from ~213 down to ~206 (the visible shift the user reported, proven by browser
    // canvas readback). Leaving the stream untagged makes the browser decode it the
    // SAME way as the source → cream matches the still cut-out. Do NOT re-add `tv`.
    "-an", "-movflags", "+faststart",
    outMp4,
  ]);

  // Poster = first frame (closed door), same crop, no downscale — the <video>
  // poster while it loads, matching the rest cut-out so there's no swap flash.
  console.log("[rooms-door] encoding door-poster.webp …");
  ffmpeg([
    "-y", "-ss", "0", "-i", SRC,
    "-frames:v", "1",
    "-vf", CROP,
    "-c:v", "libwebp", "-quality", "92",
    poster,
  ]);

  // Drop obsolete outputs from earlier (alpha-WebM / fullscreen) approaches.
  for (const stale of ["door.webm", "door-1080.mp4", "door-720.mp4"]) {
    const p = resolve(OUT_DIR, stale);
    if (existsSync(p)) {
      rmSync(p);
      console.log(`[rooms-door] removed obsolete ${stale}`);
    }
  }

  const mb = Number(sizeMB(outMp4));
  console.log(`[rooms-door] done. door.mp4 ${mb}MB`);
  if (mb > 6) console.warn(`[rooms-door] ⚠ door.mp4 ${mb}MB — over §8 ≤6MB; bump CRF.`);
}

main();
