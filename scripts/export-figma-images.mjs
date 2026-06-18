#!/usr/bin/env node
/**
 * scripts/export-figma-images.mjs
 *
 * Mirror EVERY image used on the site into figma-export/site-images/, then sync
 * the whole figma-export/ bundle (README + tokens.json + media + site-images)
 * to the designer drop at ../GAMOS-DOCS/FIGMA-EXPORT/ (figma-export/README.md).
 *
 * "Mirror" = rebuild-from-scratch: the dest is wiped first, so an image the user
 * deleted from the site simply isn't re-copied and disappears from the bundle.
 * No diffing, no stale leftovers.
 *
 * Sources (sub-app images come from the BUILT dist/ — run build:halls/build:rooms
 * first if you changed their source images):
 *   assets/images/*    -> site-images/
 *   assets/img         -> site-images/_misc
 *   halls/dist/images  -> site-images/_halls-app
 *   rooms/dist/images  -> site-images/_rooms-app
 *
 * Zero npm deps, vanilla Node ESM, build-time only (Constitution §2/§6).
 */

import { existsSync, mkdirSync, rmSync, cpSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE = join(ROOT, "figma-export");
const SITE_IMAGES = join(BUNDLE, "site-images");
// Designer drop lives outside the repo (§7), resolved relative to ROOT — same
// convention as encode-rooms-door.mjs reads ../GAMOS-DOCS.
const DOCS_DEST = resolve(ROOT, "..", "GAMOS-DOCS", "FIGMA-EXPORT");

// source (relative to ROOT) -> dest subdir under site-images ("" = root)
const IMAGE_SOURCES = [
  ["assets/images",      ""],
  ["assets/img",         "_misc"],
  ["halls/dist/images",  "_halls-app"],
  ["rooms/dist/images",  "_rooms-app"],
];

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  let n = 0;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    n += e.isDirectory() ? countFiles(join(dir, e.name)) : 1;
  }
  return n;
}

function mirrorSiteImages() {
  rmSync(SITE_IMAGES, { recursive: true, force: true });
  mkdirSync(SITE_IMAGES, { recursive: true });
  let copied = 0;
  for (const [srcRel, destSub] of IMAGE_SOURCES) {
    const src = join(ROOT, srcRel);
    if (!existsSync(src)) { console.warn(`[figma-images] SKIP missing source: ${srcRel} (sub-app not built?)`); continue; }
    const dest = destSub ? join(SITE_IMAGES, destSub) : SITE_IMAGES;
    cpSync(src, dest, { recursive: true });
    const n = countFiles(src);
    copied += n;
    console.log(`[figma-images] ${srcRel} -> site-images/${destSub || ""}  (${n} files)`);
  }
  return copied;
}

// Mirror the whole bundle to the GAMOS-DOCS designer drop (prune + refresh).
function syncToDocs() {
  mkdirSync(DOCS_DEST, { recursive: true });
  for (const entry of ["README.md", "tokens.json", "media", "site-images"]) {
    const src = join(BUNDLE, entry);
    if (!existsSync(src)) { console.warn(`[figma-images] bundle missing ${entry} — run export:figma fully`); continue; }
    const dst = join(DOCS_DEST, entry);
    rmSync(dst, { recursive: true, force: true });
    cpSync(src, dst, { recursive: true });
  }
  console.log(`[figma-images] synced bundle -> ${DOCS_DEST}`);
}

function main() {
  const total = mirrorSiteImages();
  // ponytail: an empty site-images means every source was missing — that's a
  // broken export, not "the site has no images". Fail loud.
  if (total === 0) {
    console.error("[figma-images] SELF-CHECK FAILED — no images copied (all sources missing?).");
    process.exit(1);
  }
  syncToDocs();
  const docsCount = countFiles(join(DOCS_DEST, "site-images"));
  if (docsCount !== total) {
    console.error(`[figma-images] SELF-CHECK FAILED — GAMOS-DOCS site-images (${docsCount}) != built (${total}).`);
    process.exit(1);
  }
  console.log(`[figma-images] done — ${total} site images mirrored + bundle synced to GAMOS-DOCS.`);
}

main();
