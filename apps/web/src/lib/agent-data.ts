import { agentStatus } from "./ledger.ts";
import type { AgentData } from "@/components/AgentPanel";
import { wallet } from "./wallet.ts";
import { demoCardId } from "./wallet-mock.ts";

/** Agentes con su estado, el porcentaje gastado y sus compras, listos para las pantallas de tarjetas. */
export async function loadAgents(): Promise<AgentData[]> {
  const [agents, card] = await Promise.all([wallet.agents(), wallet.card(demoCardId)]);
  return agents.map((agent) => {
    const limit = BigInt(agent.limit);
    return {
      agent,
      status: agentStatus(agent),
      percent: limit === 0n ? 0 : Math.min(100, Number((BigInt(agent.spent) * 100n) / limit)),
      activity: card.activity.filter((item) => item.kind === "payment" && item.counterparty === agent.name).slice(0, 6),
    };
  });
}
