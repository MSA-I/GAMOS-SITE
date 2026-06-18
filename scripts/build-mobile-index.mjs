#!/usr/bin/env node
/* =============================================================================
   scripts/build-mobile-index.mjs — generate /mobile/index.html from /index.html
   ---------------------------------------------------------------------------
   The mobile site is a DEDICATED entry document (CLAUDE.md §13 amendment
   2026-06-15) — but to guarantee it never drifts from the desktop source, it
   is GENERATED from index.html on every build rather than hand-maintained.

   What the transform does (and ONLY this — keep it minimal so the two pages
   stay identical in structure):

     1. Flip the root tag:  <html dir="rtl" lang="he">
        →                   <html dir="rtl" lang="he" data-view="mobile">
        The data-view marker lets CSS/JS branch on "this is the mobile build"
        without matchMedia guesswork. (The /mobile/ URL is also ≤768px in
        practice, so mobile/loader.js's existing matchMedia gates still fire.)

     2. Strip the MOBILE-REDIRECT block (everything between the
        `MOBILE-REDIRECT:START` and `MOBILE-REDIRECT:END` HTML comments) so the
        mobile page does NOT bounce back to itself. (index.html keeps it; only
        the generated copy drops it.)

     3. Prepend a "GENERATED — DO NOT EDIT" banner comment.

   Everything else is byte-identical to index.html. All asset URLs in index.html
   are root-absolute (/assets, /css, /js, /mobile) so they resolve identically
   when the document is served from /mobile/index.html. mobile/loader.js +
   mobile/css/* (the mobile-truth layer) are pulled in exactly as on the desktop
   page, so the phone treatment (tap zones, half images, culinary-mobile
   manifest, overflow-x:clip sticky fix, ≥44px targets) all apply.

   Usage:   node scripts/build-mobile-index.mjs   (or: npm run build:mobile)
   Output:  mobile/index.html  (overwritten each run — never hand-edit)
   ========================================================================= */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "index.html");
const OUT = join(ROOT, "mobile", "index.html");

function fail(msg) {
  console.error(`[build-mobile-index] ${msg}`);
  process.exit(1);
}

let html = readFileSync(SRC, "utf8");
const originalLength = html.length;

/* 1. data-view="mobile" on the root <html> tag (idempotent). -------------- */
const htmlTagRe = /<html\b([^>]*)>/i;
const m = htmlTagRe.exec(html);
if (!m) fail("could not find <html> tag in index.html");
if (!/\bdata-view\s*=/.test(m[1])) {
  html = html.replace(htmlTagRe, `<html${m[1]} data-view="mobile">`);
} else {
  // already had a data-view (shouldn't, in source) — normalize to mobile
  html = html.replace(htmlTagRe, (full, attrs) =>
    `<html${attrs.replace(/\bdata-view\s*=\s*("[^"]*"|'[^']*'|\S+)/i, 'data-view="mobile"')}>`
  );
}

/* 2. Strip the MOBILE-REDIRECT block so the mobile page never bounces. ----- */
const redirectRe =
  /[\t ]*<!--\s*MOBILE-REDIRECT:START[\s\S]*?MOBILE-REDIRECT:END\s*-->\n?/;
if (redirectRe.test(html)) {
  html = html.replace(redirectRe, "");
} else {
  // Not fatal — the pathname guard inside the script also prevents a loop —
  // but warn loudly because the desktop source should always carry the block.
  console.warn(
    "[build-mobile-index] WARNING: MOBILE-REDIRECT block not found in index.html; " +
      "mobile page will rely on the script's own pathname guard to avoid a loop."
  );
}

/* 3. GENERATED banner. ---------------------------------------------------- */
const banner =
  "<!-- ============================================================\n" +
  "     GENERATED FILE — DO NOT EDIT.\n" +
  "     Produced by scripts/build-mobile-index.mjs from /index.html.\n" +
  "     Edit index.html (the single source) + the /mobile/ layer\n" +
  "     (mobile/loader.js, mobile/css/*), then re-run `npm run build:mobile`.\n" +
  "     CLAUDE.md §13 amendment (2026-06-15).\n" +
  "     ============================================================ -->\n";
html = html.replace(/^<!DOCTYPE html>\s*/i, (d) => d.replace(/\s*$/, "\n") + banner);

writeFileSync(OUT, html, "utf8");
console.log(
  `[build-mobile-index] wrote mobile/index.html ` +
    `(${html.length} bytes; source ${originalLength} bytes).`
);
