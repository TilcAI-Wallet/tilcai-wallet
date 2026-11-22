"use client";

import Link from "next/link";
import { useState } from "react";
import type { Activity, Agent, AgentStatus } from "@/lib/ledger";
import { formatUsdc } from "@/lib/money";
import { ActivityRow } from "./ActivityRow";
import { AgentPill } from "./AgentPill";
import { PauseAgentButton, ResumeAgentButton, TestPurchaseButton } from "./actions";
import { Icon } from "./Icon";

/** Lo que las pantallas de agentes necesitan de cada uno, ya calculado en el servidor. */
export type AgentData = { agent: Agent; status: AgentStatus; percent: number; activity: Activity[] };

const action = "flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-xl";

/** Detalles de la tarjeta (con «Mostrar» para el código), acciones y movimientos de un agente. */
export function AgentPanel({ data, openHref }: { data: AgentData; openHref?: string }) {
  const { agent, status, percent, activity } = data;
  const [show, setShow] = useState(false);
  const left = BigInt(agent.limit) - BigInt(agent.spent);
  const rows: [string, string][] = [
    ["Agente", agent.name],
    ["Tope acumulado", formatUsdc(agent.limit)],
    ["Gastado", formatUsdc(agent.spent)],
    ["Disponible", status === "active" ? formatUsdc((left > 0n ? left : 0n).toString()) : formatUsdc("0")],
    ["Máx. por compra", formatUsdc(agent.maxPerPurchase)],
  ];

  return (
    <>
      <section className="flex flex-col gap-3 rounded-3xl border border-ivory/15 bg-surface p-4" aria-label={`Detalles de la tarjeta de ${agent.name}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl">Detalles de la tarjeta</h2>
          <AgentPill status={status} />
        </div>
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-ivory/15 px-3 py-2">
          <span className="flex min-w-0 items-center gap-2.5">
            <Icon name="card" size={24} />
            <span className="font-data text-base tracking-wider">{agent.card ? (show ? agent.card : `${agent.card.split("-")[0]}-••••`) : "Sin activar"}</span>
          </span>
          {agent.card && (
            <button
              type="button"
              role="switch"
              aria-checked={show}
              onClick={() => setShow((v) => !v)}
              className="flex min-h-9 shrink-0 items-center gap-2 rounded-full border border-ivory/30 py-1 pr-1 pl-3 text-sm"
            >
              {show ? "Ocultar" : "Mostrar"}
              <span className={`flex h-6 w-10 items-center rounded-full p-0.5 ${show ? "justify-end bg-accent" : "justify-start bg-ivory/25"}`}>
                <span className={`size-5 rounded-full ${show ? "bg-ink" : "bg-ivory"}`} />
              </span>
            </button>
          )}
        </div>
        <div
          role="progressbar"
          aria-label={`Gasto de ${agent.name}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-2.5 overflow-hidden rounded-full bg-ivory/15"
        >
          <div className={`h-full rounded-full ${status === "active" ? "bg-mint" : "bg-accent"}`} style={{ width: `${percent}%` }} />
        </div>
        <dl className="divide-y divide-ivory/15">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start justify-between gap-4 py-2.5">
              <dt className="text-base text-muted">{label}</dt>
              <dd className="text-right text-base">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="flex flex-col gap-3">
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
        {status === "paused" && <ResumeAgentButton agentId={agent.id} className={`${action} bg-accent text-ink`} />}
        {openHref && status !== "setup" && (
          <Link href={openHref} className={`${action} ${status === "active" ? "bg-accent text-ink" : "bg-accent/20 text-accent"}`}>
            Ver tarjeta y límites
            <Icon name="chevron" size={22} />
          </Link>
        )}
        {agent.linkedCard && (
          <Link href="/wallet/cards" className={`${action} border border-ivory/40 text-ivory`}>
            Recibos y congelar tarjeta
          </Link>
        )}
        {status === "active" && !agent.linkedCard && <TestPurchaseButton agentId={agent.id} />}
        {(status === "active" || status === "limit") && <PauseAgentButton agentId={agent.id} name={agent.name} />}
      </div>

      <section aria-labelledby="movs" className="flex flex-col gap-3">
        <h2 id="movs" className="text-2xl">
          Movimientos
        </h2>
        {activity.length === 0 ? (
          <p className="rounded-3xl border border-line bg-surface p-4 text-base text-muted">Aún no hay compras de este agente.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {activity.map((item) => (
              <li key={item.id}>
                <ActivityRow item={item} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
