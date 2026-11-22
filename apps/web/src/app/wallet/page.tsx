import Link from "next/link";
import { connection } from "next/server";
import { ActivityRow } from "@/components/ActivityRow";
import { Icon, type IconName } from "@/components/Icon";
import { Lockup } from "@/components/Logo";
import { getPrefs } from "@/lib/auth";
import { SimulatedBadge } from "@/components/SimulatedBadge";
import { formatUsdc } from "@/lib/money";
import { wallet } from "@/lib/wallet";
import { demoCardId } from "@/lib/wallet-mock";

const actions: { href: string; label: string; icon: IconName }[] = [
  { href: "/wallet/fund", label: "Fondear", icon: "plus" },
  { href: "/wallet/cards", label: "Tarjetas", icon: "card" },
  { href: "/wallet/transfer", label: "Transferir", icon: "send" },
  { href: "/wallet/receive", label: "Recibir", icon: "scan" },
];

export default async function WalletHome() {
  await connection();
  const [session, card, prefs, notices] = await Promise.all([wallet.session(), wallet.card(demoCardId), getPrefs(), wallet.notices()]);
  const unread = prefs.notify ? notices.filter((notice) => !notice.read).length : 0;
  const firstName = session.owner.split(" ")[0];

  return (
    <main className="mx-auto flex max-w-md flex-col gap-5 px-5 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <header className="flex items-center justify-between">
        <Lockup size={40} compact />
        <div className="flex">
          <Link href="/wallet/notifications" aria-label={unread ? `Notificaciones, ${unread} sin leer` : "Notificaciones"} className="relative flex size-11 items-center justify-center text-accent">
            <Icon name="bell" size={26} />
            {unread > 0 && <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-mint text-xs text-ink">{unread}</span>}
          </Link>
          <Link href="/wallet/settings" aria-label="Ajustes" className="flex size-11 items-center justify-center text-accent">
            <Icon name="gear" size={26} />
          </Link>
        </div>
      </header>

      <section>
        <h1 className="text-4xl tracking-tight">Hola, {firstName}</h1>
        <p className="text-base text-muted">{card.state === "active" ? "Tus agentes están trabajando." : "Tu agente está en pausa."}</p>
        <div className="mt-2">
          <SimulatedBadge simulated={session.simulated || card.simulated} />
        </div>
      </section>

      <section aria-labelledby="balance" className="flex items-start justify-between gap-3 rounded-3xl bg-ivory p-5 text-ink">
        <div className="flex min-w-0 flex-col gap-2">
          <h2 id="balance" className="text-base text-ink/70">
            Saldo total
          </h2>
          <p className="text-4xl tracking-tight">{prefs.hideBalance ? "••••• USDC" : formatUsdc(card.balance)}</p>
          <p className="flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full bg-mint px-3 py-1 text-sm">
            <Icon name="agent" size={18} />
            Agente: {prefs.hideBalance ? "•••" : formatUsdc(card.available)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-accent/30 text-ink">
            <Icon name="stellar" size={32} />
          </span>
          <span className="rounded-full bg-mist px-3 py-1 text-sm text-ink/70">{card.network === "testnet" ? "Testnet" : "Stellar"}</span>
        </div>
      </section>

      <nav aria-label="Acciones rápidas">
        <ul className="grid grid-cols-4 gap-2">
          {actions.map((action) => (
            <li key={action.href}>
              <Link
                href={action.href}
                className="flex min-h-20 flex-col items-center justify-center gap-1.5 rounded-3xl bg-accent/20 text-sm active:bg-accent/30"
              >
                <span className="text-accent">
                  <Icon name={action.icon} size={28} />
                </span>
                {action.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <section aria-labelledby="recent">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="recent" className="text-2xl">
            Actividad reciente
          </h2>
          <Link href="/wallet/activity" className="flex min-h-11 items-center gap-1 text-base text-accent">
            Ver todo
            <Icon name="chevron" size={18} />
          </Link>
        </div>
        <ul className="flex flex-col gap-2">
          {card.activity.slice(0, 3).map((item) => (
            <li key={item.id}>
              <ActivityRow item={item} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
