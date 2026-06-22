/**
 * frame-diff-find-vs-lab.mjs — DENSE frame-by-frame visual diff of the LIVE
 * findrealestate.com hero vs. the GAMOS hero-lab port.
 *
 * Unlike compare-find-vs-lab.mjs (7 sample points, choreography/timing only),
 * this samples the hero track at a FINE granularity and stitches each pair
 * SIDE-BY-SIDE (FIND left | LAB right) into one image per progress step, so the
 * VISUAL gaps are obvious frame-for-frame. This is the "look at every frame
 * against the real site" pass the user asked for.
 *
 * Both heroes use an identical 500vh pinned track; we normalize over the HERO
 * TRACK (heroOffsetH - vh), NOT the document, so p means the same on each
 * (FIND's doc is ~13760px incl. lower sections; LAB's is ~4500px = just the hero).
 *
 * Servers:
 *   FIND : LIVE https://findrealestate.com  (default; override FIND_BASE)
 *   LAB  : cd GAMOS-SITE && npx serve . -p 8000  → http://localhost:8000/hero-lab/
 *
 * Output → hero-lab/scripts/__shots__/framediff/
 *   find-pNNN.png, lab-pNNN.png (raw), pair-pNNN.png (side-by-side, labeled)
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const PW_CACHE = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium; try { ({ chromium } = require(PW_CACHE)); } catch { ({ chromium } = require("playwright")); }
let sharp = null; try { sharp = require(resolve(process.cwd(), "node_modules/sharp")); } catch { try { sharp = require("sharp"); } catch { /* no sharp → skip stitching */ } }

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "__shots__", "framediff");
mkdirSync(OUT, { recursive: true });

const FIND_BASE = process.env.FIND_BASE || "https://findrealestate.com";
const LAB_BASE = process.env.LAB_BASE || "http://localhost:8000";
const FIND_URL = FIND_BASE + "/";
const LAB_URL = LAB_BASE + "/hero-lab/";
const FIND_IS_LIVE = /^https?:\/\/(?!localhost|127\.)/.test(FIND_BASE);

const VW = 1440, VH = 900;
// Dense sample: every 0.08 of the hero track → 13 steps.
const SAMPLES = [];
for (let p = 0; p <= 1.0001; p += 1 / 12) SAMPLES.push(Math.min(1, +p.toFixed(4)));
const pad = (p) => String(Math.round(p * 100)).padStart(3, "0");

async function scrollTo(page, p) {
  await page.evaluate((pp) => {
    const hero = document.querySelector('[class*="hero_root"]') || document.querySelector(".hero_root");
    let max;
    if (hero && hero.offsetHeight > window.innerHeight) max = hero.offsetTop + hero.offsetHeight - window.innerHeight;
    else max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * pp));
  }, p);
  await page.waitForTimeout(400);
}

async function dismissBanners(page) {
  const labels = ["Accept all", "Accept All", "Accept", "I agree", "Agree", "Got it", "Allow all", "OK", "Continue"];
  for (const t of labels) {
    try {
      const btn = page.getByRole("button", { name: t, exact: false }).first();
      if (await btn.isVisible({ timeout: 400 })) { await btn.click({ timeout: 800 }); await page.waitForTimeout(300); return; }
    } catch { /* next */ }
  }
}

/** Stitch find|lab side by side with a labeled header band. */
async function stitch(p) {
  if (!sharp) return;
  const fPath = resolve(OUT, `find-p${pad(p)}.png`);
  const lPath = resolve(OUT, `lab-p${pad(p)}.png`);
  const band = 34;
  const labelSvg = (text, w) => Buffer.from(
    `<svg width="${w}" height="${band}"><rect width="${w}" height="${band}" fill="#1a1410"/>` +
    `<text x="12" y="23" font-family="sans-serif" font-size="18" fill="#f5efe6">${text}</text></svg>`
  );
  const tag = async (src, label) => {
    const img = sharp(src).resize(VW, VH, { fit: "cover" });
    const body = await img.png().toBuffer();
    return sharp({ create: { width: VW, height: VH + band, channels: 3, background: "#000" } })
      .composite([
        { input: labelSvg(label, VW), top: 0, left: 0 },
        { input: body, top: band, left: 0 },
      ]).png().toBuffer();
  };
  const left = await tag(fPath, `FIND (live)  p=${p.toFixed(2)}`);
  const right = await tag(lPath, `hero-lab  p=${p.toFixed(2)}`);
  await sharp({ create: { width: VW * 2 + 6, height: VH + band, channels: 3, background: "#000" } })
    .composite([{ input: left, top: 0, left: 0 }, { input: right, top: 0, left: VW + 6 }])
    .png().toFile(resolve(OUT, `pair-p${pad(p)}.png`));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const findCtx = await browser.newContext({ viewport: { width: VW, height: VH } });
  const labCtx = await browser.newContext({ viewport: { width: VW, height: VH } });
  const fp = await findCtx.newPage(), lp = await labCtx.newPage();

  let findOk = true, labOk = true;
  try {
    await fp.goto(FIND_URL, { waitUntil: FIND_IS_LIVE ? "domcontentloaded" : "load", timeout: FIND_IS_LIVE ? 60000 : 15000 });
    if (FIND_IS_LIVE) { try { await fp.waitForLoadState("networkidle", { timeout: 15000 }); } catch {} }
    await fp.waitForTimeout(FIND_IS_LIVE ? 4500 : 2000);
    await dismissBanners(fp);
  } catch (e) { findOk = false; console.log("FIND fail:", e.message); }
  try {
    await lp.goto(LAB_URL, { waitUntil: "load", timeout: 15000 });
    await lp.waitForTimeout(2000);
  } catch (e) { labOk = false; console.log("LAB fail:", e.message); }

  console.log(`\nFRAME DIFF  FIND ${findOk ? "✓" : "✗"} ${FIND_URL}   LAB ${labOk ? "✓" : "✗"} ${LAB_URL}`);
  console.log(`sharp stitching: ${sharp ? "ON" : "OFF (raw frames only)"}\n`);

  for (const p of SAMPLES) {
    if (findOk) { await scrollTo(fp, p); await fp.screenshot({ path: resolve(OUT, `find-p${pad(p)}.png`) }); }
    if (labOk) { await scrollTo(lp, p); await lp.screenshot({ path: resolve(OUT, `lab-p${pad(p)}.png`) }); }
    if (findOk && labOk) await stitch(p);
    console.log(`  p=${p.toFixed(2)}  ${findOk && labOk && sharp ? "→ pair-p" + pad(p) + ".png" : ""}`);
  }

  await browser.close();
  console.log(`\n→ ${OUT}\n  open pair-p{000..100}.png to inspect FIND (left) vs hero-lab (right) frame by frame.\n`);
  if (!findOk || !labOk) process.exitCode = 2;
}
run().catch((e) => { console.error("FRAMEDIFF ERROR:", e); process.exitCode = 1; });
