#!/usr/bin/env node
/**
 * scripts/encode-frames.mjs
 *
 * Extract WebP frame sequences from MP4 source videos for the canvas
 * scrub renderer (per `video-to-website` skill, Constitution §3).
 *
 * Usage:
 *   npm run encode:hero
 *   npm run encode:culinary
 *   npm run encode:all
 *   node scripts/encode-frames.mjs hero culinary
 *
 * Pipeline (per scene):
 *   1. ffmpeg extracts PNG frames at 30 fps × 1280px width to .tmp/frames-png/<scene>/
 *   2. sharp encodes PNG → WebP q65 to assets/frames/<scene>/
 *   3. Writes manifest.json with frameCount, width, height, fps, etc.
 *   4. Cleans up .tmp/
 *
 * Requirements:
 *   - ffmpeg on PATH (or in known Apowersoft path on Windows)
 *   - `npm install sharp` (one-time)
 *
 * Output budgets (per Constitution §8):
 *   - Per scene: ≤ 6 MB (Hero exception: 27 MB acceptable due to 7s × 30fps).
 *   - Two-phase preloader (canvas-frame-renderer.js) hides total weight from LCP.
 */

import { execSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// -----------------------------------------------------------------------------
// Scene catalog — add new scenes (resort, venue) here when their MP4s arrive.
// -----------------------------------------------------------------------------
const SCENES = {
  hero: {
    src: "assets/video/hero-master-1080.mp4",
    fps: 30,
    width: 1280,
    quality: 65,
  },
  culinary: {
    src: "assets/video/culinary-1080.mp4",
    fps: 30,
    width: 1280,
    quality: 65,
  },
  // resort:   { src: "assets/video/resort-1080.mp4",   fps: 30, width: 1280, quality: 65 },
  // venue:    { src: "assets/video/venue-1080.mp4",    fps: 30, width: 1280, quality: 65 },
};

// -----------------------------------------------------------------------------
// ffmpeg discovery — falls back to Apowersoft bundle on Windows.
// -----------------------------------------------------------------------------
function findFfmpeg() {
  const candidates = [
    "ffmpeg", // PATH
    "C:\\Program Files (x86)\\Apowersoft\\ApowerREC\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe",
  ];
  for (const c of candidates) {
    try {
      const r = spawnSync(c, ["-version"], { stdio: "ignore" });
      if (r.status === 0) return c;
    } catch {}
  }
  throw new Error(
    "ffmpeg not found. Install via `winget install ffmpeg` or `scoop install ffmpeg`, or place on PATH."
  );
}

// -----------------------------------------------------------------------------
// Lazy import sharp (so the script can at least give a clear error).
// -----------------------------------------------------------------------------
async function loadSharp() {
  try {
    const sharp = (await import("sharp")).default;
    return sharp;
  } catch (e) {
    throw new Error(
      "sharp not installed. Run: npm install --save-dev sharp\n(Original: " + e.message + ")"
    );
  }
}

// -----------------------------------------------------------------------------
// Per-scene pipeline
// -----------------------------------------------------------------------------
async function encodeScene(name, cfg, ffmpeg, sharp) {
  const srcAbs = join(ROOT, cfg.src);
  if (!existsSync(srcAbs)) {
    console.error(`[${name}] SKIP — source not found: ${cfg.src}`);
    return false;
  }

  const tmpDir = join(ROOT, ".tmp", "frames-png", name);
  const outDir = join(ROOT, "assets", "frames", name);
  rmSync(tmpDir, { recursive: true, force: true });
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  // 1. Extract PNG via ffmpeg
  console.log(`[${name}] ffmpeg extract @ ${cfg.fps}fps × ${cfg.width}px...`);
  const t0 = Date.now();
  const ff = spawnSync(
    ffmpeg,
    [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", srcAbs,
      "-vf", `fps=${cfg.fps},scale=${cfg.width}:-2`,
      join(tmpDir, "frame_%04d.png"),
    ],
    { stdio: "inherit" }
  );
  if (ff.status !== 0) throw new Error(`[${name}] ffmpeg failed (exit ${ff.status})`);

  const pngs = readdirSync(tmpDir).filter((f) => f.endsWith(".png")).sort();
  console.log(`[${name}] ${pngs.length} PNG frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  // 2. PNG → WebP via sharp
  console.log(`[${name}] sharp encode → WebP q${cfg.quality}...`);
  const t1 = Date.now();
  let totalBytes = 0;
  let firstW = 0, firstH = 0;
  for (const png of pngs) {
    const srcPng = join(tmpDir, png);
    const dstWebp = join(outDir, png.replace(/\.png$/, ".webp"));
    const info = await sharp(srcPng)
      .webp({ quality: cfg.quality, effort: 6 })
      .toFile(dstWebp);
    totalBytes += info.size;
    if (firstW === 0) { firstW = info.width; firstH = info.height; }
  }
  const totalMb = totalBytes / 1024 / 1024;
  const avgKb = totalBytes / pngs.length / 1024;
  console.log(
    `[${name}] done in ${((Date.now() - t1) / 1000).toFixed(1)}s — total ${totalMb.toFixed(1)}MB, avg ${avgKb.toFixed(1)}KB/frame`
  );

  // 3. Write manifest.json
  const sourceMtime = statSync(srcAbs).mtime.toISOString();
  const manifest = {
    scene: name,
    frameCount: pngs.length,
    frameUrl: `/assets/frames/${name}/frame_{NNNN}.webp`,
    width: firstW,
    height: firstH,
    sourceVideo: cfg.src.split("/").pop(),
    sourceMtime,
    encoded: new Date().toISOString(),
    fpsExtracted: cfg.fps,
    scaleWidthPx: cfg.width,
    webpQuality: cfg.quality,
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[${name}] manifest written → assets/frames/${name}/manifest.json`);

  // 4. Cleanup tmp
  rmSync(tmpDir, { recursive: true, force: true });

  return true;
}

// -----------------------------------------------------------------------------
// Main
// -----------------------------------------------------------------------------
async function main() {
  const args = process.argv.slice(2);
  let scenes;
  if (args.length === 0 || args[0] === "all") {
    scenes = Object.keys(SCENES);
  } else {
    scenes = args;
  }
  for (const s of scenes) {
    if (!SCENES[s]) {
      console.error(`Unknown scene: ${s}. Available: ${Object.keys(SCENES).join(", ")}`);
      process.exit(1);
    }
  }

  const ffmpeg = findFfmpeg();
  const sharp = await loadSharp();
  console.log(`Using ffmpeg: ${ffmpeg}`);

  for (const name of scenes) {
    await encodeScene(name, SCENES[name], ffmpeg, sharp);
  }

  console.log("\nAll done.");
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
