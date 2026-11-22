import Link from "next/link";
import { connection } from "next/server";
import { PauseAgentButton, ResumeAgentButton } from "@/components/actions";
import { Icon } from "@/components/Icon";
import { Page } from "@/components/ui";
import { agentStatus, type Agent, type AgentStatus } from "@/lib/ledger";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";

const pill: Record<AgentStatus, { label: string; style: string }> = {
  active: { label: "Activo", style: "bg-mint text-ink" },
  paused: { label: "En pausa", style: "bg-mist text-ink" },
  limit: { label: "Límite alcanzado", style: "bg-accent text-ink" },
  setup: { label: "Sin tarjeta", style: "border border-ivory/70 text-ivory" },
};
const action = "flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-xl";

function AgentCard({ agent }: { agent: Agent }) {
  const status = agentStatus(agent);
  const limit = BigInt(agent.limit);
  const percent = limit === 0n ? 100 : Math.min(100, Number((BigInt(agent.spent) * 100n) / limit));
  const detail = {
    active: `Gastado ${percent}% de ${formatUsdc(agent.limit)}`,
    paused: "Pausado por el usuario",
    limit: "Tope acumulado alcanzado",
    setup: "Sin acceso a fondos",
  }[status];

  return (
    <li className="flex flex-col gap-3 rounded-3xl border border-ivory/15 bg-surface p-4">
      <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
        <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent/20 text-accent">
          <Icon name={agent.icon} size={30} />
        </span>
        <div className="min-w-32 flex-1">
          <h2 className="text-xl leading-tight">{agent.name}</h2>
          <p className="text-sm text-muted">{agent.role}</p>
        </div>
        <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${pill[status].style}`}>
          {status === "active" && <span className="size-2 rounded-full bg-ink" />}
          {status === "paused" && <Icon name="pause" size={16} strokeWidth={2.6} />}
          {status === "limit" && <Icon name="alert" size={16} />}
          {status === "setup" && <Icon name="card" size={16} />}
          {pill[status].label}
        </span>
      </div>

      <div className="flex items-baseline justify-between gap-3">
        <p className="text-3xl whitespace-nowrap">{formatUsdc(agent.spent)}</p>
        <p className="text-right text-sm text-ivory/80">{detail}</p>
      </div>
      <div
        role="progressbar"
        aria-label={`Gasto de ${agent.name}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="h-3 overflow-hidden rounded-full bg-ivory/15"
      >
        <div className={`h-full rounded-full ${status === "active" ? "bg-mint" : "bg-accent"}`} style={{ width: `${percent}%` }} />
      </div>

      <p className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-ivory/85">
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Icon name="card" size={22} />
          Tarjeta: {agent.card ? <span className="font-data">{agent.card}</span> : "sin activar"}
        </span>
        <span className="flex items-center gap-2 whitespace-nowrap">
          <Icon name="layers" size={22} />
          {status === "setup" ? "Máx. por compra: sin definir" : status === "limit" ? `Uso: ${percent}% (límite: ${formatUsdc(agent.limit)})` : `Máx. por compra: ${formatUsdc(agent.maxPerPurchase)}`}
        </span>
      </p>

      {status === "paused" && <ResumeAgentButton agentId={agent.id} className={`${action} bg-accent text-ink`} />}
      {status === "setup" && (
        <Link href={`/wallet/agents/${agent.id}/card`} className={`${action} bg-accent text-ink`}>
          Configurar tarjeta
        </Link>
      )}
      {status === "limit" && (
        <Link href="/wallet/fund" className={`${action} bg-accent text-ink`}>
          <Icon name="wallet" size={26} />
          Fondear
        </Link>
      )}
      {status === "active" && (
        <>
          <Link href={agent.linkedCard ? "/wallet/cards" : "/wallet/activity"} className={`${action} bg-accent/20 text-accent`}>
            {agent.linkedCard ? "Ver tarjeta y límites" : "Ver actividad"}
            <Icon name="chevron" size={22} />
          </Link>
          <PauseAgentButton agentId={agent.id} name={agent.name} />
        </>
      )}
    </li>
  );
}

export default async function AgentsPage() {
  await connection();
  const agents = await wallet.agents();

  return (
    <Page>
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl tracking-tight">Agentes</h1>
          <p className="text-base text-muted">Administra tarjetas, límites y estado de compra de cada agente.</p>
        </div>
        <Link href="/wallet/agents/new" className="mt-1 flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-accent pr-5 pl-4 text-xl text-ink">
          <Icon name="add" size={22} strokeWidth={2.4} />
          Nuevo
        </Link>
      </header>
      <ul className="flex flex-col gap-4">
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </ul>
    </Page>
  );
}
