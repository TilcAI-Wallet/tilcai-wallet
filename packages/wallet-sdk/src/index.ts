import {
  apiErrorSchema,
  cardSchema,
  createOrderSchema,
  healthPath,
  healthSchema,
  idempotencyHeader,
  idempotencyKeySchema,
  orderSchema,
  receiptSchema,
  walletIdSchema,
  walletV1Routes,
  type CreateOrder,
  type Health,
  type WalletApiError,
} from "@tilcai-wallet/api-contracts";
import { localApiUrl } from "@tilcai-wallet/config";

export class WalletRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code?: WalletApiError["error"]["code"],
  ) {
    super(`Wallet API returned HTTP ${status}${code ? ` (${code})` : ""}`);
    this.name = "WalletRequestError";
  }
}

export function createWalletClient(baseUrl = localApiUrl, options: { accessToken?: string } = {}) {
  async function request<T>(path: string, schema: { parse(value: unknown): T }, init: RequestInit = {}) {
    if (!options.accessToken) throw new WalletRequestError(401, "unauthenticated");
    const url = new URL(path, baseUrl);
    if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "[::1]", "localhost"].includes(url.hostname))) {
      throw new Error("Wallet API requires HTTPS or a local loopback address");
    }
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${options.accessToken}`);
    headers.set("Accept", "application/json");
    const response = await fetch(url, {
      ...init,
      headers,
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      const parsed = apiErrorSchema.safeParse(await response.json().catch(() => null));
      throw new WalletRequestError(response.status, parsed.success ? parsed.data.error.code : undefined);
    }
    return schema.parse(await response.json());
  }

  return {
    async health(options: { signal?: AbortSignal } = {}): Promise<Health> {
      const response = await fetch(new URL(healthPath, baseUrl), {
        signal: options.signal,
      });
      if (!response.ok) {
        throw new Error(`Wallet API responded with HTTP ${response.status}`);
      }
      return healthSchema.parse(await response.json());
    },
    getCard(cardId: string) {
      return request(walletV1Routes.card(walletIdSchema.parse(cardId)), cardSchema);
    },
    createOrder(order: CreateOrder, idempotencyKey: string) {
      return request(walletV1Routes.orders, orderSchema, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [idempotencyHeader]: idempotencyKeySchema.parse(idempotencyKey),
        },
        body: JSON.stringify(createOrderSchema.parse(order)),
      });
    },
    getOrder(orderId: string) {
      return request(walletV1Routes.order(walletIdSchema.parse(orderId)), orderSchema);
    },
    getReceipt(receiptId: string) {
      return request(walletV1Routes.receipt(walletIdSchema.parse(receiptId)), receiptSchema);
    },
  };
}
