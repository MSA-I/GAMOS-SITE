import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.mobile.tsx";
import "./index.css";
import "./index.mobile.css";

const raw = document.documentElement.dataset.initialHall;
const initialHall: "events" | "resort" =
  raw === "resort" ? "resort" : "events";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initialHall={initialHall} />
  </StrictMode>,
);
