import Link from "next/link";

export default function AgentNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-2xl">No encontramos este agente</h1>
      <p className="text-muted">Los datos de la demo viven en el servidor y se reinician cuando este se reinicia. Revisa la lista o conecta el agente de nuevo.</p>
      <Link href="/wallet/agents" className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-ink">
        Ver mis agentes
      </Link>
      <Link href="/wallet/agents/new" className="flex min-h-11 items-center justify-center rounded-full border border-ivory/80 px-5 text-ivory">
        Conectar un agente
      </Link>
    </main>
  );
}
