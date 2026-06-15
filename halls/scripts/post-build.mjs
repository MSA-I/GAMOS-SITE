import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");

const pairs = [
  ["index.html",  "events/index.html"],
  ["resort.html", "resort/index.html"],
  // Mobile-only mirrors (additive) → /halls/dist/events-mobile/ + /halls/dist/resort-mobile/.
  ["events-mobile.html",  "events-mobile/index.html"],
  ["resort-mobile.html", "resort-mobile/index.html"],
];

for (const [src, dst] of pairs) {
  const from = resolve(dist, src);
  const to   = resolve(dist, dst);
  if (!existsSync(from)) {
    console.error(`[post-build] missing: ${from}`);
    process.exit(1);
  }
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  console.log(`[post-build] ${src} -> ${dst}`);
}
console.log("[post-build] done.");
