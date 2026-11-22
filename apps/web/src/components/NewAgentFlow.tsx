"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore, useTransition, type CSSProperties } from "react";
import { approvePairingAction, confirmConnectionAction, createPairingAction, pairingStatusAction, rejectPairingAction } from "@/app/actions";
import { agentClients, type AgentClient } from "@/lib/ledger";
import { verifyPasskey } from "@/lib/passkey";
import { Icon } from "./Icon";
import { AgentLogo, Logo, type AgentLogoName } from "./Logo";
import { primaryButton, secondaryButton } from "./Screen";
import { Banner, Field } from "./ui";

type Step = 1 | 2 | 3 | 4;

const clients: { id: AgentClient; logo: AgentLogoName; alias: string; config: (url: string) => string; where: string; app: string }[] = [
  {
    id: "claude",
    logo: "claude",
    alias: "Claude · Portátil",
    where: "Abre una terminal en tu proyecto y pega el comando de arriba (Claude Code).",
    config: (url) => `claude mcp add --transport http tilcai-wallet ${url}`,
    app: "En la app o la web de Claude: Ajustes → Conectores → Añadir conector personalizado, y pega la URL.",
  },
  {
    id: "codex",
    logo: "chatgpt",
    alias: "Codex · Escritorio",
    where: "Pega la configuración en ~/.codex/config.toml (Codex).",
    config: (url) => `[mcp_servers.tilcai-wallet]\nurl = "${url}"`,
    app: "En la app o la web de ChatGPT: Ajustes → Conectores → Modo desarrollador → Crear, y pega la URL.",
  },
];

// Enlaces universales: en el celular abren la app instalada de Claude o de ChatGPT; si no está, abren la web.
const apps: { name: string; href: string; logo: AgentLogoName }[] = [
  { name: "Claude", href: "https://claude.ai/settings/connectors", logo: "claude" },
  { name: "ChatGPT", href: "https://chatgpt.com/#settings/Connectors", logo: "chatgpt" },
];

const permissions = [
  { title: "Consultar saldo", detail: "Ver el estado de su tarjeta." },
  { title: "Solicitar compras", detail: "Enviar solicitudes de pago." },
  { title: "Ver sus recibos", detail: "Consultar el historial de sus compras." },
];

const tile = "flex size-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-ink";
const noSubscribe = () => () => undefined;

