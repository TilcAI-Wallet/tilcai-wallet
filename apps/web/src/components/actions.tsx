"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  decideRequest,
  logout,
  markAllRead,
  renameOwner,
  resetAll,
  setAgentPausedAction,
  setPref,
  setSessionActive,
} from "@/app/actions";
import type { Prefs } from "@/lib/auth";
import { ActionButton, Toggle } from "./controls";
import { Icon } from "./Icon";
import { Banner, Field } from "./ui";

const solid = "flex min-h-12 w-full items-center justify-center rounded-full bg-accent px-5 text-lg text-ink";
const outline = "flex min-h-12 w-full items-center justify-center rounded-full border border-ivory/80 px-5 text-lg text-ivory";

export const DecideButtons = ({ noticeId }: { noticeId: string }) => (
  <div className="flex gap-2">
    <div className="flex-1">
      <ActionButton action={() => decideRequest(noticeId, true)} busy="Aprobando…" className={solid}>
        Aprobar
      </ActionButton>
    </div>
    <div className="flex-1">
      <ActionButton action={() => decideRequest(noticeId, false)} busy="Rechazando…" className={outline}>
        Rechazar
      </ActionButton>
    </div>
  </div>
);

export const MarkAllRead = () => (
  <ActionButton action={markAllRead} className="flex min-h-11 items-center text-accent">
    Marcar todo como leído
  </ActionButton>
);

export const ResumeAgentButton = ({ agentId, className }: { agentId: string; className: string }) => (
  <ActionButton action={() => setAgentPausedAction(agentId, false)} busy="Reanudando…" className={className}>
    <>
      <Icon name="play" size={22} strokeWidth={2} />
      Reanudar
    </>
  </ActionButton>
);

export const PauseAgentButton = ({ agentId, name }: { agentId: string; name: string }) => (
  <ActionButton
    action={() => setAgentPausedAction(agentId, true)}
    busy="Pausando…"
    className="flex min-h-11 w-full items-center justify-center text-base text-ivory/70"
    confirm={`¿Pausar a ${name}? Dejará de poder comprar al instante.`}
  >
    Pausar agente
  </ActionButton>
);

export const AgentToggle =({ agentId, paused, name }: { agentId: string; paused: boolean; name: string }) => (
  <Toggle label={`${name}: ${paused ? "en pausa" : "activo"}`} detail={paused ? "No puede comprar hasta que lo reanudes." : "Puede comprar dentro de su tope."} on={!paused} onChange={(on) => setAgentPausedAction(agentId, !on)} />
);

export const PrefToggle = ({ pref, on, label, detail }: { pref: keyof Prefs; on: boolean; label: string; detail?: string }) => (
  <Toggle label={label} detail={detail} on={on} onChange={(next) => setPref(pref, next)} />
);

export const SessionButton = ({ active }: { active: boolean }) =>
  active ? (
    <ActionButton action={() => setSessionActive(false)} busy="Terminando…" className={outline} confirm="¿Terminar la sesión? El agente dejará de poder comprar.">
      Terminar sesión
    </ActionButton>
  ) : (
    <ActionButton action={() => setSessionActive(true)} busy="Iniciando…" className={solid}>
      Reanudar sesión
    </ActionButton>
  );

export const FreezeButton = ({ frozen }: { frozen: boolean }) => (
  <ActionButton
    action={() => setAgentPausedAction("agt_codex", !frozen)}
    busy={frozen ? "Reanudando…" : "Congelando…"}
    className={frozen ? solid : outline}
    confirm={frozen ? undefined : "¿Congelar la tarjeta? Codex no podrá comprar hasta que la reanudes."}
  >
    {frozen ? "Reanudar tarjeta" : "Congelar tarjeta"}
  </ActionButton>
);

export function LogoutButton() {
  const router = useRouter();
  return (
    <ActionButton
      action={async () => {
        await logout();
        return { ok: true };
      }}
      busy="Cerrando sesión…"
      className={outline}
      confirm="¿Cerrar sesión en este dispositivo?"
      onDone={() => router.replace("/")}
    >
      Cerrar sesión
    </ActionButton>
  );
}

export const ResetButton = () => (
  <ActionButton action={resetAll} busy="Restableciendo…" className={outline} confirm="Se restablecerán saldos, actividad y solicitudes de la demo. ¿Continuar?">
    Restablecer datos de la demo
  </ActionButton>
);

export function RenameForm({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        start(async () => {
          const result = await renameOwner(value);
          setMessage(result.ok ? { ok: true, text: "Nombre actualizado." } : { ok: false, text: result.error });
          if (result.ok) router.refresh();
        });
      }}
    >
      <Field label="Nombre" name="name" value={value} onChange={(e) => (setValue(e.target.value), setMessage(null))} autoComplete="name" maxLength={40} error={message && !message.ok ? message.text : null} />
      <button type="submit" disabled={pending || value.trim() === name} className={`${solid} disabled:opacity-50`}>
        {pending ? "Guardando…" : "Guardar nombre"}
      </button>
      {message?.ok && <Banner tone="ok">{message.text}</Banner>}
    </form>
  );
}
