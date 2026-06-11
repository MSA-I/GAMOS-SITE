import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.mobile.tsx";
import "./index.css";
import "./index.mobile.css";

const raw = document.documentElement.dataset.initialHall;
const initialHall: "oasis" | "lumina" =
  raw === "lumina" ? "lumina" : "oasis";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initialHall={initialHall} />
  </StrictMode>,
);
