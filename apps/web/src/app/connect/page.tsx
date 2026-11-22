import { Icon } from "@/components/Icon";
import { Lockup } from "@/components/Logo";
import { ConnectOptions } from "@/components/onboarding";
import { Screen } from "@/components/Screen";
import { WalletArt } from "@/components/WalletArt";

export default async function Connect({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  return (
    <Screen>
      <header className="pt-2">
        <Lockup size={48} />
      </header>
      <WalletArt icons={["robot", "code", "headset"]} className="mx-auto w-44" />
      <section className="-mt-2 text-center">
        <h1 className="text-4xl tracking-tight">Conecta tu wallet</h1>
        <p className="text-base text-ivory/75">Elige cómo quieres acceder de forma segura.</p>
      </section>
      <ConnectOptions returning={mode === "login"} />
      <p className="flex items-center justify-center gap-3 text-sm text-ivory/75">
        <span className="text-accent">
          <Icon name="shield" size={26} />
        </span>
        <span className="h-5 w-px bg-ivory/40" />
        Tus credenciales siempre quedan bajo tu control
      </p>
    </Screen>
  );
}
