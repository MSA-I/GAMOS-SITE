/** qa-tabs.mjs — verify the #routes origin tabs are NOT clipped on mobile. */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium; try { ({ chromium } = require(PW)); } catch { ({ chromium } = require("playwright")); }
const BASE = "http://localhost:5050";

const browser = await chromium.launch({ headless: true });
for (const [tag, w] of [["iPhone12", 390], ["GalaxyS22", 360], ["iPhoneSE", 375]]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.evaluate(() => document.querySelector("#routes")?.scrollIntoView());
  await page.waitForTimeout(1200);
  const r = await page.evaluate(() => {
    const wrap = document.querySelector(".directions__tabs");
    if (!wrap) return { ok: false };
    const wr = wrap.getBoundingClientRect();
    const labels = Array.from(wrap.querySelectorAll(".directions__tab-label"));
    // a tab is "clipped" if its box extends beyond the wrap's visible box (and wrap isn't scrolled to it)
    const clipped = labels.filter((l) => {
      const b = l.getBoundingClientRect();
      return b.left < wr.left - 1 || b.right > wr.right + 1;
    }).map((l) => l.textContent.trim());
    return {
      ok: true, tabCount: labels.length,
      labels: labels.map((l) => l.textContent.trim()),
      wrapW: Math.round(wr.width), scrollW: wrap.scrollWidth, clientW: wrap.clientWidth,
      overflows: wrap.scrollWidth > wrap.clientWidth + 1,
      clippedNow: clipped,
    };
  });
  console.log(`\n=== ${tag} (${w}px) ===`);
  console.log(`  tabs: ${JSON.stringify(r.labels)}`);
  console.log(`  wrap width=${r.wrapW} scrollW=${r.scrollW} clientW=${r.clientW} overflows=${r.overflows}`);
  console.log(`  clipped-in-view: ${r.clippedNow.length ? JSON.stringify(r.clippedNow) : "NONE (all 4 visible)"}`);
  await page.screenshot({ path: `D:/משה פרוייקטים/GAMOS-SITE/.tmp-routes-tabs-${tag}.png`, clip: { x: 0, y: 0, width: w, height: 260 } }).catch(() => {});
  await ctx.close();
}
await browser.close();
console.log("\n=== DONE ===");
