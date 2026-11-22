import Link from "next/link";
import { formatUsdc } from "@/lib/money";
import type { Card } from "@/lib/wallet-mock";
import { Icon } from "./Icon";

type Item = Card["activity"][number];
const icons = { payment: "coins", funding: "card", transfer: "send" } as const;
export const isOutgoing = (item: Item) => item.kind !== "funding";

/** Fila de actividad: icono, descripción, importe y estado (siempre con texto). */
export function ActivityRow({ item }: { item: Item }) {
  const body = (
    <>
      <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent">
        <Icon name={icons[item.kind]} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-base">{item.label}</span>
        <span className="text-sm text-muted">
          {new Date(item.at).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "short" })}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1">
        <span className="text-base">
          {isOutgoing(item) ? "−" : "+"}
          {formatUsdc(item.amount)}
        </span>
        <span className="rounded-full bg-mint px-2.5 py-0.5 text-sm text-ink">Completado</span>
      </span>
    </>
  );
  const style = "flex min-h-16 items-center gap-3 rounded-2xl border border-line bg-surface p-3";
  return (
    <Link href={item.receiptId ? `/receipts/${item.receiptId}` : `/wallet/activity/${item.id}`} className={`${style} active:bg-ivory/10`}>
      {body}
    </Link>
  );
}
