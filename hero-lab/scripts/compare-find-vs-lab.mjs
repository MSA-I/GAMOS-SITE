/**
 * compare-find-vs-lab.mjs — side-by-side Playwright comparison of the FIND Real
 * Estate hero vs. the GAMOS hero-lab port, for the HERO-COMPARISON.md report.
 *
 * This is NOT a pixel-diff: the assets (desert vs. building) and the wordmark
 * text (GAMOS/EVENTS vs. FIND) differ ON PURPOSE. What we compare is the
 * CHOREOGRAPHY — at what normalized scroll progress each "beat" happens (headline
 * sink, outline draw, letters fill, smoke rise, veil dissolve) and how big each
 * layer's motion is. Screenshots are written side-by-side so the effect can be
 * eyeballed; a beat table is printed for the quantitative comparison.
 *
 * Pattern copied from qa-hero-lab.mjs: resolve Playwright from the npx cache via
 * createRequire (fallback to a local `playwright`), so this touches NOTHING in
 * package.json.
 *
 * Two FIND sources are supported:
 *   LIVE :  FIND_BASE=https://findrealestate.com  (the real production site — default
 *           target for the user's "compare against the real site" request)
 *   CLONE:  cd findrealestate-clone && node server.js 8080  → FIND_BASE=http://localhost:8080
 * LAB is always served locally:
 *           cd GAMOS-SITE && npx serve . -p 8000  → http://localhost:8000/hero-lab/
 * Override with:  FIND_BASE=... LAB_BASE=... node hero-lab/scripts/compare-find-vs-lab.mjs
 *
 * Screenshots → hero-lab/scripts/__shots__/compare/ (find-pNNN.png + lab-pNNN.png).
 */
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const PW_CACHE = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium;
try { ({ chromium } = require(PW_CACHE)); } catch { ({ chromium } = require("playwright")); }

const __dirname = dirname(fileURLToPath(import.meta.url));
const SHOTS = resolve(__dirname, "__shots__", "compare");
mkdirSync(SHOTS, { recursive: true });

// Default FIND target is the LIVE production site (per the user's request to
// compare against the real site). Set FIND_BASE=http://localhost:8080 to use the
// local clone instead.
const FIND_BASE = process.env.FIND_BASE || "https://findrealestate.com";
const LAB_BASE = process.env.LAB_BASE || "http://localhost:8000";
const FIND_URL = FIND_BASE + "/";
const LAB_URL = LAB_BASE + "/hero-lab/";
const FIND_IS_LIVE = /^https?:\/\/(?!localhost|127\.)/.test(FIND_BASE);

const SAMPLES = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1];
const pad = (p) => String(Math.round(p * 100)).padStart(3, "0");

/**
 * Scroll to normalized progress p∈[0,1] OF THE HERO TRACK — not the whole
 * document. CRITICAL for a fair comparison: FIND's document is ~13760px (hero +
 * many sections below) while hero-lab's document is ONLY the ~4500px hero. If we
 * normalized over document height, FIND's hero would look "finished by p=0.15"
 * (an artifact). Both heroes use an identical 500vh pinned track (hero_root
 * offsetHeight 4500, track = 4500 - vh = 3600px), so we scroll to
 * p * (heroOffsetH - vh) on both → p means the same thing on each.
 */
async function scrollTo(page, p) {
  await page.evaluate((pp) => {
    const hero =
      document.querySelector('[class*="hero_root"]') ||
      document.querySelector(".hero_root");
    let max;
    if (hero && hero.offsetHeight > window.innerHeight) {
      max = hero.offsetTop + hero.offsetHeight - window.innerHeight; // pinned-track range
    } else {
      max = document.documentElement.scrollHeight - window.innerHeight; // fallback
    }
    window.scrollTo(0, Math.round(max * pp));
  }, p);
  // scrub is now 0.1 on the lab side; FIND uses 0.1 too. 350ms is plenty to settle.
  await page.waitForTimeout(350);
}

