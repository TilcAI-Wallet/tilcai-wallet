import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-2xl">No encontramos esta página</h1>
      <p className="text-muted">Puede que el enlace esté incompleto o que ya no exista.</p>
      <Link href="/wallet" className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-ink">
        Ir al inicio
      </Link>
    </main>
  );
}
