import { connection } from "next/server";
import { DecideButtons, MarkAllRead } from "@/components/actions";
import { Page, PageHeader } from "@/components/ui";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";

const status = { approved: "Aprobada", rejected: "Rechazada" } as const;

export default async function NotificationsPage() {
  await connection();
  const notices = await wallet.notices();
  const unread = notices.filter((notice) => !notice.read).length;

  return (
    <Page>
      <PageHeader title="Notificaciones" back="/wallet">
        <p className="text-base text-muted">{unread ? `${unread} sin leer` : "Estás al día."}</p>
      </PageHeader>
      {unread > 0 && <MarkAllRead />}
      <ul className="flex flex-col gap-3">
        {notices.map((notice) => (
          <li key={notice.id} className={`flex flex-col gap-2 rounded-3xl border p-4 ${notice.read ? "border-line bg-surface" : "border-accent bg-accent/10"}`}>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl">{notice.title}</h2>
              {!notice.read && <span className="rounded-full bg-mint px-2.5 py-0.5 text-sm text-ink">Nueva</span>}
            </div>
            <p className="text-base text-ivory/80">{notice.body}</p>
            <p className="text-sm text-muted">{new Date(notice.at).toLocaleString("es-BO", { timeZone: "America/La_Paz", dateStyle: "short", timeStyle: "short" })}</p>
            {notice.request?.status === "pending" && (
              <>
                <p className="text-base">Aumento solicitado: +{formatUsdc(notice.request.extra)}</p>
                <DecideButtons noticeId={notice.id} />
              </>
            )}
            {notice.request && notice.request.status !== "pending" && (
              <p className="w-fit rounded-full border border-ivory px-3 py-1 text-sm">{status[notice.request.status]}</p>
            )}
          </li>
        ))}
      </ul>
    </Page>
  );
}
