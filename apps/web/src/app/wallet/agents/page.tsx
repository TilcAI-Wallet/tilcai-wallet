import Link from "next/link";
import { connection } from "next/server";
import { AgentWallet } from "@/components/AgentWallet";
import { Icon } from "@/components/Icon";
import { Page } from "@/components/ui";
import { loadAgents } from "@/lib/agent-data";

export default async function AgentsPage() {
  await connection();
  const items = await loadAgents();

  return (
    <Page>
      <header className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-4xl tracking-tight">Agentes</h1>
          <p className="text-base text-muted">Una tarjeta por agente, con sus límites y su estado de compra.</p>
        </div>
        <Link href="/wallet/agents/new" className="mt-1 flex min-h-12 shrink-0 items-center gap-1.5 rounded-full bg-accent pr-5 pl-4 text-xl text-ink">
          <Icon name="add" size={22} strokeWidth={2.4} />
          Nuevo
        </Link>
      </header>
      <AgentWallet items={items} />
    </Page>
  );
}
