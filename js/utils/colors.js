/**
 * colors.js — single-source bridge from css/tokens.css to JS contexts that
 * cannot use `var(--token)` directly (WebGL shaders, <canvas> fills, inline
 * style strings). Constitution §10.2: every visual value derives from
 * css/tokens.css — JS must read the token, not re-hardcode the hex.
 *
 * Usage:
 *   import { readToken, brandPalette } from "./utils/colors.js";
 *   const ink = readToken("--ink-deep", "#1A1410");   // resolved at call time
 *
 * Why read at call time (not module load): tokens.css may not be applied when
 * a module is first imported, and a future theme switch would restyle the
 * document root. A getComputedStyle read is cheap when done once per init.
 */

/** Read a CSS custom property off :root, trimmed. Falls back if unset/empty. */
export function readToken(name, fallback = "") {
  if (typeof document === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return v || fallback;
}

/**
 * Read several tokens in ONE getComputedStyle pass (cheaper than N reads).
 * @param {Array<[string, string]>} pairs  [tokenName, fallback] tuples
 * @returns {string[]} resolved values, in order
 */
export function readTokens(pairs) {
  if (typeof document === "undefined") return pairs.map(([, fb]) => fb);
  const cs = getComputedStyle(document.documentElement);
  return pairs.map(([name, fb]) => (cs.getPropertyValue(name).trim() || fb));
}

/**
 * Canonical brand palette (§5, LOCKED). The fallback hexes mirror
 * css/tokens.css verbatim so the values are correct even if a token read
 * returns empty (e.g. tokens.css failed to load). tokens.css stays the
 * single source — these are the documented mirror, read via readToken.
 */
export const BRAND_TOKENS = {
  brass: ["--brass", "#CFAE83"],
  brassDeep: ["--brass-deep", "#8B6F46"],
  cocoa: ["--cocoa", "#534133"],
  ivory: ["--ivory", "#F5EFE6"],
  inkDeep: ["--ink-deep", "#1A1410"],
  accentRose: ["--accent-rose", "#B8576F"],
  mist: ["--mist", "#E8DFD3"],
};

/** Resolve the whole brand palette to current hex values (one CGS pass). */
export function brandPalette() {
  const keys = Object.keys(BRAND_TOKENS);
  const values = readTokens(keys.map((k) => BRAND_TOKENS[k]));
  const out = {};
  keys.forEach((k, i) => { out[k] = values[i]; });
  return out;
}
