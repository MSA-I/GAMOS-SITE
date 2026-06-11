/** qa-tiles.mjs — pin down why #routes tiles don't load. */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium; try { ({ chromium } = require(PW)); } catch { ({ chromium } = require("playwright")); }
const BASE = "http://localhost:5050";

async function run(tag, opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const reqs = [];
  page.on("request", (r) => { const u = r.url(); if (/tile|cartocdn|basemaps|\.png|openstreetmap/i.test(u) && !u.includes(":5050/assets")) reqs.push(u); });
  const fails = [];
  page.on("requestfailed", (r) => { const u = r.url(); if (/tile|cartocdn|basemaps|openstreetmap/i.test(u)) fails.push(`${u} :: ${r.failure()?.errorText}`); });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.querySelector("#routes")?.scrollIntoView());
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const tiles = Array.from(document.querySelectorAll(".leaflet-tile"));
    return {
      cont: (() => { const c = document.querySelector(".leaflet-container"); const r = c?.getBoundingClientRect(); return c ? { w: Math.round(r.width), h: Math.round(r.height) } : null; })(),
      tileCount: tiles.length,
      loaded: tiles.filter((t) => t.complete && t.naturalWidth > 0).length,
      srcs: tiles.slice(0, 3).map((t) => t.src || t.getAttribute("src") || "(no src)"),
    };
  });
  console.log(`\n=== ${tag} ===`);
  console.log(`  container: ${JSON.stringify(info.cont)}  tiles: ${info.loaded}/${info.tileCount} loaded`);
  console.log(`  sample tile srcs:`);
  info.srcs.forEach((s) => console.log(`    ${s}`));
  console.log(`  tile requests seen: ${reqs.length}` + (reqs.length ? `\n    ${reqs.slice(0, 3).join("\n    ")}` : ""));
  if (fails.length) console.log(`  FAILED requests:\n    ${fails.slice(0, 4).join("\n    ")}`);

  // Try fetching one tile URL directly from the page context to see its status.
  if (info.srcs[0] && info.srcs[0].startsWith("http")) {
    const probe = await page.evaluate(async (u) => {
      try { const r = await fetch(u, { mode: "no-cors" }); return `type=${r.type} status=${r.status || "(opaque)"} ok=${r.ok}`; }
      catch (e) { return "FETCH-ERROR: " + e.message; }
    }, info.srcs[0]);
    console.log(`  direct fetch of tile[0]: ${probe}`);
  }
  await ctx.close();
}

const browser = await chromium.launch({ headless: true });
await run("DESKTOP 1440", { viewport: { width: 1440, height: 900 } });
await run("iPhone12 390 (touch)", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
console.log("\n=== DONE ===");
