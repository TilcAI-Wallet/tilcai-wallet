"use client";

import Link from "next/link";
import { useState } from "react";
import { AgentCreditCard } from "./AgentCreditCard";
import { AgentPanel, type AgentData } from "./AgentPanel";

const peek = 54; // altura visible de cada tarjeta que queda detrás

/** Pila de tarjetas estilo wallet: la de adelante se ve completa; tocar una de atrás la trae al frente, y tocar la de adelante la abre. */
export function AgentWallet({ items }: { items: AgentData[] }) {
  const [order, setOrder] = useState(() => items.map((item) => item.agent.id).reverse());
  const byId = new Map(items.map((item) => [item.agent.id, item]));
  // Tras crear un agente llegan datos nuevos: se conserva el orden elegido y el recién llegado queda al frente.
  const ids = [...order.filter((id) => byId.has(id)), ...items.map((item) => item.agent.id).filter((id) => !order.includes(id))];
  const frontId = ids.at(-1)!;
  const front = byId.get(frontId)!;
  const bring = (id: string) => setOrder([...ids.filter((other) => other !== id), id]);
  const position = items.findIndex((item) => item.agent.id === frontId);

  return (
    <>
      <div className="[container-type:inline-size]">
        <div className="relative" style={{ height: `calc(63.05cqw + ${(ids.length - 1) * peek}px)` }}>
          {ids.map((id, index) => {
            const data = byId.get(id)!;
            const isFront = id === frontId;
            const card = <AgentCreditCard agent={data.agent} status={data.status} />;
            return (
              <div
                key={id}
                className="absolute inset-x-0 transition-[top] duration-[340ms] ease-(--ease-drawer) motion-reduce:transition-none"
                style={{ top: index * peek, zIndex: index }}
              >
                <div className="card-deal" style={{ animationDelay: `${index * 60}ms` }}>
                {isFront ? (
                  <Link href={`/wallet/agents/${id}`} aria-label={`Abrir la tarjeta de ${data.agent.name}`} className="block rounded-[1.6rem] active:scale-[0.985]">
                    {card}
                  </Link>
                ) : (
                  <button type="button" onClick={() => bring(id)} aria-label={`Traer al frente la tarjeta de ${data.agent.name}`} className="block w-full rounded-[1.6rem] text-left">
                    {card}
                  </button>
                )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {items.length > 1 && (
        <div className="flex items-center justify-center gap-2" role="group" aria-label="Tarjetas">
          {items.map((item, index) => (
            <button
              key={item.agent.id}
              type="button"
              onClick={() => bring(item.agent.id)}
              aria-label={`Tarjeta ${index + 1} de ${items.length}: ${item.agent.name}`}
              aria-current={index === position ? "true" : undefined}
              className="flex size-6 items-center justify-center"
            >
              <span className={`h-2 rounded-full transition-[width,background-color] duration-300 ease-(--ease-out) motion-reduce:transition-none ${index === position ? "w-6 bg-accent" : "w-2 bg-ivory/30"}`} />
            </button>
          ))}
        </div>
      )}

      {/* `key` reinicia «Mostrar» al cambiar de tarjeta. */}
      <div className="swap flex flex-col gap-5">
        <AgentPanel key={frontId} data={front} openHref={`/wallet/agents/${frontId}`} />
      </div>
    </>
  );
}
