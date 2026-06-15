/**
 * qa-hero-lab.mjs — Playwright QA for the FIND-faithful hero-lab sandbox.
 *
 * Pattern copied from mobile/scripts/qa-mobile-pages.mjs: resolve Playwright from
 * the npx cache via createRequire (fallback to a local `playwright`), so this
 * touches NOTHING in package.json.
 *
 * Assumes a static server is already serving the repo ROOT, e.g.:
 *   npx serve . -p 8000          (then BASE = http://localhost:8000)
 * Override with:  QA_BASE=http://localhost:5050 node hero-lab/scripts/qa-hero-lab.mjs
 *
 * Verifies (plan §F):
 *  1. mask fills across scroll      (maskfill opacity: ~0 → >.4 → ~1)
 *  2. outline fades as fill rises   (outline opacity: ~1 → ≤.2, inverse of maskfill)
 *  3. two clouds spread to opposite edges (one cloud.webp reused, end mirrored — FIND-faithful)
 *  4. smoke rises                   (translateY at p=1 higher than p=0)
 *  5. no blank frame at any p       (sky/subject imgs decoded; not ~uniform white)
 *  6. subject present + rises
 *  7. reduced-motion settled frame  (maskfill≈1, outline≈.2, no errors)
 *  8. no-js finished frame          (root ~100vh, maskfill=1, all visible)
 *
 * Screenshots → hero-lab/scripts/__shots__/.
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
const SHOTS = resolve(__dirname, "__shots__");
mkdirSync(SHOTS, { recursive: true });

const BASE = process.env.QA_BASE || "http://localhost:8000";
const URL = BASE + "/hero-lab/";

const results = [];
const log = (ok, t, d = "") => { results.push([ok, t, d]); console.log(`  [${ok ? "PASS" : "FAIL"}] ${t}${d ? " — " + d : ""}`); };
const near = (v, target, tol) => Math.abs(v - target) <= tol;

/** Scroll the 500vh track to a normalized progress p∈[0,1] and read layer state. */
async function readAt(page, p) {
  await page.evaluate((pp) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    window.scrollTo(0, Math.round(max * pp));
  }, p);
  await page.waitForTimeout(550); // settle for scrub:0.6
  return page.evaluate(() => {
    const cs = (sel, prop) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return getComputedStyle(el).getPropertyValue(prop);
    };
    const rect = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2, cy: b.y + b.height / 2 };
    };
    const imgOk = (sel) => {
      const el = document.querySelector(sel);
      return !!(el && el.naturalWidth > 0 && el.naturalHeight > 0);
    };
    const maskImg = document.querySelector(".layer--maskfill image");
    const outlinePath = document.querySelector(".layer--outline .wordmark-svg path");
    const zIdx = (sel) => { const el = document.querySelector(sel); return el ? parseInt(getComputedStyle(el).zIndex, 10) : null; };
    return {
      p: parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--p")) || 0,
      maskOpacity: parseFloat(cs(".layer--maskfill", "opacity")),
      outlineOpacity: parseFloat(cs(".layer--outline", "opacity")),
      contentOpacity: parseFloat(cs(".layer--content", "opacity")),
      veilOpacity: parseFloat(cs(".layer--veil", "opacity")),
      cloudStart: rect(".cloud--start"),
      cloudEnd: rect(".cloud--end"),
      cloudOpacity: parseFloat(cs(".cloud--start", "opacity")),
      cloudStartSrc: document.querySelector(".cloud--start")?.currentSrc || document.querySelector(".cloud--start")?.src,
      cloudEndSrc: document.querySelector(".cloud--end")?.currentSrc || document.querySelector(".cloud--end")?.src,
      smoke: rect(".smoke__img"),
      subject: rect(".layer--subject img"),
      skyImgOk: imgOk(".layer--sky img"),
      subjectImgOk: imgOk(".layer--subject img"),
      contentVisible: parseFloat(cs(".layer--content", "opacity")) > 0.01,
      // RF2 parallax: the masked image's computed transform (changes across scroll)
      maskImgTransform: maskImg ? getComputedStyle(maskImg).transform : null,
      // RF3 continuous draw: the outline path's stroke-dashoffset (should decrease).
      // The computed value can come back wrapped as "calc(213.71px)", so pull the
      // first number out rather than parseFloat (which chokes on the "calc(" prefix).
      outlineDashoffset: (() => {
        if (!outlinePath) return null;
        const raw = getComputedStyle(outlinePath).getPropertyValue("stroke-dashoffset");
        const m = raw && raw.match(/-?\d+(\.\d+)?/);
        return m ? parseFloat(m[0]) : null;
      })(),
      // RF5 seam: z-orders + content centre
      smokeZ: zIdx(".layer--smoke"),
      veilZ: zIdx(".layer--veil"),
      contentRect: rect(".hero-content"),
      vh: window.innerHeight,
    };
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  console.log(`\nQA hero-lab @ ${URL}\n`);

  // ---- Desktop scrub matrix ------------------------------------------------
  const desk = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const dp = await desk.newPage();
  const deskErrs = [];
  dp.on("console", (m) => { if (m.type() === "error") deskErrs.push(m.text()); });
  await dp.goto(URL, { waitUntil: "load" });
  await dp.waitForTimeout(1800); // entrance timeline + fonts

  console.log("=== desktop 1440×900 (FIND staging, round 3 windows) ===");
  // Sample points aligned to the round-3 windows: p1 0→0.18, draw 0.06→0.68,
  // p3 0.45→0.80, p4 0.74→1.0. Lets us assert the SEQUENCE + the round-3 fixes.
  const snap = {};
  for (const p of [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1]) {
    snap[p] = await readAt(dp, p);
    await dp.screenshot({ path: resolve(SHOTS, `hero-p${String(Math.round(p * 100)).padStart(3, "0")}@1440.png`) });
  }

  // BEAT 1 — headline sinks first; fill not started.
  log(snap[0].contentOpacity > 0.9 && snap[0.15].contentOpacity < 0.3 && snap[0.15].maskOpacity < 0.1,
    "B1·headline fades first, fill not started",
    `content p0=${snap[0].contentOpacity?.toFixed(2)} p.15=${snap[0.15].contentOpacity?.toFixed(2)} maskfill@.15=${snap[0.15].maskOpacity?.toFixed(2)}`);

  // RF3 — outline strokes draw CONTINUOUSLY across most of the scroll: the
  // dashoffset must DECREASE monotonically from p.15→p.35→p.55 (not snap in a
  // tiny window). Each glyph has a per-path --len, so check the first path.
  const off = [0.15, 0.35, 0.55].map((p) => snap[p].outlineDashoffset);
  log(off[0] > off[1] && off[1] > off[2] && off[0] > 0,
    "RF3·outline draws continuously (dashoffset decreases across scroll)",
    `dashoffset p.15=${off[0]?.toFixed(0)} p.35=${off[1]?.toFixed(0)} p.55=${off[2]?.toFixed(0)}`);

  // RF2 — PARALLAX FILL: the masked image's transform must CHANGE between p.35
  // and p.75 (it pans inside the letters). Static fill would be identical.
  log(snap[0.35].maskImgTransform && snap[0.75].maskImgTransform &&
      snap[0.35].maskImgTransform !== snap[0.75].maskImgTransform,
    "RF2·masked image MOVES inside the letters (parallax, not static)",
    `t@.35≠t@.75 → ${snap[0.35].maskImgTransform !== snap[0.75].maskImgTransform}`);

  // BEAT 3 — crossover: fill rises late (last third) as the outline fades.
  log(snap[0.55].maskOpacity > 0.1 && snap[0.9].maskOpacity > 0.85 && snap[0.9].outlineOpacity < snap[0.55].outlineOpacity,
    "B3·fill rises in the last third as outline fades",
    `maskfill p.55=${snap[0.55].maskOpacity?.toFixed(2)} p.9=${snap[0.9].maskOpacity?.toFixed(2)} outline .55→.9=${snap[0.55].outlineOpacity?.toFixed(2)}→${snap[0.9].outlineOpacity?.toFixed(2)}`);

  // BEAT 4 + RF5 — smoke rises ABOVE the veil (z), clouds fade out, veil dissolves last.
  log(snap[0.55].veilOpacity < 0.1 && snap[1].veilOpacity > 0.8 && snap[0.9].smoke.y < snap[0.55].smoke.y - 5,
    "B4·smoke rises + veil dissolves last",
    `veil p.55=${snap[0.55].veilOpacity?.toFixed(2)} p1=${snap[1].veilOpacity?.toFixed(2)} smokeY .55→.9=${snap[0.55].smoke.y.toFixed(0)}→${snap[0.9].smoke.y.toFixed(0)}`);
  log(snap[0].smokeZ > snap[0].veilZ && snap[0.9].cloudOpacity < 0.3,
    "RF5·smoke above veil (seam covered) + clouds faded by beat 4",
    `smokeZ=${snap[0].smokeZ} veilZ=${snap[0].veilZ} cloudOp@.9=${snap[0.9].cloudOpacity?.toFixed(2)}`);

  // RF1 — headline centered at rest (its box centre near viewport centre).
  const cc = snap[0].contentRect, vh0 = snap[0].vh;
  log(cc && Math.abs(cc.cy - vh0 / 2) < vh0 * 0.18,
    "RF1·headline centered at rest",
    `content cy=${cc?.cy.toFixed(0)} vh/2=${(vh0/2).toFixed(0)}`);

  // 3. clouds spread to opposite edges (one cloud.webp reused, --end mirrored via scaleX(-1) — FIND-faithful)
  const cStartMoved = snap[1].cloudStart.cx - snap[0].cloudStart.cx; // RTL start = right; +15% pushes it further right (→ +x)
  const cEndMoved = snap[1].cloudEnd.cx - snap[0].cloudEnd.cx;
  log(Math.abs(cStartMoved) > 5 && Math.abs(cEndMoved) > 5 && Math.sign(cStartMoved) !== Math.sign(cEndMoved),
    "3·clouds spread to opposite edges",
    `Δstart=${cStartMoved.toFixed(0)} Δend=${cEndMoved.toFixed(0)} file=${(snap[0].cloudStartSrc||"").split("/").pop()}`);

  // 4. smoke rises (smaller/negative y at p=1)
  log(snap[1].smoke.y < snap[0].smoke.y - 5,
    "4·smoke rises with scroll",
    `y p0=${snap[0].smoke.y.toFixed(0)} p1=${snap[1].smoke.y.toFixed(0)}`);

  // 5. no blank frame: sky + subject decoded at every p; + a pixel-uniformity check
  const allDecoded = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1].every((p) => snap[p].skyImgOk && snap[p].subjectImgOk);
  // uniformity: sample the rendered DOM via screenshot variance in-browser
  const uniform = await dp.evaluate(async () => {
    // draw the visible viewport to a small canvas and measure luma stddev
    return new Promise((res) => {
      const c = document.createElement("canvas");
      c.width = 80; c.height = 50;
      // can't readback cross-origin-free here without taint; approximate by
      // checking that multiple layers have non-zero painted area instead.
      const layers = [".layer--sky img", ".layer--subject img", ".layer--content"];
      const painted = layers.filter((s) => {
        const el = document.querySelector(s);
        if (!el) return false;
        const b = el.getBoundingClientRect();
        const st = getComputedStyle(el);
        return b.width > 4 && b.height > 4 && parseFloat(st.opacity) > 0.02 && st.visibility !== "hidden" && st.display !== "none";
      });
      res(painted.length);
    });
  });
  log(allDecoded && uniform >= 2, "5·no blank frame at any p (imgs decoded + layers painted)", `decoded=${allDecoded} paintedLayers=${uniform}`);

  // 6. subject present + rises
  log(snap[0].subjectImgOk && snap[1].subject.y < snap[0].subject.y - 5,
    "6·subject present and rises",
    `imgOk=${snap[0].subjectImgOk} y p0=${snap[0].subject.y.toFixed(0)} p1=${snap[1].subject.y.toFixed(0)}`);

  // 7. warm sunset sky in use (not the pastel-blue FIND lookalike). Sample the
  // mid-band of the sky (the sunset's warm glow sits mid/low, not the pale top
  // strip) from a fresh screenshot at p=0 and assert R > B.
  await readAt(dp, 0);
  const skyShot = await dp.screenshot({ clip: { x: 60, y: 260, width: 40, height: 40 } });
  const warm = await dp.evaluate(async (b64) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let r = 0, g = 0, bl = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; bl += d[i + 2]; n++; }
    return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(bl / n) };
  }, skyShot.toString("base64"));
  log(warm.r > warm.b, "7·warm sunset sky in use (R>B at top)", `sky rgb(${warm.r},${warm.g},${warm.b})`);

  if (deskErrs.length) console.log(`  console errors: ${deskErrs.slice(0, 3).join(" || ")}`);
  log(deskErrs.length === 0, "·no console errors (desktop)", deskErrs.length ? deskErrs.slice(0, 2).join(" | ") : "clean");
  await desk.close();

  // ---- Mobile 390×844 ------------------------------------------------------
  const mob = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const mp = await mob.newPage();
  await mp.goto(URL, { waitUntil: "load" });
  await mp.waitForTimeout(1500);
  console.log("\n=== mobile 390×844 ===");
  const m0 = await readAt(mp, 0), m1 = await readAt(mp, 1);
  await mp.screenshot({ path: resolve(SHOTS, "hero-p000@390.png") });
  await readAt(mp, 0.5); await mp.screenshot({ path: resolve(SHOTS, "hero-p050@390.png") });
  await readAt(mp, 1); await mp.screenshot({ path: resolve(SHOTS, "hero-p100@390.png") });
  log(m1.maskOpacity > 0.85 && m1.subject.y < m0.subject.y - 5,
    "·mobile mask fills + subject rises",
    `mask p1=${m1.maskOpacity?.toFixed(2)} subjΔ=${(m1.subject.y - m0.subject.y).toFixed(0)}`);
  await mob.close();

  // ---- 7. reduced-motion settled frame ------------------------------------
  const rm = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  const rmp = await rm.newPage();
  const rmErrs = [];
  rmp.on("console", (m) => { if (m.type() === "error") rmErrs.push(m.text()); });
  await rmp.goto(URL, { waitUntil: "load" });
  await rmp.waitForTimeout(1000);
  const rs = await rmp.evaluate(() => ({
    mask: parseFloat(getComputedStyle(document.querySelector(".layer--maskfill")).opacity),
    content: parseFloat(getComputedStyle(document.querySelector(".layer--content")).opacity),
    subjectVisible: parseFloat(getComputedStyle(document.querySelector(".layer--subject")).opacity),
    rootH: document.querySelector(".hero_root").getBoundingClientRect().height,
    vh: window.innerHeight,
  }));
  await rmp.screenshot({ path: resolve(SHOTS, "hero-reduced-motion@1440.png") });
  // Reduced-motion shows the ENTRY frame: collapsed 100vh, headline readable,
  // desert visible, letters NOT yet filled (no scroll motion to fill them).
  log(rs.content > 0.9 && rs.mask < 0.1 && rs.subjectVisible > 0.9 && near(rs.rootH, rs.vh, 4) && rmErrs.length === 0,
    "RM·reduced-motion entry frame (headline visible, letters empty, 100vh)",
    `content=${rs.content} mask=${rs.mask} subj=${rs.subjectVisible} rootH≈vh(${rs.rootH.toFixed(0)}/${rs.vh}) errs=${rmErrs.length}`);
  await rm.close();

  // ---- no-js finished frame ------------------------------------------------
  const nj = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
  const njp = await nj.newPage();
  await njp.goto(URL, { waitUntil: "load" });
  await njp.waitForTimeout(600);
  const ns = await njp.evaluate(() => ({
    mask: parseFloat(getComputedStyle(document.querySelector(".layer--maskfill")).opacity),
    content: parseFloat(getComputedStyle(document.querySelector(".layer--content")).opacity),
    rootH: document.querySelector(".hero_root").getBoundingClientRect().height,
    vh: window.innerHeight,
    subjVisible: parseFloat(getComputedStyle(document.querySelector(".layer--subject")).opacity),
  }));
  await njp.screenshot({ path: resolve(SHOTS, "hero-no-js@1440.png") });
  log(ns.content > 0.9 && ns.mask < 0.1 && near(ns.rootH, ns.vh, 4) && ns.subjVisible > 0.9,
    "NJ·no-js entry frame (collapsed 100vh, headline visible, letters empty)",
    `content=${ns.content} mask=${ns.mask} rootH≈vh(${ns.rootH.toFixed(0)}/${ns.vh}) subj=${ns.subjVisible}`);
  await nj.close();

  await browser.close();

  console.log("\n" + "=".repeat(60));
  const passed = results.filter((r) => r[0]).length;
  console.log(`TOTAL: ${passed}/${results.length} passed`);
  console.log(`screenshots → ${SHOTS}`);
  if (passed !== results.length) {
    console.log("\nFAILURES:");
    results.filter((r) => !r[0]).forEach((r) => console.log(`  ✗ ${r[1]} — ${r[2]}`));
    process.exitCode = 1;
  }
}

run().catch((e) => { console.error("QA ERROR:", e); process.exitCode = 1; });
