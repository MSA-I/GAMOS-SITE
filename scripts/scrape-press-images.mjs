#!/usr/bin/env node
/**
 * scripts/scrape-press-images.mjs
 *
 * One-shot scrape + encode helper for the /press/ page.
 *
 * Reads the canonical image-URL list (`PRESS_SOURCES` below — sourced from
 * og:image meta tags fetched via curl on 2026-06-09), downloads each image
 * via Node's built-in fetch with a browser User-Agent + Referer, then encodes
 * with sharp into the standard .full.webp + .half.webp + .full.jpg + .half.jpg
 * quartet under `assets/images/press/NN.*`.
 *
 * Idempotent: skips entries whose `.full.webp` already exists unless `--force`
 * is passed.
 *
 * On any single failure (network, 404, sharp can't decode), logs the error and
 * sets `imageMissing: true` for that entry in the printed summary so the
 * caller can update `data/press.json` to render the no-image card.
 *
 * Constitution §8: encoded outputs target ≤ 220 KB for .full.webp.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import sharp from "sharp";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = resolve(ROOT, "assets", "images", "press");
const FORCE = process.argv.includes("--force");

mkdirSync(OUT_DIR, { recursive: true });

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// id (zero-padded), the article URL (used as Referer to defeat hotlink blocks),
// and the og:image URL extracted on 2026-06-09. Caption + credit captured at
// the same time and emitted into the summary so the markup can use them.
const PRESS_SOURCES = [
  {
    id: "01",
    referer: "https://home.walla.co.il/item/3769677",
    imageUrl: "https://images.wcdn.co.il/f_auto,q_auto,w_1200,t_54/3/9/3/1/3931502-46.jpg",
    caption: "מתחם גאמוס במעלה אדומים",
    credit: "וואלה בית ועיצוב",
  },
  {
    id: "02",
    referer: "https://jerusalem.mynet.co.il/yediothjerusalem/article/sy9h1ysua",
    imageUrl: "https://pic1.yitweb.co.il/picserver/mynet/crop_images/2024/06/27/r1MGaxkoUC/r1MGaxkoUC_0_0_2048_1152_0_large.jpg",
    caption: "מתחם גאמוס – ידיעות ירושלים",
    credit: "mynet ירושלים",
  },
  {
    id: "03",
    referer: "https://sport1.maariv.co.il/square/article/1608237/",
    // Maariv: og:image points to asset 1238780 (NOT the 1271389 banner that
    // appears earlier on the page — that's a 1662×168 promotional strip).
    // We ask for the original (no thumb crop, no h/w) so the encoder can
    // resize the largest available.
    imageUrl: "https://sport1images.maariv.co.il/image/upload/f_auto,fl_lossy/1238780",
    caption: "החגיגה של משפחת בוזגלו במתחם גאמוס",
    credit: "מעריב Sport1",
  },
  {
    id: "04",
    referer: "https://www.emess.co.il/radio/1770827",
    // EMESS: og:image is on emess.co.il (NOT ahs.co.il — that's the upstream
    // host the resize endpoint proxies to, but the publicly served URL is
    // emess.co.il/resize/?...&url=...). The 800×450 size is the only one
    // available; sharp won't enlarge.
    imageUrl: "https://www.emess.co.il/resize/?width=800&height=450&url=/uploads/2025/10/6P1A8029.jpg",
    caption: "חתונת בתו של מנחם טוקר",
    credit: "צילום: שלומי כהן",
  },
  {
    id: "05",
    referer: "https://www.ynet.co.il/yedioth/article/yokra14158336",
    imageUrl: "https://ynet-pic1.yit.co.il/picserver6/crop_images/2024/11/21/yk14158466/yk14158466_0_0_268_232_0_x-large.jpg",
    caption: "השף אבי ביטון",
    credit: "ynet",
  },
  {
    id: "06",
    referer: "https://mekomi.walla.co.il/item/3673958",
    imageUrl: "https://images.wcdn.co.il/f_auto,q_auto,w_1200,t_54/3/7/3/3/3733554-46.jpg",
    caption: "מתחם מעוצב בהשראת דובאי לחתונות ואירועים של פעם בחיים",
    credit: "וואלה מקומי",
  },
  {
    id: "07",
    referer: "https://www.ice.co.il/tourism/news/article/1015983",
    imageUrl: "https://img.ice.co.il/giflib/news/rsPhoto/sz_464/rsz_615_346_35b10f35-0748-4511-b3fd-274846856acb.jpeg",
    caption: "מתחם גאמוס",
    credit: "ICE",
  },
];

async function downloadImage(url, referer) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
      Referer: referer,
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1024) {
    throw new Error(`Suspiciously small response (${buf.length} bytes) — likely an HTML error page`);
  }
  return buf;
}

async function encodeQuartet(buf, id) {
  // Probe input size so we can decide whether an upscale is worth attempting.
  const meta = await sharp(buf).metadata();
  const inputW = meta.width ?? 0;
  console.log(`  source: ${meta.format} ${inputW}×${meta.height ?? "?"} (${(buf.length / 1024).toFixed(1)} KB)`);

  // Targets per Constitution §8. We won't upscale beyond the source pixel size
  // to avoid blurring; if the source is small the .full.webp will simply be
  // smaller than 1920px (sharp's resize uses `withoutEnlargement: true`).
  const FULL_W = 1920;
  const HALF_W = 960;

  const opts = (w) => ({ width: w, fit: "inside", withoutEnlargement: true });

  await sharp(buf)
    .rotate()
    .resize(opts(FULL_W))
    .webp({ quality: 82 })
    .toFile(join(OUT_DIR, `${id}.full.webp`));

  await sharp(buf)
    .rotate()
    .resize(opts(HALF_W))
    .webp({ quality: 78 })
    .toFile(join(OUT_DIR, `${id}.half.webp`));

  await sharp(buf)
    .rotate()
    .resize(opts(FULL_W))
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(join(OUT_DIR, `${id}.full.jpg`));

  await sharp(buf)
    .rotate()
    .resize(opts(HALF_W))
    .jpeg({ quality: 78, mozjpeg: true })
    .toFile(join(OUT_DIR, `${id}.half.jpg`));
}

async function processOne(entry) {
  const target = join(OUT_DIR, `${entry.id}.full.webp`);
  if (!FORCE && existsSync(target)) {
    console.log(`[${entry.id}] skip — already exists (use --force to overwrite)`);
    return { id: entry.id, ok: true, skipped: true };
  }
  try {
    console.log(`[${entry.id}] fetch ${entry.imageUrl}`);
    const buf = await downloadImage(entry.imageUrl, entry.referer);
    await encodeQuartet(buf, entry.id);
    console.log(`[${entry.id}] ✔ encoded`);
    return { id: entry.id, ok: true, caption: entry.caption, credit: entry.credit };
  } catch (err) {
    console.error(`[${entry.id}] ✖ ${err.message}`);
    return { id: entry.id, ok: false, error: err.message };
  }
}

const results = [];
for (const entry of PRESS_SOURCES) {
  // Sequential, not parallel — keeps logs readable + plays nice with Israeli
  // CDN rate limits which were occasionally fussy during testing.
  // eslint-disable-next-line no-await-in-loop
  results.push(await processOne(entry));
}

console.log("\n=== Summary ===");
const summary = results.map((r) => ({
  id: r.id,
  imagePath: r.ok ? `/assets/images/press/${r.id}` : null,
  caption: r.caption ?? "",
  credit: r.credit ?? "",
  error: r.error,
}));
writeFileSync(join(OUT_DIR, "_summary.json"), JSON.stringify(summary, null, 2), "utf8");
for (const s of summary) {
  console.log(s.imagePath ? `${s.id}: ✔ ${s.imagePath}` : `${s.id}: ✖ ${s.error}`);
}
console.log(`\nSummary written to ${join(OUT_DIR, "_summary.json")}`);
