import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { AgentPill } from "@/components/AgentPill";
import { PauseAgentButton, ResumeAgentButton, TestPurchaseButton } from "@/components/actions";
import { Icon } from "@/components/Icon";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { Page, PageHeader } from "@/components/ui";
import { agentStatus } from "@/lib/ledger";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const agent = (await wallet.agents()).find((a) => a.id === id);
  if (!agent) notFound();
  if (agent.linkedCard) redirect("/wallet/cards");
  if (agent.card === null) redirect(`/wallet/agents/${agent.id}/card`);

  const status = agentStatus(agent);  const left = BigInt(agent.limit) - BigInt(agent.spent);
  const rows: [string, string][] = [
    ["Tope acumulado", formatUsdc(agent.limit)],
    ["Gastado", formatUsdc(agent.spent)],
    ["Disponible", status === "paused" ? formatUsdc("0") : formatUsdc((left > 0n ? left : 0n).toString())],
    ["Máx. por compra", formatUsdc(agent.maxPerPurchase)],
  ];

  return (
    <Page>
      <PageHeader title={agent.name} back="/wallet/agents">
        <p className="text-base text-muted">{agent.role}</p>
      </PageHeader>
      <section className="flex flex-col gap-6 rounded-3xl bg-accent p-5 text-ink">
        <div className="flex items-start justify-between">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-ink text-accent">
            <Icon name={agent.icon} size={28} />
          </span>
          <span className="text-lg">Tarjeta virtual</span>
        </div>
        <p className="font-data text-3xl tracking-widest">{agent.card}</p>
        <p className="flex items-center justify-between text-base">
          <span>USDC · Stellar Testnet</span>
          <AgentPill status={status} />
        </p>
      </section>
      <dl className="divide-y divide-ivory/20 rounded-3xl border border-ivory/60 px-4">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-start justify-between gap-4 py-3">
            <dt className="text-base text-muted">{label}</dt>
            <dd className="text-right text-base">{value}</dd>
          </div>
        ))}
      </dl>
      {status === "active" && <TestPurchaseButton agentId={agent.id} />}
      {status === "paused" ? (
        <ResumeAgentButton agentId={agent.id} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-accent px-5 text-xl text-ink" />
      ) : (
        <PauseAgentButton agentId={agent.id} name={agent.name} />
      )}
      <div>
        <SimulatedBadge simulated />
      </div>
    </Page>
  );
}
