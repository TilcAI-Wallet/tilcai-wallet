import Link from "next/link";
import { connection } from "next/server";
import { demoCardId, demoReceiptIds } from "@/lib/wallet-mock";
import { projectName } from "@tilcai-wallet/config";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { StatusPill } from "@/components/StatusPill";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";

const cardStates = {
  draft: "Borrador",
  active: "Activa",
  freeze_pending: "Congelando",
  frozen: "Congelada",
  revocation_pending: "Revocando",
  revoked: "Revocada",
} as const;

const rowStyle = "flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3";

export default async function Home() {
  await connection();
  const [session, card] = await Promise.all([wallet.session(), wallet.card(demoCardId)]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
      <header className="flex flex-col gap-2">
        <p className="font-semibold text-accent">{projectName}</p>
        <p className="text-sm text-muted">
          {session.owner} · {session.tenant}
        </p>
        <div>
          <SimulatedBadge simulated={session.simulated || card.simulated} />
        </div>
      </header>

      <section className="rounded-3xl bg-accent p-5 text-white" aria-labelledby="card-name">
        <div className="flex items-center justify-between gap-3">
          <h1 id="card-name" className="text-lg font-semibold">
            {card.name}
          </h1>
          <span className="rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold">{cardStates[card.state]}</span>
        </div>
        <p className="mt-6 text-sm text-white/80">Saldo confirmado</p>
        <p className="text-3xl font-semibold tracking-tight">{formatUsdc(card.balance)}</p>
        <p className="mt-1 text-xs text-white/70">Stellar {card.network === "testnet" ? "Testnet" : "Mainnet"}</p>
      </section>

      <dl className="grid grid-cols-3 gap-2 text-sm">
        <Figure label="Tope" amount={card.cap} />
        <Figure label="Gastado" amount={card.spent} />
        <Figure label="Disponible para el agente" amount={card.available} />
      </dl>

      <section aria-labelledby="activity">
        <h2 id="activity" className="mb-2 font-semibold">
          Actividad
        </h2>
        <ul className="flex flex-col gap-2">
          {card.activity.map((item) => {
            const row = (
              <>
                <span className="flex flex-col">
                  <span className="font-medium">{item.label}</span>
                  <span className="text-xs text-muted">{new Date(item.at).toLocaleString("es-BO", { timeZone: "America/La_Paz" })}</span>
                </span>
                <span className="font-semibold">
                  {item.kind === "payment" ? "−" : "+"}
                  {formatUsdc(item.amount)}
                </span>
              </>
            );
            return (
              <li key={item.id}>
                {item.receiptId ? (
                  <Link href={`/receipts/${item.receiptId}`} className={`${rowStyle} active:bg-white`}>
                    {row}
                  </Link>
                ) : (
                  <div className={rowStyle}>{row}</div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {card.simulated && (
        <section aria-labelledby="states" className="text-sm">
          <h2 id="states" className="mb-2 font-semibold">
            Otros estados de prueba
          </h2>
          <div className="flex gap-2">
            <Link href={`/receipts/${demoReceiptIds.pending}`} className="flex min-h-11 items-center rounded-full border border-line px-4">
              <StatusPill tone="wait">Orden pendiente</StatusPill>
            </Link>
            <Link href={`/receipts/${demoReceiptIds.failed}`} className="flex min-h-11 items-center rounded-full border border-line px-4">
              <StatusPill tone="bad">Pago fallido</StatusPill>
            </Link>
          </div>
        </section>
      )}
    </main>
  );
}

function Figure({ label, amount }: { label: string; amount: string }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 font-semibold">{formatUsdc(amount)}</dd>
    </div>
  );
}