/** Best-effort dismiss of cookie/consent banners on the live site (so they don't
 *  block the hero in screenshots). Tries common accept-button texts; ignores misses. */
async function dismissBanners(page) {
  const labels = [
    "Accept all", "Accept All", "Accept", "I agree", "Agree", "Got it",
    "Allow all", "OK", "Continue", "אישור", "מסכים",
  ];
  for (const t of labels) {
    try {
      const btn = page.getByRole("button", { name: t, exact: false }).first();
      if (await btn.isVisible({ timeout: 400 })) { await btn.click({ timeout: 800 }); await page.waitForTimeout(300); return; }
    } catch { /* not present — try next */ }
  }
}

/** Read the lab's beat state (opacities + layer Y positions) at the current scroll. */
async function readLabState(page) {
  return page.evaluate(() => {
    const op = (sel) => {
      const el = document.querySelector(sel);
      return el ? parseFloat(getComputedStyle(el).opacity) : null;
    };
    const y = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return Math.round(el.getBoundingClientRect().y);
    };
    return {
      p: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--p")) || 0,
      content: op(".layer--content"),
      maskfill: op(".layer--maskfill"),
      outline: op(".layer--outline"),
      veil: op(".layer--veil"),
      cloud: op(".cloud--start"),
      subjectY: y(".layer--subject img"),
      smokeY: y(".smoke__img"),
    };
  });
}

/**
 * Best-effort beat read for FIND. FIND uses hashed CSS-module class prefixes
 * (hero_content__*, hero_composite__*, hero_smoke__* …), so we match by class
 * PREFIX rather than exact name. Returns nulls gracefully if the DOM differs —
 * the screenshots remain the primary FIND comparison artifact.
 */
