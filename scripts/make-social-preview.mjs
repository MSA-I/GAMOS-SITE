// make-social-preview.mjs — dedicated Open Graph / social share image
// (conversion pass 2026-07-13, marketing critique P3: "תמונת Social Preview
// ייעודית עם צילום אמיתי של המתחם + לוגו ברור, בלי להעמיס טקסט").
//
// Composites: a real venue photograph (the shabbat money-shot — the open-air
// hall set for a festive meal facing the desert) + a soft ink-deep gradient
// at the bottom + the gold GAMOS wordmark. Output: 1200×630 (the OG sweet
// spot — WhatsApp/Facebook/LinkedIn all render 1.91:1 large cards).
//
// Run: node scripts/make-social-preview.mjs   (also: npm run build:brand)
// Output: assets/images/brand/social-preview.jpg  → referenced by og:image.
import sharp from "sharp";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const PHOTO = resolve(ROOT, "assets/images/shabbat-chatan/01.full.jpg");
const LOGO = resolve(ROOT, "assets/images/brand/logo-gold.webp");
const OUT = resolve(ROOT, "assets/images/brand/social-preview.jpg");

const W = 1200;
const H = 630;

// Base photo — cover-crop to 1.91:1, biased slightly UP (attention: the set
// tables + desert horizon live in the upper 2/3; the floor is expendable).
const photo = await sharp(PHOTO)
  .resize(W, H, { fit: "cover", position: "attention" })
  .toBuffer();

// Bottom ink-deep gradient so the gold wordmark always reads (§5 --ink-deep).
const gradient = Buffer.from(
  `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">
     <defs>
       <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
         <stop offset="0.45" stop-color="#1A1410" stop-opacity="0"/>
         <stop offset="1" stop-color="#1A1410" stop-opacity="0.82"/>
       </linearGradient>
     </defs>
     <rect width="${W}" height="${H}" fill="url(#g)"/>
   </svg>`,
);

// Gold wordmark, centered in the darkened bottom band.
const LOGO_W = 340;
const logoBuf = await sharp(LOGO)
  .resize({ width: LOGO_W })
  .toBuffer();
const logoMeta = await sharp(logoBuf).metadata();

await sharp(photo)
  .composite([
    { input: gradient, top: 0, left: 0 },
    {
      input: logoBuf,
      top: H - logoMeta.height - 44,
      left: Math.round((W - LOGO_W) / 2),
    },
  ])
  .jpeg({ quality: 84, mozjpeg: true })
  .toFile(OUT);

const meta = await sharp(OUT).metadata();
console.log(`wrote assets/images/brand/social-preview.jpg ${meta.width}x${meta.height}`);
