#!/usr/bin/env node
// Capture viewport screenshots of every section of the GAMOS site + the three
// legal pages, into ~/Desktop/GAMOS-screenshots/.
//
// Strategy:
//   1) Open the home page ONCE, kill the loading overlay, wait for content to
//      hydrate (lounge ring, culinary frames, etc.).
//   2) For each section: scroll to it, settle ~1.5s, screenshot.
//   3) Then navigate separately for each legal page.

import { spawn } from "node:child_process";
import { mkdir, writeFile, rm, access } from "node:fs/promises";
import { constants as FS } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";

const CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe";

const BASE = "http://localhost:8000";
// Write to D:\ instead of C:\ Desktop because the user's C: drive is full.
// The embed step will copy the final selection to ~/Desktop afterwards.
const OUT_DIR = process.env.OUT_DIR || "D:\\GAMOS-screenshots-tmp";
const W = 1440;
const H = 900;
const PORT = 9222;

// 2026-07-13: #buffet + #shabbat-chatan retired (buffet folded into the
// culinary grid; shabbat represented in the #events hover-list gallery).
const SECTION_TARGETS = [
  { name: "01-hero",            scrollTo: "top" },
  { name: "02-hall-portal",     scrollTo: "#hall-portal" },
  { name: "03-why-gamos",       scrollTo: "#why-gamos" },
  { name: "04-lounge",          scrollTo: "#lounge" },
  { name: "05-culinary",        scrollTo: "#culinary" },
  { name: "06-rooms",           scrollTo: "#rooms" },
  { name: "07-marquee",         scrollTo: ".marquee" },
  { name: "08-about",           scrollTo: "#about" },
  { name: "09-testimonials",    scrollTo: "#testimonials" },
  { name: "10-gallery",         scrollTo: "#gallery" },
  { name: "11-events",          scrollTo: "#events" },
  { name: "12-contact",         scrollTo: "#contact" },
  { name: "13-routes",          scrollTo: "#routes" },
  { name: "14-site-footer",     scrollTo: "footer.site-footer" },
];

const LEGAL_TARGETS = [
  { name: "17-privacy",         url: `${BASE}/legal/privacy.html` },
  { name: "18-terms",           url: `${BASE}/legal/terms.html` },
  { name: "19-accessibility",   url: `${BASE}/legal/accessibility.html` },
];

// Hero scrub states for Figma export (figma-export/README.md). The hero is a
// 500vh pinned scene (§3); scrolling to each fraction of its OWN scroll range
// (not the whole page) freezes a scrub state the designer reconstructs with
// Smart Animate. Mirrors hero-lab/scripts/qa-hero-lab.mjs's p-loop.
const HERO_PROGRESS = [0, 0.2, 0.4, 0.6, 0.8, 1];

async function ensureDir(dir) { await mkdir(dir, { recursive: true }); }
async function chromeReachable() {
  try { await access(CHROME, FS.X_OK); return true; } catch { return false; }
}

async function fetchJSON(url, retries = 80) {
  for (let i = 0; i < retries; i++) {
    try { const r = await fetch(url); if (r.ok) return await r.json(); } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  throw new Error(`Failed to reach ${url}`);
}

class CDPClient {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = new Set();
    ws.addEventListener("message", (ev) => {
      const data = typeof ev.data === "string" ? ev.data : new TextDecoder().decode(ev.data);
      const msg = JSON.parse(data);
      if (msg.id != null && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(msg.error.message || JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) { for (const h of this.handlers) h(msg); }
    });
  }
  send(method, params = {}, timeoutMs = 30_000) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP ${method} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { clearTimeout(t); resolve(v); },
        reject:  (e) => { clearTimeout(t); reject(e); },
      });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  on(handler)  { this.handlers.add(handler); return () => this.handlers.delete(handler); }
  close() { this.ws.close(); }
}

async function openCDP(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  return new CDPClient(ws);
}

async function evalJs(cdp, expr, awaitPromise = false) {
  const r = await cdp.send("Runtime.evaluate", {
    expression: expr, returnByValue: true, awaitPromise,
  }, 15_000);
  if (r.exceptionDetails) throw new Error("JS exception: " + JSON.stringify(r.exceptionDetails));
  return r.result?.value;
}

async function navigateAndWait(cdp, url) {
  const loadFired = new Promise((resolve) => {
    const off = cdp.on((msg) => { if (msg.method === "Page.loadEventFired") { off(); resolve(); } });
    setTimeout(() => { off(); resolve(); }, 12_000);
  });
  await cdp.send("Page.navigate", { url });
  await loadFired;
  // Poll readyState
  for (let i = 0; i < 20; i++) {
    if (await evalJs(cdp, "document.readyState") === "complete") break;
    await new Promise(r => setTimeout(r, 200));
  }
}

async function killOverlay(cdp) {
  await evalJs(cdp, `
    (() => {
      try { window.gamosLoading && window.gamosLoading.hide && window.gamosLoading.hide(); } catch (e) {}
      const o = document.getElementById('loading-overlay');
      if (o) { o.remove(); }
      document.documentElement.removeAttribute('data-loading');
      document.body.classList.remove('is-loading');
    })()
  `);
}

