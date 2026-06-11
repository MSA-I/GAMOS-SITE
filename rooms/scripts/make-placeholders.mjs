/**
 * make-placeholders.mjs — generate the §5-palette placeholder tiles for the
 * rooms wall into rooms/public/images/NN.webp.
 *
 * The venue has only 4 real room types right now; the wall needs ~20 cards to
 * read like the phantom reference. This emits tasteful numbered portrait tiles
 * in the brand palette. They go through Three's TextureLoader EXACTLY like the
 * future real photos, so swapping real photos in later is a pure data edit in
 * src/roomsData.ts (change the `image` path) — no code change.
 *
 * Run automatically by `npm run build` (prebuild) or manually:
 *   node scripts/make-placeholders.mjs
 *
 * The card set (count, which indices are "real"/highlighted, tone cycle) is
 * mirrored from src/roomsData.ts. Keep them in sync if the data shape changes.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(here, "..", "public", "images");
mkdirSync(OUT_DIR, { recursive: true });

// §5 palette.
const PALETTE = {
  brass: "#CFAE83",
  "brass-deep": "#8B6F46",
  cocoa: "#534133",
  ivory: "#F5EFE6",
  "ink-deep": "#1A1410",
  rose: "#B8576F",
  mist: "#E8DFD3",
};
const TONES = ["brass", "cocoa", "ivory", "mist", "rose"];

// Text color that reads on a given tone background.
const FG_ON = {
  brass: "#1A1410",
  cocoa: "#F5EFE6",
  ivory: "#1A1410",
  mist: "#1A1410",
  rose: "#F5EFE6",
};

const TOTAL = 20;
const W = 800;
const H = 1000;

// Mirror roomsData REAL_SLOTS: real cards at indices 0,6,11,17 (numbers 01,07,12,18).
const REAL_TYPES = {
  0: "נוף",
  6: "סוויטה",
  11: "חדר",
  17: "ספא",
};

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function svgTile(number, tone, isReal, typeLabel) {
  const bg = PALETTE[tone];
  const fg = FG_ON[tone];
  const brass = PALETTE.brass;
  // A subtle two-stop vertical wash + a large faint number, an optional brass
  // hairline border + type label for the highlighted real cards.
  const border = isReal
    ? `<rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="${brass}" stroke-width="3" opacity="0.85"/>`
    : "";
  const typeText = isReal
    ? `<text x="${W / 2}" y="${H - 90}" font-family="Rubik, Heebo, Arial, sans-serif" font-size="40" font-weight="600" fill="${fg}" text-anchor="middle" opacity="0.92" letter-spacing="6">${esc(typeLabel)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="${PALETTE["ink-deep"]}" stop-opacity="0.22"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  ${border}
  <text x="${W / 2}" y="${H / 2 + 80}" font-family="Rubik, Heebo, Arial, sans-serif" font-size="260" font-weight="900" fill="${fg}" text-anchor="middle" opacity="0.18">${esc(number)}</text>
  <text x="${W / 2}" y="${H / 2 + 200}" font-family="Cinzel, Rubik, serif" font-size="34" font-weight="700" fill="${fg}" text-anchor="middle" opacity="0.6" letter-spacing="10">GAMOS</text>
  ${typeText}
</svg>`;
}

let made = 0;
for (let i = 0; i < TOTAL; i++) {
  const number = String(i + 1).padStart(2, "0");
  const isReal = i in REAL_TYPES;
  const tone = isReal ? "brass" : TONES[i % TONES.length];
  const svg = svgTile(number, tone, isReal, REAL_TYPES[i]);
  const out = resolve(OUT_DIR, `${number}.webp`);
  await sharp(Buffer.from(svg))
    .webp({ quality: 80, effort: 5 })
    .toFile(out);
  made++;
}
console.log(`[make-placeholders] wrote ${made} tiles → ${OUT_DIR}`);
