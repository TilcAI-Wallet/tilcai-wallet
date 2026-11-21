import { projectName } from "@tilcai-wallet/config";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-6 py-16 md:px-12">
      <p className="mb-4 font-semibold text-accent">{projectName}</p>
      <h1 className="max-w-xl text-4xl font-semibold tracking-tight md:text-6xl">
        Compras de agentes, con control y evidencia.
      </h1>
      <p className="mt-5 max-w-lg text-muted">
        Base web del proyecto. Las sesiones, tarjetas y recibos se integrarán con la API de la wallet.
      </p>
    </main>
  );
}
