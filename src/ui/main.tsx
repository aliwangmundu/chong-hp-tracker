import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import App from "./App";
import "../index.css";

const container = document.getElementById("root");
if (container === null) throw new Error("#root is missing from action.html");

// Rendering before OBR.onReady leaves the SDK calls in App unusable.
OBR.onReady(() => {
  createRoot(container).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
