import { createHash, timingSafeEqual } from "node:crypto";

export const demoReportProviderId = "demo-report-provider";
export interface DeliveryRequest { orderId: string; offerId: string; paymentTxHash: string; ledger: number }
/** What a provider claims to have delivered. The worker verifies it independently. */
export interface DeliveredArtifact { providerId: string; evidenceId: string; digest: string; artifact: Buffer }
export interface DeliveryProvider { readonly id: string; deliver(request: DeliveryRequest): Promise<DeliveredArtifact> }

const sha256 = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

/** Test delivery of the demo report. It is only invoked after verified Testnet payment evidence. */
export class DemoReportProvider implements DeliveryProvider {
  readonly id = demoReportProviderId;
  async deliver(request: DeliveryRequest): Promise<DeliveredArtifact> {
    if (request.offerId !== "test-report") throw new Error("unsupported offer");
    const artifact = Buffer.from(JSON.stringify({
      kind: "tilcai-demo-report-v1", provider: this.id, orderId: request.orderId, offerId: request.offerId,
      paymentTxHash: request.paymentTxHash, ledger: request.ledger,
      title: "Informe de mercado de prueba", body: "Artefacto de demostración Testnet sin valor comercial.",
    }), "utf8");
    return { providerId: this.id, evidenceId: `dlv-${sha256(`${this.id}|${request.orderId}|${request.paymentTxHash}`).slice(0, 32)}`, digest: sha256(artifact), artifact };
  }
}

/** Recomputes the digest and checks the artifact is bound to this order and payment. */
export function verifyDeliveredArtifact(request: DeliveryRequest, delivered: DeliveredArtifact): { evidenceId: string; digest: string; bytes: number } {
  if (delivered.providerId !== demoReportProviderId) throw new Error("unexpected delivery provider");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(delivered.evidenceId) || !/^[0-9a-f]{64}$/.test(delivered.digest)) throw new Error("invalid delivery evidence");
  if (!Buffer.isBuffer(delivered.artifact) || delivered.artifact.length < 1 || delivered.artifact.length > 65536) throw new Error("invalid delivery artifact");
  if (!timingSafeEqual(Buffer.from(sha256(delivered.artifact), "hex"), Buffer.from(delivered.digest, "hex"))) throw new Error("delivery digest mismatch");
  let content: Record<string, unknown>;
  try { content = JSON.parse(delivered.artifact.toString("utf8")) as Record<string, unknown>; } catch { throw new Error("unreadable delivery artifact"); }
  if (content.kind !== "tilcai-demo-report-v1" || content.provider !== demoReportProviderId || content.orderId !== request.orderId ||
      content.offerId !== request.offerId || content.paymentTxHash !== request.paymentTxHash || content.ledger !== request.ledger)
    throw new Error("delivery artifact is not bound to this order and payment");
  return { evidenceId: delivered.evidenceId, digest: delivered.digest, bytes: delivered.artifact.length };
}
