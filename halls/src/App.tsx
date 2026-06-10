import { useState } from "react";
import DepthGallery from "./depth-gallery/DepthGallery";
import HallChrome from "./components/HallChrome";
import { getProjectsByHall } from "./projectsData";
import type { ProjectWithColors } from "./types";

interface Props {
  initialHall: "oasis" | "lumina";
}

export default function App({ initialHall }: Props) {
  // Lazy initial state: pick the first project for this hall synchronously
  // during the first render so HallChrome's editorial label is populated on
  // the very first paint (no flash of empty title/spec). The source is
  // blend-aware (Engine fires the active-plane callback at the crossfade
  // midpoint via getPlaneBlendData) so the label flips at the right moment.
  const [activeProject, setActiveProject] = useState<ProjectWithColors | null>(
    () => {
      const projects = getProjectsByHall(initialHall);
      return projects[0] ?? null;
    },
  );

  // frame-dark flag (Wave 4): true when the nearest plane index < 2 (the
  // brightest photos). HallChrome swaps the label's texture-text variant to
  // the LIGHT cream fill so the title stays legible over bright imagery.
  const [frameDark, setFrameDark] = useState(false);

  return (
    <>
      <DepthGallery
        hallId={initialHall}
        onActiveChange={setActiveProject}
        onFrameDarkChange={setFrameDark}
      />
      <HallChrome
        hallId={initialHall}
        activeProject={activeProject}
        frameDark={frameDark}
      />
    </>
  );
}
