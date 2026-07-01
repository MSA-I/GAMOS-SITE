import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyDocumentLang } from "./i18n";

// Follow the main site's language choice (same-origin localStorage) before the
// first paint, so lang/dir are correct and the chrome renders in the right tongue.
applyDocumentLang();

const raw = document.documentElement.dataset.initialHall;
const initialHall: "events" | "resort" =
  raw === "resort" ? "resort" : "events";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App initialHall={initialHall} />
  </StrictMode>,
);
