import { Lockup } from "@/components/Logo";
import { PhraseImport } from "@/components/onboarding";
import { Screen } from "@/components/Screen";

export default function PhrasePage() {
  return (
    <Screen>
      <header className="pt-2">
        <Lockup size={48} />
      </header>
      <section>
        <h1 className="text-4xl tracking-tight">Frase de recuperación</h1>
        <p className="text-base text-ivory/75">Restaura tu cuenta con tus 12 o 24 palabras.</p>
      </section>
      <PhraseImport />
    </Screen>
  );
}
