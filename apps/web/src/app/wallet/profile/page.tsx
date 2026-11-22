import { connection } from "next/server";
import { LogoutButton, RenameForm } from "@/components/actions";
import { Page, PageHeader, ListRow } from "@/components/ui";
import { getSession } from "@/lib/auth";
import { demoAddress, shortKey } from "@/lib/stellar";
import { wallet } from "@/lib/wallet";

const methods = { passkey: "Passkey", key: "Llave privada", phrase: "Frase de recuperación", device: "Dispositivo vinculado" } as const;

export default async function ProfilePage() {
  await connection();
  const [session, method] = await Promise.all([wallet.session(), getSession()]);
  const initials = session.owner
    .split(" ")
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return (
    <Page>
      <PageHeader title="Perfil" back={null} />
      <section className="flex items-center gap-4">
        <span aria-hidden="true" className="flex size-16 items-center justify-center rounded-full bg-accent text-3xl text-ink">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="text-2xl">{session.owner}</p>
          <p className="text-sm text-muted">{session.tenant}</p>
          <p className="text-sm text-muted">{shortKey(demoAddress)} · Stellar Testnet</p>
        </div>
      </section>
      <p className="text-base text-muted">Acceso con: {method ? methods[method] : "—"}</p>
      <RenameForm name={session.owner} />
      <nav aria-label="Cuenta" className="divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface">
        <ListRow href="/wallet/settings" icon="gear" title="Ajustes" detail="Privacidad, seguridad y red" />
        <ListRow href="/wallet/notifications" icon="bell" title="Notificaciones" detail="Avisos y solicitudes de tus agentes" />
        <ListRow href="/wallet/receive" icon="scan" title="Mi dirección" detail="Recibir USDC en Testnet" />
        <ListRow href="/wallet/cards" icon="card" title="Tarjetas" detail="Codex · Portátil" />
      </nav>
      <LogoutButton />
    </Page>
  );
}
