import Link from "next/link";

export default function ReceiptNotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <h1 className="text-2xl">No encontramos este recibo</h1>
      <p className="text-muted">Puede que la orden no exista o que el enlace esté incompleto.</p>
      <Link href="/wallet/cards" className="flex min-h-11 items-center justify-center rounded-full bg-accent px-5 text-ink">
        Volver a la tarjeta
      </Link>
    </main>
  );
}
