import { z } from "zod";
import {
  apiErrorSchema,
  cardSchema,
  createOrderSchema,
  idempotencyHeader,
  idempotencyKeySchema,
  orderSchema,
  receiptSchema,
  sessionSchema,
  walletIdSchema,
  walletV1Routes,
} from "./wallet-v1.js";

const mediaType = "application/json";

function json(name: string) {
  return { [mediaType]: { schema: { $ref: `#/components/schemas/${name}` } } };
}

function response(description: string, schema: string) {
  return { description, content: json(schema) };
}

const errorResponses = {
  400: response("Invalid request", "Error"),
  401: response("Authentication required", "Error"),
  403: response("Insufficient scope", "Error"),
  404: response("Resource not found or outside session", "Error"),
  429: response("Rate limited", "Error"),
  503: response("Service unavailable", "Error"),
};

function getById(base: string, name: string, schema: string) {
  return {
    [`${base}/{${name}}`]: {
      get: {
        parameters: [
          { name, in: "path", required: true, schema: z.toJSONSchema(walletIdSchema) },
        ],
        responses: { 200: response("Resource found", schema), ...errorResponses },
      },
    },
  };
}

const openapi = {
  openapi: "3.1.0",
  info: { title: "TilcAI Wallet Testnet API", version: "1.0.0" },
  security: [{ bearer: [] }],
  paths: {
    ...getById(walletV1Routes.sessions, "sessionId", "Session"),
    ...getById(walletV1Routes.cards, "cardId", "Card"),
    [walletV1Routes.orders]: {
      post: {
        parameters: [{
          in: "header",
          name: idempotencyHeader,
          required: true,
          schema: z.toJSONSchema(idempotencyKeySchema),
        }],
        requestBody: { required: true, content: json("CreateOrder") },
        responses: {
          200: response("Existing order for matching idempotency key", "Order"),
          202: response("Order accepted, payment may still be pending", "Order"),
          409: response("Limit exceeded or conflicting idempotency key", "Error"),
          ...errorResponses,
        },
      },
    },
    ...getById(walletV1Routes.orders, "orderId", "Order"),
    ...getById(walletV1Routes.receipts, "receiptId", "Receipt"),
  },
  components: {
    securitySchemes: { bearer: { type: "http", scheme: "bearer" } },
    schemas: {
      Session: z.toJSONSchema(sessionSchema),
      Card: z.toJSONSchema(cardSchema),
      CreateOrder: z.toJSONSchema(createOrderSchema, { io: "input" }),
      Order: z.toJSONSchema(orderSchema),
      Receipt: z.toJSONSchema(receiptSchema),
      Error: z.toJSONSchema(apiErrorSchema),
    },
  },
};

console.log(JSON.stringify(openapi, null, 2));
