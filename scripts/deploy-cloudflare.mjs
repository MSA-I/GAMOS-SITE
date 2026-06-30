#!/usr/bin/env node
/* =============================================================================
   scripts/deploy-cloudflare.mjs — build + stage + deploy to Cloudflare Pages
   ---------------------------------------------------------------------------
   Constitution §14 mandates Cloudflare Pages as the host (egress is free at
   every tier; Vercel/Netlify overage can hit ~$800–$2,800/mo at scale). This
   script implements the curated LOCAL-UPLOAD path (not Git integration),
   because three things block a repo-clone build:

     1. assets/video/ is gitignored → culinary-1080.mp4 + culinary-poster.jpg
        are NOT in the git tree, so a clone wouldn't have them. We copy them
        explicitly from disk here — that is the whole reason for local upload.
     2. docs/reference-assets/FIND-hero-assets.zip (~30MB) is tracked and
        exceeds Cloudflare Pages' 25 MiB per-file limit → a git-tree deploy is
        rejected. docs/ is dev-only and excluded here.
     3. 209MB culinary frames + assets/_src/ are committed and would bloat
        every git-integration deploy with no clean per-path exclude.

   What it does, in order:
     1. npm run build      (regenerates mobile/index.html, halls/dist, rooms/dist)
     2. reset _site/        (delete + recreate — never ship stale files)
     3. copy an ALLOW-LIST of production paths into _site/ (never copy-all:
        the repo root carries stray shell-accident junk files an allow-list skips)
     4. pre-flight asserts (6 routes present, no file >25 MiB, docs/ absent)
     5. wrangler pages deploy _site  (preview by default; --prod → production)

   Decisions locked with the user:
     • Culinary scrub (2026-06-16): canvas-frames scrub RESTORED after a brief
       <video> detour. The OOM (361×4K frames eager-preloaded → ~11GB) is fixed by
       SLIDING-WINDOW decode in js/canvas-frame-renderer.js (~9 desktop / ~17 mobile
       frames held at once), not by dropping the effect. Desktop frames re-encoded
       4K→1080p (~42MB), mobile 960×540 (~11MB) — both SHIPPED. canvas-frames is also
       the only scrub that works on iOS. (culinary-h264-1080.mp4 left on disk, unused.)
     • Map tiles stay on CARTO keyless for now; MapTiler key is a follow-up
       before a real public custom-domain launch.
     • subject.png re-encoded 2026-06-30 (6240×1599 ~20MB → 3120×800 ~1.6MB,
       full-color) — it's only the no-WebP <img> fallback; modern browsers fetch
       the responsive subject-*.webp.

   Usage:
     node scripts/deploy-cloudflare.mjs                  # build + stage + PREVIEW deploy
     node scripts/deploy-cloudflare.mjs --prod           # build + stage + PRODUCTION deploy
     node scripts/deploy-cloudflare.mjs --stage-only     # build + stage, NO upload (dry run)
     (also: npm run deploy:cf  /  npm run deploy:cf:prod)

   Auth: set CLOUDFLARE_API_TOKEN (+ CLOUDFLARE_ACCOUNT_ID) for non-interactive,
   or run `npx wrangler login` once beforehand for OAuth.
   ========================================================================= */

import {
  existsSync,
  rmSync,
  mkdirSync,
  cpSync,
  readdirSync,
  statSync,
} from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, relative } from "node:path";
import { execSync, spawnSync } from "node:child_process";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = join(ROOT, "_site");
const PROJECT = process.env.CF_PAGES_PROJECT || "gamos-site";
const PRODUCTION_BRANCH = "production";
const MAX_FILE_BYTES = 25 * 1024 * 1024; // Cloudflare Pages per-file hard limit (25 MiB)

const args = new Set(process.argv.slice(2));
const PROD = args.has("--prod");
const STAGE_ONLY = args.has("--stage-only");

