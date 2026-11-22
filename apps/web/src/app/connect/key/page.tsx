import { Lockup } from "@/components/Logo";
import { KeyImport } from "@/components/onboarding";
import { Screen } from "@/components/Screen";

export default function KeyPage() {
  return (
    <Screen>
      <header className="pt-2">
        <Lockup size={48} />
      </header>
      <section>
        <h1 className="text-4xl tracking-tight">Importa tu llave privada</h1>
        <p className="text-base text-ivory/75">Pega la llave de una cuenta Stellar existente.</p>
      </section>
      <KeyImport />
    </Screen>
  );
}
