// Lectura del recibo real desde la Wallet API v1 (mismo receiptId que el SDK y el MCP).
// Solo se usa en el servidor; el token nunca llega al navegador.
import type { OrderState, Receipt } from "./wallet-mock.ts";

export class WalletApiError extends Error {
  constructor(readonly status: number) {
    super(`Wallet API respondió HTTP ${status}`);
  }
}

const hex64 = /^[0-9a-f]{64}$/;
const walletId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const amount = /^[1-9][0-9]{0,38}$/;
const asRecord = (value: unknown): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("Recibo inválido");
  return value as Record<string, unknown>;
};

/** Convierte el recibo del contrato v1 a la vista de la PWA sin inventar datos. */
export function receiptFromApi(input: unknown): Receipt {
  const receipt = asRecord(input);
  const payment = asRecord(receipt.payment);
  const delivery = asRecord(receipt.delivery);
  if (
    (receipt.mode !== "fixture" && receipt.mode !== "testnet") || receipt.network !== "testnet" ||
    typeof receipt.receiptId !== "string" || !walletId.test(receipt.receiptId) ||
    typeof receipt.orderId !== "string" || !walletId.test(receipt.orderId) ||
    typeof receipt.cardId !== "string" || !walletId.test(receipt.cardId) ||
    typeof receipt.amountMinor !== "string" || !amount.test(receipt.amountMinor)
  ) throw new Error("Recibo inválido");
  const confirmed = payment.status === "confirmed";
  if (confirmed && (typeof payment.txHash !== "string" || !hex64.test(payment.txHash) || !Number.isSafeInteger(payment.ledger))) throw new Error("Recibo inválido");
  if (!["not_submitted", "pending", "confirmed", "failed"].includes(payment.status as string)) throw new Error("Recibo inválido");
  const delivered = delivery.status === "delivered";
  if (delivered && (typeof delivery.providerId !== "string" || typeof delivery.evidenceId !== "string" || typeof delivery.digest !== "string" || !hex64.test(delivery.digest))) throw new Error("Recibo inválido");
  if (!["pending", "delivered", "failed"].includes(delivery.status as string)) throw new Error("Recibo inválido");
  const simulated = receipt.mode === "fixture";
  const state: OrderState = payment.status === "failed" ? "failed" : delivered ? "delivered" : confirmed ? "paid" : "payment_pending";
  return {
    id: receipt.receiptId,
    orderId: receipt.orderId,
    state,
    description: "Compra del agente",
    amount: receipt.amountMinor,
    network: "testnet",
    asset: "USDC",
    cardId: receipt.cardId,
    createdAt: null,
    payment: {
      state: confirmed ? "confirmed" : payment.status === "failed" ? "failed" : "pending",
      txHash: confirmed ? (payment.txHash as string) : null,
      ledger: confirmed ? (payment.ledger as number) : null,
      // Un hash de fixture no existe en Stellar: no se enlaza al explorador.
      explorerUrl: confirmed && !simulated ? `https://stellar.expert/explorer/testnet/tx/${payment.txHash as string}` : null,
    },
    delivery: {
      state: delivered ? "delivered" : delivery.status === "failed" ? "failed" : "pending",
      provider: delivered ? (delivery.providerId as string) : "demo-report-provider",
      deliveryId: delivered ? (delivery.evidenceId as string) : null,
      digest: delivered ? (delivery.digest as string) : null,
    },
    simulated,
  };
}

export async function fetchReceipt(baseUrl: string, token: string, receiptId: string): Promise<Receipt> {
  if (!walletId.test(receiptId)) throw new WalletApiError(404);
  const url = new URL(`/v1/receipts/${encodeURIComponent(receiptId)}`, baseUrl);
  const loopback = ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) throw new Error("La Wallet API requiere HTTPS o loopback");
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new WalletApiError(response.status);
  return receiptFromApi(await response.json());
}