async function scrollTo(cdp, target) {
  if (target === "top") {
    await evalJs(cdp, "window.scrollTo(0, 0)");
  } else {
    await evalJs(cdp, `
      (() => {
        const el = document.querySelector(${JSON.stringify(target)});
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        window.scrollTo(0, Math.max(0, rect.top + window.scrollY));
        return true;
      })()
    `);
  }
}

async function scrollToHeroProgress(cdp, p) {
  return evalJs(cdp, `
    (() => {
      const el = document.querySelector('#hero');
      if (!el) return false;
      const range = Math.max(1, el.offsetHeight - window.innerHeight);
      window.scrollTo(0, Math.round(el.offsetTop + range * ${p}));
      return true;
    })()
  `);
}

async function capture(cdp, name) {
  process.stdout.write(`  → ${name} ... `);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30_000);
  const out = join(OUT_DIR, `${name}.png`);
  const buf = Buffer.from(data, "base64");
  await writeFile(out, buf);
  process.stdout.write(`ok (${(buf.length / 1024).toFixed(0)}KB)\n`);
}

async function main() {
  if (!(await chromeReachable())) { console.error(`Chrome not found: ${CHROME}`); process.exit(1); }
  await ensureDir(OUT_DIR);
  console.log(`Output dir: ${OUT_DIR}`);

  // Use D: for chrome user-data-dir too — C: is full.
  const userDir = `D:\\GAMOS-chrome-tmp-${Date.now()}`;
  await ensureDir(userDir);

  const args = [
    "--headless=new", "--disable-gpu", "--no-sandbox", "--hide-scrollbars",
    "--force-device-scale-factor=1",
    `--window-size=${W},${H}`,
    `--user-data-dir=${userDir}`,
    `--remote-debugging-port=${PORT}`,
    "about:blank",
  ];
  console.log(`Spawning Chrome on port ${PORT}...`);
  const child = spawn(CHROME, args, { stdio: ["ignore", "ignore", "ignore"] });

  let cdp;
  try {
    await fetchJSON(`http://127.0.0.1:${PORT}/json/version`);
    const tabs = await fetchJSON(`http://127.0.0.1:${PORT}/json`);
    // CRITICAL: filter to type==="page". Chrome with extensions exposes a
    // "background_page" tab as tabs[0]; using it gives a blank screenshot.
    const tab = tabs.find(t => t.type === "page");
    if (!tab) throw new Error(`No page tab found among ${tabs.length} tabs: ${tabs.map(t=>t.type).join(",")}`);
    cdp = await openCDP(tab.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    // NOTE: do NOT call Emulation.setDeviceMetricsOverride — it causes
    // the captureScreenshot output to come back as a blank white frame on
    // headless=new on Windows. The --window-size launch arg is enough; the
    // resulting viewport is approximately 1424x749 (window minus decorations).

    // Phase 1: home page sections
    console.log("Phase 1: home page sections");
    await navigateAndWait(cdp, `${BASE}/`);
    await new Promise(r => setTimeout(r, 2500)); // hydration: lounge ring, IO modules
    await killOverlay(cdp);
    await new Promise(r => setTimeout(r, 1500)); // post-overlay-removal settle

    for (const t of SECTION_TARGETS) {
      try {
        await scrollTo(cdp, t.scrollTo);
        await new Promise(r => setTimeout(r, 1500)); // animate-on-enter, IO reveal
        await capture(cdp, t.name);
      } catch (e) { process.stdout.write(`FAIL: ${e.message}\n`); }
    }

    // Phase 1b: hero scrub states (HERO_PROGRESS_SHOTS) — still on the home page.
    console.log("\nPhase 1b: hero scrub states");
    for (const p of HERO_PROGRESS) {
      const name = `hero-p${String(Math.round(p * 100)).padStart(3, "0")}`;
      try {
        const ok = await scrollToHeroProgress(cdp, p);
        if (!ok) { process.stdout.write(`  → ${name} ... SKIP (#hero not found)\n`); continue; }
        await new Promise(r => setTimeout(r, 700)); // scrub settle (scrub:0.6)
        await capture(cdp, name);
      } catch (e) { process.stdout.write(`FAIL: ${e.message}\n`); }
    }

    // Phase 2: legal pages
    console.log("\nPhase 2: legal pages");
    for (const t of LEGAL_TARGETS) {
      try {
        await navigateAndWait(cdp, t.url);
        await new Promise(r => setTimeout(r, 1500));
        await killOverlay(cdp);
        await new Promise(r => setTimeout(r, 800));
        await scrollTo(cdp, "top");
        await new Promise(r => setTimeout(r, 600));
        await capture(cdp, t.name);
      } catch (e) { process.stdout.write(`FAIL: ${e.message}\n`); }
    }
  } finally {
    try { cdp && cdp.close(); } catch {}
    child.kill();
    setTimeout(() => rm(userDir, { recursive: true, force: true }).catch(() => {}), 1500);
  }
  console.log("\nDone.");
}

main().catch((e) => { console.error(e); process.exit(1); });
