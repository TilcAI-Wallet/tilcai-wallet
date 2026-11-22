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
export type Agent = { id: string; name: string; role: string; paused: boolean; linkedCard: boolean };
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
      { id: codexAgentId, name: "Codex · Portátil", role: "Compra informes de mercado", paused: false, linkedCard: true },
      { id: "agt_seo", name: "Agente SEO", role: "Compra de datos de palabras clave", paused: true, linkedCard: false },
    ],
    sessions: [
      { id: "ses_codex", agentId: codexAgentId, title: "Informe de mercado", state: "active", startedAt: at },
      { id: "ses_seo", agentId: "agt_seo", title: "Compra de datos (Agente SEO)", state: "ended", startedAt: at },
    ],
    counter: 0,
  };
}

/** Lo que el agente aún puede gastar: nada si la tarjeta está congelada o la sesión terminó. */
export function available(store: Store): bigint {
  if (store.cardState !== "active" || store.sessionState !== "active") return 0n;
  return store.cap > store.spent ? store.cap - store.spent : 0n;
}

const nextId = (store: Store, prefix: string) => `${prefix}_${++store.counter}`;
const fakeHash = (seed: number) => Array.from({ length: 8 }, (_, i) => ((seed * 2654435761 + i * 40503) >>> 0).toString(16).padStart(8, "0")).join("");

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
