import React from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { IMAGES_FOLDER } from "./screens";

type Props = {
  src: string;
  index: number;
  total: number;
  zoom?: "in" | "out" | "left" | "right";
};

export const ImageSlide: React.FC<Props> = ({
  src,
  zoom = "in",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();

  const fadeIn = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80 },
    durationInFrames: 20,
  });

  const fadeOut = interpolate(
    frame,
    [durationInFrames - 18, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const progress = frame / durationInFrames;
  let scale = 1;
  let translateX = 0;
  let translateY = 0;

  if (zoom === "in") {
    scale = interpolate(progress, [0, 1], [1, 1.18]);
  } else if (zoom === "out") {
    scale = interpolate(progress, [0, 1], [1.18, 1]);
  } else if (zoom === "left") {
    scale = 1.15;
    translateX = interpolate(progress, [0, 1], [40, -40]);
  } else if (zoom === "right") {
    scale = 1.15;
    translateX = interpolate(progress, [0, 1], [-40, 40]);
  }

  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          opacity,
          transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
        }}
      >
        <Img
          src={staticFile(`images/${IMAGES_FOLDER}/${src}`)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
