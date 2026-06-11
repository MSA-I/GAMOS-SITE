/**
 * qa-mobile-fidelity.mjs — Playwright QA for the 2026-06-11 mobile-fidelity pass.
 *
 * Verifies mobile runs the IDENTICAL desktop experiences (not flat fallbacks)
 * across iPhone 12 / Galaxy S22 / iPhone SE, + desktop no-regression + a
 * reduced-motion pass. Server must already be on :5050.
 *
 * Resolves Playwright from the npx cache (not a repo dep) so package.json stays
 * untouched. Run:  node mobile/scripts/qa-mobile-fidelity.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);

// Resolve the npx-cached playwright module.
const PW_CACHE = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium;
try {
  ({ chromium } = require(PW_CACHE));
} catch {
  ({ chromium } = require("playwright"));
}

const BASE = "http://localhost:5050";
const MOBILE = [["iPhone12", 390, 844], ["GalaxyS22", 360, 780], ["iPhoneSE", 375, 667]];
const results = [];
const log = (tag, ok, detail = "") => {
  results.push([ok ? "PASS" : "FAIL", tag, detail]);
  console.log(`  [${ok ? "PASS" : "FAIL"}] ${tag}${detail ? " — " + detail : ""}`);
};
const settle = async (page) => { await page.waitForLoadState("networkidle").catch(() => {}); await page.waitForTimeout(400); };

async function testHome(page, label, w, reduced = false) {
  console.log(`\n=== HOME @ ${label} (${w}px)${reduced ? " [reduced-motion]" : ""} ===`);
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await settle(page);

  const layers = await page.evaluate(() => {
    const q = (s) => document.querySelector(s);
    const ev = q(".hero-static__layer--events > img");
    const rs = q(".hero-static__layer--resort > img");
    const op = (el) => (el ? parseFloat(getComputedStyle(el).opacity) : -1);
    const l = q(".hero-static__cta-label");
    let pill = "none";
    if (l) { const c = getComputedStyle(l); pill = (c.position === "absolute" && parseInt(c.width) <= 2) ? "sr-only" : "VISIBLE-PILL"; }
    return {
      base: !!q(".hero-static__layer--base"), gamos: !!q(".hero-static__layer--gamos"),
      desert: !!q(".hero-static__layer--desert"),
      eventsImg: op(ev), eventsW: ev ? ev.getBoundingClientRect().width : 0, resortImg: op(rs),
      tapEvents: !!q(".hero-static__tap--events"), pill,
    };
  });
  log(`hero/5-layers/${label}`, layers.base && layers.gamos && layers.desert, "base+gamos+desert present");
  log(`hero/events-bitmap-visible/${label}`, layers.eventsImg === 1 && layers.eventsW > 10, `opacity=${layers.eventsImg} w=${Math.round(layers.eventsW)}`);
  log(`hero/resort-bitmap-visible/${label}`, layers.resortImg === 1, `opacity=${layers.resortImg}`);
  log(`hero/no-pill/${label}`, layers.pill === "sr-only", `cta-label=${layers.pill}`);
  if (w <= 768) {
    const tap = await page.evaluate(() => {
      const t = document.querySelector(".hero-static__tap--events");
      if (!t) return { ok: false };
      const r = t.getBoundingClientRect(); const c = getComputedStyle(t);
      return { ok: true, w: r.width, h: r.height, href: t.getAttribute("href"), z: c.zIndex };
    });
    log(`hero/tap-overlay->=48px/${label}`, tap.ok && tap.w >= 48 && tap.h >= 48, `w=${Math.round(tap.w || 0)} h=${Math.round(tap.h || 0)} href=${tap.href} z=${tap.z}`);
  }

  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  log(`no-h-overflow/${label}`, ov.sw <= ov.cw + 2, `scrollWidth=${ov.sw} clientWidth=${ov.cw}`);

  await page.evaluate(() => document.querySelector("#lounge")?.scrollIntoView());
  await page.waitForTimeout(700);
  const lounge = await page.evaluate(() => {
    const ring = document.querySelector("[data-lounge-ring]"); const stage = document.querySelector("[data-lounge-stage]");
    if (!ring || !stage) return { ok: false };
    return { ok: true, ringT: getComputedStyle(ring).transform, persp: getComputedStyle(stage).perspective, stageT: getComputedStyle(stage).transform };
  });
  if (reduced) {
    log(`lounge/RM-grid/${label}`, lounge.ok && (lounge.ringT === "none" || lounge.ringT === "matrix(1, 0, 0, 1, 0, 0)"), `ringT=${lounge.ringT}`);
  } else {
    const hasRotate = lounge.ok && lounge.ringT && lounge.ringT.includes("matrix") && lounge.ringT !== "none";
    const perspOn = lounge.ok && lounge.persp !== "none";
    log(`lounge/3D-ring-live/${label}`, hasRotate && perspOn, `ringT=${(lounge.ringT || "?").slice(0, 28)} persp=${lounge.persp}`);
    if (w <= 768) log(`lounge/stage-scaled/${label}`, (lounge.stageT || "").includes("matrix"), `stageT=${(lounge.stageT || "none").slice(0, 28)}`);
  }

  if (w <= 768) {
    const man = await page.evaluate(() => { const c = document.querySelector(".culinary canvas[data-manifest-url]"); return c ? c.dataset.manifestUrl : "no-canvas"; });
    log(`culinary/mobile-manifest/${label}`, (man || "").includes("culinary-mobile"), `manifest=${man}`);
  }

  const shab = await page.evaluate(() => {
    const lay = document.querySelector(".shabbat__layout"); const stg = document.querySelector(".shabbat__stage");
    return { layD: lay ? getComputedStyle(lay).display : "none", stgD: stg ? getComputedStyle(stg).display : "none" };
  });
  log(`shabbat/not-flattened/${label}`, shab.layD !== "contents" && shab.stgD !== "contents", `layout=${shab.layD} stage=${shab.stgD}`);
}

async function testPress(page, label) {
  console.log(`\n=== PRESS @ ${label} ===`);
  await page.goto(BASE + "/press/", { waitUntil: "domcontentloaded" });
  await settle(page);
  const pr = await page.evaluate(() => {
    const host = document.querySelector("[data-press-shader]");
    return { host: !!host, canvases: host ? host.querySelectorAll("canvas").length : 0, rows: document.querySelectorAll(".press-card, [data-stagger] > *").length };
  });
  log(`press/shader-mounts/${label}`, pr.host && pr.canvases >= 1, `host=${pr.host} canvases=${pr.canvases}`);
  log(`press/rows/${label}`, pr.rows > 0, `rows=${pr.rows}`);
}

async function testHalls(page, label) {
  console.log(`\n=== HALLS oasis @ ${label} (touch) ===`);
  await page.goto(BASE + "/halls/dist/oasis/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const h = await page.evaluate(() => { const c = document.querySelector("canvas"); return { canvas: !!c, w: c ? c.width : 0, h: c ? c.height : 0 }; });
  log(`halls/webgl-canvas/${label}`, h.canvas && h.w > 0, `canvas ${h.w}x${h.h}`);
}

async function testRooms(page, label) {
  console.log(`\n=== ROOMS wall @ ${label} (touch) ===`);
  await page.goto(BASE + "/rooms/dist/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1800);
  const r = await page.evaluate(() => { const c = document.querySelector("canvas"); return { canvas: !!c, w: c ? c.width : 0 }; });
  log(`rooms/wall-canvas/${label}`, r.canvas && r.w > 0, `canvas w=${r.w}`);
}

const browser = await chromium.launch({ headless: true });
for (const [label, w, hgt] of MOBILE) {
  const ctx = await browser.newContext({ viewport: { width: w, height: hgt }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await testHome(page, label, w);
  if (label === "iPhone12") { await testPress(page, label); await testHalls(page, label); await testRooms(page, label); }
  await ctx.close();
}
{ // desktop no-regression
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage(); await testHome(page, "Desktop1440", 1440); await ctx.close();
}
{ // reduced-motion mobile
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
  const page = await ctx.newPage(); await testHome(page, "iPhone12-RM", 390, true); await ctx.close();
}
await browser.close();

console.log("\n" + "=".repeat(60));
const passed = results.filter((r) => r[0] === "PASS").length;
const failed = results.filter((r) => r[0] === "FAIL");
console.log(`TOTAL: ${passed}/${results.length} passed`);
if (failed.length) { console.log("\nFAILURES:"); for (const [, tag, d] of failed) console.log(`  FAIL ${tag} — ${d}`); }
else console.log("ALL CHECKS PASSED");
