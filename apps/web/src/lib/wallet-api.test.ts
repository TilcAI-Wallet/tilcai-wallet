import { deepEqual, equal, rejects, throws } from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import { test } from "node:test";
import { fetchReceipt, receiptFromApi, WalletApiError } from "./wallet-api.ts";

const testnetReceipt = {
  mode: "testnet", receiptId: "receipt-1", orderId: "order-1", sessionId: "session-1", cardId: "card-1", network: "testnet",
  assetContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
  sourceAddress: "CDCSGJZCHL5SOYURXLZ6YZQGWIOFN3FDREKJ27LGPPPCFJRIPPLIVLT6",
  recipientAddress: "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX", amountMinor: "5000000",
  payment: { status: "confirmed", txHash: "a".repeat(64), ledger: 110 },
  delivery: { status: "delivered", providerId: "demo-report-provider", evidenceId: "dlv-1", digest: "b".repeat(64) },
  refundStatus: "none",
};

test("a Testnet API receipt keeps payment and delivery evidence separate and is not simulated", () => {
  const receipt = receiptFromApi(testnetReceipt);
  equal(receipt.id, "receipt-1");
  equal(receipt.state, "delivered");
  equal(receipt.simulated, false);
  deepEqual(receipt.payment, { state: "confirmed", txHash: "a".repeat(64), ledger: 110, explorerUrl: `https://stellar.expert/explorer/testnet/tx/${"a".repeat(64)}` });
  deepEqual(receipt.delivery, { state: "delivered", provider: "demo-report-provider", deliveryId: "dlv-1", digest: "b".repeat(64) });
});

test("fixture receipts stay simulated and unsubmitted payments never show a hash", () => {
  const fixture = receiptFromApi({ ...testnetReceipt, mode: "fixture", sourceAddress: null, delivery: { status: "pending" } });
  equal(fixture.simulated, true);
  equal(fixture.payment.explorerUrl, null);
  equal(fixture.state, "paid");
  const pending = receiptFromApi({ ...testnetReceipt, payment: { status: "not_submitted" }, delivery: { status: "pending" } });
  deepEqual([pending.state, pending.payment.state, pending.payment.txHash], ["payment_pending", "not_submitted", null]);
  const submitted = receiptFromApi({ ...testnetReceipt, payment: { status: "pending", txHash: "c".repeat(64) }, delivery: { status: "pending" } });
  deepEqual([submitted.state, submitted.payment.state, submitted.payment.explorerUrl], ["payment_pending", "pending", null]);
  throws(() => receiptFromApi({ ...testnetReceipt, mode: "fixture", sourceAddress: null }), /inválido/);
  throws(() => receiptFromApi({ ...testnetReceipt, payment: { status: "confirmed" } }));
  throws(() => receiptFromApi({ ...testnetReceipt, delivery: { status: "delivered", providerId: "demo-report-provider" } }));
  throws(() => receiptFromApi({ ...testnetReceipt, mode: "mainnet" }));
});

test("the PWA reads the same receiptId from a test API server with its bearer token", async (context) => {
  const token = "pwa-test-token";
  const server = createServer((request, response) => {
    response.setHeader("Content-Type", "application/json");
    if (request.headers.authorization !== `Bearer ${token}`) { response.writeHead(401).end('{"error":{"code":"unauthenticated"}}'); return; }
    if (request.url === "/v1/receipts/receipt-1") { response.end(JSON.stringify(testnetReceipt)); return; }
    response.writeHead(404).end('{"error":{"code":"not_found"}}');
  });
  server.listen(0, "127.0.0.1");
  context.after(() => server.close());
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an HTTP port");
  const base = `http://127.0.0.1:${address.port}`;
  equal((await fetchReceipt(base, token, "receipt-1")).payment.txHash, "a".repeat(64));
  await rejects(() => fetchReceipt(base, token, "missing"), (error: unknown) => error instanceof WalletApiError && error.status === 404);
  await rejects(() => fetchReceipt(base, "wrong-token", "receipt-1"), (error: unknown) => error instanceof WalletApiError && error.status === 401);
  await rejects(() => fetchReceipt("http://wallet.example", token, "receipt-1"), /HTTPS/);
});
