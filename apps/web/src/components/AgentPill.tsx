import type { AgentStatus } from "@/lib/ledger";
import { Icon } from "./Icon";

const pill: Record<AgentStatus, { label: string; style: string }> = {
  active: { label: "Activo", style: "bg-mint text-ink" },
  paused: { label: "En pausa", style: "bg-mist text-ink" },
  limit: { label: "Límite alcanzado", style: "bg-accent text-ink" },
  setup: { label: "Sin tarjeta", style: "border border-ivory/70 text-ivory" },
};

/** Estado del agente con texto e ícono, nunca solo color. */
export function AgentPill({ status }: { status: AgentStatus }) {
  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm ${pill[status].style}`}>
      {status === "active" && <span className="size-2 rounded-full bg-ink" />}
      {status === "paused" && <Icon name="pause" size={16} strokeWidth={2.6} />}
      {status === "limit" && <Icon name="alert" size={16} />}
      {status === "setup" && <Icon name="card" size={16} />}
      {pill[status].label}
    </span>
  );
}
