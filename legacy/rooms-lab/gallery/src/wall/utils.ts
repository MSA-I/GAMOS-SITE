/**
 * Shared math + color helpers for the rooms-wall modules.
 *
 * Copied verbatim from halls/src/depth-gallery/utils.ts — a single source of
 * truth so Wall / Drag / Hover can't drift independently.
 */

export interface RGB {
  r: number;
  g: number;
  b: number;
}

/** Linear interpolation: `a` toward `b` by `t` (0..1). */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Clamp `v` into the inclusive range [lo, hi]. */
export function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * Parse a `#rgb` or `#rrggbb` hex color into 0..255 RGB components.
 * Returns the brand ink-deep default { r:26, g:20, b:16 } on parse failure.
 */
export function hexToRgb(hex: string): RGB {
  const m = hex.replace("#", "");
  const expanded =
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m;
  const num = parseInt(expanded, 16);
  if (Number.isNaN(num)) return { r: 26, g: 20, b: 16 };
  return {
    r: (num >> 16) & 0xff,
    g: (num >> 8) & 0xff,
    b: num & 0xff,
  };
}
