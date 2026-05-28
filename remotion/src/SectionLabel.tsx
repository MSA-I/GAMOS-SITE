import React from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type Props = {
  title: string;
  subtitle: string;
};

export const SectionLabel: React.FC<Props> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const entry = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80 },
    durationInFrames: 25,
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 25, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const x = interpolate(entry, [0, 1], [-60, 0]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          bottom: 90,
          left: 100,
          opacity: entry * exitOpacity,
          transform: `translateX(${x}px)`,
          fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            color: "#d4af37",
            fontSize: 22,
            letterSpacing: 8,
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            color: "#fff",
            fontSize: 76,
            fontWeight: 300,
            letterSpacing: 2,
            textShadow: "0 2px 20px rgba(0,0,0,0.6)",
          }}
        >
          {title}
        </div>
        <div
          style={{
            width: 120,
            height: 2,
            backgroundColor: "#d4af37",
            marginTop: 16,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
