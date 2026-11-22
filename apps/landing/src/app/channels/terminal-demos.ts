import type { TerminalDemo } from "./channel-types";

const launch = "pnpm --silent --filter @tilcai-wallet/mcp start";
const install = "pnpm install --frozen-lockfile";
const status = "Demostración · MCP local";
const tool = "tilcai-wallet · get_card({})";

export const agentDemos = [
  {
    id: "claude",
    kind: "terminal",
    theme: "claude",
    name: "Claude Code",
    status,
    detail: "Instala las dependencias del repo, registra el servidor y consulta la tarjeta de la sesión.",
    setup: [install, `claude mcp add --transport stdio tilcai-wallet -- ${launch}`],
    prompt: "Consulta mi saldo y el presupuesto de Codex.",
    tool,
    view: "mcp",
  },
  {
    id: "codex",
    kind: "terminal",
    theme: "codex",
    name: "Codex",
    status,
    detail: "Registra el MCP de TilcAI en Codex. El agente consulta saldo y tope antes de comprar.",
    setup: [install, `codex mcp add tilcai-wallet -- ${launch}`],
    prompt: "¿Cuánto puedo gastar en esta sesión?",
    tool,
    view: "mcp",
  },
  {
    id: "opencode",
    kind: "terminal",
    theme: "opencode",
    name: "OpenCode",
    status,
    detail: "Conecta el mismo servidor local en OpenCode y comprueba el presupuesto disponible.",
    setup: [install, `opencode mcp add tilcai-wallet -- ${launch}`],
    prompt: "Revisa el presupuesto de mi tarjeta.",
    tool,
    view: "mcp",
  },
] as const satisfies readonly TerminalDemo[];

export const cliDemo = {
  id: "cli",
  kind: "terminal",
  theme: "cli",
  name: "Terminal",
  status: "CLI local · Vista TUI",
  detail: "El CLI comprueba el gateway con health. La ficha de saldo pertenece a la vista previa TUI.",
  setup: [install],
  prompt: "pnpm --filter @tilcai-wallet/cli start health",
  tool: "GET /healthz",
  view: "health",
} as const satisfies TerminalDemo;
