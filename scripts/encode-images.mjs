#!/usr/bin/env node
/**
 * scripts/encode-images.mjs
 *
 * Bulk-encode brand & section images from `תמונות לאנימציית האתר/` (READ-ONLY
 * source) to `assets/images/` (production output). Generates `.full.webp` +
 * `.half.webp` + `.full.jpg` + `.half.jpg` per source for <picture>
 * with srcset support.
 *
 * Usage:
 *   npm run encode:images
 *
 * Targets (per Constitution §8):
 *   - .full.webp:  max-width 1920px, q82, ≤ 220 KB
 *   - .half.webp:  max-width 960px,  q78, ≤ 80 KB
 *   - .full.jpg :  max-width 1920px, q80 (fallback)
 *   - .half.jpg :  max-width 960px,  q78 (fallback)
 *
 * Source layout (already on disk):
 *   תמונות לאנימציית האתר/אולם 3/*.png    → assets/images/halls/venue/NN.{full,half}.{webp,jpg}
 *   תמונות לאנימציית האתר/ריזורט 1/*.png  → assets/images/halls/resort/NN.{full,half}.{webp,jpg}
 *   תמונות לאנימציית האתר/קולינריה 4/*.jpg → assets/images/culinary/NN.{full,half}.{webp,jpg}
 *   תמונות לאנימציית האתר/LAUNGE/*.jpg     → assets/images/halls/lounge/NN.{full,half}.{webp,jpg}
 *   תמונות לאנימציית האתר/חדרי נופש 2/*.jpg → assets/images/halls/rooms/NN.{full,half}.{webp,jpg}
 *
 * Existing encoded images are kept (overwrites only if --force flag passed).
 */

import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, basename, extname } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC_ROOT = join(ROOT, "תמונות לאנימציית האתר");

const FORCE = process.argv.includes("--force");

// Source → output mapping.
// `srcDir` is resolved against SRC_ROOT (the READ-ONLY animation-assets folder)
// unless `srcBase: "root"` is set, in which case it resolves against the project
// ROOT — used for in-project staging dirs under `assets/_src/`.
const MAPPINGS = [
  { srcDir: "אולם 3",        outDir: "assets/images/halls/venue",   exts: [".png", ".jpg", ".jpeg"] },
  { srcDir: "ריזורט 1",      outDir: "assets/images/halls/resort",  exts: [".png", ".jpg", ".jpeg"], skipSubdirs: true },
  { srcDir: "קולינריה 4",    outDir: "assets/images/culinary",      exts: [".jpg", ".jpeg"] },
  { srcDir: "LAUNGE",        outDir: "assets/images/halls/lounge",  exts: [".jpg", ".jpeg", ".png"] },
  { srcDir: "חדרי נופש 2",   outDir: "assets/images/halls/rooms",   exts: [".jpg", ".jpeg", ".png"] },
  // New staged sources (copied into the repo under assets/_src/).
  { srcDir: "assets/_src/lounge",  outDir: "assets/images/halls/lounge", exts: [".jpg", ".jpeg", ".png"], srcBase: "root" },
  { srcDir: "assets/_src/gallery", outDir: "assets/images/gallery",      exts: [".jpg", ".jpeg", ".png"], srcBase: "root" },
];

// Single-output (non-numbered, non-variant) encodes: produces ONE .webp at the
// exact target path. Used for brand texture swatches.
const SINGLE_WEBP = [
  {
    src: "תמונות לאנימציית האתר/פונט/טקסטורה לטיפוגרפיה בהירה.png",
    out: "assets/images/brand/texture-light.webp",
  },
  {
    src: "תמונות לאנימציית האתר/פונט/טקסטורה לטיפוגרפיה כהה.png",
    out: "assets/images/brand/texture-dark.webp",
  },
];

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

function listSources(srcDir, exts, skipSubdirs, srcBase) {
  const baseRoot = srcBase === "root" ? ROOT : SRC_ROOT;
  const fullSrc = join(baseRoot, srcDir);
  if (!existsSync(fullSrc)) return [];
  const files = readdirSync(fullSrc, { withFileTypes: true });
  const result = [];
  for (const f of files) {
    if (f.isDirectory()) continue; // never recurse — sources have nested working folders
    const ext = extname(f.name).toLowerCase();
    if (!exts.includes(ext)) continue;
    result.push(join(fullSrc, f.name));
  }
  return result.sort();
}

async function encodePair(srcPath, outDir, basenameNoExt, sharp) {
  mkdirSync(outDir, { recursive: true });
  const outFullWebp = join(outDir, `${basenameNoExt}.full.webp`);
  const outHalfWebp = join(outDir, `${basenameNoExt}.half.webp`);
  const outFullJpg  = join(outDir, `${basenameNoExt}.full.jpg`);
  const outHalfJpg  = join(outDir, `${basenameNoExt}.half.jpg`);

  if (!FORCE && existsSync(outFullWebp) && existsSync(outHalfWebp)) {
    return { skipped: true };
  }

  const pipeline = sharp(srcPath, { failOn: "warning" });

  await pipeline.clone().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(outFullWebp);
  await pipeline.clone().resize({ width: 960,  withoutEnlargement: true }).webp({ quality: 78, effort: 6 }).toFile(outHalfWebp);
  await pipeline.clone().resize({ width: 1920, withoutEnlargement: true }).jpeg({ quality: 80, mozjpeg: true }).toFile(outFullJpg);
  await pipeline.clone().resize({ width: 960,  withoutEnlargement: true }).jpeg({ quality: 78, mozjpeg: true }).toFile(outHalfJpg);

  return { skipped: false };
}

function basenameNoExtNumeric(srcPath, idx) {
  const raw = basename(srcPath, extname(srcPath));
  // If file is already numeric like "01", "02" — use as-is. Otherwise number sequentially.
  if (/^\d+(\.\d+)?$/.test(raw)) return raw.padStart(2, "0").replace(".", "_");
  return String(idx + 1).padStart(2, "0");
}

async function main() {
  const sharp = await loadSharp();
  let totalEncoded = 0;
  let totalSkipped = 0;

  for (const m of MAPPINGS) {
    const sources = listSources(m.srcDir, m.exts, m.skipSubdirs, m.srcBase);
    if (sources.length === 0) {
      console.log(`[${m.srcDir}] no sources found, skipping`);
      continue;
    }
    console.log(`[${m.srcDir}] ${sources.length} source files → ${m.outDir}`);
    for (let i = 0; i < sources.length; i++) {
      const src = sources[i];
      const baseName = basenameNoExtNumeric(src, i);
      const result = await encodePair(src, join(ROOT, m.outDir), baseName, sharp);
      if (result.skipped) totalSkipped++; else totalEncoded++;
    }
  }

  // Single-output webp encodes (brand textures).
  for (const s of SINGLE_WEBP) {
    const srcPath = join(ROOT, s.src);
    const outPath = join(ROOT, s.out);
    if (!existsSync(srcPath)) {
      console.log(`[single] source missing, skipping: ${s.src}`);
      continue;
    }
    if (!FORCE && existsSync(outPath)) {
      console.log(`[single] exists, skipping: ${s.out}`);
      totalSkipped++;
      continue;
    }
    mkdirSync(dirname(outPath), { recursive: true });
    await sharp(srcPath, { failOn: "warning" })
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(outPath);
    console.log(`[single] ${s.src} → ${s.out}`);
    totalEncoded++;
  }

  console.log(`\nDone. Encoded: ${totalEncoded}, Skipped (already exist): ${totalSkipped}.`);
  if (totalSkipped > 0 && !FORCE) {
    console.log("Pass --force to re-encode existing files.");
  }
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
