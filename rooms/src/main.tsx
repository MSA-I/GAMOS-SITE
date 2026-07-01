import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyDocumentLang } from "./i18n";

// Follow the main site's language choice (same-origin localStorage) before paint.
applyDocumentLang();

// Single entry — no data-initial-hall to read (unlike halls). One curved wall.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
