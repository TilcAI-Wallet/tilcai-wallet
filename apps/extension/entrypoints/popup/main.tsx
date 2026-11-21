import { createRoot } from "react-dom/client";
import { palette, projectName } from "@tilcai-wallet/config";

const root = document.getElementById("root");
if (!root) throw new Error("Popup root is missing.");

document.body.style.margin = "0";
createRoot(root).render(
  <main style={{ minWidth: 280, padding: 24, color: palette.ink, background: palette.background, fontFamily: "system-ui" }}>
    <h1 style={{ marginTop: 0, color: palette.violet }}>{projectName}</h1>
    <p>Base para vincular sitios y consultar el estado de la wallet.</p>
  </main>,
);
