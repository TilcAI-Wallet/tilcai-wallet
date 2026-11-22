import { agentsView, available, createStore, payAgent, type Agent, type AgentSession, type Notice, type Store } from "./ledger.ts";
import { demoCardId, demoReceiptIds, demoReceipts, type Card, type Receipt, type Session } from "./wallet-mock.ts";

export class WalletNotFoundError extends Error {}

// Estado del demo en el servidor; `globalThis` lo comparte entre rutas, páginas y acciones en dev.
const shared = globalThis as typeof globalThis & { __tilcaiStore?: Store };
export const store = (): Store => (shared.__tilcaiStore ??= createStore());
export const resetDemo = () => void (shared.__tilcaiStore = createStore());
/** Para `POST /api/mock/pay|reset`: lleva la tarjeta de "antes" a "después" del pago de 0,50 USDC. */
export function setDemoPaid(paid: boolean) {
  if (paid) payAgent(store(), new Date("2026-11-21T20:05:00.000Z"));
  else resetDemo();
}

// shortcut: cliente simulado en memoria (se pierde al reiniciar y no escala a varias instancias). Al existir la
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
