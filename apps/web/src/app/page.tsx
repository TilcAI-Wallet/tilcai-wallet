import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { InstallPrompt } from "@/components/InstallPrompt";
import { Lockup } from "@/components/Logo";
import { primaryButton, Screen, secondaryButton } from "@/components/Screen";
import { WalletArt } from "@/components/WalletArt";
import { getSession } from "@/lib/auth";

export default async function Welcome() {
  if (await getSession()) redirect("/wallet");
  return (
    <Screen>
      <header className="pt-2">
        <Lockup />
      </header>
      <section className="flex flex-col gap-3">
        <h1 className="text-4xl leading-[1.05] tracking-tight">
          Tu wallet.
          <br />
          Tus agentes.
          <br />
          Tú pones los límites.
        </h1>
        <p className="text-base text-ivory/75">Gestiona sesiones, asigna presupuestos y controla compras de IA con total claridad.</p>
      </section>
      <WalletArt icons={["robot", "code", "headset"]} className="mx-auto min-h-0 w-full max-w-[22rem] flex-1" />
      <div className="flex flex-col gap-3">
        <Link href="/connect" className={primaryButton}>
          Comenzar
        </Link>
        <Link href="/connect?mode=login" className={secondaryButton}>
          Ya tengo cuenta
        </Link>
      </div>
      <p className="flex items-center justify-center gap-3 text-sm text-ivory/75">
        <span className="text-accent">
          <Icon name="fingerprint" size={26} />
        </span>
        <span className="h-5 w-px bg-ivory/40" />
        Seguro con passkeys y control humano
      </p>
      <InstallPrompt />
    </Screen>
  );
}
