import Link from "next/link";

export default function ActivityNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-2xl">No encontramos este movimiento</h1>
      <p className="text-muted">Puede que la demo se haya reiniciado en el servidor y la actividad ya no exista.</p>
      <Link href="/wallet/activity" className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-ink">
        Ver mi actividad
      </Link>
    </main>
  );
}
