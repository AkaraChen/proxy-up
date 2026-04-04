import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
// @ts-expect-error - CSS side-effect import
import "./style.css";
import App from "./App";

createRoot(document.querySelector<HTMLDivElement>("#app")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
