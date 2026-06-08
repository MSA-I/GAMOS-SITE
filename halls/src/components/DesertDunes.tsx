import React from "react";

interface DesertDunesProps {
  index: number;
  side: "left" | "right";
  isActive: boolean;
  depth: number;
  isLightMode?: boolean;
}

/**
 * DesertDunes
 *
 * Sculptural SVG dune silhouette rendered as four stacked cubic-bezier
 * layers (haze / back / mid / front) plus a warm radial sand-haze wash
 * at the dune feet. Replaces the old "rounded-tr-[100%]" mountain divs
 * in the lumina hall.
 *
 * Each instance varies its bezier control points by `index` so a row
 * of dunes never reads as repeated. `isLightMode` is currently unused
 * but accepted as an optional prop so a future palette branch can
 * degrade gracefully without a signature change.
 */
const DesertDunes: React.FC<DesertDunesProps> = ({
  index,
  side,
  isActive,
  depth,
  isLightMode: _isLightMode = true,
}) => {
  const xShift = index * 24;
  const yPhase = (index % 3) * 40;

  const hazeId = `dune-haze-${index}-${side}`;

  // Layer 0 — deepest atmospheric haze (most distant ridge, very low contrast).
  const hazePath =
    `M0,${500 + yPhase * 0.5} ` +
    `C${260 + xShift},${380 + yPhase * 0.5} ${520 - xShift},${460 + yPhase * 0.5} ${820 + xShift},${360 + yPhase * 0.5} ` +
    `C${1140 - xShift},${280 + yPhase * 0.5} ${1440 + xShift},${440 + yPhase * 0.5} 1800,${400 + yPhase * 0.5} ` +
    `L1800,900 L0,900 Z`;

  // Layer 1 — back / far horizon ridge (sand-shadow, two crests).
  const backPath =
    `M0,${900} ` +
    `C${240 + xShift},${440 + yPhase} ${480 - xShift},${640 + yPhase} ${760 + xShift},${300 + yPhase} ` +
    `C${1060 - xShift},${180 + yPhase} ${1340 + xShift},${520 + yPhase} ${1580 + xShift},${340 + yPhase} ` +
    `C${1720 - xShift},${260 + yPhase} 1800,${480 + yPhase} 1800,${900} Z`;

  // Layer 2 — mid / middle dune crests (warm sand, three peaks).
  const midPath =
    `M0,${900} ` +
    `C${200 + xShift},${480 - yPhase} ${420 - xShift},${640 - yPhase} ${640 + xShift},${360 - yPhase} ` +
    `C${860 - xShift},${220 - yPhase} ${1060 + xShift},${560 - yPhase} ${1280 + xShift},${320 - yPhase} ` +
    `C${1480 - xShift},${200 - yPhase} ${1680 + xShift},${500 - yPhase} 1800,${420 - yPhase} ` +
    `L1800,900 L0,900 Z`;

  // Layer 3 — front / closest dune (full-opacity brand brass, tall hero crest).
  const frontPath =
    `M0,${900} ` +
    `C${220 + xShift},${600 + yPhase * 0.4} ${440 - xShift},${720 + yPhase * 0.4} ${720 + xShift},${440 + yPhase * 0.4} ` +
    `C${980 - xShift},${260 + yPhase * 0.4} ${1240 + xShift},${600 + yPhase * 0.4} ${1500 + xShift},${500 + yPhase * 0.4} ` +
    `C${1680 - xShift},${440 + yPhase * 0.4} 1800,${640 + yPhase * 0.4} 1800,${900} Z`;

  const rotateY = side === "left" ? 15 : -15;
  const scale = 1 - depth * 0.04;
  const zTranslate = -depth * 30;
  const transformOrigin = side === "left" ? "bottom left" : "bottom right";

  return (
    <svg
      className="absolute bottom-0 w-[42vw] max-w-[1100px]"
      viewBox="0 0 1800 900"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden="true"
      style={{
        opacity: isActive ? 1 : 0.62,
        transition: "opacity 700ms ease-out",
        transform: `translate3d(0, 0, ${zTranslate}px) rotateY(${rotateY}deg) scale(${scale})`,
        transformOrigin,
        pointerEvents: "none",
        [side === "left" ? "left" : "right"]: 0,
      } as React.CSSProperties}
    >
      <defs>
        <radialGradient id={hazeId} cx="50%" cy="100%" r="75%" fx="50%" fy="100%">
          <stop offset="0%" stopColor="#CFAE83" stopOpacity={0} />
          <stop offset="100%" stopColor="#CFAE83" stopOpacity={0.18} />
        </radialGradient>
      </defs>

      <path
        d={hazePath}
        fill="#5C4A42"
        fillOpacity={0.08}
        transform="translate(0,-30)"
      />

      <path d={backPath} fill="#5C4A42" fillOpacity={0.18} />

      <path d={midPath} fill="#D4A574" fillOpacity={0.55} />

      <path d={frontPath} fill="#CFAE83" fillOpacity={1} />

      <rect x="0" y="0" width="1800" height="900" fill={`url(#${hazeId})`} />
    </svg>
  );
};

export default DesertDunes;
