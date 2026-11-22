import { notFound } from "next/navigation";
import { connection } from "next/server";
import { AgentCreditCard } from "@/components/AgentCreditCard";
import { AgentPanel } from "@/components/AgentPanel";
import { Page, PageHeader } from "@/components/ui";
import { loadAgents } from "@/lib/agent-data";

export default async function AgentDetail({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const data = (await loadAgents()).find((item) => item.agent.id === id);
  if (!data) notFound();

  return (
    <Page>
      <PageHeader title={data.agent.name} back="/wallet/agents">
        <p className="text-base text-muted">{data.agent.role}</p>
      </PageHeader>
      <AgentCreditCard agent={data.agent} status={data.status} />
      <AgentPanel data={data} />
    </Page>
  );
}
