/**
 * hero-lab asset builder — SANDBOX ONLY.
 *
 * Faithful to the "FIND" hero layer recipe (see findrealestate-clone/
 * איך-ההירו-בנוי.md): a rising cut-out SUBJECT, a second copy of that subject
 * masked through the wordmark letters, CLOUDS spreading from the sides, and a
 * separate rising SMOKE band — composited over a warm SKY.
 *
 * Reads READ-ONLY masters under GAMOS-DOCS (Constitution §7 — never edited) and
 * emits WebP assets into hero-lab/assets/ ONLY. Touches nothing else.
 *
 *   node hero-lab/scripts/build-assets.mjs
 *
 * Outputs (7 files):
 *   assets/sky.webp / sky-mobile.webp        — L1 back-sky backdrop
 *   assets/subject.webp / subject-mobile.webp — L2 rising cut-out ridge (+ L3 fill source)
 *   assets/cloud.webp                         — L4 cloud cut-out (used twice; one mirrored)
 *   assets/smoke.webp                         — L6 rising haze band
 *
 * SOURCE NOTES (2026-06-15 — re-sourced to the user's DEDICATED separated assets):
 *   - SKY      = HERO/שמיים אחוריים.jpg — the FIND-style back sky (3840×2612, opaque).
 *   - SUBJECT  = HERO/מדבר-2.png — the desert ridge, ALREADY carries a real
 *     transparent sky (6240×1599 RGBA), so it needs NO background-removal: keep
 *     the alpha and just trim() to the content bbox.
 *   - CLOUD    = HERO/עננים-03.png — a clean cloud cut-out (2248×954 RGBA, single
 *     centered blob). Used as ONE file rendered twice (mirrored on one side) —
 *     exactly how FIND reuses cloud.c8800fa9.png for both clouds. No keying.
 *   - SMOKE    = HERO/עשן-02.png — a clean smoke/haze cut-out (3840×1240 RGBA,
 *     content in the lower band fading up). Direct alpha passthrough, no keying.
 *
 * No luminance-keying, no 3D, no model — these are real pre-separated PNGs, so
 * the pipeline is pure alpha-preserving resize/trim/encode.
 */
import sharp from "../../node_modules/sharp/lib/index.js";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const LAB = resolve(__dirname, "..");
const OUT = resolve(LAB, "assets");
const DOCS = resolve(LAB, "../../GAMOS-DOCS/תמונות לאנימציית האתר");

// READ-ONLY source masters (Constitution §7 — never edited, only read).
const SKY_SRC = resolve(DOCS, "HERO/שמיים אחוריים-2.png"); // back sky — clean warm sunset gradient, 2720×1536 (user 2026-06-15 round 3; the requested z-image-upscaled_00001_ was a FIND-website screenshot with burned-in text, rejected)
const SUBJECT_SRC = resolve(DOCS, "HERO/מדבר-2.png"); // desert ridge, real transparent sky
const CLOUD_SRC = resolve(DOCS, "HERO/עננים-03.png"); // clean cloud cut-out
const SMOKE_SRC = resolve(DOCS, "HERO/עשן-02.png"); // clean smoke cut-out

// ---------------------------------------------------------------------------
// L1 · sky — the back-sky backdrop (FIND hero_back). Opaque JPG, object-fit:cover.
// ---------------------------------------------------------------------------
async function buildSky() {
  await sharp(SKY_SRC)
    .resize({ width: 2000, withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(resolve(OUT, "sky.webp"));
  await sharp(SKY_SRC)
    .resize({ width: 1080, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toFile(resolve(OUT, "sky-mobile.webp"));
  console.log("✓ sky.webp + sky-mobile.webp");
}

// ---------------------------------------------------------------------------
// L2 · subject — the rising cut-out ridge (FIND hero_house). מדבר-2.png already
// has a real transparent sky, so we keep its alpha and just trim to the alpha
// bbox (drops the empty transparent margin so the ridge anchors to the bottom).
// ---------------------------------------------------------------------------
async function buildSubject() {
  const meta = await sharp(SUBJECT_SRC).metadata();
  if (!meta.hasAlpha) {
    throw new Error(`SUBJECT_SRC has no alpha channel — expected transparent sky in ${SUBJECT_SRC}`);
  }
  // trim() crops uniform/transparent borders to the content bbox.
  // Higher quality (round 3): the desert is seen close-up THROUGH the wordmark
  // letters (parallax fill), so it must be sharp — width 2600, q84, alpha94.
  await sharp(SUBJECT_SRC)
    .trim({ threshold: 10 })
    .resize({ width: 2600, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 94 })
    .toFile(resolve(OUT, "subject.webp"));
  await sharp(SUBJECT_SRC)
    .trim({ threshold: 10 })
    .resize({ width: 1000, withoutEnlargement: true })
    .webp({ quality: 78, alphaQuality: 90 })
    .toFile(resolve(OUT, "subject-mobile.webp"));
  console.log("✓ subject.webp + subject-mobile.webp (alpha preserved, trimmed)");
}

// ---------------------------------------------------------------------------
// L4 · cloud — a single clean cut-out. Rendered twice in the markup (the second
// mirrored via scaleX(-1)), exactly as FIND reuses one cloud file for both
// sides. Trim the transparent margin so the cloud anchors tight; keep alpha.
// ---------------------------------------------------------------------------
async function buildCloud() {
  const meta = await sharp(CLOUD_SRC).metadata();
  if (!meta.hasAlpha) {
    throw new Error(`CLOUD_SRC has no alpha channel — expected transparent cut-out in ${CLOUD_SRC}`);
  }
  await sharp(CLOUD_SRC)
    .trim({ threshold: 6 })
    .resize({ width: 1400, withoutEnlargement: true })
    .webp({ quality: 84, alphaQuality: 90 })
    .toFile(resolve(OUT, "cloud.webp"));
  console.log("✓ cloud.webp (single cut-out, mirrored for the 2nd side in markup)");
}

// ---------------------------------------------------------------------------
// L6 · smoke — a clean rising haze band. Content sits in the lower portion and
// fades up, so a straight alpha-preserving resize already reads as rising fog.
// ---------------------------------------------------------------------------
async function buildSmoke() {
  const meta = await sharp(SMOKE_SRC).metadata();
  if (!meta.hasAlpha) {
    throw new Error(`SMOKE_SRC has no alpha channel — expected transparent cut-out in ${SMOKE_SRC}`);
  }
  await sharp(SMOKE_SRC)
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 80, alphaQuality: 88 })
    .toFile(resolve(OUT, "smoke.webp"));
  console.log("✓ smoke.webp (clean haze band)");
}

async function main() {
  console.log("hero-lab asset build (FIND-faithful, dedicated separated assets)");
  console.log("sky   :", SKY_SRC);
  console.log("subj  :", SUBJECT_SRC);
  console.log("cloud :", CLOUD_SRC);
  console.log("smoke :", SMOKE_SRC);
  await buildSky();
  await buildSubject();
  await buildCloud();
  await buildSmoke();
  console.log("done →", OUT);
}

main().catch((e) => {
  console.error("BUILD FAILED:", e.message);
  process.exit(1);
});
