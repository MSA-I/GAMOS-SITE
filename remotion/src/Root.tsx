import React from "react";
import { Composition } from "remotion";
import {
  Walkthrough,
  TOTAL_FRAMES,
  FPS_RATE,
} from "./Walkthrough";
import {
  PortalLayers,
  PORTAL_LAYERS_DURATION_FRAMES,
  PORTAL_LAYERS_FPS,
} from "./PortalLayers";

const PORTAL_DEFAULT_PROPS = {
  backgroundSrc: "resort/1.5/background.mp4",
  foregroundSrc: "resort/1.5/foreground.webm",
  portalContentSrc: "resort/1.5/portal_content.png",
  showBackground: true,
  showPortalContent: true,
  showForeground: true,
  portalScale: 1,
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="GamosWalkthrough"
        component={Walkthrough}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS_RATE}
        width={1920}
        height={1080}
      />
      <Composition
        id="Resort1-5-PortalLayers"
        component={PortalLayers}
        durationInFrames={PORTAL_LAYERS_DURATION_FRAMES}
        fps={PORTAL_LAYERS_FPS}
        width={1920}
        height={1080}
        defaultProps={PORTAL_DEFAULT_PROPS}
      />
      <Composition
        id="Resort1-5-BackgroundOnly"
        component={PortalLayers}
        durationInFrames={PORTAL_LAYERS_DURATION_FRAMES}
        fps={PORTAL_LAYERS_FPS}
        width={1920}
        height={1080}
        defaultProps={{
          ...PORTAL_DEFAULT_PROPS,
          showPortalContent: false,
          showForeground: false,
        }}
      />
      <Composition
        id="Resort1-5-ForegroundOnly"
        component={PortalLayers}
        durationInFrames={PORTAL_LAYERS_DURATION_FRAMES}
        fps={PORTAL_LAYERS_FPS}
        width={1920}
        height={1080}
        defaultProps={{
          ...PORTAL_DEFAULT_PROPS,
          showBackground: false,
          showPortalContent: false,
        }}
      />
    </>
  );
};
