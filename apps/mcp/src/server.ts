import { McpServer } from "@modelcontextprotocol/server";
import { serveStdio } from "@modelcontextprotocol/server/stdio";
import {
  cardSchema,
  createOrderSchema,
  idempotencyKeySchema,
  orderSchema,
  receiptSchema,
  walletIdSchema,
} from "@tilcai-wallet/api-contracts";
import { localApiUrl, projectVersion } from "@tilcai-wallet/config";
import { createWalletClient, WalletRequestError } from "@tilcai-wallet/wallet-sdk";
import { z } from "zod";

function createServer() {
  const server = new McpServer(
    { name: "tilcai-wallet", version: projectVersion },
    { capabilities: { tools: {} } },
  );
  const accessToken = process.env.WALLET_MCP_TOKEN;
  const card = walletIdSchema.safeParse(process.env.WALLET_MCP_CARD_ID);
  if (!accessToken || /\s/.test(accessToken) || !card.success) return server;

  const cardId = card.data;
  const wallet = createWalletClient(process.env.WALLET_API_URL || localApiUrl, { accessToken });

  async function respond<T extends { cardId: string }>(load: () => Promise<T>) {
    try {
      const data = await load();
      if (data.cardId !== cardId) throw new WalletRequestError(404, "not_found");
      return {
        structuredContent: { ...data },
        content: [{ type: "text" as const, text: JSON.stringify(data) }],
      };
    } catch (cause) {
      let code: string = "request_failed";
      if (cause instanceof WalletRequestError) code = cause.code ?? `http_${cause.status}`;
      return {
        isError: true,
        content: [{ type: "text" as const, text: code }],
      };
    }
  }

  server.registerTool("get_card", {
    description: "Read the balance, limits and available budget of the configured Testnet card.",
    inputSchema: z.strictObject({}),
    outputSchema: cardSchema,
    annotations: { readOnlyHint: true },
  }, () => respond(() => wallet.getCard(cardId)));

  server.registerTool("create_order", {
    description: "Make a Testnet purchase on the configured card. Set a maximum in minimum asset units. Reuse the same idempotency key for the same purchase when retrying.",
    inputSchema: createOrderSchema.omit({ cardId: true }).extend({ idempotencyKey: idempotencyKeySchema }),
    outputSchema: orderSchema,
    annotations: { destructiveHint: true, idempotentHint: true },
  }, ({ idempotencyKey, ...order }) => respond(() => wallet.createOrder({ ...order, cardId }, idempotencyKey)));

  server.registerTool("get_order", {
    description: "Read the status of an existing Testnet order and its receipt ID when available.",
    inputSchema: z.strictObject({ orderId: walletIdSchema }),
    outputSchema: orderSchema,
    annotations: { readOnlyHint: true },
  }, ({ orderId }) => respond(() => wallet.getOrder(orderId)));

  server.registerTool("get_receipt", {
    description: "Read the Testnet receipt with payment and provider delivery evidence.",
    inputSchema: z.strictObject({ receiptId: walletIdSchema }),
    outputSchema: receiptSchema,
    annotations: { readOnlyHint: true },
  }, ({ receiptId }) => respond(() => wallet.getReceipt(receiptId)));

  return server;
}

serveStdio(createServer);
