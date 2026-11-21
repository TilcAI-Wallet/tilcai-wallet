import { createRoot } from "react-dom/client";
import { palette, projectName } from "@tilcai-wallet/config";

const root = document.getElementById("root");
if (!root) throw new Error("Mini App root is missing.");

createRoot(root).render(
  <main style={{ maxWidth: 480, padding: 20, margin: "0 auto", color: palette.ink, fontFamily: "system-ui" }}>
    <h1 style={{ color: palette.violet }}>{projectName}</h1>
    <p>Base de Telegram Mini App para vincular y consultar la wallet.</p>
  </main>,
);
