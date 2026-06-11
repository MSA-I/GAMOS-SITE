import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "..", "dist");

const pairs = [
  ["index.html",  "oasis/index.html"],
  ["lumina.html", "lumina/index.html"],
  // Mobile-only mirrors (additive) → /halls/dist/oasis-mobile/ + /halls/dist/lumina-mobile/.
  ["oasis-mobile.html",  "oasis-mobile/index.html"],
  ["lumina-mobile.html", "lumina-mobile/index.html"],
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
