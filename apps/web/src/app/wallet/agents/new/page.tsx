import { Banner, Page, PageHeader } from "@/components/ui";
import { SimulatedBadge } from "@/components/SimulatedBadge";

// shortcut: código fijo de ejemplo. Con la API real lo emite el servidor, de un solo uso y con vencimiento.
const pairingCode = "TL-7H4K-92QX";

export default function NewAgentPage() {
  return (
    <Page>
      <PageHeader title="Conectar un agente" back="/wallet/agents" />
      <p className="text-base text-ivory/80">Tu agente se conecta por MCP con un código de un solo uso. Nunca recibe tus claves: solo puede pedir compras dentro de su tope.</p>
      <p className="rounded-3xl border border-ivory/60 py-5 text-center text-3xl tracking-widest">{pairingCode}</p>
      <ol className="flex flex-col gap-2 text-base text-ivory/80">
        <li>1. Abre la configuración MCP de tu agente (por ejemplo Codex).</li>
        <li>2. Agrega el servidor Tilcai Wallet.</li>
        <li>3. Introduce el código de arriba cuando te lo pida.</li>
        <li>4. Vuelve aquí: el agente aparecerá en la lista y tú aprobarás su tope.</li>
      </ol>
      <Banner tone="info">El código vence en 10 minutos y se usa una sola vez.</Banner>
      <div>
        <SimulatedBadge simulated />
      </div>
    </Page>
  );
}
