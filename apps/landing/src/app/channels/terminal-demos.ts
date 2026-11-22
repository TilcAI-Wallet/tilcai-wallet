import { demoPurchase as purchase } from "../story/demo-purchase";
import type { TerminalDemo } from "./channel-types";

const status = "Recorrido MCP · stdio local";

export const agentDemos = [
  {
    id: "claude",
    kind: "terminal",
    theme: "claude",
    name: "Claude Code",
    status,
    detail: "Conecta el servidor MCP local y autoriza la sesión para que el agente consulte su tarjeta.",
    lines: [
      { tone: "prompt", text: "Conecta TilcAI Wallet y revisa la tarjeta." },
      { tone: "tool", text: "stdio → servidor tilcai-wallet" },
      { tone: "tool", text: "Sesión autorizada → get_card" },
      { tone: "result", text: `${purchase.agent} · Disponible: ${purchase.limit}` },
    ],
  },
  {
    id: "codex",
    kind: "terminal",
    theme: "codex",
    name: "Codex",
    status,
    detail: "Con la sesión autorizada, el agente crea la orden y consulta su estado por MCP.",
    lines: [
      { tone: "prompt", text: "Compra el informe si entra en el límite." },
      { tone: "tool", text: `get_card → tope ${purchase.limit}` },
      { tone: "tool", text: "create_order → test-report" },
      { tone: "result", text: `get_order → pago confirmado · ${purchase.payment}` },
    ],
  },
  {
    id: "opencode",
    kind: "terminal",
    theme: "opencode",
    name: "OpenCode",
    status,
    detail: "Consulta el recibo desde otro cliente MCP. El historial sigue en la misma wallet.",
    lines: [
      { tone: "prompt", text: "Consulta el recibo de la última compra." },
      { tone: "tool", text: "get_order → recibo disponible" },
      { tone: "tool", text: "get_receipt → permiso, orden y pago" },
      { tone: "result", text: `${purchase.order} · ${purchase.payment}` },
    ],
  },
] as const satisfies readonly TerminalDemo[];

export const cliDemo = {
  id: "cli",
  kind: "terminal",
  theme: "cli",
  name: "Terminal",
  status: "CLI en desarrollo",
  detail: "El CLI ya tiene una comprobación local. Las consultas de wallet por sesión son el siguiente paso.",
  lines: [
    { tone: "prompt", text: "pnpm --filter @tilcai-wallet/cli start health" },
    { tone: "tool", text: "Consultando el gateway local…" },
    { tone: "result", text: "Gateway local · respuesta OK" },
  ],
} as const satisfies TerminalDemo;
