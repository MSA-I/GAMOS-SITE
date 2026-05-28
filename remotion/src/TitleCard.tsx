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

export const TitleCard: React.FC<Props> = ({ title, subtitle }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const titleEntry = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 90 },
    durationInFrames: 30,
  });

  const subtitleEntry = spring({
    frame: frame - 10,
    fps,
    config: { damping: 200, stiffness: 90 },
    durationInFrames: 30,
  });

  const exitOpacity = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const titleY = interpolate(titleEntry, [0, 1], [40, 0]);
  const subtitleY = interpolate(subtitleEntry, [0, 1], [30, 0]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0a0a0a",
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(circle at 50% 40%, rgba(212,175,55,0.18) 0%, rgba(10,10,10,1) 70%)",
        }}
      />
      <div
        style={{
          position: "relative",
          textAlign: "center",
          fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            opacity: titleEntry,
            transform: `translateY(${titleY}px)`,
            fontSize: 130,
            fontWeight: 300,
            color: "#f5e6c3",
            letterSpacing: 14,
            textTransform: "uppercase",
          }}
        >
          {title}
        </div>
        <div
          style={{
            opacity: subtitleEntry,
            transform: `translateY(${subtitleY}px)`,
            fontSize: 38,
            fontWeight: 200,
            color: "#d4af37",
            letterSpacing: 8,
            marginTop: 30,
            fontStyle: "italic",
          }}
        >
          {subtitle}
        </div>
        <div
          style={{
            opacity: subtitleEntry,
            width: 200,
            height: 1,
            backgroundColor: "#d4af37",
            margin: "40px auto 0",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
