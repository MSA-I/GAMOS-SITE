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

  console.log("[rooms-door] encoding door.mp4 (opaque H.264, crop, full→limited range, tagged bt709, ×3, crf16) …");
  ffmpeg([
    "-y", "-i", SRC,
    // COLOUR-RANGE FIX (2026-06-15). The source is FULL-range (signalstats YMIN≈13,
    // YMAX≈237 — outside the limited 16–235 band) but carries NO colour tags. Photoshop
    // ignores tags and reads the raw full-range pixels → shows the TRUE cream. VLC +
    // every browser honour the H.264 default for an untagged stream = LIMITED-range
    // bt709, so they EXPAND already-full pixels (limited→full) and the cream washes out
    // (true 197 → on-screen ~210) — that's the "door changes colour" the user saw.
    //
    // The fix is to CONVERT the pixels full→limited (so they sit in 16–235) AND tag the
    // stream tv/bt709. Proven by ffmpeg round-trip: corrected clip, decoded the way a
    // browser does (limited→full), reads cream ≈ c5b4aa ≈ the Photoshop-true c5b5a8.
    //
    // ⚠ An EARLIER attempt added `-color_range tv` WITHOUT the full→limited conversion —
    // it merely LABELLED full-range pixels as limited, so decoders over-expanded them
    // (cream 213→206) and someone wrongly concluded "tags are bad, leave it untagged".
    // Untagged is the disease (browsers default to limited and mis-expand). The cure is
    // CONVERT **and** TAG together — both halves below. Do NOT drop either half.
    "-vf", `setpts=PTS/${SPEED},${CROP},scale=in_range=full:out_range=limited,format=yuv420p`,
    "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p",
    "-preset", "slow", "-crf", "16", // near-visually-lossless (user: don't reduce quality)
    // Tag the converted (now limited-range) stream so every decoder reads it identically.
    "-color_range", "tv",
    "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
    // Ask libx264 to stamp the colour fields into the SPS VUI too (the wrapper writes
    // its own VUI back onto the stream). The DECODE-CRITICAL fields land correctly:
    // colormatrix=bt709 (→ matrix 1) and fullrange=off (→ full 0) — these two alone
    // govern the YUV→RGB math that was shifting the cream, and they verify correct.
    // primaries+transfer stay "unspecified" in the colr box on this ffmpeg/x264 build
    // (a muxer quirk — even a direct h264_metadata bsf stamp won't move them); that's
    // HARMLESS, browsers default unspecified SDR primaries/transfer to bt709/sRGB.
    // NOTE: x264 uses `fullrange=off` (NOT `range=tv`); the wrong name aborts the whole
    // param string silently, so don't "simplify" it back.
    "-x264-params", "colorprim=bt709:transfer=bt709:colormatrix=bt709:fullrange=off",
    // +write_colr embeds the MP4 `colr` box so players that ignore the bitstream VUI
    // (the gap that caused the cross-player mismatch) still see the colour space.
    "-an", "-movflags", "+faststart+write_colr",
    outMp4,
  ]);

  // Poster = first frame (closed door), same crop, no downscale — the <video>
  // poster while it loads, matching the rest cut-out so there's no swap flash.
  // Read the source as FULL-range (scale=in_range=full:out_range=full) before baking
  // to RGB so the poster's pixels equal the TRUE cream the corrected door.mp4 now
  // displays — otherwise the poster (baked from the untagged→assumed-limited decode)
  // would show the OLD shifted cream and flash against the corrected first frame.
  console.log("[rooms-door] encoding door-poster.webp (full-range read → true cream) …");
  ffmpeg([
    "-y", "-ss", "0", "-i", SRC,
    "-frames:v", "1",
    "-vf", `${CROP},scale=in_range=full:out_range=full,format=rgb24`,
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
