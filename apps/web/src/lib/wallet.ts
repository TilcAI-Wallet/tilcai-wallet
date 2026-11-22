import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { agentsView, available, createStore, payAgent, type Agent, type AgentSession, type Notice, type Store } from "./ledger.ts";
import { demoCardId, demoReceiptIds, demoReceipts, type Card, type Receipt, type Session } from "./wallet-mock.ts";
import { fetchReceipt, WalletApiError } from "./wallet-api.ts";

export class WalletNotFoundError extends Error {}

// Estado del demo en el servidor. Vive en memoria (`globalThis`, compartido entre rutas, páginas y acciones) y se guarda
// en `.data/store.json` tras cada cambio, para que reiniciar el servidor no borre agentes, saldos ni actividad.
// shortcut: un archivo local sirve para una demo de un solo servidor; con la Wallet API el estado vive en su base de datos.
const shared = globalThis as typeof globalThis & { __tilcaiStore?: Store; __tilcaiStamp?: number };
const file = join(process.cwd(), ".data", "store.json");
const encode = (_key: string, value: unknown) => (typeof value === "bigint" ? { __bigint: value.toString() } : value);
const decode = (_key: string, value: unknown) =>
  value && typeof value === "object" && "__bigint" in value ? BigInt((value as { __bigint: string }).__bigint) : value;

export function store(): Store {
  try {
    const stamp = statSync(file).mtimeMs;
    // Recarga si otro proceso o un reinicio escribió un archivo más nuevo que lo que tenemos en memoria.
    if (!shared.__tilcaiStore || stamp > (shared.__tilcaiStamp ?? 0)) {
      shared.__tilcaiStore = JSON.parse(readFileSync(file, "utf8"), decode) as Store;
      shared.__tilcaiStamp = stamp;
    }
  } catch {
    shared.__tilcaiStore ??= createStore(); // todavía no hay archivo guardado, o está dañado
  }
  const current = shared.__tilcaiStore!;
  current.pairings ??= []; // un estado guardado antes de existir las vinculaciones
  const themes = ["accent", "ivory", "ink"] as const;
  current.agents.forEach((agent, index) => {
    const inferred = agent.id === "agt_codex" || agent.role.includes("OpenAI") ? "chatgpt" : agent.role.includes("Anthropic") ? "claude" : undefined;
    agent.brand = inferred ?? agent.brand ?? "tilcai"; // estado guardado antes de existir las tarjetas con logo
    agent.theme ??= themes[index % 3]!;
  });
  return current;
}

/** Guarda el estado actual en disco; se llama después de cada cambio. */
export function commit() {
  try {
    mkdirSync(join(process.cwd(), ".data"), { recursive: true });
    writeFileSync(file, JSON.stringify(store(), encode));
    shared.__tilcaiStamp = statSync(file).mtimeMs;
  } catch {
    // Sin disco escribible la demo sigue funcionando en memoria.
  }
}

export function resetDemo() {
  shared.__tilcaiStore = createStore();
  commit();
}
/** Para `POST /api/mock/pay|reset`: lleva la tarjeta de "antes" a "después" del pago de 0,50 USDC. */
export function setDemoPaid(paid: boolean) {
  if (paid) {
    payAgent(store(), new Date("2026-11-21T20:05:00.000Z"));
    commit();
  } else resetDemo();
}

// shortcut: cliente simulado sobre un archivo local (no escala a varias instancias). Al existir la
// Wallet API, reemplazar este objeto por llamadas a wallet-sdk (mismos métodos y tipos) sin tocar las páginas.
export const wallet = {
  async session(): Promise<Session> {
    return { owner: store().ownerName, tenant: "Agencia piloto · La Paz", simulated: true };
  },
  async card(id: string): Promise<Card> {
    if (id !== demoCardId) throw new WalletNotFoundError();
    const s = store();
    return {
      id: demoCardId,
      name: "Codex · Portátil",
      state: s.cardState,
      network: "testnet",
      asset: "USDC",
      balance: s.balance.toString(),
      cap: s.cap.toString(),
      spent: s.spent.toString(),
      available: available(s).toString(),
      activity: s.activity,
      simulated: true,
    };
  },
  async receipt(id: string): Promise<Receipt> {
    // Con WALLET_API_URL y WALLET_API_TOKEN (solo servidor) el recibo viene de la Wallet API real.
    const apiUrl = process.env.WALLET_API_URL, apiToken = process.env.WALLET_API_TOKEN;
    if (apiUrl && apiToken) {
      return fetchReceipt(apiUrl, apiToken, id).catch((error: unknown) => {
        if (error instanceof WalletApiError && (error.status === 404 || error.status === 400)) throw new WalletNotFoundError();
        throw error;
      });
    }
    if (id === demoReceiptIds.error) throw new Error("API de prueba caída");
    if (!Object.hasOwn(demoReceipts, id)) throw new WalletNotFoundError();
    return demoReceipts[id]!;
  },
  async notices(): Promise<Notice[]> {
    return store().notices;
  },
  async agents(): Promise<Agent[]> {
    return agentsView(store());
  },
  async sessions(): Promise<AgentSession[]> {
    return store().sessions;
  },
};