/* ── helpers ─────────────────────────────────────────────────────────────── */
function log(msg) {
  console.log(`[deploy-cf] ${msg}`);
}
function fail(msg) {
  console.error(`\n[deploy-cf] ✗ ${msg}\n`);
  process.exit(1);
}
function human(bytes) {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${bytes}B`;
}

/* Allow-list of root files (copied only if they exist). ───────────────────── */
const ROOT_FILES = [
  "index.html",
  // 2026-06-18: 404.html shelved to legacy/404.html per user ("לא צריך אותו
  // כרגע") — disconnected from the active deploy so Cloudflare serves its
  // default 404. Re-enable by moving it back to root + restoring this entry.
  "corridor.html", // legacy halls exhibit page (§2.1 rule 6 — preserved)
  "_headers", // Cloudflare cache + security headers (already correct)
  "robots.txt",
  "sitemap.xml",
];

/* Allow-list of root directories (copied wholesale). ──────────────────────── */
const ROOT_DIRS = [
  "css",
  "js",
  "mobile", // includes the generated mobile/index.html + loader.js + css
  "press",
  "legal", // privacy / terms / accessibility (reachable by URL)
  join("halls", "dist"),
  join("rooms", "dist"),
];

/* Inside assets/, copy every top-level entry EXCEPT these. ────────────────── */
const ASSETS_EXCLUDE = new Set([
  "_src", // orphan source workbench
  "video", // gitignored heavy MP4 sources — only 2 files re-added below
  // (frames/hero handled specially inside the frames walk)
]);

/* ── 1. build ────────────────────────────────────────────────────────────── */
log(`project=${PROJECT}  mode=${PROD ? "PRODUCTION" : STAGE_ONLY ? "STAGE-ONLY (no upload)" : "PREVIEW"}`);
log("building site (npm run build)…");
execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

/* ── 2. reset staging dir ─────────────────────────────────────────────────── */
log("resetting _site/…");
rmSync(SITE, { recursive: true, force: true });
mkdirSync(SITE, { recursive: true });

/* ── 3. copy allow-list ───────────────────────────────────────────────────── */
for (const f of ROOT_FILES) {
  const src = join(ROOT, f);
  if (existsSync(src)) {
    cpSync(src, join(SITE, f));
    log(`+ ${f}`);
  } else if (f === "index.html" || f === "_headers") {
    fail(`required root file missing: ${f}`);
  }
}

for (const d of ROOT_DIRS) {
  const src = join(ROOT, d);
  if (!existsSync(src)) fail(`required directory missing: ${d} (did the build run?)`);
  cpSync(src, join(SITE, d), { recursive: true });
  log(`+ ${d}/`);
}

/* assets/ — selective copy. -------------------------------------------------- */
const assetsSrc = join(ROOT, "assets");
const assetsDst = join(SITE, "assets");
mkdirSync(assetsDst, { recursive: true });
for (const entry of readdirSync(assetsSrc)) {
  if (ASSETS_EXCLUDE.has(entry)) {
    log(`- assets/${entry}/ (excluded)`);
    continue;
  }
  if (entry === "frames") {
    // Skip only the orphan hero frame sequence (hero is layered PNG/WebP now,
    // §3). culinary + culinary-mobile are SHIPPED again (2026-06-16): the
    // scrub was restored to canvas-frames with sliding-window decode, so those
    // frames are referenced. Desktop set re-encoded 4K→1080p (~42MB); mobile
    // 960×540 (~11MB).
    const FRAMES_SKIP = new Set(["hero"]);
    const framesSrc = join(assetsSrc, "frames");
    const framesDst = join(assetsDst, "frames");
    mkdirSync(framesDst, { recursive: true });
    for (const sub of readdirSync(framesSrc)) {
      if (FRAMES_SKIP.has(sub)) {
        log(`- assets/frames/${sub}/ (excluded — orphan)`);
        continue;
      }
      cpSync(join(framesSrc, sub), join(framesDst, sub), { recursive: true });
    }
    log("+ assets/frames/ (minus hero)");
    continue;
  }
  cpSync(join(assetsSrc, entry), join(assetsDst, entry), { recursive: true });
}
log("+ assets/ (minus _src, video, frames/hero)");

/* Re-add the gitignored video files the site needs. The culinary scrub is back
   on canvas-frames (sliding-window decode), so it no longer needs an MP4 — but
   culinary-poster.jpg is still the <picture> poster shown before frames decode.
   (culinary-h264-1080.mp4 stays on disk as an unused fallback asset.)
   hero-poster.jpg removed 2026-06-18 (user) — the hero video + its OG/social
   poster tags are gone, so nothing references it any more. ----------- */
const videoDst = join(assetsDst, "video");
mkdirSync(videoDst, { recursive: true });
for (const v of ["culinary-poster.jpg"]) {
  const src = join(assetsSrc, "video", v);
  if (!existsSync(src)) fail(`expected assets/video/${v} on disk — not found (it's gitignored; must exist locally)`);
  cpSync(src, join(videoDst, v));
  log(`+ assets/video/${v} (${human(statSync(src).size)}, gitignored — copied from disk)`);
}

/* ── 4. pre-flight asserts ────────────────────────────────────────────────── */
log("running pre-flight checks…");

const REQUIRED_ROUTES = [
  "index.html",
  "_headers",
  "mobile/index.html",
  "press/index.html",
  join("halls", "dist", "events", "index.html"),
  join("halls", "dist", "resort", "index.html"),
  join("rooms", "dist", "index.html"),
];
for (const r of REQUIRED_ROUTES) {
  if (!existsSync(join(SITE, r))) fail(`missing required route in _site/: ${r}`);
}
log(`✓ all ${REQUIRED_ROUTES.length} required routes present`);

if (existsSync(join(SITE, "docs"))) fail("_site/docs/ exists — it must be excluded (carries the >25MiB zip)");
log("✓ docs/ correctly excluded");

// Recursive walk: no file may exceed the 25 MiB Cloudflare per-file cap.
let fileCount = 0;
let totalBytes = 0;
let biggest = { path: "", size: 0 };
const oversize = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      walk(p);
    } else {
      fileCount++;
      totalBytes += st.size;
      if (st.size > biggest.size) biggest = { path: relative(SITE, p), size: st.size };
      if (st.size > MAX_FILE_BYTES) oversize.push({ path: relative(SITE, p), size: st.size });
      // subject.png is the no-WebP <img> fallback (modern browsers use the
      // subject-*.webp <source>s). Re-encoded 2026-06-30 to 3120×800 (~1.6MB);
      // warn only if it regresses back to a bloated size.
      if (name === "subject.png" && st.size > 5 * 1024 * 1024) {
        console.warn(
          `[deploy-cf] ⚠ ${relative(SITE, p)} is ${human(st.size)} — the no-WebP fallback should be ~1.6MB; re-encode (sharp resize 3120 + level9).`
        );
      }
    }
  }
})(SITE);

