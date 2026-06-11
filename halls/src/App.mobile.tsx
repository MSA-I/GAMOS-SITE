import { useState } from "react";
import DepthGallery from "./depth-gallery/DepthGallery";
import HallChromeMobile from "./components/HallChromeMobile";
import { getProjectsByHall } from "./projectsData";
import type { ProjectWithColors } from "./types";

interface Props {
  initialHall: "oasis" | "lumina";
}

// Mobile twin of App.tsx — IDENTICAL DepthGallery usage (same WebGL, same
// props/callbacks); only the overlaid chrome is swapped to the phone-first
// HallChromeMobile (re-laid-out so the editorial label no longer wraps/overlaps
// the gallery and the controls hit ≥44px). See plan §A/§B.
export default function App({ initialHall }: Props) {
  // Lazy initial state: pick the first project for this hall synchronously
  // during the first render so the editorial label is populated on the very
  // first paint (no flash of empty title/spec). The source is blend-aware
  // (Engine fires the active-plane callback at the crossfade midpoint via
  // getPlaneBlendData) so the label flips at the right moment.
  const [activeProject, setActiveProject] = useState<ProjectWithColors | null>(
    () => {
      const projects = getProjectsByHall(initialHall);
      return projects[0] ?? null;
    },
  );

  // frame-dark flag: true when the nearest plane index < 2 (the brightest
  // photos). HallChromeMobile swaps the label's texture-text variant to the
  // LIGHT cream fill so the title stays legible over bright imagery.
  const [frameDark, setFrameDark] = useState(false);

  return (
    <>
      <DepthGallery
        hallId={initialHall}
        onActiveChange={setActiveProject}
        onFrameDarkChange={setFrameDark}
      />
      <HallChromeMobile
        hallId={initialHall}
        activeProject={activeProject}
        frameDark={frameDark}
      />
    </>
  );
}
