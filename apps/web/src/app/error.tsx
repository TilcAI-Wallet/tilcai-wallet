"use client";

// En Next 16.4 el error boundary recibe `retry` (no `reset`).
export default function ErrorPage({ retry }: { error: unknown; retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-2xl font-semibold">No pudimos cargar tu información</h1>
      <p className="text-muted">La API de la wallet no respondió. Revisa tu conexión e inténtalo de nuevo.</p>
      <button
        type="button"
        onClick={() => retry()}
        className="min-h-11 rounded-full bg-accent px-5 font-semibold text-white"
      >
        Reintentar
      </button>
    </main>
  );
}
