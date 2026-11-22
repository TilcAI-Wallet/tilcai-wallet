import {
  demoCardAfter,
  demoCardBefore,
  demoCardId,
  demoReceiptIds,
  demoReceipts,
  demoSession,
  type Card,
  type Receipt,
  type Session,
} from "./wallet-mock";

export class WalletNotFoundError extends Error {}

// Estado del demo en el servidor; `globalThis` lo comparte entre rutas y páginas en dev.
const demo = globalThis as typeof globalThis & { __tilcaiPaid?: boolean };
export const setDemoPaid = (paid: boolean) => void (demo.__tilcaiPaid = paid);

// shortcut: cliente simulado. Al existir la Wallet API, reemplazar este objeto por llamadas
// a wallet-sdk (mismos métodos y tipos) sin tocar las páginas.
export const wallet = {
  async session(): Promise<Session> {
    return demoSession;
  },
  async card(id: string): Promise<Card> {
    if (id !== demoCardId) throw new WalletNotFoundError();
    return demo.__tilcaiPaid ? demoCardAfter : demoCardBefore;
  },
  async receipt(id: string): Promise<Receipt> {
    if (id === demoReceiptIds.error) throw new Error("API de prueba caída");
    if (!Object.hasOwn(demoReceipts, id)) throw new WalletNotFoundError();
    return demoReceipts[id]!;
  },
};
