// scripts/extract-shabbat-tints.mjs
// ---------------------------------------------------------------------------
// Derives the 5 #shabbat-chatan scroll-background tints from the photos they
// are paired with, and writes them into css/tokens.css between the
// `>>> shabbat-tints` / `<<< shabbat-tints` sentinels.
//
// Each panel N pairs with image N (01, 03, 05, 07, 09). We pull the image's
// dominant HUE (Vibrant → LightVibrant → Muted fallback chain) and
// `pastelize()` it — keep the hue, lift lightness, temper saturation — so the
// background reads as a SOFT PASTEL of the photo's colour. Pastels are light,
// so js/shabbat-gallery.js's luma check keeps the heading texture dark/readable.
//
// node-vibrant uses jimp internally, which does NOT decode WebP, so we
// pre-decode each .webp to a PNG buffer via sharp (Constitution §2 build-time
// tool, already a root dep). Both deps are dynamically imported so the script
// degrades gracefully (warns + keeps existing tokens) on a fresh clone before
// `npm install`.
//
// Constitution §5 (single-source colour tokens), §10.2 (no hard-coded hex
// elsewhere). Run via: npm run extract:shabbat-tints
// ---------------------------------------------------------------------------
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const imgDir = resolve(root, "assets", "images", "shabbat-chatan");
const tokensFile = resolve(root, "css", "tokens.css");

// Panel N ↔ image N. 2026-06-18: expanded to an 8-image set (staging
// assets/_src/shabbat → encoded 01-08), matching index.html (8 panels).
const IMAGES = ["01", "02", "03", "04", "05", "06", "07", "08"];
const FALLBACK_TINT = "#F2ECE2"; // warm ivory pastel — if extraction is unavailable.

// Tint targets: keep only a HINT of the image's hue over a warm, brand-aligned
// cream base (§5 palette is warm ivory/brass/cocoa — "Luxury or nothing", not
// candy pastels). Low saturation + high lightness → muted, barely-tinted
// surfaces in the ivory-warm / mist family; the image hue just nudges each
// panel slightly. Stays light (luma > 140) so the heading texture stays dark.
const PASTEL_LIGHTNESS = 0.88; // 0-1 — final L in HSL (very light, cream-level).
const PASTEL_SATURATION = 0.20; // 0-1 — final S in HSL (muted — just a tint of hue).

function luma({ r, g, b }) {
  return 0.299 * r + 0.587 * g + 0.114 * b; // rec601, 0-255
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  return {
    r: parseInt(m.slice(0, 2), 16),
    g: parseInt(m.slice(2, 4), 16),
    b: parseInt(m.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

// --- RGB <-> HSL so we can keep the source HUE and override L + S. ---
function rgbToHsl({ r, g, b }) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  const d = max - min;
  if (d !== 0) {
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb({ h, s, l }) {
  if (s === 0) { const v = l * 255; return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

// Keep the swatch's hue; push lightness up + saturation down so the result is
// a soft pastel version of the photo's dominant colour.
function pastelize(hex) {
  const hsl = rgbToHsl(hexToRgb(hex));
  return rgbToHex(hslToRgb({ h: hsl.h, s: PASTEL_SATURATION, l: PASTEL_LIGHTNESS }));
}

async function main() {
  let Vibrant = null;
  let sharp = null;
  try {
    Vibrant = (await import("node-vibrant/node")).Vibrant;
    if (!Vibrant) throw new Error("named export 'Vibrant' is undefined");
    sharp = (await import("sharp")).default;
  } catch (err) {
    console.warn(
      "[shabbat-tints] node-vibrant/sharp not usable — leaving existing tokens untouched —",
      err?.message ?? err
    );
    return;
  }

  if (!existsSync(imgDir)) {
    console.error(`[shabbat-tints] missing image dir: ${imgDir}`);
    process.exit(1);
  }

  const tints = [];
  const rows = [];
  for (const n of IMAGES) {
    const file = resolve(imgDir, `${n}.full.webp`);
    let tint = FALLBACK_TINT;
    let rawHex = "(fallback)";
    let rawLuma = 0;
    try {
      const pngBuf = await sharp(file).png().toBuffer();
      const palette = await Vibrant.from(pngBuf).getPalette();
      // Same swatch chain as the deep version so the HUE identity matches what
      // the user saw (warm browns / bordeaux / copper / teal); pastelize() then
      // only lifts lightness + tempers saturation to soften it.
      const swatch =
        palette.DarkVibrant ??
        palette.DarkMuted ??
        palette.Vibrant ??
        palette.Muted;
      rawHex = swatch?.hex ?? FALLBACK_TINT;
      rawLuma = Math.round(luma(hexToRgb(rawHex)));
      tint = pastelize(rawHex);
    } catch (err) {
      console.warn(`[shabbat-tints] fallback for ${n}.full.webp — ${err?.message ?? err}`);
    }
    tints.push(tint);
    rows.push({ image: `${n}.full.webp`, raw: rawHex, rawLuma, tint, tintLuma: Math.round(luma(hexToRgb(tint))) });
  }

  // Rewrite the sentinel block in css/tokens.css.
  const css = readFileSync(tokensFile, "utf8");
  const block =
    "  /* >>> shabbat-tints (generated by scripts/extract-shabbat-tints.mjs — do not edit by hand) */\n" +
    tints
      .map((t, i) => `  --shabbat-tint-${i + 1}: ${t}; /* from ${IMAGES[i]}.full.webp */`)
      .join("\n") +
    "\n  /* <<< shabbat-tints */";

  const re =
    /  \/\* >>> shabbat-tints[\s\S]*?\/\* <<< shabbat-tints \*\//;
  if (!re.test(css)) {
    console.error("[shabbat-tints] sentinel block not found in css/tokens.css — aborting.");
    process.exit(1);
  }
  const next = css.replace(re, block);

  console.table(rows);
  if (next === css) {
    console.log("[shabbat-tints] no changes.");
    return;
  }
  writeFileSync(tokensFile, next, "utf8");
  console.log(`[shabbat-tints] wrote ${tints.length} tints to css/tokens.css`);
}

main().catch((err) => {
  console.error("[shabbat-tints]", err);
  process.exit(1);
});
