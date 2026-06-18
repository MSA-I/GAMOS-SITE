#!/usr/bin/env node
/**
 * scripts/export-figma-media.mjs
 *
 * Stage the motion/media assets a designer drags into Figma (figma-export/
 * README.md, step 5) under figma-export/media/:
 *   - hero scene layers (sky/subject/clouds/smoke/logo) — one Figma frame each
 *   - culinary video (video-fill) + 8 still keyframes (posters)
 *   - legacy hero + portal-loop videos (optional video-fills)
 *
 * Keyframes are COPIED from the already-extracted assets/frames/culinary/ WebP
 * sequence (encode-frames.mjs output) — same source, no re-decode. Only if that
 * dir is absent do we fall back to ffmpeg on the mp4.
 *
 * Zero npm deps, vanilla Node ESM, build-time only (Constitution §2/§6/§8).
 */

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync, readFileSync, statSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "figma-export", "media");

// src (relative to ROOT) → output filename. Hero layers prefixed by stack order
// (bottom→top per §3) so the designer rebuilds the composite in the right z-order.
const HERO_LAYERS = [
  ["assets/images/hero-scene/sky.jpg",     "hero-layer-0-sky.jpg"],
  ["assets/images/hero-scene/subject.png", "hero-layer-1-subject.png"],
  ["assets/images/hero-scene/clouds.png",  "hero-layer-2-clouds.png"],
  ["assets/images/hero-scene/smoke.png",   "hero-layer-3-smoke.png"],
  ["assets/images/hero-scene/logo.svg",    "hero-layer-4-logo.svg"],
];

const VIDEOS = [
  ["assets/video/culinary-h264-1080.mp4", "culinary.mp4"],
  ["assets/video/hero-master-1080.mp4",   "hero-legacy.mp4"],
  ["assets/video/portal-loop.mp4",        "portal-loop.mp4"],
];

const KEYFRAME_COUNT = 8;
const CULINARY_FRAMES = join(ROOT, "assets", "frames", "culinary");

function copyInto(srcRel, outName, produced) {
  const src = join(ROOT, srcRel);
  if (!existsSync(src)) { console.warn(`[figma-media] SKIP missing: ${srcRel}`); return; }
  const dst = join(OUT_DIR, outName);
  copyFileSync(src, dst);
  produced.push(dst);
  console.log(`[figma-media] ${outName}  (${(statSync(dst).size / 1024 / 1024).toFixed(2)}MB)`);
}

function findFfmpeg() {
  for (const c of ["ffmpeg",
    "C:\\Program Files (x86)\\Apowersoft\\ApowerREC\\ffmpeg.exe",
    "C:\\Program Files\\ffmpeg\\bin\\ffmpeg.exe"]) {
    try { if (spawnSync(c, ["-version"], { stdio: "ignore" }).status === 0) return c; } catch {}
  }
  throw new Error("ffmpeg not found (needed only for keyframe fallback).");
}

function exportKeyframes(produced) {
  const manifestPath = join(CULINARY_FRAMES, "manifest.json");
  if (existsSync(manifestPath)) {
    const { frameCount } = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (let i = 0; i < KEYFRAME_COUNT; i++) {
      // even spread, skip the very first/last black-ish frames
      const idx = Math.round(((i + 1) / (KEYFRAME_COUNT + 1)) * frameCount);
      const frame = join(CULINARY_FRAMES, `frame_${String(idx).padStart(4, "0")}.webp`);
      if (!existsSync(frame)) continue;
      const out = `culinary-keyframe-${String(i + 1).padStart(2, "0")}.webp`;
      copyFileSync(frame, join(OUT_DIR, out));
      produced.push(join(OUT_DIR, out));
    }
    console.log(`[figma-media] ${KEYFRAME_COUNT} culinary keyframes (copied from assets/frames/culinary)`);
    return;
  }
  // Fallback: extract straight from the mp4 (1 frame every ~2s, capped).
  const src = join(ROOT, "assets/video/culinary-h264-1080.mp4");
  if (!existsSync(src)) { console.warn("[figma-media] no culinary frames or mp4 — skipping keyframes"); return; }
  const ffmpeg = findFfmpeg();
  const pattern = join(OUT_DIR, "culinary-keyframe-%02d.png");
  const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y",
    "-i", src, "-vf", "fps=1/2,scale=1920:-2", "-frames:v", String(KEYFRAME_COUNT), pattern],
    { stdio: "inherit" });
  if (r.status !== 0) throw new Error(`ffmpeg keyframe extract failed (exit ${r.status})`);
  for (let i = 1; i <= KEYFRAME_COUNT; i++) {
    const p = join(OUT_DIR, `culinary-keyframe-${String(i).padStart(2, "0")}.png`);
    if (existsSync(p)) produced.push(p);
  }
  console.log(`[figma-media] keyframes via ffmpeg fallback`);
}

function main() {
  rmSync(OUT_DIR, { recursive: true, force: true });
  mkdirSync(OUT_DIR, { recursive: true });

  const produced = [];
  for (const [src, name] of HERO_LAYERS) copyInto(src, name, produced);
  for (const [src, name] of VIDEOS) copyInto(src, name, produced);
  exportKeyframes(produced);

  // ponytail: assert every produced file is non-empty — catches a silent ffmpeg
  // failure or a 0-byte copy before the designer wastes a Figma session on it.
  const empty = produced.filter((p) => statSync(p).size === 0);
  if (empty.length) {
    console.error("[figma-media] SELF-CHECK FAILED — 0-byte outputs:\n  " + empty.join("\n  "));
    process.exit(1);
  }
  if (produced.length === 0) {
    console.error("[figma-media] SELF-CHECK FAILED — nothing was produced.");
    process.exit(1);
  }
  console.log(`[figma-media] done — ${produced.length} files in figma-export/media/, all size>0.`);
}

main();
