/**
 * qa-hero-v10-verify.mjs — verify the composer portrait fix + desktop no-regress.
 * Server on :5050.  node mobile/scripts/qa-hero-v10-verify.mjs
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const PW_CACHE = "C:/Users/art1/AppData/Local/npm-cache/_npx/5e2e484947874241/node_modules/playwright";
let chromium;
try { ({ chromium } = require("playwright")); }
catch { ({ chromium } = require(PW_CACHE)); }

const BASE = "http://localhost:5050";
const settle = async (p) => { await p.waitForLoadState("networkidle").catch(()=>{}); await p.waitForTimeout(500); };
const out = [];
const log = (ok, tag, d="") => { out.push([ok,tag,d]); console.log(`  [${ok?"PASS":"FAIL"}] ${tag}${d?" — "+d:""}`); };

async function check(page, url, label, w) {
  const errs = [];
  page.on("console", (m) => { if (m.type()==="error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push("PAGEERR "+e.message));
  await page.goto(BASE+url, { waitUntil: "domcontentloaded" });
  await settle(page);
  await page.evaluate(() => document.querySelector("#hall-portal")?.scrollIntoView({ block: "start" }));
  await page.waitForTimeout(500);

  const m = await page.evaluate(() => {
    const q = (s)=>document.querySelector(s);
    const rect = (el)=>{ if(!el) return null; const b=el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height),bottom:Math.round(b.bottom)};};
    const ev = q(".gamos-hero__cta--events"), rs = q(".gamos-hero__cta--resort");
    const promptText = q(".gamos-hero__prompt-text");
    const composer = q("#hall-portal .gamos-hero");
    return {
      composerH: composer ? Math.round(composer.getBoundingClientRect().height) : 0,
      ev: rect(ev), rs: rect(rs),
      promptOverflow: promptText ? (promptText.scrollWidth > promptText.clientWidth + 1) : false,
      promptW: promptText ? Math.round(promptText.getBoundingClientRect().width) : 0,
      vw: document.documentElement.clientWidth,
    };
  });
  // gap between the two CTAs (no overlap → events.bottom < resort.y)
  const gap = (m.ev && m.rs) ? (m.rs.y - m.ev.bottom) : -999;
  log(m.ev && m.ev.h >= 44, `${label}/events-tap>=44`, `h=${m.ev?.h}`);
  log(m.rs && m.rs.h >= 44, `${label}/resort-tap>=44`, `h=${m.rs?.h}`);
  log(gap >= 0, `${label}/no-cta-overlap`, `gap=${gap}px (events.bottom=${m.ev?.bottom} resort.y=${m.rs?.y})`);
  log(!m.promptOverflow && (m.promptW <= m.vw), `${label}/prompt-fits`, `promptW=${m.promptW} vw=${m.vw} overflow=${m.promptOverflow}`);

  const ov = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  log(ov.sw <= ov.cw + 2, `${label}/no-h-overflow`, `sw=${ov.sw} cw=${ov.cw}`);
  log(errs.length === 0, `${label}/no-console-errors`, errs.slice(0,4).join(" | ") || "clean");
}

const browser = await chromium.launch({ headless: true });
{
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
  const page = await ctx.newPage(); await check(page, "/mobile/", "mob390", 390); await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport:{width:360,height:780}, isMobile:true, hasTouch:true, deviceScaleFactor:3 });
  const page = await ctx.newPage(); await check(page, "/mobile/", "mob360", 360); await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
  const page = await ctx.newPage(); await check(page, "/", "desk1440", 1440); await ctx.close();
}
await browser.close();
const pass = out.filter(r=>r[0]).length;
console.log(`\nTOTAL ${pass}/${out.length} passed`);
if (pass !== out.length) { console.log("FAILURES:"); out.filter(r=>!r[0]).forEach(([,t,d])=>console.log(`  ${t} — ${d}`)); }
else console.log("ALL PASSED");
