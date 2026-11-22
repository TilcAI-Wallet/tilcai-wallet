"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { configureAgentCardAction } from "@/app/actions";
import { parseUsdc } from "@/lib/money";
import { primaryButton } from "./Screen";
import { Banner, Field } from "./ui";

export function AgentCardForm({ agentId }: { agentId: string }) {
  const [limit, setLimit] = useState("50");
  const [max, setMax] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function submit() {
    const l = parseUsdc(limit);
    const m = parseUsdc(max);
    if (!l || !m) return setError("Escribe montos válidos, por ejemplo 50 o 10,50.");
    if (BigInt(m) > BigInt(l)) return setError("El máximo por compra no puede superar el tope acumulado.");
    start(async () => {
      const result = await configureAgentCardAction(agentId, limit, max);
      if (!result.ok) return setError(result.error);
      router.push("/wallet/agents");
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Field label="Tope acumulado (USDC)" name="limit" inputMode="decimal" autoComplete="off" value={limit} onChange={(e) => (setLimit(e.target.value), setError(null))} hint="Lo máximo que el agente puede gastar en total." />
      <Field label="Máximo por compra (USDC)" name="max" inputMode="decimal" autoComplete="off" value={max} onChange={(e) => (setMax(e.target.value), setError(null))} hint="Lo máximo que puede pagar en una sola compra." />
      {error && <Banner tone="error">{error}</Banner>}
      <button type="submit" disabled={pending} className={`${primaryButton} disabled:opacity-60`}>
        {pending ? "Activando…" : "Activar tarjeta"}
      </button>
    </form>
  );
}
