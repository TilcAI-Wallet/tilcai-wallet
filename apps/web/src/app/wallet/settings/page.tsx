import { projectVersion } from "@tilcai-wallet/config";
import { LogoutButton, PrefToggle, ResetButton } from "@/components/actions";
import { Page, PageHeader } from "@/components/ui";
import { getPrefs } from "@/lib/auth";

const group = "divide-y divide-line overflow-hidden rounded-3xl border border-line bg-surface";

export default async function SettingsPage() {
  const prefs = await getPrefs();

  return (
    <Page>
      <PageHeader title="Ajustes" back="/wallet" />
      <section aria-labelledby="privacy" className="flex flex-col gap-2">
        <h2 id="privacy" className="text-2xl">
          Privacidad
        </h2>
        <div className={group}>
          <PrefToggle pref="hideBalance" on={prefs.hideBalance} label="Ocultar saldos" detail="Muestra ••••• en el inicio." />
          <PrefToggle pref="notify" on={prefs.notify} label="Avisos de actividad" detail="Muestra el contador en la campana." />
        </div>
      </section>
      <section aria-labelledby="security" className="flex flex-col gap-2">
        <h2 id="security" className="text-2xl">
          Seguridad
        </h2>
        <div className={group}>
          <PrefToggle pref="requirePasskey" on={prefs.requirePasskey} label="Pedir passkey al enviar" detail="Verifica tu identidad antes de cada transferencia." />
        </div>
      </section>
      <section aria-labelledby="network" className="flex flex-col gap-2">
        <h2 id="network" className="text-2xl">
          Red
        </h2>
        <div className={`${group} p-4`}>
          <p className="text-lg">Stellar Testnet</p>
          <p className="text-sm text-muted">Mainnet todavía no está disponible. Los fondos son de prueba.</p>
        </div>
      </section>
      <section aria-labelledby="demo" className="flex flex-col gap-3">
        <h2 id="demo" className="text-2xl">
          Demo
        </h2>
        <ResetButton />
        <LogoutButton />
      </section>
      <p className="text-center text-sm text-muted">Tilcai Wallet v{projectVersion}</p>
    </Page>
  );
}
