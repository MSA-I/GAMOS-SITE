#!/usr/bin/env node
/**
 * rooms-lab/scripts/encode-door-frames.mjs
 *
 * EXPERIMENT (rooms-lab) — encode the new Seedance door-opening clip into a WebP
 * frame sequence for the culinary-style canvas scrub, AND sample the "lit" colour
 * from the LAST frame's centre (the lit doorway) so the door→gallery handoff can
 * flood that colour instead of black.
 *
 * Nothing here touches production. Mirrors scripts/encode-frames.mjs.
 *
 * Source (READ-ONLY, §7 — lives outside the repo):
 *   ../GAMOS-DOCS/תמונות לאנימציית האתר/חדרי נופש 2/video_Seedance2.0_r2v_00003_.mp4
 *   (H.264 1920×1080, ~8.04s, 193 frames @ 24fps)
 *
 * Output:
 *   rooms-lab/assets/frames/door/frame_0001.webp … frame_0193.webp
 *   rooms-lab/assets/frames/door/manifest.json   (incl. litColor)
 *   rooms-lab/assets/door-poster.webp            (first frame)
 *
 * Run:  npm run encode:door-lab     (ffmpeg on PATH, Constitution §8)
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, "..", "..", ".."); // GAMOS-SITE (legacy/rooms-lab/scripts → up 3)
const LAB = resolve(HERE, "..");              // legacy/rooms-lab

const SRC = resolve(
  ROOT, "..", "GAMOS-DOCS", "תמונות לאנימציית האתר", "חדרי נופש 2",
  "video_Seedance2.0_r2v_00003_.mp4",
);

const FPS = 24;
const WIDTH = 1920;   // full source res (matches the proven culinary path).
const QUALITY = 90;   // smartSubsample on — crisp warm-light edges.

// The colour that floods the screen at the door→gallery handoff. USER-CONFIRMED
// (2026-06-22): the warm sunlit gold seen THROUGH the door gap — the light you
// step into — not the dark frame average. Sampled from that region of the last
// frame (≈ #dda86b). This is the single source of truth; keep it in sync with
// css/rooms-lab.css (--lit) and gallery/src/intro/IntroGate.tsx.
const LIT_COLOR = "#dda86b";
// Region (fractions of frame) used only as a SANITY-CHECK log against LIT_COLOR
// — the warm glow just inside the doorway opening for this clip's composition.
const LIT_SAMPLE = [0.46, 0.30, 0.10, 0.18]; // x, y, w, h

function findFfmpeg() {
  const candidates = [
    "ffmpeg",
    "C:\\Program Files (x86)\\Apowersoft\\ApowerREC\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
  ];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ["-version"], { stdio: "ignore" });
      if (r.status === 0) return c;
    } catch {}
  }
  throw new Error("ffmpeg not found on PATH.");
}

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch (e) {
    throw new Error("sharp not installed. Run: npm install --save-dev sharp\n(" + e.message + ")");
  }
}

function hex(n) {
  return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
}

async function main() {
  if (!existsSync(SRC)) {
    console.error("[door-lab] source missing:", SRC);
    process.exit(1);
  }
  const ffmpeg = findFfmpeg();
  const sharp = await loadSharp();

  const tmpDir = join(ROOT, ".tmp", "frames-png", "door-lab");
  const outDir = join(LAB, "assets", "frames", "door");
  rmSync(tmpDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  // 1. ffmpeg → PNG frames
  console.log(`[door-lab] ffmpeg extract @ ${FPS}fps × ${WIDTH}px …`);
  const ff = spawnSync(ffmpeg, [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", SRC,
    "-vf", `fps=${FPS},scale=${WIDTH}:-2`,
    join(tmpDir, "frame_%04d.png"),
  ], { stdio: "inherit" });
  if (ff.status !== 0) throw new Error(`ffmpeg failed (exit ${ff.status})`);

  const pngs = readdirSync(tmpDir).filter((f) => f.endsWith(".png")).sort();
  if (pngs.length === 0) throw new Error("no frames extracted");
  console.log(`[door-lab] ${pngs.length} PNG frames`);

  // 2. PNG → WebP
  console.log(`[door-lab] sharp encode → WebP q${QUALITY} …`);
  let totalBytes = 0, firstW = 0, firstH = 0;
  for (const png of pngs) {
    const info = await sharp(join(tmpDir, png))
      .webp({ quality: QUALITY, effort: 6, smartSubsample: true })
      .toFile(join(outDir, png.replace(/\.png$/, ".webp")));
    totalBytes += info.size;
    if (firstW === 0) { firstW = info.width; firstH = info.height; }
  }
  console.log(`[door-lab] ${(totalBytes / 1048576).toFixed(1)}MB total, ${(totalBytes / pngs.length / 1024).toFixed(1)}KB/frame`);

  // Poster = first frame
  await sharp(join(tmpDir, pngs[0]))
    .webp({ quality: 90 })
    .toFile(join(LAB, "assets", "door-poster.webp"));

  // 3. LIT colour. We USE the user-confirmed LIT_COLOR (warm sunlit gold through
  //    the door gap). We ALSO sample that region of the last frame as a sanity
  //    log so a future clip swap surfaces drift. NOTE: sharp's .stats() runs on
  //    the INPUT image, ignoring a chained .extract() — so we extract to a
  //    buffer first, then stat that buffer.
  const lastPng = join(tmpDir, pngs[pngs.length - 1]);
  const meta = await sharp(lastPng).metadata();
  const [fx, fy, fw, fh] = LIT_SAMPLE;
  const region = {
    left: Math.floor(meta.width * fx), top: Math.floor(meta.height * fy),
    width: Math.floor(meta.width * fw), height: Math.floor(meta.height * fh),
  };
  const buf = await sharp(lastPng).extract(region).png().toBuffer();
  const [r, g, b] = (await sharp(buf).stats()).channels;
  const sampled = `#${hex(r.mean)}${hex(g.mean)}${hex(b.mean)}`;
  const litColor = LIT_COLOR;
  console.log(`[door-lab] litColor = ${litColor} (using user-confirmed; door-gap sample = ${sampled})`);

  // 4. manifest.json (culinary schema + litColor)
  const manifest = {
    scene: "door",
    frameCount: pngs.length,
    frameUrl: "/rooms-lab/assets/frames/door/frame_{NNNN}.webp",
    width: firstW,
    height: firstH,
    litColor,
    sourceVideo: SRC.split(/[\\/]/).pop(),
    sourceMtime: statSync(SRC).mtime.toISOString(),
    encoded: new Date().toISOString(),
    fpsExtracted: FPS,
    scaleWidthPx: WIDTH,
    webpQuality: QUALITY,
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log("[door-lab] manifest → rooms-lab/assets/frames/door/manifest.json");

  rmSync(tmpDir, { recursive: true, force: true });
  console.log("[door-lab] done.");
}

main().catch((e) => { console.error("\nERROR:", e.message); process.exit(1); });
