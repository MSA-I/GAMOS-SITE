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
  // during the first render so HallChrome's bottom label is populated on
  // the very first paint (no flash of empty <h2>/<p>).
  const [activeProject, setActiveProject] = useState<ProjectWithColors | null>(
    () => {
      const projects = getProjectsByHall(initialHall);
      return projects[0] ?? null;
    },
  );

  return (
    <>
      <DepthGallery hallId={initialHall} onActiveChange={setActiveProject} />
      <HallChrome hallId={initialHall} activeProject={activeProject} />
    </>
  );
}
