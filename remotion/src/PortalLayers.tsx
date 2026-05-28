import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile } from "remotion";

/**
 * PortalLayers — three-layer composition built from the segmented 1.5.mp4:
 *
 *   1. background.mp4   (bottom)  — the original scene with the foreground
 *                                   inpainted out.
 *   2. portal_content   (middle)  — anything you want to appear *behind* the
 *                                   foreground (image, video, gradient, …).
 *   3. foreground.webm  (top)     — the segmented foreground with a real alpha
 *                                   channel; it occludes the middle layer and
 *                                   creates the "portal" reveal.
 *
 * Edit the props below or pass new ones from Root.tsx via defaultProps to
 * swap the middle layer.
 */

export type PortalLayersProps = {
  backgroundSrc: string;
  foregroundSrc: string;
  portalContentSrc: string;
  showBackground: boolean;
  showPortalContent: boolean;
  showForeground: boolean;
  portalScale: number;
};

export const PORTAL_LAYERS_FPS = 24;
export const PORTAL_LAYERS_DURATION_FRAMES = 241;

export const PortalLayers: React.FC<PortalLayersProps> = ({
  backgroundSrc,
  foregroundSrc,
  portalContentSrc,
  showBackground,
  showPortalContent,
  showForeground,
  portalScale,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {showBackground ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(backgroundSrc)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}

      {showPortalContent ? (
        <AbsoluteFill
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Img
            src={staticFile(portalContentSrc)}
            style={{
              width: `${100 * portalScale}%`,
              height: `${100 * portalScale}%`,
              objectFit: "cover",
            }}
          />
        </AbsoluteFill>
      ) : null}

      {showForeground ? (
        <AbsoluteFill>
          <OffthreadVideo
            src={staticFile(foregroundSrc)}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
