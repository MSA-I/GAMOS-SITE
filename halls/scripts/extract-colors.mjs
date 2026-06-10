// halls/scripts/extract-colors.mjs
// ---------------------------------------------------------------------------
// Reads every .webp under halls/public/images/projects/ and writes a sorted
// JSON map of {background, blob1, blob2} colors keyed by "images/projects/<file>".
//
// node-vibrant is dynamically imported so this script degrades gracefully when
// the dependency isn't installed yet (initial scaffolding, fresh clone before
// `npm install`). On dynamic-import failure OR per-file palette failure we
// fall back to the brand-default trio (cocoa / ink-deep / brass).
//
// Output is byte-equal-skipped: if the existing file matches what we would
// write, we don't rewrite it (keeps git diffs clean across rebuilds).
// ---------------------------------------------------------------------------
import {
  readdirSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const halls = resolve(here, "..");
const inDir = resolve(halls, "public", "images", "projects");
const outFile = resolve(halls, "src", "data", "extractedColors.json");

// Brand defaults — see css/tokens.css §5 (--ink-deep / --cocoa / --brass).
const FALLBACK = {
  background: "#1a1410",
  blob1: "#534133",
  blob2: "#cfae83",
};

async function main() {
  let Vibrant;
  let sharp;
  try {
    // node-vibrant v4 ships only a *named* `Vibrant` export from /node;
    // there is no default export (the default is `undefined` at runtime).
    Vibrant = (await import("node-vibrant/node")).Vibrant;
    if (!Vibrant) throw new Error("named export 'Vibrant' is undefined");
  } catch (err) {
    console.warn(
      "[extract-colors] node-vibrant not usable; writing all-fallback JSON —",
      err?.message ?? err
    );
    Vibrant = null;
  }
  if (Vibrant) {
    try {
      // node-vibrant v4 uses jimp internally which does NOT decode WebP.
      // We pre-decode to a PNG buffer via sharp (transitive dep of vibrant).
      sharp = (await import("sharp")).default;
    } catch (err) {
      console.warn(
        "[extract-colors] sharp not usable (required to decode webp for vibrant); writing all-fallback JSON —",
        err?.message ?? err
      );
      Vibrant = null; // null Vibrant too so the per-file loop falls through to the FALLBACK branch cleanly
    }
  }

  if (!existsSync(inDir)) {
    console.error(`[extract-colors] missing input dir: ${inDir}`);
    process.exit(1);
  }

  const files = readdirSync(inDir)
    .filter((f) => f.toLowerCase().endsWith(".webp"))
    .sort();

  const result = {};
  let ok = 0;
  let fb = 0;

  for (const file of files) {
    const key = `images/projects/${file}`;
    if (!Vibrant) {
      result[key] = { ...FALLBACK };
      fb++;
      continue;
    }
    try {
      // Decode WebP → PNG buffer for vibrant (jimp can't read webp natively).
      const pngBuf = await sharp(resolve(inDir, file)).png().toBuffer();
      const palette = await Vibrant.from(pngBuf).getPalette();
      const bg = palette.DarkMuted?.hex ?? FALLBACK.background;
      const b1 = palette.Muted?.hex ?? FALLBACK.blob1;
      const b2 = palette.DarkVibrant?.hex ?? FALLBACK.blob2;
      result[key] = {
        background: bg.toLowerCase(),
        blob1: b1.toLowerCase(),
        blob2: b2.toLowerCase(),
      };
      ok++;
    } catch (err) {
      console.warn(
        `[extract-colors] fallback: ${file} — ${err?.message ?? err}`
      );
      result[key] = { ...FALLBACK };
      fb++;
    }
  }

  // Sort keys lexicographically for stable diffs.
  const sorted = Object.fromEntries(
    Object.keys(result)
      .sort()
      .map((k) => [k, result[k]])
  );
  const json = JSON.stringify(sorted, null, 2) + "\n";

  mkdirSync(dirname(outFile), { recursive: true });
  if (existsSync(outFile) && readFileSync(outFile, "utf8") === json) {
    console.log(`[extract-colors] no changes (${files.length} entries)`);
    return;
  }

  writeFileSync(outFile, json, "utf8");
  console.log(
    `[extract-colors] wrote ${files.length} entries (${ok} extracted, ${fb} fallback)`
  );
}

main().catch((err) => {
  console.error("[extract-colors]", err);
  process.exit(1);
});
