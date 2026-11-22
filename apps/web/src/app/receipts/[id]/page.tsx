import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";

import { AutoRefresh } from "@/components/AutoRefresh";
import { StatusPill } from "@/components/StatusPill";
import { formatUsdc } from "@/lib/money";
import { WalletNotFoundError, wallet } from "@/lib/wallet";

const payment = {
  not_submitted: ["wait", "Pago no enviado"],
  pending: ["wait", "Pago pendiente"],
  confirmed: ["ok", "Pago confirmado"],
  failed: ["bad", "Pago fallido"],
} as const;
const delivery = {
  pending: ["wait", "Entrega pendiente"],
  delivered: ["ok", "Entregado"],
  failed: ["bad", "Entrega fallida"],
} as const;

const section = "flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const receipt = await wallet.receipt(id).catch((error: unknown) => {
    if (error instanceof WalletNotFoundError) notFound();
    throw error;
  });
  const [payTone, payLabel] = payment[receipt.payment.state];
  const [delTone, delLabel] = delivery[receipt.delivery.state];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      {receipt.state === "payment_pending" && <AutoRefresh />}
      <Link href="/wallet/cards" className="flex min-h-11 items-center text-accent">
        ← Tarjeta
      </Link>
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl tracking-tight">{receipt.description}</h1>
        <p className="text-3xl">{formatUsdc(receipt.amount)}</p>
      </header>

      <section className={section} aria-labelledby="pay">
        <div className="flex items-center justify-between">
          <h2 id="pay">
            Pago
          </h2>
          <StatusPill tone={payTone}>{payLabel}</StatusPill>
        </div>
        {receipt.payment.txHash ? (
          <>
            <p className="break-all text-sm text-muted">
              {receipt.simulated ? "Hash (simulado) " : ""}
              {receipt.payment.txHash}
            </p>
            <p className="text-sm text-muted">
              {receipt.simulated ? "Ledger (simulado) " : "Ledger "}
              {receipt.payment.ledger}
            </p>
            {receipt.payment.explorerUrl && (
              <a
                href={receipt.payment.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 items-center justify-center rounded-full bg-accent px-4 text-ink"
              >
                Ver transacción en Stellar Expert
              </a>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">
            {receipt.payment.state === "pending"
              ? "Esperando confirmación de Stellar."
              : receipt.payment.state === "not_submitted"
                ? "El pago aún no se envió a Stellar."
                : "No se registró ninguna transacción."}
          </p>
        )}
      </section>

      <section className={section} aria-labelledby="delivery">
        <div className="flex items-center justify-between">
          <h2 id="delivery">
            Entrega
          </h2>
          <StatusPill tone={delTone}>{delLabel}</StatusPill>
        </div>
        <p className="text-sm text-muted">Evidencia del proveedor: {receipt.delivery.provider}</p>
        {receipt.delivery.deliveryId && <p className="text-sm">ID de entrega: {receipt.delivery.deliveryId}</p>}
        {receipt.delivery.digest && <p className="break-all text-sm text-muted">{receipt.delivery.digest}</p>}
      </section>

      <p className="text-sm text-muted">
        Orden {receipt.orderId} · Stellar {receipt.network === "testnet" ? "Testnet" : "Mainnet"}
      </p>
    </main>
  );
}
