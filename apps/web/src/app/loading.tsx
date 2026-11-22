export default function Loading() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-5" aria-busy="true">
      <p className="sr-only" role="status">
        Cargando…
      </p>
      <div className="h-6 w-40 animate-pulse rounded-full bg-line" />
      <div className="h-40 animate-pulse rounded-3xl bg-line" />
      <div className="h-20 animate-pulse rounded-2xl bg-line" />
      <div className="h-16 animate-pulse rounded-2xl bg-line" />
    </main>
  );
}
