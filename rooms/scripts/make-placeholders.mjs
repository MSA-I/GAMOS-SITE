/**
 * make-placeholders.mjs — generate §5-palette PLACEHOLDER tiles for the rooms
 * wall into rooms/public/images/ph-<row>-<k>.webp.
 *
 * 2026-06-15: the wall is a 5-row × COLS_PER_ROW grid, ONE ROW PER CATEGORY
 * (src/roomsData.ts). Real photos fill each row first (rooms/public/images/NN.webp
 * from scripts/encode-images.mjs FLAT_WEBP); the remaining cells in a row are
 * brand placeholder tiles named `ph-<rowNo>-<k>.webp` (rowNo 1-based category
 * index, k 1-based placeholder position in that row). This generator emits ONLY
 * those placeholder tiles, tinted to the row's category tone, with a quiet
 * "בקרוב" label — it NEVER touches the real NN.webp photos.
 *
 * Keep the per-category real-photo counts in REAL_COUNT in sync with
 * REAL_BY_CATEGORY in src/roomsData.ts.
 *
 * Run automatically by `npm run build` (prebuild) or manually:
 *   node scripts/make-placeholders.mjs
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
  cocoa: "#534133",
  ivory: "#F5EFE6",
  mist: "#E8DFD3",
  rose: "#B8576F",
  "ink-deep": "#1A1410",
};
// Text colour that reads on each tone.
const FG_ON = {
  brass: "#1A1410",
  cocoa: "#F5EFE6",
  ivory: "#1A1410",
  mist: "#1A1410",
  rose: "#F5EFE6",
};

// Mirror src/roomsData.ts: COLS_PER_ROW, CATEGORIES order + tone, and how many
// REAL photos each category currently has (the rest of the row = placeholders).
// 2026-06-18: every category row now has 5 real photos (full 5×5 grid), so NO
// placeholders are generated. Kept as a no-op generator (real:5 → 0 tiles) so
// the prebuild step stays wired; if a row ever goes short again, drop its count.
const COLS_PER_ROW = 5;
const ROWS = [
  { label: "חדר זוגי", tone: "cocoa", real: 5 },
  { label: "חדר משפחה", tone: "brass", real: 5 },
  { label: "סוויטה", tone: "rose", real: 5 },
  { label: "חדר נוף", tone: "mist", real: 5 },
  { label: "סאונה רטובה ויבשה", tone: "ivory", real: 5 },
];

const W = 800;
const H = 1000;

function esc(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// A quiet branded "coming soon" tile in the row's category tone.
function svgTile(tone, categoryLabel) {
  const bg = PALETTE[tone] ?? PALETTE.brass;
  const fg = FG_ON[tone] ?? "#1A1410";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${bg}"/>
      <stop offset="1" stop-color="${PALETTE["ink-deep"]}" stop-opacity="0.24"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="${bg}"/>
  <rect width="${W}" height="${H}" fill="url(#g)"/>
  <text x="${W / 2}" y="${H / 2 - 30}" font-family="Cinzel, Rubik, serif" font-size="34" font-weight="700" fill="${fg}" text-anchor="middle" opacity="0.55" letter-spacing="10">GAMOS</text>
  <text x="${W / 2}" y="${H / 2 + 40}" font-family="Rubik, Heebo, Arial, sans-serif" font-size="46" font-weight="700" fill="${fg}" text-anchor="middle" opacity="0.85">${esc(categoryLabel)}</text>
  <text x="${W / 2}" y="${H / 2 + 110}" font-family="Heebo, Arial, sans-serif" font-size="30" font-weight="500" fill="${fg}" text-anchor="middle" opacity="0.6" letter-spacing="6">בקרוב</text>
</svg>`;
}

let made = 0;
for (let r = 0; r < ROWS.length; r++) {
  const row = ROWS[r];
  const placeholders = Math.max(0, COLS_PER_ROW - row.real);
  for (let k = 1; k <= placeholders; k++) {
    const out = resolve(OUT_DIR, `ph-${r + 1}-${k}.webp`);
    const svg = svgTile(row.tone, row.label);
    await sharp(Buffer.from(svg)).webp({ quality: 80, effort: 5 }).toFile(out);
    made++;
  }
}
console.log(`[make-placeholders] wrote ${made} placeholder tiles → ${OUT_DIR}`);