async function readFindState(page) {
  return page.evaluate(() => {
    const byPrefix = (prefix) =>
      document.querySelector(`[class*="${prefix}"]`);
    const op = (prefix) => {
      const el = byPrefix(prefix);
      return el ? parseFloat(getComputedStyle(el).opacity) : null;
    };
    const y = (prefix) => {
      const el = byPrefix(prefix);
      if (!el) return null;
      return Math.round(el.getBoundingClientRect().y);
    };
    return {
      content: op("hero_content"),
      composite: op("hero_composite"), // FIND's mask-fill copy
      logo: op("hero_logo"),           // FIND's outline wordmark
      overlay: op("hero_overlay"),     // FIND's white veil
      houseY: y("hero_house"),         // FIND's rising building
      smokeY: y("hero_smoke"),
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const vp = { viewport: { width: 1440, height: 900 } };

  // ---- FIND ----------------------------------------------------------------
  const findCtx = await browser.newContext(vp);
  const fp = await findCtx.newPage();
  const findErrs = [];
  fp.on("console", (m) => { if (m.type() === "error") findErrs.push(m.text()); });
  let findReachable = true;
  try {
    // Live site: a full "load" can exceed 15s (video + big media), so wait only
    // for DOM + JS, then give hydration/GSAP a generous beat. Local clone is fast.
    await fp.goto(FIND_URL, {
      waitUntil: FIND_IS_LIVE ? "domcontentloaded" : "load",
      timeout: FIND_IS_LIVE ? 60000 : 15000,
    });
    if (FIND_IS_LIVE) {
      try { await fp.waitForLoadState("networkidle", { timeout: 15000 }); } catch { /* heavy site never idles — fine */ }
    }
    await fp.waitForTimeout(FIND_IS_LIVE ? 4000 : 2000); // hydration + GSAP reveal
    await dismissBanners(fp); // cookie / consent overlays on the live site
  } catch (e) {
    findReachable = false;
    console.log(`\n⚠️  FIND not reachable @ ${FIND_URL} — ${e.message}\n   (live: check connectivity; clone: cd findrealestate-clone && node server.js 8080)\n`);
  }

  // ---- LAB -----------------------------------------------------------------
  const labCtx = await browser.newContext(vp);
  const lp = await labCtx.newPage();
  const labErrs = [];
  lp.on("console", (m) => { if (m.type() === "error") labErrs.push(m.text()); });
  let labReachable = true;
  try {
    await lp.goto(LAB_URL, { waitUntil: "load", timeout: 15000 });
    await lp.waitForTimeout(2000); // entrance timeline + fonts
  } catch (e) {
    labReachable = false;
    console.log(`\n⚠️  LAB not reachable @ ${LAB_URL} — ${e.message}\n   (start it with: cd GAMOS-SITE && npx serve . -p 8000)\n`);
  }

  console.log(`\nCOMPARE  FIND ${findReachable ? "✓" : "✗"} ${FIND_URL}`);
  console.log(`         LAB  ${labReachable ? "✓" : "✗"} ${LAB_URL}\n`);

  const labRows = [];
  const findRows = [];

  for (const p of SAMPLES) {
    if (findReachable) {
      await scrollTo(fp, p);
      await fp.screenshot({ path: resolve(SHOTS, `find-p${pad(p)}.png`) });
      findRows.push({ p, ...(await readFindState(fp)) });
    }
    if (labReachable) {
      await scrollTo(lp, p);
      await lp.screenshot({ path: resolve(SHOTS, `lab-p${pad(p)}.png`) });
      labRows.push({ p, ...(await readLabState(lp)) });
    }
  }

  // ---- Report --------------------------------------------------------------
  const f3 = (v) => (v == null ? "  · " : v.toFixed(2));
  const i4 = (v) => (v == null ? "  · " : String(v).padStart(4));

  if (labReachable) {
    console.log("=== LAB beat table (opacity per layer / Y per moving layer) ===");
    console.log("  p     content maskfill outline veil  cloud | subjY smokeY");
    for (const r of labRows) {
      console.log(
        `  ${r.p.toFixed(2)}  ${f3(r.content)}   ${f3(r.maskfill)}    ${f3(r.outline)}   ${f3(r.veil)} ${f3(r.cloud)} | ${i4(r.subjectY)} ${i4(r.smokeY)}`
      );
    }
  }

  if (findReachable) {
    console.log("\n=== FIND beat table (by class-prefix; nulls = DOM differs) ===");
    console.log("  p     content composite logo  overlay | houseY smokeY");
    for (const r of findRows) {
      console.log(
        `  ${r.p.toFixed(2)}  ${f3(r.content)}   ${f3(r.composite)}     ${f3(r.logo)}  ${f3(r.overlay)}  | ${i4(r.houseY)} ${i4(r.smokeY)}`
      );
    }
  }

  // ---- Derived beat-onset summary (lab) ------------------------------------
  if (labReachable) {
    const onset = (key, thresh, dir = "up") => {
      for (const r of labRows) {
        const v = r[key];
        if (v == null) continue;
        if (dir === "up" && v >= thresh) return r.p;
        if (dir === "down" && v <= thresh) return r.p;
      }
      return null;
    };
    console.log("\n=== LAB derived beat onsets ===");
    console.log(`  headline gone (content ≤ 0.1):     p≈${onset("content", 0.1, "down")}`);
    console.log(`  letters filling (maskfill ≥ 0.5):  p≈${onset("maskfill", 0.5, "up")}`);
    console.log(`  letters full (maskfill ≥ 0.9):     p≈${onset("maskfill", 0.9, "up")}`);
    console.log(`  veil dissolving (veil ≥ 0.5):      p≈${onset("veil", 0.5, "up")}`);
  }

  if (findErrs.length) console.log(`\n  FIND console errors: ${findErrs.slice(0, 3).join(" || ")}`);
  if (labErrs.length) console.log(`  LAB console errors: ${labErrs.slice(0, 3).join(" || ")}`);

  console.log(`\nscreenshots → ${SHOTS}`);
  console.log(`  find-p{000..100}.png  vs  lab-p{000..100}.png  (compare side by side)\n`);

  await browser.close();
  if (!findReachable || !labReachable) process.exitCode = 2;
}

run().catch((e) => { console.error("COMPARE ERROR:", e); process.exitCode = 1; });
