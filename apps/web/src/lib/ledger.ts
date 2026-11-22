// Lógica pura del estado simulado de la wallet (sin I/O): la usan las acciones del servidor y los tests.
import { demoReceiptIds } from "./wallet-mock.ts";

export type Kind = "funding" | "payment" | "transfer";
export type Activity = { id: string; kind: Kind; label: string; amount: string; at: string; receiptId: string | null; txHash: string | null; counterparty: string | null };
export type Notice = {
  id: string;
  title: string;
  body: string;
  at: string;
  read: boolean;
  /** Solicitud de aumento de tope del agente, pendiente de decisión del dueño. */
  request?: { extra: string; status: "pending" | "approved" | "rejected" };
};
export type Agent = {
  id: string;
  name: string;
  role: string;
  icon: "agent" | "bars" | "laptop";
  paused: boolean;
  linkedCard: boolean;
  /** Código de su tarjeta; `null` mientras no tenga una activada. */
  card: string | null;
  /** Tope acumulado, gastado y máximo por compra, en unidades atómicas. */
  limit: string;
  spent: string;
  maxPerPurchase: string;
};
export type AgentStatus = "active" | "paused" | "limit" | "setup";
export type AgentSession = { id: string; agentId: string; title: string; state: "active" | "ended"; startedAt: string };
export type CardState = "active" | "frozen";

export type Store = {
  ownerName: string;
  balance: bigint;
  cap: bigint;
  spent: bigint;
  cardState: CardState;
  sessionState: "active" | "ended";
  activity: Activity[];
  notices: Notice[];
  agents: Agent[];
  sessions: AgentSession[];
  pairings: Pairing[];
  counter: number;
};

const usdc = (whole: number, cents = 0) => BigInt(whole) * 10_000_000n + BigInt(cents) * 100_000n;
export const codexAgentId = "agt_codex";

export function createStore(now = new Date("2026-11-21T20:00:00.000Z")): Store {
  const at = now.toISOString();
  return {
    ownerName: "Jhamil Calixto",
    balance: usdc(20),
    cap: usdc(0, 50),
    spent: 0n,
    cardState: "active",
    sessionState: "active",
    activity: [{ id: "act_funding", kind: "funding", label: "Fondeo de prueba", amount: usdc(20).toString(), at, receiptId: null, txHash: null, counterparty: "Faucet de Testnet" }],
    notices: [
      { id: "ntf_welcome", title: "Bienvenido a Tilcai Wallet", body: "Tu wallet está lista en Stellar Testnet. Fondea y conecta un agente para empezar.", at, read: false },
      { id: "ntf_request", title: "Codex pide más tope", body: "Codex · Portátil solicita subir su tope acumulado en 0,50 USDC para seguir comprando.", at, read: false, request: { extra: usdc(0, 50).toString(), status: "pending" } },
    ],
    agents: [
      // Los montos de Codex se leen del estado de su tarjeta (ver `agentsView`); aquí solo son el valor inicial.
      { id: codexAgentId, name: "Codex · Portátil", role: "Compra informes de mercado", icon: "agent", paused: false, linkedCard: true, card: "AG-7K2Q", limit: usdc(0, 50).toString(), spent: "0", maxPerPurchase: usdc(0, 50).toString() },
      { id: "agt_seo", name: "Agente SEO", role: "Compra datos de palabras clave", icon: "agent", paused: true, linkedCard: false, card: "SEO-T482", limit: usdc(50).toString(), spent: usdc(12).toString(), maxPerPurchase: usdc(5).toString() },
      { id: "agt_analytics", name: "Agente Analítica", role: "APIs, dashboards y reportes", icon: "bars", paused: false, linkedCard: false, card: "AN-114C", limit: usdc(50).toString(), spent: usdc(50).toString(), maxPerPurchase: usdc(10).toString() },
    ],
    sessions: [
      { id: "ses_codex", agentId: codexAgentId, title: "Informe de mercado", state: "active", startedAt: at },
      { id: "ses_seo", agentId: "agt_seo", title: "Compra de datos (Agente SEO)", state: "ended", startedAt: at },
    ],
    pairings: [],
    counter: 0,
  };
}

/** Lo que el agente aún puede gastar: nada si la tarjeta está congelada o la sesión terminó. */
export function available(store: Store): bigint {
  if (store.cardState !== "active" || store.sessionState !== "active") return 0n;
  return store.cap > store.spent ? store.cap - store.spent : 0n;
}

/** Estado que ve la persona: en pausa, con el tope agotado o activo. */
export function agentStatus(agent: Agent): AgentStatus {
  if (agent.paused) return "paused";
  if (agent.card === null) return "setup";
  return BigInt(agent.spent) >= BigInt(agent.limit) ? "limit" : "active";
}

