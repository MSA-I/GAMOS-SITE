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
  // 2026-06-04: Corridor galleries (arch-corridor-gallery port). 10 venue + 6 resort
  // floating cards. NEW outDir to avoid collision with existing halls/* images
  // referenced elsewhere (about-section, legacy markup).
  { srcDir: "השראות/תמונות מרחפות/אולם",   outDir: "assets/images/corridor/venue",  exts: [".png", ".jpg", ".jpeg"] },
  { srcDir: "השראות/תמונות מרחפות/ריזורט", outDir: "assets/images/corridor/resort", exts: [".png", ".jpg", ".jpeg"] },
];

// Single-output (non-numbered, non-variant) encodes: produces ONE .webp at the
// exact target path. Used for brand texture swatches, the central logo, etc.
// Each entry may carry optional `width` (default 1600) and `quality` (default 80)
// to support assets that need higher fidelity than the section-image budget.
const SINGLE_WEBP = [
  // Central GAMOS logo (replaces the SVG-mask GAMOS letters in Hero +
  // logo-gold.webp in the footer). High quality — this is the brand mark.
  {
    src: "תמונות לאנימציית האתר/לוגו/לוגו מרכזי.png",
    out: "assets/images/brand/logo-central.webp",
    width: 1200,
    quality: 92,
  },
  // Texture fills for headings (background-clip: text). The user has 4 source
  // textures under תמונות/פונט/. Naming below describes the SURFACE the fill
  // sits on (not the texture's own brightness — the source filenames are
  // confusingly inverse to that). Verified empirically 2026-06-03:
  //   "טיפוגרפיה בהירה.png" — luma 38 (DARK gold-flecked) → for LIGHT surfaces
  //   "טיפוגרפיה כהה.png"   — luma 193 (LIGHT gold-flecked) → for DARK surfaces
  {
    srcCandidates: [
      "תמונות לאנימציית האתר/פונט/טקסטורה מלאה כהה.png",
      "תמונות לאנימציית האתר/פונט/טיפוגרפיה בהירה.png",
      "תמונות לאנימציית האתר/פונט/טקסטורה לטיפוגרפיה בהירה.png",
    ],
    out: "assets/images/brand/typo-on-light.webp",
    width: 2000,
    quality: 92,
  },
  {
    srcCandidates: [
      "תמונות לאנימציית האתר/פונט/טיפוגרפיה כהה.png",
      "תמונות לאנימציית האתר/פונט/טקסטורה לטיפוגרפיה כהה.png",
    ],
    out: "assets/images/brand/typo-on-dark.webp",
    width: 2000,
    quality: 92,
  },
  {
    srcCandidates: [
      "תמונות לאנימציית האתר/פונט/טקסטורה בהירה.png",
    ],
    out: "assets/images/brand/texture-light.webp",
    width: 1600,
    quality: 88,
  },
  {
    srcCandidates: [
      "תמונות לאנימציית האתר/פונט/טקסטורה כהה.png",
    ],
    out: "assets/images/brand/texture-dark.webp",
    width: 1600,
    quality: 88,
  },
  // 2026-06-04: Hero base layer replaced with השראות/2.1.png per user.
  // Higher width (2400) and quality (85) than the previous encode — hero is
  // full-bleed and any softness shows on a 4K display. Aspect 1.7708 ≈ the
  // shader's BASE_ASPECT 1.7768 (sub-1% delta — no shader change needed).
  {
    src: "תמונות לאנימציית האתר/השראות/2.1.png",
    out: "assets/images/brand/hero-distort.full.webp",
    width: 2400,
    quality: 85,
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

  // Single-output webp encodes (brand assets — logo, textures).
  for (const s of SINGLE_WEBP) {
    const candidates = s.srcCandidates ?? [s.src];
    let resolvedSrc = null;
    for (const candidate of candidates) {
      const candidateAbs = join(ROOT, candidate);
      if (existsSync(candidateAbs)) {
        resolvedSrc = { rel: candidate, abs: candidateAbs };
        break;
      }
    }
    const outPath = join(ROOT, s.out);
    if (!resolvedSrc) {
      console.log(`[single] source missing, skipping: ${s.out}  (tried: ${candidates.join(", ")})`);
      continue;
    }
    if (!FORCE && existsSync(outPath)) {
      console.log(`[single] exists, skipping: ${s.out}`);
      totalSkipped++;
      continue;
    }
    mkdirSync(dirname(outPath), { recursive: true });
    const width = s.width ?? 1600;
    const quality = s.quality ?? 80;
    await sharp(resolvedSrc.abs, { failOn: "warning" })
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, effort: 6 })
      .toFile(outPath);
    console.log(`[single] ${resolvedSrc.rel} → ${s.out}  (${width}px q${quality})`);
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
