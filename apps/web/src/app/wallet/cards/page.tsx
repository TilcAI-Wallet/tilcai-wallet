import Link from "next/link";
import { connection } from "next/server";
import { ActivityRow } from "@/components/ActivityRow";
import { FreezeButton } from "@/components/actions";
import { StatusPill } from "@/components/StatusPill";
import { Page, PageHeader } from "@/components/ui";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";
import { demoCardId, demoReceiptIds } from "@/lib/wallet-mock";

const cardStates = {
  draft: "Borrador",
  active: "Activa",
  freeze_pending: "Congelando",
  frozen: "Congelada",
  revocation_pending: "Revocando",
  revoked: "Revocada",
} as const;

export default async function Cards() {
  await connection();
  const [session, card] = await Promise.all([wallet.session(), wallet.card(demoCardId)]);
  const lastReceipt = card.activity.find((item) => item.receiptId);

  return (
    <Page>
      <PageHeader title="Tarjetas" back="/wallet">
        <p className="text-base text-muted">
          {session.owner} · {session.tenant}
        </p>
      </PageHeader>

      <section className="rounded-3xl border border-line bg-surface p-5" aria-labelledby="card-name">
        <div className="flex items-center justify-between gap-3">
          <h2 id="card-name" className="text-2xl">
            {card.name}
          </h2>
          <StatusPill tone={card.state === "active" ? "ok" : "wait"}>{cardStates[card.state]}</StatusPill>
        </div>
        <p className="mt-6 text-base text-muted">Saldo confirmado</p>
        <p className="text-5xl tracking-tight">{formatUsdc(card.balance)}</p>
        <p className="mt-1 text-sm text-muted">Stellar {card.network === "testnet" ? "Testnet" : "Mainnet"}</p>
        {lastReceipt && (
          <Link href={`/receipts/${lastReceipt.receiptId}`} className="mt-5 flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-base text-ink">
            Revisar último recibo
          </Link>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-2">
        <Figure label="Disponible para el agente" amount={card.available} wide />
        <Figure label="Tope" amount={card.cap} />
        <Figure label="Gastado" amount={card.spent} />
      </dl>

      <FreezeButton frozen={card.state === "frozen"} />

      <section aria-labelledby="activity">
        <h2 id="activity" className="mb-2 text-2xl">
          Actividad
        </h2>
        <ul className="flex flex-col gap-2">
          {card.activity.map((item) => (
            <li key={item.id}>
              <ActivityRow item={item} />
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="states">
        <h2 id="states" className="mb-2 text-xl">
          Otros estados de prueba
        </h2>
        <div className="flex gap-2">
          <Link href={`/receipts/${demoReceiptIds.pending}`} className="flex min-h-12 items-center rounded-full border border-line px-3">
            <StatusPill tone="wait">Orden pendiente</StatusPill>
          </Link>
          <Link href={`/receipts/${demoReceiptIds.failed}`} className="flex min-h-12 items-center rounded-full border border-line px-3">
            <StatusPill tone="bad">Pago fallido</StatusPill>
          </Link>
        </div>
      </section>
    </Page>
  );
}

function Figure({ label, amount, wide }: { label: string; amount: string; wide?: boolean }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface p-3 ${wide ? "col-span-2" : ""}`}>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={wide ? "mt-1 text-3xl" : "mt-1 text-xl"}>{formatUsdc(amount)}</dd>
    </div>
  );
}
