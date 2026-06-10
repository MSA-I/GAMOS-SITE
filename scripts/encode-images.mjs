#!/usr/bin/env node
/**
 * scripts/encode-images.mjs
 *
 * Bulk-encode brand & section images from `../GAMOS-DOCS/תמונות לאנימציית האתר/`
 * (READ-ONLY source — moved out of GAMOS-SITE on 2026-06-09) to `assets/images/`
 * (production output). Generates `.full.webp` + `.half.webp` + `.full.jpg` +
 * `.half.jpg` per source for <picture> with srcset support.
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
 * Source layout (sibling repo: ../GAMOS-DOCS/):
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
// 2026-06-09: source library was moved out of GAMOS-SITE into the sibling
// GAMOS-DOCS folder to keep the repo lean (4.7GB → 0). Resolve via parent.
const SRC_ROOT = resolve(ROOT, "..", "GAMOS-DOCS", "תמונות לאנימציית האתר");

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
  // 2026-06-04: שבתות חתן section (vertical parallax column).
  { srcDir: "שבתות חתן 5",   outDir: "assets/images/shabbat-chatan", exts: [".jpg", ".jpeg"] },
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
  // Texture fills for headings (background-clip: text). Sourced ONLY from the
  // canonical font folder תמונות/פונט/ (CLAUDE.md §4.1). Token names below
  // describe the SURFACE the fill sits on — NOT the texture's own brightness.
  // WARNING: the source filenames are inverse to actual brightness. Re-sourced
  // 2026-06-10 from the big full-texture files (2688×1520) per user request,
  // mapping verified empirically by sharp stats() luma:
  //   "טקסטורה בהירה.png" — luma 44  (DARK texture)  → typo-on-light → LIGHT surfaces
  //   "טקסטורה כהה.png"   — luma 217 (LIGHT texture) → typo-on-dark  → DARK surfaces
  // (Old typography-sample files kept as fallbacks so the encoder never skips.)
  {
    srcCandidates: [
      "תמונות לאנימציית האתר/פונט/טקסטורה בהירה.png",
      "תמונות לאנימציית האתר/פונט/טיפוגרפיה בהירה.png",
      "תמונות לאנימציית האתר/פונט/טקסטורה לטיפוגרפיה בהירה.png",
    ],
    out: "assets/images/brand/typo-on-light.webp",
    width: 2000,
    quality: 92,
  },
  {
    srcCandidates: [
      "תמונות לאנימציית האתר/פונט/טקסטורה כהה.png",
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
  // 2026-06-04: "הטקסטורה הכהה המלאה" — the FULL-coverage dark texture used
  // as fill for the canvas-rendered Events/Resort labels. User pointed at
  // "פונט/טקסטורה מלאה כהה.png" specifically; this is distinct from the
  // typo-on-dark.webp used for site-wide dark-bg headings.
  {
    src: "תמונות לאנימציית האתר/פונט/טקסטורה מלאה כהה.png",
    out: "assets/images/brand/hero-text-fill.webp",
    width: 1600,
    quality: 90,
  },
  // 2026-06-09: 5 kashrut certification logos for the redesigned #kosher
  // marquee. Sources are normalized PNGs (black on transparent) produced by
  // mobile/scripts/normalize-kosher-logos.mjs from raw PNGs sourced from
  // each org's public site. WebP-only (alpha mandatory). Width 600 keeps
  // the logos crisp at the marquee's clamp(48px,6vw,80px) height under 2x
  // pixel density without bloating payload.
  {
    src: "תמונות לאנימציית האתר/כשרות/rabbanut-bw.png",
    out: "assets/images/kosher/rabbanut.webp",
    width: 600, quality: 92,
  },
  {
    src: "תמונות לאנימציית האתר/כשרות/tzohar-bw.png",
    out: "assets/images/kosher/tzohar.webp",
    width: 600, quality: 92,
  },
  {
    src: "תמונות לאנימציית האתר/כשרות/eda-charedit-bw.png",
    out: "assets/images/kosher/eda-charedit.webp",
    width: 600, quality: 92,
  },
  {
    src: "תמונות לאנימציית האתר/כשרות/beit-yosef-bw.png",
    out: "assets/images/kosher/beit-yosef.webp",
    width: 600, quality: 92,
  },
  {
    src: "תמונות לאנימציית האתר/כשרות/agudat-israel-bw.png",
    out: "assets/images/kosher/agudat-israel.webp",
    width: 600, quality: 92,
  },
];

// 2026-06-08 v2: Named-pair encodes for the layered static hero. Five PNG
// layers compose into the hero (z-order bottom-to-top): שכבה 2 (base) → GAMOS
// → EVENTS → RESORT → מדבר. Each layer needs alpha preservation; the small
// text layers (GAMOS / EVENT / RESORT) get a single retina-2x WebP-only encode;
// the big background + desert get the full pair (.full + .half) for srcset
// responsiveness.
const NAMED_PAIRS = [
  // Base background (שכבה 2). Solid ivory + lower-edge wave; alpha preserved
  // because it sits on the hero's --ivory background but the wave bottom is
  // semi-transparent. Both sizes; jpg fallback only at full size.
  {
    src: "תמונות לאנימציית האתר/HERO/שכבה 2.png",
    outDir: "assets/images/hero",
    name: "base",
    fullWidth: 2048, fullQuality: 88,
    halfWidth: 1024, halfQuality: 84,
    keepAlpha: true,
    flatten: "#F5EFE6", // jpg falls back to flat ivory — the wave is decorative
  },
  // Desert hills — used twice (layer 5 of hero AND inside #hero-cover).
  {
    src: "תמונות לאנימציית האתר/HERO/מדבר-2.png",
    outDir: "assets/images/hero",
    name: "desert",
    fullWidth: 2048, fullQuality: 88,
    halfWidth: 1024, halfQuality: 84,
    keepAlpha: true,
    webpOnly: true, // desert MUST keep alpha; jpg fallback would show as a brown rectangle
  },
  // Text layers — single retina-2x size, WebP only (alpha preservation
  // mandatory, jpg would flatten the transparent background to ivory and
  // ruin the layered composition).
  {
    src: "תמונות לאנימציית האתר/HERO/GAMOS 1.png",
    outDir: "assets/images/hero",
    name: "gamos",
    singleWidth: 852, singleQuality: 92, // 2x source (426)
    keepAlpha: true,
    webpOnly: true,
  },
  {
    src: "תמונות לאנימציית האתר/HERO/EVENT 1.png",
    outDir: "assets/images/hero",
    name: "events",
    singleWidth: 694, singleQuality: 92, // 2x source (347)
    keepAlpha: true,
    webpOnly: true,
  },
  {
    src: "תמונות לאנימציית האתר/HERO/RESORT 2.png",
    outDir: "assets/images/hero",
    name: "resort",
    singleWidth: 672, singleQuality: 92, // 2x source (336)
    keepAlpha: true,
    webpOnly: true,
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
      // 2026-06-09: paths starting with the moved source-library prefix resolve
      // against SRC_ROOT (GAMOS-DOCS) instead of ROOT (GAMOS-SITE).
      const candidateAbs = candidate.startsWith("תמונות לאנימציית האתר/")
        ? join(SRC_ROOT, candidate.slice("תמונות לאנימציית האתר/".length))
        : join(ROOT, candidate);
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

  // Named-pair encodes: explicit filename. Two modes:
  //   - single-size: { singleWidth, singleQuality } → one .webp file (no .jpg)
  //   - pair-size:   { fullWidth/Quality, halfWidth/Quality } → .full + .half
  //                  in WebP, plus optional JPG fallback (skipped when webpOnly).
  for (const np of NAMED_PAIRS) {
    // 2026-06-09: see SRC_ROOT comment — the source library moved to GAMOS-DOCS.
    const srcAbs = np.src.startsWith("תמונות לאנימציית האתר/")
      ? join(SRC_ROOT, np.src.slice("תמונות לאנימציית האתר/".length))
      : join(ROOT, np.src);
    if (!existsSync(srcAbs)) {
      console.log(`[named] source missing, skipping: ${np.src}`);
      continue;
    }
    const outDirAbs = join(ROOT, np.outDir);
    mkdirSync(outDirAbs, { recursive: true });

    // Single-size mode: write ONE .webp at np.name.webp.
    if (np.singleWidth) {
      const outWebp = join(outDirAbs, `${np.name}.webp`);
      if (!FORCE && existsSync(outWebp)) {
        console.log(`[named] exists, skipping: ${np.outDir}/${np.name}.webp`);
        totalSkipped++;
        continue;
      }
      await sharp(srcAbs, { failOn: "warning" })
        .resize({ width: np.singleWidth, withoutEnlargement: true })
        .webp({
          quality: np.singleQuality,
          effort: 6,
          alphaQuality: np.keepAlpha ? 92 : undefined,
        })
        .toFile(outWebp);
      console.log(`[named] ${np.src} → ${np.outDir}/${np.name}.webp (${np.singleWidth}px q${np.singleQuality})`);
      totalEncoded++;
      continue;
    }

    // Pair-size mode: .full + .half in WebP (and optionally JPG fallback).
    const outFullWebp = join(outDirAbs, `${np.name}.full.webp`);
    const outHalfWebp = join(outDirAbs, `${np.name}.half.webp`);
    const outFullJpg  = join(outDirAbs, `${np.name}.full.jpg`);
    const outHalfJpg  = join(outDirAbs, `${np.name}.half.jpg`);

    const allExist = np.webpOnly
      ? (existsSync(outFullWebp) && existsSync(outHalfWebp))
      : (existsSync(outFullWebp) && existsSync(outHalfWebp) && existsSync(outFullJpg) && existsSync(outHalfJpg));

    if (!FORCE && allExist) {
      console.log(`[named] exists, skipping: ${np.outDir}/${np.name}.*`);
      totalSkipped++;
      continue;
    }

    const baseWebp = sharp(srcAbs, { failOn: "warning" });
    await baseWebp.clone()
      .resize({ width: np.fullWidth, withoutEnlargement: true })
      .webp({ quality: np.fullQuality, effort: 6, alphaQuality: np.keepAlpha ? 90 : undefined })
      .toFile(outFullWebp);
    await baseWebp.clone()
      .resize({ width: np.halfWidth, withoutEnlargement: true })
      .webp({ quality: np.halfQuality, effort: 6, alphaQuality: np.keepAlpha ? 88 : undefined })
      .toFile(outHalfWebp);

    if (!np.webpOnly) {
      // JPG fallback: flatten onto provided color (or ivory).
      const baseJpg = sharp(srcAbs, { failOn: "warning" }).flatten({ background: np.flatten || "#F5EFE6" });
      await baseJpg.clone()
        .resize({ width: np.fullWidth, withoutEnlargement: true })
        .jpeg({ quality: 86, mozjpeg: true })
        .toFile(outFullJpg);
      await baseJpg.clone()
        .resize({ width: np.halfWidth, withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(outHalfJpg);
    }

    const formats = np.webpOnly ? "{full,half}.webp" : "{full,half}.{webp,jpg}";
    console.log(`[named] ${np.src} → ${np.outDir}/${np.name}.${formats}`);
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
