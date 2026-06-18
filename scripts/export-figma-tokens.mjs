#!/usr/bin/env node
/**
 * scripts/export-figma-tokens.mjs
 *
 * Convert css/tokens.css (the single source of design truth, §10.2) into
 * figma-export/tokens.json in the Tokens Studio / W3C Design Tokens format,
 * so a designer can import it into Figma via Tokens Studio Pro and get the
 * real GAMOS Variables/Styles (figma-export/README.md, step 4).
 *
 * Usage:
 *   node scripts/export-figma-tokens.mjs            # write tokens.json
 *   node scripts/export-figma-tokens.mjs --self-check  # write + assert §5 colors
 *   npm run export:figma                            # tokens + media
 *
 * Zero npm deps, vanilla Node ESM, build-time only (Constitution §2/§6).
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "css", "tokens.css");
const OUT_DIR = join(ROOT, "figma-export");
const OUT = join(OUT_DIR, "tokens.json");

// W3C $type per name prefix. Order matters — first match wins.
const TYPE_RULES = [
  [/^radius-/,                                   "borderRadius"],
  [/^font-/,                                     "fontFamilies"],
  [/^text-/,                                     "fontSizes"],
  [/^fw-/,                                       "fontWeights"],
  [/^lh-/,                                       "lineHeights"],
  [/^tracking-/,                                 "letterSpacing"],
  [/^(space-|section-pad|gutter)/,               "spacing"],
  [/^container-/,                                "sizing"],
  [/^(shadow-|focus-ring)/,                      "boxShadow"],
  [/^(brass|cocoa|ivory|mist|ink|accent|bg|fg|shabbat-tint)/, "color"],
];

function typeFor(name) {
  for (const [re, t] of TYPE_RULES) if (re.test(name)) return t;
  return "other"; // dur-*, ease-*, z-*, scrim-* (gradients), typo-*/texture-* (urls), border-* (rgba), card-zoom
}

// Parse every `--name: value;` declaration from :root blocks. Comments are
// stripped first because they contain literal "--typo-on-light : …" prose that
// would otherwise be parsed as a (broken, multi-line) declaration. CSS values
// here never contain a ';', so [^;]+ safely spans multi-line gradients/clamps.
function parseTokens(css) {
  const noComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const re = /--([\w-]+)\s*:\s*([^;]+);/g;
  const map = new Map(); // first occurrence wins → real --dur-* beat the
  let m;                 // @media(prefers-reduced-motion) 0.01ms overrides.
  while ((m = re.exec(noComments)) !== null) {
    const name = m[1];
    const value = m[2].replace(/\s+/g, " ").trim();
    if (!map.has(name)) map.set(name, value);
  }
  return map;
}

// A value that is exactly `var(--x)` becomes a Tokens Studio alias
// `{type.x}`. Mixed values (color-mix/gradient/clamp with var inside) stay
// verbatim as `other` strings (plan: don't try to compute them).
function formatValue(value, typeOf) {
  const alias = value.match(/^var\(\s*--([\w-]+)\s*\)$/);
  if (alias) {
    const target = alias[1];
    return { value: `{${typeOf(target)}.${target}}`, isAlias: true };
  }
  return { value, isAlias: false };
}

function main() {
  const css = readFileSync(SRC, "utf8");
  const tokens = parseTokens(css);
  if (tokens.size === 0) throw new Error(`No --tokens parsed from ${SRC}`);

  const typeOf = (name) => typeFor(name);

  const out = {};
  for (const [name, raw] of tokens) {
    const type = typeOf(name);
    // Aliases keep the name's prefix type; mixed exprs fall to "other".
    const formatted = formatValue(raw, typeOf);
    const $type = formatted.isAlias ? type : (/(color-mix|gradient|clamp|rgba|url\()/.test(raw) ? "other" : type);
    (out[$type] ||= {})[name] = { $value: formatted.value, $type };
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  const count = [...tokens.keys()].length;
  console.log(`[figma-tokens] wrote ${count} tokens → figma-export/tokens.json`);

  // ponytail: self-check guards the one thing that silently rots — the §5 brand
  // palette. If a hex drifts or a token vanishes, fail loud (exit 1).
  if (process.argv.includes("--self-check")) {
    const EXPECT = {
      brass: "#CFAE83", cocoa: "#534133", ivory: "#F5EFE6",
      "ink-deep": "#1A1410", "accent-rose": "#B8576F",
    };
    const errs = [];
    JSON.parse(readFileSync(OUT, "utf8")); // assert valid JSON round-trips
    for (const [name, hex] of Object.entries(EXPECT)) {
      const got = (out.color?.[name]?.$value || "").toUpperCase();
      if (got !== hex.toUpperCase()) errs.push(`${name}: expected ${hex}, got "${got || "(missing)"}"`);
    }
    if (errs.length) {
      console.error("[figma-tokens] SELF-CHECK FAILED:\n  " + errs.join("\n  "));
      process.exit(1);
    }
    console.log("[figma-tokens] self-check OK — 5 brand colors present with correct hex, JSON valid.");
  }
}

main();
