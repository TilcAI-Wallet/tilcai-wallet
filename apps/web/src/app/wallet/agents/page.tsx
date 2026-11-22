import Link from "next/link";
import { connection } from "next/server";
import { AgentToggle } from "@/components/actions";
import { Icon } from "@/components/Icon";
import { Page, PageHeader } from "@/components/ui";
import { wallet } from "@/lib/wallet";

export default async function AgentsPage() {
  await connection();
  const agents = await wallet.agents();

  return (
    <Page>
      <PageHeader title="Agentes" back={null}>
        <p className="text-base text-muted">Pausa un agente en cualquier momento: dejará de poder comprar al instante.</p>
      </PageHeader>
      <ul className="flex flex-col gap-3">
        {agents.map((agent) => (
          <li key={agent.id} className="rounded-3xl border border-line bg-surface py-2">
            <div className="flex items-center gap-3 px-4 pt-2">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                <Icon name="agent" size={24} />
              </span>
              <div>
                <h2 className="text-xl">{agent.name}</h2>
                <p className="text-sm text-muted">{agent.role}</p>
              </div>
            </div>
            <AgentToggle agentId={agent.id} paused={agent.paused} name="Estado" />
            {agent.linkedCard && (
              <Link href="/wallet/cards" className="flex min-h-11 items-center px-4 text-accent">
                Ver su tarjeta y límites
              </Link>
            )}
          </li>
        ))}
      </ul>
      <Link href="/wallet/agents/new" className="flex min-h-12 items-center justify-center rounded-full bg-accent px-5 text-lg text-ink">
        Conectar un agente
      </Link>
    </Page>
  );
}
