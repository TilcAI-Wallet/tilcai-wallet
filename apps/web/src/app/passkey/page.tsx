import { Icon } from "@/components/Icon";
import { Lockup } from "@/components/Logo";
import { PasskeyFlow } from "@/components/onboarding";
import { Screen } from "@/components/Screen";
import { WalletArt } from "@/components/WalletArt";
import { getSession } from "@/lib/auth";
import { wallet } from "@/lib/wallet";

const benefits = ["Más rápido que una contraseña", "Más seguro para aprobar compras", "Recuperación simplificada"];

export default async function Passkey({ searchParams }: { searchParams: Promise<{ mode?: string; next?: string }> }) {
  const { mode, next } = await searchParams;
  const login = mode === "login";
  const hasSession = (await getSession()) !== null;
  const { owner } = await wallet.session();

  return (
    <Screen>
      <header className="pt-2">
        <Lockup size={48} />
      </header>
      <section>
        <h1 className="text-4xl tracking-tight">{login ? "Inicia con tu passkey" : "Crea tu passkey"}</h1>
        <p className="text-base text-ivory/75">
          {login
            ? "Verifica tu identidad con la biometría de este dispositivo."
            : next === "protect"
              ? "Tu wallet ya está importada. Protégela con biometría."
              : "Protege tu wallet con biometría y acceso seguro."}
        </p>
      </section>
      <WalletArt icons={["face", "fingerprint", "shield"]} className="mx-auto w-32" />
      <PasskeyFlow mode={login ? "login" : "create"} hasSession={hasSession} ownerName={owner} />
      {!login && (
        <ul className="flex flex-col gap-2">
          {benefits.map((text) => (
            <li key={text} className="flex items-center gap-3 text-base">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-mint text-ink">
                <Icon name="check" size={18} strokeWidth={2.6} />
              </span>
              {text}
            </li>
          ))}
        </ul>
      )}
      <p className="flex items-center gap-3 text-sm text-ivory/75">
        <span className="text-accent">
          <Icon name="fingerprint" size={26} />
        </span>
        <span className="h-8 w-px bg-ivory/40" />
        Tilcai Wallet usa passkeys para proteger tus agentes y tus fondos.
      </p>
    </Screen>
  );
}
