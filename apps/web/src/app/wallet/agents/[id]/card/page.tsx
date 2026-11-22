import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import { AgentCardForm } from "@/components/AgentCardForm";
import { Banner, Page, PageHeader } from "@/components/ui";
import { wallet } from "@/lib/wallet";

export default async function AgentCardPage({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const agent = (await wallet.agents()).find((a) => a.id === id);
  if (!agent) notFound();
  if (agent.card !== null) redirect("/wallet/agents");

  return (
    <Page>
      <PageHeader title="Tarjeta y límites" back="/wallet/agents">
        <p className="text-base text-muted">Define cuánto puede gastar {agent.name}. Sin tarjeta no tiene acceso a fondos.</p>
      </PageHeader>
      <AgentCardForm agentId={agent.id} />
      <Banner tone="info">Puedes pausar al agente en cualquier momento y dejará de poder comprar al instante.</Banner>
    </Page>
  );
}