if (oversize.length) {
  for (const o of oversize) console.error(`[deploy-cf]   ✗ ${o.path} = ${human(o.size)} (> 25 MiB cap)`);
  fail(`${oversize.length} file(s) exceed Cloudflare Pages' 25 MiB per-file limit — fix before deploy.`);
}
log(`✓ no file exceeds 25 MiB (largest: ${biggest.path} = ${human(biggest.size)})`);
log(`✓ _site/ assembled: ${fileCount} files, ${human(totalBytes)} total`);

if (STAGE_ONLY) {
  log("stage-only mode — skipping upload. Inspect _site/ then deploy with:");
  log(`  npx wrangler pages deploy _site --project-name=${PROJECT}${PROD ? ` --branch ${PRODUCTION_BRANCH}` : ""}`);
  process.exit(0);
}

/* ── 5. deploy via wrangler ───────────────────────────────────────────────── */
const hasToken = !!process.env.CLOUDFLARE_API_TOKEN;
log(hasToken ? "CLOUDFLARE_API_TOKEN detected — non-interactive deploy." : "no API token — wrangler will use stored OAuth (run `npx wrangler login` first if needed).");

const wranglerArgs = ["wrangler", "pages", "deploy", "_site", `--project-name=${PROJECT}`, "--commit-dirty=true"];
if (PROD) wranglerArgs.push("--branch", PRODUCTION_BRANCH);

log(`deploying: npx ${wranglerArgs.join(" ")}`);
// shell:true is required on Windows so spawnSync can launch npx.cmd (Node >=18
// refuses to spawn .cmd/.bat without it). The args are static/internal, so
// there is no untrusted-input injection surface here.
const res = spawnSync("npx", wranglerArgs, { cwd: ROOT, stdio: "inherit", shell: true });
if (res.status !== 0) fail(`wrangler exited with code ${res.status}. (Not logged in? run \`npx wrangler login\`. No project? run \`npx wrangler pages project create ${PROJECT} --production-branch ${PRODUCTION_BRANCH}\`.)`);

log(`✓ ${PROD ? "PRODUCTION" : "preview"} deploy complete.`);
