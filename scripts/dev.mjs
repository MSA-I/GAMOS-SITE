#!/usr/bin/env node
/**
 * scripts/dev.mjs — single-command dev server.
 *
 * Boots ALL three pages on one port (http://localhost:8000):
 *   /                     → main vanilla site
 *   /halls/dist/oasis/    → React/Vite immersive oasis hall  (Constitution §2.1)
 *   /halls/dist/lumina/   → React/Vite immersive lumina hall (Constitution §2.1)
 *
 * Logic:
 *   1. If `halls/dist/oasis/index.html` is missing OR older than the newest
 *      file under `halls/src/`, run `build:halls` first (vite build → static).
 *   2. Spawn `npx serve . -p 8000 -L` from the repo root and proxy stdio.
 *
 * To force a clean rebuild: `npm run build:halls` then `npm run dev:fast`.
 * For React HMR while iterating on halls/, run `npm run dev:halls` in a
 * second terminal alongside this one (it serves on port 5173).
 */

import { existsSync, statSync } from "node:fs";
import { readdir } from "node:fs/promises";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn, spawnSync } from "node:child_process";

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, "..");
const HALLS_DIST_INDEX = join(root, "halls", "dist", "oasis", "index.html");
const HALLS_SRC = join(root, "halls", "src");

async function newestMtime(dir) {
  let newest = 0;
  const stack = [dir];
  while (stack.length) {
    const current = stack.pop();
    let entries;
    try { entries = await readdir(current, { withFileTypes: true }); }
    catch { continue; }
    for (const e of entries) {
      const p = join(current, e.name);
      if (e.isDirectory()) stack.push(p);
      else {
        const m = statSync(p).mtimeMs;
        if (m > newest) newest = m;
      }
    }
  }
  return newest;
}

async function needsBuild() {
  if (!existsSync(HALLS_DIST_INDEX)) {
    return "halls/dist/ missing";
  }
  const distMtime = statSync(HALLS_DIST_INDEX).mtimeMs;
  const srcMtime = await newestMtime(HALLS_SRC);
  if (srcMtime > distMtime) {
    return "halls/src/ newer than halls/dist/";
  }
  return null;
}

function runBuild() {
  console.log("[dev] running `npm run build:halls`…");
  const r = spawnSync("npm", ["run", "build:halls"], {
    stdio: "inherit",
    shell: true,
    cwd: root,
  });
  if (r.status !== 0) {
    console.error("[dev] build:halls failed (exit " + r.status + ")");
    process.exit(r.status ?? 1);
  }
}

function runServer() {
  console.log("");
  console.log("[dev] http://localhost:8000              → main site");
  console.log("[dev] http://localhost:8000/halls/dist/oasis/   → אולם");
  console.log("[dev] http://localhost:8000/halls/dist/lumina/  → ריזורט");
  console.log("");
  // -n / --no-port-switching: fail loudly if 8000 is busy, don't silently
  // hop to a random port (would break the printed URLs and any links the
  // user has bookmarked).
  const server = spawn("npx", ["--yes", "serve", ".", "-p", "8000", "-L", "-n"], {
    stdio: "inherit",
    shell: true,
    cwd: root,
  });
  server.on("exit", (code) => process.exit(code ?? 0));
  process.on("SIGINT",  () => server.kill("SIGINT"));
  process.on("SIGTERM", () => server.kill("SIGTERM"));
}

const reason = await needsBuild();
if (reason) {
  console.log("[dev] " + reason + " — rebuilding halls/");
  runBuild();
} else {
  console.log("[dev] halls/dist/ is up to date (skipping build).");
}
runServer();