export function NewAgentFlow() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  // Dirección del último cambio de paso: avanzar entra desde la derecha, retroceder desde la izquierda.
  const [prevStep, setPrevStep] = useState<Step>(1);
  const [dir, setDir] = useState<1 | -1>(1);
  if (step !== prevStep) {
    setPrevStep(step);
    setDir(step > prevStep ? 1 : -1);
  }
  const [clientId, setClientId] = useState<AgentClient>("claude");
  const [alias, setAlias] = useState(clients[0]!.alias);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [code, setCode] = useState<string>();
  const [expired, setExpired] = useState(false);
  const [copied, setCopied] = useState<"idle" | "config" | "url" | "failed">("idle");
  const [help, setHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string>();
  const [pending, start] = useTransition();
  const client = clients.find((c) => c.id === clientId)!;
  const clientName = agentClients[clientId].name;
  const origin = useSyncExternalStore(noSubscribe, () => window.location.origin, () => "");
  const url = `${origin}/api/mcp/${code ?? ""}`;
  const isLocal = /^https?:\/\/(localhost|127\.|\[::1\])/.test(origin);

  // Espera la conexión real del agente: el servidor marca la vinculación como «conectada» cuando el cliente MCP la usa.
  useEffect(() => {
    if (step !== 2 || !code || expired) return;
    let alive = true;
    const timer = setInterval(async () => {
      const status = await pairingStatusAction(code);
      if (!alive) return;
      if (status === "connected" || status === "approved") setStep(3);
      else if (status === "missing") setExpired(true);
    }, 1500);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [step, code, expired]);

  function choose(next: AgentClient) {
    const previous = clients.find((c) => c.id === clientId)!;
    setClientId(next);
    // Si la persona no tocó el alias, acompaña al cliente elegido.
    if (alias === previous.alias) setAlias(clients.find((c) => c.id === next)!.alias);
  }

  function openPairing() {
    const clean = alias.trim();
    if (clean.length < 2 || clean.length > 30) return setAliasError("El alias debe tener entre 2 y 30 caracteres.");
    setAliasError(null);
    start(async () => {
      const result = await createPairingAction(clientId, alias, code);
      if (!result.ok) {
        setStep(1);
        return setAliasError(result.error);
      }
      setCode(result.id);
      setExpired(false);
      setCopied("idle");
      setStep(2);
    });
  }

  function approve() {
    start(async () => {
      setError(null);
      const check = await verifyPasskey();
      if (!check.ok && check.reason === "cancelled") return setError("Cancelaste la verificación. No se aprobó nada.");
      if (!check.ok && check.reason === "error") return setError("No pudimos verificar tu passkey. No se aprobó nada.");
      if (!check.ok || check.simulated) setNote("La verificación con passkey se simuló en este dispositivo.");
      const result = await approvePairingAction(code ?? "");
      if (!result.ok) return setError(result.error);
      setAgentId(result.id);
      setStep(4);
    });
  }

  // «Conectar»: avanza solo si un cliente MCP real ya llamó al servidor con este código.
  // Mientras no haya una URL pública con HTTPS, desde el celular eso todavía no es posible: se explica y se ofrece la demo.
  function connectNow() {
    start(async () => {
      setError(null);
      setHint(null);
      const status = await pairingStatusAction(code ?? "");
      if (status === "connected" || status === "approved") return setStep(3);
      if (status === "missing") return setExpired(true);
      setHint(
        "Todavía no detectamos tu agente. La conexión real con Claude y ChatGPT aún no está disponible (necesita una URL pública con HTTPS). Mientras tanto, toca «Ver demo» para ver cómo funciona.",
      );
    });
  }

  // «Ver demo»: sigue el recorrido completo como si el agente ya se hubiera conectado.
  function viewDemo() {
    start(async () => {
      setError(null);
      setHint(null);
      const result = await confirmConnectionAction(code ?? "");
      if (!result.ok) return setError(result.error);
      setStep(3);
    });
  }

  function reject() {
    start(async () => {
      if (code) await rejectPairingAction(code);
      router.push("/wallet/agents");
    });
  }

  async function copy(value: string, what: "config" | "url") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(what);
    } catch {
      setCopied("failed");
    }
  }

  const back = step === 1 || step === 4 ? undefined : () => setStep((step - 1) as Step);
  const backClass = "flex size-11 items-center justify-center rounded-full text-ivory";

  return (
    <div className="flex min-h-[calc(100dvh-7rem)] flex-col gap-5">
      <header className="flex flex-col gap-3">
        <div className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center">
          {back ? (
            <button type="button" onClick={back} aria-label="Paso anterior" className={backClass}>
              <Icon name="back" size={26} />
            </button>
          ) : (
            <Link href="/wallet/agents" aria-label="Volver a agentes" className={backClass}>
              <Icon name="back" size={26} />
            </Link>
          )}
          <span className="flex items-center justify-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent">
              <Logo size={22} color="bg-ink" />
            </span>
            <span className="flex items-baseline gap-1.5 text-2xl">
              Tilcai <span className="text-sm tracking-[0.2em]">WALLET</span>
            </span>
          </span>
        </div>
        <div className="flex gap-2" aria-hidden="true">
          {[1, 2, 3, 4].map((n) => (
            <span key={n} className="relative h-2 flex-1 overflow-hidden rounded-full bg-ivory/20">
              <span className={`absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-500 ease-(--ease-out) motion-reduce:transition-none ${n <= step ? "scale-x-100" : "scale-x-0"}`} />
            </span>
          ))}
        </div>
        <p className="text-center text-sm text-ivory/80">Paso {step} de 4</p>
      </header>

      {step === 1 && (
        <div key={1} className="step-in flex flex-1 flex-col gap-5" style={{ "--enter-x": dir } as CSSProperties}>
          <section>
            <h1 className="text-4xl tracking-tight">Nuevo agente</h1>
            <p className="text-base text-ivory/80">Elige el cliente que quieres conectar.</p>
          </section>
          <div role="radiogroup" aria-label="Cliente del agente" className="flex flex-col gap-3">
            {clients.map((c) => {
              const on = c.id === clientId;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(c.id)}
                  className={`flex min-h-20 items-center gap-3 rounded-3xl border p-3 text-left ${on ? "border-accent bg-accent text-ink" : "border-ivory/50"}`}
                >
                  <span className={on ? "flex size-12 shrink-0 items-center justify-center text-ink" : "flex size-12 shrink-0 items-center justify-center text-ivory"}>
                    <AgentLogo name={c.logo} size={34} />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-xl">{agentClients[c.id].name}</span>
                    <span className={`text-sm ${on ? "text-ink/80" : "text-ivory/75"}`}>{agentClients[c.id].role}.</span>
                  </span>
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${on ? "bg-ink text-accent" : "border-2 border-ivory/50"}`}>
                    {on && <Icon name="check" size={18} strokeWidth={2.8} />}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2">
            <Field
              label="Alias del agente"
              name="alias"
              autoComplete="off"
              maxLength={30}
              value={alias}
              onChange={(e) => {
                setAlias(e.target.value);
                setAliasError(null);
              }}
              error={aliasError}
              hint="Así lo verás en tu lista de agentes."
            />
          </div>
          <div className="mt-auto">
            <button type="button" disabled={pending} onClick={openPairing} className={`${primaryButton} gap-2 disabled:opacity-60`}>
              {pending ? "Preparando…" : "Continuar"}
              <Icon name="arrow" size={24} />
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div key={2} className="step-in flex flex-1 flex-col gap-5" style={{ "--enter-x": dir } as CSSProperties}>
          <section>
            <h1 className="text-4xl tracking-tight">Conectar con MCP</h1>
            <p className="text-base text-ivory/80">Configura Tilcai Wallet en tu computadora.</p>
          </section>
          <section className="flex flex-col gap-3 rounded-3xl border border-ivory/25 bg-surface p-4">
            <div className="flex items-center gap-3">
              <span className="text-ivory">
                <Icon name="server" size={32} />
              </span>
              <h2 className="text-xl">Servidor MCP de Tilcai</h2>
            </div>
            <p className="text-base text-ivory/80">Agrega este servidor en {clientName} para vincular tu agente con tu wallet.</p>
            <button type="button" className={`${primaryButton} gap-2`} onClick={() => copy(client.config(url), "config")}>
              <Icon name="copy" size={22} />
              Copiar configuración
            </button>
            <button type="button" aria-expanded={help} onClick={() => setHelp((v) => !v)} className={`${secondaryButton} gap-2`}>
              <Icon name="external" size={22} />
              Ver instrucciones
            </button>
            <div className="grid grid-cols-2 gap-3">
              {apps.map((app) => (
                <a
                  key={app.name}
                  href={app.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => void copy(url, "url")}
                  className="flex min-h-12 items-center justify-center gap-1.5 rounded-full border border-accent px-2 text-base whitespace-nowrap text-accent"
                >
                  <AgentLogo name={app.logo} size={22} />
                  Abrir {app.name}
                </a>
              ))}
            </div>
            <p className="text-sm text-ivory/70">Al abrir la app copiamos la URL: pégala al crear el conector personalizado.</p>
            {copied === "config" && <Banner tone="ok">Configuración copiada.</Banner>}
            {copied === "url" && <Banner tone="ok">URL copiada.</Banner>}
            {copied === "failed" && <Banner tone="error">No se pudo copiar. Abre «Ver instrucciones» y cópiala a mano.</Banner>}
            {help && (
              <div className="flex flex-col gap-3 rounded-2xl border border-ivory/30 p-3 text-base text-ivory/85">
                <ol className="flex flex-col gap-1.5">
                  <li>1. {client.where}</li>
                  <li>2. Abre {clientName} y confirma que ve «tilcai-wallet» entre sus herramientas MCP.</li>
                  <li>3. Vuelve aquí: la conexión se detecta sola.</li>
                </ol>
                <pre className="font-data overflow-x-auto rounded-xl bg-ivory/10 p-3 text-xs whitespace-pre-wrap break-all">{client.config(url)}</pre>
                <p>{client.app}</p>
                <button type="button" onClick={() => copy(url, "url")} className={`${secondaryButton} gap-2`}>
                  <Icon name="copy" size={22} />
                  Copiar solo la URL
                </button>
                {isLocal && (
                  <Banner tone="info">
                    Estás en localhost: {clientName} en esta misma computadora sí puede conectarse. Para la app o la web de ChatGPT y Claude necesitas una URL pública con HTTPS
                    (despliega la web o usa un túnel).
                  </Banner>
                )}
              </div>
            )}
          </section>
          {expired ? (
            <section className="flex flex-col gap-3 rounded-3xl border border-ivory/60 p-4" role="alert">
              <h2 className="text-xl">El código venció</h2>
              <p className="text-base text-ivory/80">Los códigos duran 10 minutos y se usan una sola vez.</p>
              <button type="button" disabled={pending} onClick={openPairing} className={`${primaryButton} disabled:opacity-60`}>
                Generar código nuevo
              </button>
            </section>
          ) : (
            <section className="flex items-center gap-4 rounded-3xl border border-ivory/25 bg-surface p-4" role="status">
              <span className="size-11 shrink-0 animate-spin rounded-full border-4 border-accent/25 border-t-accent motion-reduce:animate-none" aria-hidden="true" />
              <div>
                <h2 className="text-xl">Esperando conexión…</h2>
                <p className="text-base text-ivory/80">Mantén {clientName} abierto y completa la conexión.</p>
              </div>
            </section>
          )}
          {error && <Banner tone="error">{error}</Banner>}
          {hint && <Banner tone="info">{hint}</Banner>}
          <div className="mt-auto flex flex-col gap-3">
            <button type="button" disabled={pending || !code || expired} onClick={connectNow} className={`${primaryButton} disabled:opacity-60`}>
              {pending ? "Comprobando…" : "Conectar"}
            </button>
            <button type="button" disabled={pending || !code || expired} onClick={viewDemo} className={`${secondaryButton} disabled:opacity-60`}>
              Ver demo
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div key={3} className="step-in flex flex-1 flex-col gap-5" style={{ "--enter-x": dir } as CSSProperties}>
          <section>
            <h1 className="text-4xl tracking-tight">Aprobar acceso</h1>
            <p className="text-base text-ivory/80">Se detectó una solicitud de conexión de un agente.</p>
          </section>
          <section className="flex items-center gap-3 rounded-3xl border border-ivory/25 bg-surface p-3">
            <span className={tile}>
              <Icon name="laptop" size={28} />
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-xl">{alias.trim()}</h2>
              <p className="text-sm text-ivory/75">Nueva sesión entrante</p>
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-lg">Permisos solicitados</h2>
            <ul className="flex flex-col gap-3">
              {permissions.map((p) => (
                <li key={p.title} className="flex items-start gap-3">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-mint text-ink">
                    <Icon name="check" size={20} strokeWidth={2.8} />
                  </span>
                  <span className="flex flex-col leading-tight">
                    <span className="text-lg">{p.title}</span>
                    <span className="text-sm text-ivory/75">{p.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <p className="flex items-center gap-3 rounded-3xl border border-ivory/60 p-4 text-base">
            <Icon name="info" size={26} />
            Sin acceso a fondos hasta activar una tarjeta.
          </p>
          {error && <Banner tone="error">{error}</Banner>}
          <div className="mt-auto flex flex-col gap-3">
            <button type="button" disabled={pending} onClick={approve} className={`${primaryButton} gap-2 disabled:opacity-60`}>
              <Icon name="fingerprint" size={26} />
              {pending ? "Esperando a tu dispositivo…" : "Aprobar con passkey"}
            </button>
            <button type="button" disabled={pending} onClick={reject} className={secondaryButton}>
              Rechazar
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div key={4} className="step-in flex flex-1 flex-col gap-5" style={{ "--enter-x": dir } as CSSProperties}>
          <section className="flex flex-col items-center gap-3 pt-2 text-center">
            <span className="flex size-20 items-center justify-center rounded-full bg-mint text-ink">
              <Icon name="check" size={46} strokeWidth={2.6} />
            </span>
            <h1 className="text-4xl tracking-tight">¡Agente conectado!</h1>
            <p className="text-base text-ivory/80">{clientName} ya está vinculado a tu cuenta en Tilcai Wallet.</p>
          </section>
          <section className="rounded-3xl border border-ivory/25 bg-surface p-3">
            <div className="flex items-center gap-3">
              <span className={tile}>
                <Icon name="laptop" size={28} />
              </span>
              <div className="min-w-0">
                <h2 className="truncate text-xl">{alias.trim()}</h2>
                <p className="flex items-center gap-2 text-sm text-mint">
                  <span className="size-2 rounded-full bg-mint" />
                  Acceso de lectura activo
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-3 border-t border-ivory/20 pt-3 text-base">
              <Icon name="card" size={24} />
              <span className="flex-1">Tarjeta: sin activar</span>
              <Icon name="info" size={22} />
            </p>
          </section>
          <p className="text-center text-base text-ivory/80">El agente puede consultar tu cuenta. Para que realice compras, configura una tarjeta y define sus límites.</p>
          {note && <Banner tone="info">{note}</Banner>}
          <div className="mt-auto flex flex-col gap-3">
            <Link href={agentId ? `/wallet/agents/${agentId}/card` : "/wallet/agents"} className={primaryButton}>
              Configurar tarjeta y límites
            </Link>
            <Link href="/wallet/agents" className={secondaryButton}>
              Ahora no
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
