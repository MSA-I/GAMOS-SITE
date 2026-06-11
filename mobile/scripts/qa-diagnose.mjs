/**
 * qa-diagnose.mjs — empirical root-cause probe for the two mobile bugs:
 *   1. #routes Leaflet map broken on mobile
 *   2. #culinary scroll-scrub shows no animation on mobile
 *
 * Resolves Playwright from the npx cache (no repo dep). Server must be on :5050.
 * Run:  node mobile/scripts/qa-diagnose.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW_CACHE = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium;
try { ({ chromium } = require(PW_CACHE)); } catch { ({ chromium } = require("playwright")); }

const BASE = "http://localhost:5050";

async function diagnoseCulinary(page, tag) {
  console.log(`\n========== CULINARY @ ${tag} ==========`);
  const netFrames = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("/culinary") && (u.endsWith(".webp") || u.endsWith("manifest.json")))
      netFrames.push(`${r.status()} ${u.split("/assets/frames/")[1] || u}`);
  });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(500);

  const rm = await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const pre = await page.evaluate(() => {
    const c = document.querySelector(".culinary canvas");
    if (!c) return { ok: false };
    const r = c.getBoundingClientRect(); const cs = getComputedStyle(c);
    return { ok: true, w: r.width, h: r.height, display: cs.display, opacity: cs.opacity,
      manifest: c.dataset.manifestUrl, mounted: c.classList.contains("is-mounted"),
      ready: c.classList.contains("is-ready") };
  });
  console.log(`  reduced-motion: ${rm}`);
  console.log(`  canvas: ${JSON.stringify(pre)}`);

  // scroll to #culinary then scrub: sample canvas pixels at two scroll depths
  await page.evaluate(() => document.querySelector("#culinary")?.scrollIntoView());
  await page.waitForTimeout(800);
  const cap = async (label) => {
    const buf = await page.evaluate(() => {
      const c = document.querySelector(".culinary canvas");
      if (!c || !c.width) return null;
      try { return c.toDataURL("image/png").slice(0, 5000); } catch { return "TAINTED"; }
    });
    return buf;
  };
  // jump scroll within the 320vh spacer
  const sceneTop = await page.evaluate(() => {
    const s = document.querySelector("#culinary"); return s ? s.getBoundingClientRect().top + window.scrollY : 0;
  });
  await page.evaluate((y) => window.scrollTo(0, y + window.innerHeight * 0.5), sceneTop);
  await page.waitForTimeout(500);
  const a = await cap("p1");
  await page.evaluate((y) => window.scrollTo(0, y + window.innerHeight * 2.5), sceneTop);
  await page.waitForTimeout(500);
  const b = await cap("p2");
  const post = await page.evaluate(() => {
    const c = document.querySelector(".culinary canvas");
    return c ? { ready: c.classList.contains("is-ready"), mounted: c.classList.contains("is-mounted") } : {};
  });
  const scrubbing = a && b && a !== b && a !== "TAINTED";
  console.log(`  after-scroll: ready=${post.ready} mounted=${post.mounted}`);
  console.log(`  CANVAS SCRUBS (pixels change across scroll): ${scrubbing ? "YES" : "NO"}${a === "TAINTED" ? " (canvas tainted — can't read)" : ""}`);
  console.log(`  culinary network (first 8): ${netFrames.slice(0, 8).join(" | ") || "NONE"}`);
  if (errs.length) console.log(`  console errors: ${errs.slice(0, 3).join(" || ")}`);
}

async function diagnoseRoutes(page, tag) {
  console.log(`\n========== ROUTES @ ${tag} ==========`);
  const tiles = [];
  page.on("response", (r) => {
    const u = r.url();
    if (u.includes("tile") || u.includes("cartocdn") || u.includes("basemaps")) tiles.push(r.status());
  });
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });

  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.querySelector("#routes")?.scrollIntoView());
  await page.waitForTimeout(2500); // let IO build + tiles load

  const map = await page.evaluate(() => {
    const cont = document.querySelector("#directions-map, .leaflet-container");
    if (!cont) return { ok: false };
    const r = cont.getBoundingClientRect();
    const loadedTiles = Array.from(document.querySelectorAll(".leaflet-tile"))
      .filter((t) => t.complete && t.naturalWidth > 0).length;
    const allTiles = document.querySelectorAll(".leaflet-tile").length;
    return { ok: true, w: Math.round(r.width), h: Math.round(r.height),
      hasLeaflet: !!document.querySelector(".leaflet-container"),
      tilesLoaded: loadedTiles, tilesTotal: allTiles,
      paths: document.querySelectorAll(".leaflet-overlay-pane path").length };
  });
  console.log(`  map container: ${JSON.stringify(map)}`);
  console.log(`  tile responses (status codes): ${tiles.slice(0, 10).join(",") || "NONE"}`);

  // click 2nd origin tab → does the route path change?
  const tabChange = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[name="directions-origin"]'));
    if (inputs.length < 2) return "no-tabs";
    const before = document.querySelector(".leaflet-overlay-pane path")?.getAttribute("d")?.slice(0, 40) || "";
    const other = inputs.find((i) => !i.checked) || inputs[1];
    other.click();
    return new Promise((res) => setTimeout(() => {
      const after = document.querySelector(".leaflet-overlay-pane path")?.getAttribute("d")?.slice(0, 40) || "";
      res(before !== after ? "route-changed" : (before ? "route-SAME" : "no-path"));
    }, 1500));
  });
  console.log(`  tab switch: ${tabChange}`);
  if (errs.length) console.log(`  console errors: ${errs.slice(0, 4).join(" || ")}`);
}

const browser = await chromium.launch({ headless: true });

// iPhone 12 (motion allowed)
let ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
let page = await ctx.newPage();
await diagnoseRoutes(page, "iPhone12 (motion on)");
await diagnoseCulinary(page, "iPhone12 (motion on)");
await ctx.close();

// iPhone 12 reduced-motion
ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
page = await ctx.newPage();
await diagnoseCulinary(page, "iPhone12 (REDUCED-MOTION)");
await ctx.close();

// Desktop baseline (culinary should scrub)
ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
page = await ctx.newPage();
await diagnoseCulinary(page, "Desktop1440 (baseline)");
await ctx.close();

await browser.close();
console.log("\n========== DONE ==========");