/** Agentes con los montos de Codex tomados de su tarjeta, para que las dos pantallas coincidan. */
export const agentsView = (store: Store): Agent[] =>
  store.agents.map((agent) => (agent.id === codexAgentId ? { ...agent, limit: store.cap.toString(), spent: store.spent.toString() } : agent));

export const nextId = (store: Store, prefix: string) => `${prefix}_${++store.counter}`;
export const fakeHash = (seed: number) => Array.from({ length: 8 }, (_, i) => ((seed * 2654435761 + i * 40503) >>> 0).toString(16).padStart(8, "0")).join("");

export class LedgerError extends Error {}

export function fund(store: Store, amount: bigint, now: Date) {
  if (amount <= 0n) throw new LedgerError("El monto debe ser mayor que cero.");
  store.balance += amount;
  const id = nextId(store, "act");
  store.activity.unshift({ id, kind: "funding", label: "Fondeo desde faucet", amount: amount.toString(), at: now.toISOString(), receiptId: null, txHash: fakeHash(store.counter), counterparty: "Faucet de Testnet" });
  store.notices.unshift({ id: nextId(store, "ntf"), title: "Fondeo recibido", body: "Se acreditaron los fondos en tu wallet.", at: now.toISOString(), read: false });
  return id;
}

export function transfer(store: Store, to: string, amount: bigint, now: Date) {
  if (amount <= 0n) throw new LedgerError("El monto debe ser mayor que cero.");
  if (amount > store.balance) throw new LedgerError("Saldo insuficiente.");
  store.balance -= amount;
  const id = nextId(store, "act");
  store.activity.unshift({ id, kind: "transfer", label: "Transferencia enviada", amount: amount.toString(), at: now.toISOString(), receiptId: null, txHash: fakeHash(store.counter + 7), counterparty: to });
  return id;
}

/** El pago de 0,50 USDC del escenario de demo (el recibo enlaza a la transferencia real de Testnet). */
export function payAgent(store: Store, now: Date) {
  const amount = usdc(0, 50);
  if (store.activity.some((item) => item.kind === "payment")) return;
  store.balance -= amount;
  store.spent += amount;
  store.activity.unshift({ id: "act_payment", kind: "payment", label: "Informe de mercado", amount: amount.toString(), at: now.toISOString(), receiptId: demoReceiptIds.paid, txHash: null, counterparty: "Codex · Portátil" });
  store.notices.unshift({ id: nextId(store, "ntf"), title: "Pago de Codex confirmado", body: "Codex pagó 0,50 USDC por un informe de mercado.", at: now.toISOString(), read: false });
}

export function resolveRequest(store: Store, noticeId: string, approve: boolean) {
  const request = store.notices.find((notice) => notice.id === noticeId)?.request;
  if (!request || request.status !== "pending") throw new LedgerError("La solicitud ya fue resuelta.");
  request.status = approve ? "approved" : "rejected";
  if (approve) store.cap += BigInt(request.extra);
  const notice = store.notices.find((n) => n.id === noticeId)!;
  notice.read = true;
}

export const agentClients = {
  claude: { name: "Claude Code", role: "Agente de Anthropic para desarrollo y tareas" },
  codex: { name: "Codex", role: "Agente de OpenAI para desarrollo y automatización" },
} as const;
export type AgentClient = keyof typeof agentClients;

/** Vincula un agente nuevo: queda con acceso de lectura y sin tarjeta, o sea sin acceso a fondos. */
export function connectAgent(store: Store, client: string, alias: string, now: Date) {
  if (!Object.hasOwn(agentClients, client)) throw new LedgerError("Elige un cliente: Claude Code o Codex.");
  const name = cleanAlias(store, alias);
  const id = nextId(store, "agt");
  store.agents.push({ id, name, role: agentClients[client as AgentClient].role, icon: "laptop", paused: false, linkedCard: false, card: null, limit: "0", spent: "0", maxPerPurchase: "0" });
  store.notices.unshift({ id: nextId(store, "ntf"), title: "Agente conectado", body: `${name} quedó vinculado. Configura su tarjeta y límites para que pueda comprar.`, at: now.toISOString(), read: false });
  return id;
}

/** Activa la tarjeta de un agente recién conectado con su tope acumulado y su máximo por compra. */
export function configureAgentCard(store: Store, agentId: string, limit: bigint, maxPerPurchase: bigint, now: Date) {
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) throw new LedgerError("Agente desconocido.");
  if (agent.card !== null) throw new LedgerError("Este agente ya tiene una tarjeta.");
  if (limit <= 0n || maxPerPurchase <= 0n) throw new LedgerError("Los montos deben ser mayores que cero.");
  if (maxPerPurchase > limit) throw new LedgerError("El máximo por compra no puede superar el tope acumulado.");
  const suffix = ((++store.counter * 2654435761) >>> 0).toString(36).toUpperCase().slice(0, 4).padEnd(4, "0");
  agent.card = `AG-${suffix}`;
  agent.limit = limit.toString();
  agent.maxPerPurchase = maxPerPurchase.toString();
  store.notices.unshift({ id: nextId(store, "ntf"), title: "Tarjeta activada", body: `${agent.name} ya puede comprar dentro de sus límites.`, at: now.toISOString(), read: false });
}

