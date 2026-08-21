import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import OBR from "@owlbear-rodeo/sdk";
import "@/index.css";
import RollPopover from "./RollPopover";

OBR.onReady(() => {
  const container = document.getElementById("root");
  if (container === null) throw new Error("missing #root");

  createRoot(container).render(
    <StrictMode>
      <RollPopover />
    </StrictMode>,
  );
});
