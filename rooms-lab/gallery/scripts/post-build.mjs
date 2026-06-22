import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Rooms emits two entries:
//   dist/index.html   — DESKTOP route, IS the served path (/rooms/dist/).
//   dist/mobile.html  — MOBILE route (additive). Mirror it to
//                       dist/mobile/index.html so the clean URL /rooms/dist/mobile/
//                       resolves (and stays under the /rooms/dist/ base, so every
//                       hashed-asset URL still resolves unchanged).
// Both entries share the same hashed bundle dir (dist/assets/), differing only in
// which main.*.tsx they load. This post-build asserts both landed + does the
// mobile mirror (parity with halls' oasis/lumina mirror pipeline).
const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");

const entry = resolve(dist, "index.html");
if (!existsSync(entry)) {
  console.error(`[post-build] missing: ${entry}`);
  process.exit(1);
}

const mobileEntry = resolve(dist, "mobile.html");
if (!existsSync(mobileEntry)) {
  console.error(`[post-build] missing: ${mobileEntry}`);
  process.exit(1);
}

const mobileDir = resolve(dist, "mobile");
mkdirSync(mobileDir, { recursive: true });
copyFileSync(mobileEntry, resolve(mobileDir, "index.html"));

console.log(
  "[post-build] dist/index.html present; dist/mobile.html → dist/mobile/index.html mirrored — done.",
);
