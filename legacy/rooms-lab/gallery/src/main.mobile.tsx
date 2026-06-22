import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.mobile.tsx";
import "./index.css";
// Mobile chrome overrides — imported AFTER index.css so the .roomsm-* rules win.
import "./index.mobile.css";

// Mobile entry — mirrors main.tsx (single curved wall, no data-initial-hall) but
// mounts App.mobile (which swaps RoomsChrome → RoomsChromeMobile). The WebGL wall,
// IntroGate, and RoomDetail are reused verbatim.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
