// Servidor MCP remoto (transporte HTTP "Streamable", sin estado) para que Claude Code, Codex, ChatGPT y Claude se
// conecten de verdad a la wallet. Lógica pura sobre el `Store`: la ruta HTTP solo traduce peticiones y respuestas.
// shortcut: sin OAuth ni límite de peticiones; el código de vinculación en la URL o el token es la única credencial.
// Con la Wallet API real, cada agente tendrá su propio token con vencimiento y revocación.
import { agentPurchase, agentStatus, agentsView, findPairing, LedgerError, type Store } from "./ledger.ts";
import { formatUsdc, parseUsdc } from "./money.ts";

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: Record<string, unknown> };
export type McpReply = { status: number; body?: unknown };

const versions = ["2025-06-18", "2025-03-26", "2024-11-05"];

const tools = [
  {
    name: "get_wallet_status",
    description: "Muestra el estado de la tarjeta de este agente: tope acumulado, gastado, disponible y máximo por compra.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "request_purchase",
    description:
      "Solicita una compra en USDC (Stellar Testnet, simulada). Se rechaza si la tarjeta no existe, está en pausa o la compra supera el máximo por compra, el tope acumulado o el saldo.",
    inputSchema: {
      type: "object",
      properties: {
        amount: { type: "string", description: "Monto en USDC, por ejemplo 0.50 o 10." },
        description: { type: "string", description: "Qué se está comprando." },
      },
      required: ["amount", "description"],
      additionalProperties: false,
    },
  },
  {
    name: "list_receipts",
    description: "Lista las compras que este agente ya hizo con su tarjeta.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
];

const text = (value: string, isError = false) => ({ content: [{ type: "text", text: value }], ...(isError ? { isError: true } : {}) });
const error = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

function callTool(store: Store, code: string, name: string, args: Record<string, unknown>, now: Date) {
  const pairing = findPairing(store, code, now)!;
  if (pairing.status !== "approved" || !pairing.agentId) {
    return text("Conexión pendiente: la persona dueña debe aprobarla en la app de Tilcai Wallet antes de que uses estas herramientas.", true);
  }
  const agent = agentsView(store).find((a) => a.id === pairing.agentId);
  if (!agent) return text("Este agente ya no existe en la wallet.", true);

  if (name === "get_wallet_status") {
    const status = agentStatus(agent);
    const left = BigInt(agent.limit) - BigInt(agent.spent);
    return text(
      JSON.stringify({
        agente: agent.name,
        estado: { active: "activo", paused: "en pausa", limit: "tope alcanzado", setup: "sin tarjeta (sin acceso a fondos)" }[status],
        tarjeta: agent.card,
        tope_acumulado: formatUsdc(agent.limit),
        gastado: formatUsdc(agent.spent),
        disponible: status === "active" ? formatUsdc((left > 0n ? left : 0n).toString()) : formatUsdc("0"),
        maximo_por_compra: formatUsdc(agent.maxPerPurchase),
        simulado: true,
      }),
    );
  }
  if (name === "request_purchase") {
    const amount = parseUsdc(typeof args.amount === "string" ? args.amount : "");
    if (!amount) return text("Monto inválido. Usa un número positivo en USDC, por ejemplo 0.50.", true);
    try {
      const id = agentPurchase(store, agent.id, BigInt(amount), typeof args.description === "string" ? args.description : "", now);
      return text(JSON.stringify({ aprobada: true, id_recibo: id, monto: formatUsdc(amount), simulado: true }));
    } catch (failure) {
      if (failure instanceof LedgerError) return text(`Compra rechazada: ${failure.message}`, true);
      throw failure;
    }
  }
  if (name === "list_receipts") {
    const receipts = store.activity
      .filter((item) => item.kind === "payment" && item.counterparty === agent.name)
      .map((item) => ({ id: item.id, descripcion: item.label, monto: formatUsdc(item.amount), fecha: item.at, simulado: true }));
    return text(JSON.stringify(receipts));
  }
  return text(`Herramienta desconocida: ${name}.`, true);
}

function handleOne(store: Store, code: string, message: Rpc, now: Date) {
  const { id, method, params = {} } = message;
  if (message.jsonrpc !== "2.0" || typeof method !== "string") return error(id, -32600, "Petición inválida.");
  const reply = (result: unknown) => ({ jsonrpc: "2.0", id, result });

  // Cualquier contacto válido marca la vinculación como «conectada»: la app lo detecta y pide la aprobación.
  const pairing = findPairing(store, code, now)!;
  if (pairing.status === "waiting") pairing.status = "connected";

  switch (method) {
    case "initialize": {
      const asked = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      return reply({
        protocolVersion: versions.includes(asked) ? asked : versions[0],
        capabilities: { tools: {} },
        serverInfo: { name: "tilcai-wallet", title: "Tilcai Wallet", version: "0.1.0" },
        instructions: "Tarjeta de gasto con límites para agentes, en Stellar Testnet (simulada). La persona dueña aprueba la conexión desde la app.",
      });
    }
    case "ping":
      return reply({});
    case "tools/list":
      return reply({ tools });
    case "tools/call":
      return reply(callTool(store, code, String(params.name ?? ""), (params.arguments as Record<string, unknown>) ?? {}, now));
    default:
      return error(id, -32601, `Método no admitido: ${method}.`);
  }
}

/** Procesa una petición JSON-RPC (o un lote). Sin `id` es una notificación: no lleva respuesta. */
export function handleMcp(store: Store, code: string | null, payload: unknown, now: Date): McpReply {
  if (!code || !findPairing(store, code, now)) {
    return { status: 401, body: error(null, -32001, "Código de conexión inválido o vencido. Genera uno nuevo en la app de Tilcai Wallet.") };
  }
  const messages = (Array.isArray(payload) ? payload : [payload]) as Rpc[];
  const replies = messages.filter((m) => m && typeof m === "object" && m.id !== undefined).map((m) => handleOne(store, code, m, now));
  for (const m of messages) if (m && typeof m === "object" && m.id === undefined) handleOne(store, code, m, now);
  if (replies.length === 0) return { status: 202 };
  return { status: 200, body: Array.isArray(payload) ? replies : replies[0] };
}
