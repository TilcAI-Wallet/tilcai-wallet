import Link from "next/link";
import { connection } from "next/server";
import { ActivityRow, isOutgoing } from "@/components/ActivityRow";
import { Page, PageHeader } from "@/components/ui";
import { wallet } from "@/lib/wallet";
import { demoCardId } from "@/lib/wallet-mock";

const filters = [
  { id: "all", label: "Todo" },
  { id: "in", label: "Entradas" },
  { id: "out", label: "Salidas" },
] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await connection();
  const { f } = await searchParams;
  const filter = filters.find((item) => item.id === f)?.id ?? "all";
  const card = await wallet.card(demoCardId);
  const items = card.activity.filter((item) => filter === "all" || (filter === "out") === isOutgoing(item));

  return (
    <Page>
      <PageHeader title="Actividad" back={null} />
      <nav aria-label="Filtros" className="flex gap-2">
        {filters.map((item) => (
          <Link
            key={item.id}
            href={`/wallet/activity?f=${item.id}`}
            aria-current={filter === item.id ? "true" : undefined}
            className={`flex min-h-11 items-center rounded-full border px-4 text-base ${filter === item.id ? "border-accent bg-accent text-ink" : "border-ivory/50"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <p className="rounded-2xl border border-line p-4 text-base text-muted">No hay movimientos en este filtro todavía.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <ActivityRow item={item} />
            </li>
          ))}
        </ul>
      )}
    </Page>
  );
}
