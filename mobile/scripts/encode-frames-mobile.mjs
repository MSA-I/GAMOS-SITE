#!/usr/bin/env node
/**
 * mobile/scripts/encode-frames-mobile.mjs
 *
 * Phase 2C (mobile pass 2026-06-08). Standalone encoder for the mobile
 * tier of canvas-scrub frame sequences. Mirrors the desktop pipeline at
 * /scripts/encode-frames.mjs but at phone-friendly resolution + quality
 * + framerate (mobile budget per Constitution §8).
 *
 * Currently encodes:
 *   culinary-mobile  — 960px wide, 24fps, WebP q=80
 *
 * Usage:
 *   node mobile/scripts/encode-frames-mobile.mjs
 *   node mobile/scripts/encode-frames-mobile.mjs culinary-mobile
 *
 * Output:
 *   assets/frames/culinary-mobile/frame_NNNN.webp
 *   assets/frames/culinary-mobile/manifest.json
 *
 * Wiring:
 *   /index.html — <canvas data-manifest-url-mobile="…/culinary-mobile/manifest.json">
 *   /mobile/js/canvas-frames-mobile.js — swaps the dataset at runtime when
 *     the viewport is ≤768px so the downstream renderer fetches this
 *     manifest instead of the desktop one.
 */

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

// -----------------------------------------------------------------------------
// Mobile scene catalog. Add new mobile-tier scenes here as the
// site introduces more canvas scrubs.
// -----------------------------------------------------------------------------
const SCENES = {
  // Culinary @ 960px / 24fps / q=80 → ~35-40KB per frame across 361 frames
  // ≈ 13MB total. Phase-1 preloader still gates LCP on the first 10 frames
  // (~400KB) so the actual cost of opening the section on a phone is well
  // under the 6MB-per-scene budget.
  "culinary-mobile": {
    src: "assets/video/culinary-1080.mp4",
    fps: 24,
    width: 960,
    quality: 80,
  },
};

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
  throw new Error(
    "ffmpeg not found. Install via `winget install ffmpeg` or `scoop install ffmpeg`, or place on PATH."
  );
}

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

  console.log(`[${name}] ffmpeg extract @ ${cfg.fps}fps × ${cfg.width}px ...`);
  const t0 = Date.now();
  const ffArgs = [
    "-hide_banner", "-loglevel", "error", "-y",
    "-i", srcAbs,
    "-vf", `fps=${cfg.fps},scale=${cfg.width}:-2`,
    join(tmpDir, "frame_%04d.png"),
  ];
  const ff = spawnSync(ffmpeg, ffArgs, { stdio: "inherit" });
  if (ff.status !== 0) throw new Error(`[${name}] ffmpeg failed (exit ${ff.status})`);

  const pngs = readdirSync(tmpDir).filter((f) => f.endsWith(".png")).sort();
  console.log(`[${name}] ${pngs.length} PNG frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  console.log(`[${name}] sharp encode → WebP q${cfg.quality} ...`);
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
  const avgKb  = totalBytes / pngs.length / 1024;
  console.log(
    `[${name}] done in ${((Date.now() - t1) / 1000).toFixed(1)}s — ${totalMb.toFixed(1)}MB total, avg ${avgKb.toFixed(1)}KB/frame`
  );

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
    tier: "mobile",
  };
  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`[${name}] manifest written → assets/frames/${name}/manifest.json`);

  rmSync(tmpDir, { recursive: true, force: true });
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const scenes = (args.length === 0) ? Object.keys(SCENES) : args;
  for (const s of scenes) {
    if (!SCENES[s]) {
      console.error(`Unknown scene: ${s}. Available: ${Object.keys(SCENES).join(", ")}`);
      process.exit(1);
    }
  }

  const ffmpeg = findFfmpeg();
  const sharp  = await loadSharp();
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
