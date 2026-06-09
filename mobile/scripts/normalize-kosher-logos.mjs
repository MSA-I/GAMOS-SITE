#!/usr/bin/env node
/**
 * mobile/scripts/normalize-kosher-logos.mjs
 *
 * One-shot helper. Reads the 5 raw kashrut-org logos that the Wave 0 SWARM
 * downloaded into `../GAMOS-DOCS/תמונות לאנימציית האתר/כשרות/` and writes
 * normalized monochrome black-on-transparent PNG variants alongside them
 * with a `-bw` suffix. Those `-bw.png` files are then the input for the
 * main `scripts/encode-images.mjs` pass which writes the final `.webp`s
 * into `assets/images/kosher/`.
 *
 * Pipeline per logo:
 *   1. read source (PNG or SVG — sharp handles both)
 *   2. resize to a 1200×600 max box (preserve aspect)
 *   3. flatten transparency onto pure white (drops anti-alias halo against bg)
 *   4. greyscale + linear contrast bump → near-pure black/white
 *   5. threshold (everything darker than 200 → black; lighter → 100% white)
 *   6. invert luminance: white → fully transparent, black → fully opaque
 *   7. write `-bw.png`
 *
 * The end result is what the .marquee--logos `filter: brightness(0)` rule
 * expects: a clean silhouette on transparent. Hover state in CSS lifts
 * opacity from 0.78 → 1.0.
 *
 * Why we don't just rely on `filter: brightness(0)` against the raw colored
 * logos: the raw sources have JPG/PNG anti-alias halos and per-org color
 * casts (rabbanut is dark blue, tzohar has gradient gold, etc.). Without a
 * normalized binary alpha, the CSS filter creates muddy edges and leaks the
 * source's transparent-but-not-quite background onto the ivory marquee.
 *
 * Usage:
 *   node mobile/scripts/normalize-kosher-logos.mjs
 *
 * Exit status: 0 on success; non-zero if any source is missing.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC_DIR = resolve(HERE, "..", "..", "..", "GAMOS-DOCS",
  "תמונות לאנימציית האתר", "כשרות");

// Each entry tries srcCandidates in order — first existing wins. This lets
// the SWARM agents save either .png or .svg and the normalizer copes.
const LOGOS = [
  { name: "rabbanut",      srcCandidates: ["rabbanut.png", "rabbanut.svg"] },
  { name: "tzohar",        srcCandidates: ["tzohar.png", "tzohar.svg"] },
  { name: "eda-charedit",  srcCandidates: ["eda-charedit.png", "eda-charedit.svg"] },
  { name: "beit-yosef",    srcCandidates: ["beit-yosef.png", "beit-yosef.svg"] },
  { name: "agudat-israel", srcCandidates: ["agudat-israel.png", "agudat-israel.svg"] },
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

async function normalize(sharp, logo) {
  const srcPath = logo.srcCandidates
    .map((f) => join(SRC_DIR, f))
    .find((p) => existsSync(p));

  if (!srcPath) {
    console.warn(`[skip] ${logo.name}: none of ${logo.srcCandidates.join(", ")} found in ${SRC_DIR}`);
    return false;
  }

  const outPath = join(SRC_DIR, `${logo.name}-bw.png`);

  // Density 600 helps SVG → raster conversion produce a sharp 1200px raster.
  // For PNG sources sharp ignores the density flag.
  const input = sharp(srcPath, { density: 600, failOn: "warning" });

  // Step 1: resize to fit a 1200×600 box, preserve aspect.
  // Step 2: flatten onto white so the threshold step has a known background.
  // Step 3-4: greyscale + linear (slope=1.6, offset=-40) crushes mid-tones to extremes.
  // Step 5: threshold at 200 — anything darker becomes 0 (black), else 255 (white).
  // Step 6: invert; then negate alpha to produce black-on-transparent.

  // Two-stage so we can build the alpha mask from the binary luminance:
  //   stage A: produce a 1-channel binary mask (white = ink, black = background)
  //   stage B: composite a flat-black image with that mask as its alpha
  const maskBuffer = await input
    .clone()
    .resize({ width: 1200, height: 600, fit: "inside", withoutEnlargement: false })
    .flatten({ background: "#ffffff" })
    .greyscale()
    .linear(1.6, -40)
    .threshold(200) // luma >=200 → 255 (white), else 0 (black)
    .negate({ alpha: false }) // invert so ink = 255, bg = 0
    .toColourspace("b-w")
    .png()
    .toBuffer();

  // Now build the final RGBA: black pixels everywhere, alpha = mask.
  const { width, height } = await sharp(maskBuffer).metadata();
  const black = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 0, g: 0, b: 0 },
    },
  })
    .png()
    .toBuffer();

  await sharp(black)
    .joinChannel(maskBuffer)
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`[ok]   ${logo.name}: ${srcPath} → ${outPath}  (${width}×${height})`);
  return true;
}

async function main() {
  if (!existsSync(SRC_DIR)) {
    console.error(`Source directory missing: ${SRC_DIR}`);
    process.exit(1);
  }
  const sharp = await loadSharp();

  let ok = 0;
  let missing = 0;
  for (const logo of LOGOS) {
    try {
      const success = await normalize(sharp, logo);
      if (success) ok++; else missing++;
    } catch (e) {
      console.error(`[fail] ${logo.name}: ${e.message}`);
      missing++;
    }
  }
  console.log(`\nDone. Normalized: ${ok}, Missing/failed: ${missing}.`);
  if (missing > 0) process.exit(2);
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  process.exit(1);
});
