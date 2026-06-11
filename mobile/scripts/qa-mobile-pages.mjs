/** qa-mobile-pages.mjs — verify the 3 mobile sub-app pages + homepage phone routing. */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium; try { ({ chromium } = require(PW)); } catch { ({ chromium } = require("playwright")); }
const BASE = "http://localhost:5050";
const results = [];
const log = (t, ok, d = "") => { results.push([ok, t, d]); console.log(`  [${ok ? "PASS" : "FAIL"}] ${t}${d ? " — " + d : ""}`); };

const browser = await chromium.launch({ headless: true });

async function subapp(url, tag, canvasSel, chromeSel) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  await page.goto(BASE + url, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500); // WebGL mount + chrome anim
  const r = await page.evaluate((cs) => {
    const c = document.querySelector("canvas");
    const vw = window.innerWidth, vh = window.innerHeight;
    // any chrome element whose box exceeds the viewport (clipped/overflow)?
    const chrome = Array.from(document.querySelectorAll(cs));
    const overflow = chrome.filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && (b.left < -1 || b.right > vw + 1); }).map((e) => e.className);
    // tap targets ≥44px among links/buttons in the chrome
    const small = Array.from(document.querySelectorAll("a[class*='m-'],button")).filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.width < 44 || b.height < 44); }).map((e) => `${(e.className||'').slice(0,24)}:${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`);
    return { canvas: !!c, cw: c ? c.width : 0, vw, overflowCount: overflow.length, overflow: overflow.slice(0, 3), small: small.slice(0, 5) };
  }, chromeSel);
  console.log(`\n=== ${tag} (${url}) ===`);
  log(`${tag}/webgl-canvas`, r.canvas && r.cw > 0, `canvas w=${r.cw}`);
  log(`${tag}/no-chrome-overflow`, r.overflowCount === 0, r.overflowCount ? `overflow: ${JSON.stringify(r.overflow)}` : "none clipped");
  log(`${tag}/no-tiny-tap-targets`, r.small.length === 0, r.small.length ? `<44px: ${JSON.stringify(r.small)}` : "all ≥44px");
  if (errs.length) console.log(`  console errors: ${errs.slice(0, 2).join(" || ")}`);
  await page.screenshot({ path: `D:/משה פרוייקטים/GAMOS-SITE/.tmp-${tag}.png` }).catch(() => {});
  await ctx.close();
}

await subapp("/halls/dist/oasis-mobile/", "oasis-mobile", "canvas", ".hallm-home,.hallm-switch,.hallm-label,.hallm-title");
await subapp("/halls/dist/lumina-mobile/", "lumina-mobile", "canvas", ".hallm-home,.hallm-switch,.hallm-label,.hallm-title");
await subapp("/rooms/dist/mobile/", "rooms-mobile", "canvas", ".roomsm-back,.roomsm-heading,.roomsm-active,.roomsm-title");

// Homepage phone routing: hrefs rewritten on ≤768px, desktop untouched.
async function routing(tag, w, expectMobile) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, isMobile: w <= 768, hasTouch: w <= 768, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => ({
    events: document.querySelector(".hero-static__layer--events")?.getAttribute("href"),
    resort: document.querySelector(".hero-static__layer--resort")?.getAttribute("href"),
    door: document.querySelector("#rooms-door")?.getAttribute("href"),
    tapEvents: document.querySelector(".hero-static__tap--events")?.getAttribute("href"),
  }));
  console.log(`\n=== routing @ ${tag} (${w}px) ===`);
  const wantE = expectMobile ? "/halls/dist/oasis-mobile/" : "/halls/dist/oasis/";
  const wantD = expectMobile ? "/rooms/dist/mobile/" : "/rooms/dist/";
  log(`${tag}/events-href`, r.events === wantE, `${r.events}`);
  log(`${tag}/resort-href`, r.resort === (expectMobile ? "/halls/dist/lumina-mobile/" : "/halls/dist/lumina/"), `${r.resort}`);
  log(`${tag}/door-href`, r.door === wantD, `${r.door}`);
  if (expectMobile) log(`${tag}/tap-overlay-cloned-mobile`, r.tapEvents === "/halls/dist/oasis-mobile/", `tap=${r.tapEvents}`);
  await ctx.close();
}
await routing("mobile", 390, true);
await routing("desktop", 1440, false);

await browser.close();
console.log("\n" + "=".repeat(56));
const passed = results.filter((r) => r[0]).length;
const failed = results.filter((r) => !r[0]);
console.log(`TOTAL: ${passed}/${results.length} passed`);
if (failed.length) { console.log("FAILURES:"); failed.forEach(([, t, d]) => console.log(`  FAIL ${t} — ${d}`)); }
else console.log("ALL CHECKS PASSED");