const pairingTtlMs = 10 * 60_000;

/** Intento de vincular un agente: el código viaja en la URL o el token del cliente MCP. */
export type Pairing = { code: string; client: AgentClient; alias: string; createdAt: string; status: "waiting" | "connected" | "approved"; agentId?: string };

function cleanAlias(store: Store, alias: string) {
  const name = alias.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 30) throw new LedgerError("El alias debe tener entre 2 y 30 caracteres.");
  if (store.agents.some((agent) => agent.name.toLowerCase() === name.toLowerCase())) throw new LedgerError("Ya tienes un agente con ese alias.");
  return name;
}

/** Abre una vinculación pendiente (vence en 10 minutos). `replace` descarta la anterior si la persona vuelve atrás. */
export function createPairing(store: Store, client: string, alias: string, code: string, now: Date, replace?: string) {
  if (!Object.hasOwn(agentClients, client)) throw new LedgerError("Elige un cliente: Claude Code o Codex.");
  const name = cleanAlias(store, alias);
  store.pairings = store.pairings.filter((p) => p.code !== replace || p.status === "approved");
  store.pairings.push({ code, client: client as AgentClient, alias: name, createdAt: now.toISOString(), status: "waiting" });
  return code;
}

/** Busca una vinculación vigente: las aprobadas no vencen; las pendientes sí. */
export function findPairing(store: Store, code: string, now: Date) {
  store.pairings = store.pairings.filter((p) => p.status === "approved" || now.getTime() - new Date(p.createdAt).getTime() < pairingTtlMs);
  return store.pairings.find((p) => p.code === code);
}

export function approvePairing(store: Store, code: string, now: Date) {
  const pairing = findPairing(store, code, now);
  if (!pairing) throw new LedgerError("La conexión venció. Vuelve atrás para generar un código nuevo.");
  if (pairing.status !== "approved") {
    pairing.agentId = connectAgent(store, pairing.client, pairing.alias, now);
    pairing.status = "approved";
  }
  return pairing.agentId!;
}

export function rejectPairing(store: Store, code: string) {
  store.pairings = store.pairings.filter((p) => p.code !== code || p.status === "approved");
}

/** Compra solicitada por un agente conectado: respeta pausa, tarjeta, máximo por compra, tope acumulado y saldo. */
export function agentPurchase(store: Store, agentId: string, amount: bigint, label: string, now: Date) {
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) throw new LedgerError("Agente desconocido.");
  if (agent.paused) throw new LedgerError("El agente está en pausa: la persona dueña debe reanudarlo.");
  if (agent.card === null) throw new LedgerError("El agente no tiene tarjeta: no tiene acceso a fondos.");
  if (amount <= 0n) throw new LedgerError("El monto debe ser mayor que cero.");
  if (amount > BigInt(agent.maxPerPurchase)) throw new LedgerError("El monto supera el máximo por compra de esta tarjeta.");
  if (BigInt(agent.spent) + amount > BigInt(agent.limit)) throw new LedgerError("La compra superaría el tope acumulado de la tarjeta.");
  if (amount > store.balance) throw new LedgerError("La wallet no tiene saldo suficiente.");
  const description = label.trim().slice(0, 80) || "Compra del agente";
  store.balance -= amount;
  agent.spent = (BigInt(agent.spent) + amount).toString();
  const id = nextId(store, "act");
  store.activity.unshift({ id, kind: "payment", label: description, amount: amount.toString(), at: now.toISOString(), receiptId: null, txHash: fakeHash(store.counter + 13), counterparty: agent.name });
  store.notices.unshift({ id: nextId(store, "ntf"), title: `Pago de ${agent.name}`, body: `${agent.name} pagó ${amount / 10_000_000n},${(amount % 10_000_000n).toString().padStart(7, "0").slice(0, 2)} USDC: ${description}.`, at: now.toISOString(), read: false });
  return id;
}

export function setAgentPaused(store: Store, agentId: string, paused: boolean) {
  const agent = store.agents.find((a) => a.id === agentId);
  if (!agent) throw new LedgerError("Agente desconocido.");
  agent.paused = paused;
  if (agent.id === codexAgentId) store.cardState = paused ? "frozen" : "active";
}

export function setCodexSession(store: Store, active: boolean) {
  store.sessionState = active ? "active" : "ended";
  const session = store.sessions.find((s) => s.id === "ses_codex")!;
  session.state = store.sessionState;
}
