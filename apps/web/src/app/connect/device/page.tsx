import { Lockup } from "@/components/Logo";
import { DeviceLink } from "@/components/onboarding";
import { Screen } from "@/components/Screen";
import { SimulatedBadge } from "@/components/SimulatedBadge";

export default function DevicePage() {
  return (
    <Screen>
      <header className="pt-2">
        <Lockup size={48} />
      </header>
      <section>
        <h1 className="text-4xl tracking-tight">Conectar dispositivo</h1>
        <p className="text-base text-ivory/75">Vincula esta sesión con un dispositivo que ya tenga tu wallet.</p>
      </section>
      <DeviceLink />
      <div>
        <SimulatedBadge simulated />
      </div>
    </Screen>
  );
}
