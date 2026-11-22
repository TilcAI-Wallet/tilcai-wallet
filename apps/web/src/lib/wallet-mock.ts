// Datos simulados de la PWA mientras no exista la Wallet API real.
// Las formas (Session, Card, Receipt) son las que pedirá la API: al integrarla, solo cambia `wallet.ts`.
// Importes en unidades atómicas (7 decimales, como Stellar), siempre como cadena.

export type CardState = "draft" | "active" | "freeze_pending" | "frozen" | "revocation_pending" | "revoked";
export type OrderState = "awaiting_budget" | "payment_pending" | "paid" | "delivered" | "failed";

export type Session = { owner: string; tenant: string; simulated: boolean };

export type Card = {
  id: string;
  name: string;
  state: CardState;
  network: "testnet" | "mainnet";
  asset: "USDC";
  /** Saldo confirmado de la subcuenta. */
  balance: string;
  /** Tope acumulado vigente. */
  cap: string;
  spent: string;
  /** Capacidad de gasto restante del agente (tope menos gastado). */
  available: string;
  activity: { id: string; kind: "funding" | "payment"; label: string; amount: string; at: string; receiptId: string | null }[];
  simulated: boolean;
};

// Pago y entrega evolucionan por separado (docs/persistence.md).
export type Receipt = {
  id: string;
  orderId: string;
  state: OrderState;
  description: string;
  amount: string;
  network: "testnet" | "mainnet";
  asset: "USDC";
  cardId: string;
  createdAt: string;
  payment: {
    state: "pending" | "confirmed" | "failed";
    txHash: string | null;
    ledger: number | null;
    explorerUrl: string | null;
  };
  delivery: {
    state: "pending" | "delivered" | "failed";
    provider: string;
    deliveryId: string | null;
    digest: string | null;
  };
  simulated: boolean;
};

export const demoCardId = "codex-portatil";
export const demoReceiptIds = {
  paid: "rcp_demo_paid",
  pending: "rcp_demo_pending",
  failed: "rcp_demo_failed",
  /** Simula una API caída para ver el estado de error. */
  error: "rcp_demo_error",
} as const;

// 1 USDC = 10_000_000 unidades atómicas.
const usdc = (value: string) => {
  const [whole = "0", fraction = ""] = value.split(".");
  return `${BigInt(whole) * 10_000_000n + BigInt(fraction.padEnd(7, "0"))}`;
};

export const demoSession: Session = { owner: "Jhamil Calixto", tenant: "Agencia piloto · La Paz", simulated: true };

const funding = {
  id: "act_funding",
  kind: "funding",
  label: "Fondeo de prueba",
  amount: usdc("20"),
  at: "2026-11-21T20:00:00.000Z",
  receiptId: null,
} as const;

const cardBase = {
  id: demoCardId,
  name: "Codex · Portátil",
  state: "active",
  network: "testnet",
  asset: "USDC",
  cap: usdc("0.50"),
  simulated: true,
} as const;

/** Antes del gasto: 20,00 en la subcuenta y 0,50 de capacidad para el agente. */
export const demoCardBefore: Card = {
  ...cardBase,
  balance: usdc("20"),
  spent: usdc("0"),
  available: usdc("0.50"),
  activity: [funding],
};

/** Después de pagar 0,50: quedan 19,50 y el agente no puede gastar más con este tope. */
export const demoCardAfter: Card = {
  ...cardBase,
  balance: usdc("19.50"),
  spent: usdc("0.50"),
  available: usdc("0"),
  activity: [
    {
      id: "act_payment",
      kind: "payment",
      label: "Informe de mercado",
      amount: usdc("0.50"),
      at: "2026-11-21T20:05:00.000Z",
      receiptId: demoReceiptIds.paid,
    },
    funding,
  ],
};

const receiptBase = {
  orderId: "ord_demo_1",
  description: "Informe de mercado",
  amount: usdc("0.50"),
  network: "testnet",
  asset: "USDC",
  cardId: demoCardId,
  createdAt: "2026-11-21T20:05:00.000Z",
  simulated: true,
} as const;

// El hash y el ledger son los de la transferencia real de 0,50 USDC en Testnet (PR #9 del repo).
// La orden y la entrega siguen simuladas hasta que exista el adaptador real.
const testnetTx = "0f624b09c43169743b81deacf956f3415dc5feef87ddb61fdd52f676a76143d8";

export const demoReceipts: Record<string, Receipt> = {
  [demoReceiptIds.paid]: {
    ...receiptBase,
    id: demoReceiptIds.paid,
    state: "delivered",
    payment: {
      state: "confirmed",
      txHash: testnetTx,
      ledger: 5859035,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${testnetTx}`,
    },
    delivery: {
      state: "delivered",
      provider: "Proveedor de prueba",
      deliveryId: "dlv_demo_1",
      digest: "sha256:9b74c9897bac770ffc029102a200c5de1f1f4cc2f0f4e6ac1c0b5e1d3a6c0f11",
    },
  },
  [demoReceiptIds.pending]: {
    ...receiptBase,
    id: demoReceiptIds.pending,
    orderId: "ord_demo_2",
    state: "payment_pending",
    payment: { state: "pending", txHash: null, ledger: null, explorerUrl: null },
    delivery: { state: "pending", provider: "Proveedor de prueba", deliveryId: null, digest: null },
  },
  [demoReceiptIds.failed]: {
    ...receiptBase,
    id: demoReceiptIds.failed,
    orderId: "ord_demo_3",
    state: "failed",
    payment: { state: "failed", txHash: null, ledger: null, explorerUrl: null },
    delivery: { state: "failed", provider: "Proveedor de prueba", deliveryId: null, digest: null },
  },
};
