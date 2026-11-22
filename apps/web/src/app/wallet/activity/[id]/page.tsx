import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { isOutgoing } from "@/components/ActivityRow";
import { Banner, Page, PageHeader } from "@/components/ui";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";
import { demoCardId } from "@/lib/wallet-mock";

const kinds = { funding: "Fondeo", transfer: "Transferencia enviada", payment: "Pago de agente" } as const;

export default async function ActivityDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const item = (await wallet.card(demoCardId)).activity.find((entry) => entry.id === id);
  if (!item) notFound();

  const rows: [string, string][] = [
    ["Tipo", kinds[item.kind]],
    ["Monto", `${isOutgoing(item) ? "−" : "+"}${formatUsdc(item.amount)}`],
    ["Fecha", new Date(item.at).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "long", timeStyle: "short" })],
    ["Red", "Stellar Testnet"],
    [item.kind === "funding" ? "Origen" : "Destino", item.counterparty ?? "—"],
  ];
  if (item.txHash) rows.push(["Hash", item.txHash]);

  return (
    <Page>
      <PageHeader title={item.label} back="/wallet/activity" />
      <Banner tone="ok">Completado</Banner>
      <dl className="divide-y divide-ivory/20 rounded-3xl border border-ivory/60 px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3">
            <dt className="text-base text-muted">{label}</dt>
            <dd className={`break-all text-right text-base ${/^[GS][A-Z2-7]{55}$|^[0-9a-f]{64}$|XLM/.test(value) ? "font-data" : ""}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {item.receiptId && (
        <Link href={`/receipts/${item.receiptId}`} className="flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-lg text-ink">
          Abrir recibo
        </Link>
      )}
    </Page>
  );
}
