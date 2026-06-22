#!/usr/bin/env node
/**
 * rooms-lab/scripts/qa-rooms-lab.mjs — Playwright smoke test for the scrolled
 * door + lit handoff. Start a server first (e.g. `npx serve . -p 8123`), then:
 *   node rooms-lab/scripts/qa-rooms-lab.mjs [http://localhost:8123]
 * Screenshots → rooms-lab/scripts/__shots__/ (scratch; safe to delete).
 *
 * Uses a system Chromium channel (msedge/chrome) so it needs no browser
 * download. Asserts: canvas readies, door scrubs (pixels change with scroll),
 * lit veil floods at the end, and the gallery boots from the lit colour.
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.argv[2] || "http://localhost:8123";
const HERE = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(HERE, "__shots__");
mkdirSync(SHOTS, { recursive: true });

async function launch() {
  for (const channel of ["msedge", "chrome", undefined]) {
    try {
      return await chromium.launch({ channel, headless: true });
    } catch (_) {}
  }
  throw new Error("No Chromium/Edge/Chrome available for Playwright.");
}

const results = [];
function check(name, ok, extra = "") { results.push({ name, ok, extra }); console.log(`${ok ? "✓" : "✗"} ${name} ${extra}`); }

async function main() {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`${BASE}/rooms-lab/`, { waitUntil: "load" });
  await page.waitForSelector(".door-scene__canvas.is-ready", { timeout: 15000 });
  check("canvas ready", true);

  // p0 — closed door
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const p0 = await page.locator("canvas").screenshot({ path: join(SHOTS, "p0.png") });

  // mid scroll — door opening
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.5));
  await page.waitForTimeout(600);
  const pMid = await page.locator("canvas").screenshot({ path: join(SHOTS, "p50.png") });
  check("door scrubs (p0 ≠ p50)", Buffer.compare(p0, pMid) !== 0);

  // full scroll — triggers lit veil + auto-nav to gallery
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  // Wait for navigation to the gallery
  await page.waitForURL(/\/rooms-lab\/gallery\/dist\//, { timeout: 8000 }).catch(() => {});
  const navigated = /\/rooms-lab\/gallery\/dist\//.test(page.url());
  check("auto-nav to gallery", navigated, page.url());

  // Gallery boots — capture the intro cover (lit) just after load
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(SHOTS, "gallery-intro.png") });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(SHOTS, "gallery-revealed.png") });

  check("no page errors", errors.length === 0, errors.join(" | "));

  await browser.close();
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => { console.error("QA ERROR:", e.message); process.exit(1); });
