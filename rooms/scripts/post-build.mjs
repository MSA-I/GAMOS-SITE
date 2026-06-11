import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Rooms is a SINGLE-entry sub-app: `vite build` already emits dist/index.html,
// which IS the served route (/rooms/dist/). Unlike halls there is no oasis/
// lumina duplication to mirror — so this post-build is just a sanity assert
// that the entry landed, kept for parity with halls' pipeline + clear failure.
const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");
const entry = resolve(dist, "index.html");

if (!existsSync(entry)) {
  console.error(`[post-build] missing: ${entry}`);
  process.exit(1);
}
console.log("[post-build] dist/index.html present — done.");
