import { connection } from "next/server";
import { SessionButton } from "@/components/actions";
import { StatusPill } from "@/components/StatusPill";
import { Page, PageHeader } from "@/components/ui";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";
import { demoCardId } from "@/lib/wallet-mock";

export default async function SessionsPage() {
  await connection();
  const [sessions, agents, card] = await Promise.all([wallet.sessions(), wallet.agents(), wallet.card(demoCardId)]);
  const cap = BigInt(card.cap);
  const percent = cap === 0n ? 0 : Number((BigInt(card.spent) * 100n) / cap);

  return (
    <Page>
      <PageHeader title="Sesiones" back={null}>
        <p className="text-base text-muted">Cada sesión es una ventana de compra con presupuesto para un agente.</p>
      </PageHeader>
      <ul className="flex flex-col gap-3">
        {sessions.map((session) => {
          const live = session.id === "ses_codex";
          const agent = agents.find((a) => a.id === session.agentId);
          return (
            <li key={session.id} className="flex flex-col gap-3 rounded-3xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{session.title}</h2>
                  <p className="text-sm text-muted">{agent?.name}</p>
                </div>
                <StatusPill tone={session.state === "active" ? "ok" : "wait"}>{session.state === "active" ? "En curso" : "Terminada"}</StatusPill>
              </div>
              {live && (
                <>
                  <div>
                    <div className="mb-1 flex justify-between text-base">
                      <span>Gastado {formatUsdc(card.spent)}</span>
                      <span className="text-muted">Tope {formatUsdc(card.cap)}</span>
                    </div>
                    <div role="progressbar" aria-label="Presupuesto usado" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-ivory/15">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-1 text-sm text-muted">Disponible para el agente: {formatUsdc(card.available)}</p>
                  </div>
                  <SessionButton active={session.state === "active"} />
                </>
              )}
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
