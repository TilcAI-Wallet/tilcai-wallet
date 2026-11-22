import { NewAgentFlow } from "@/components/NewAgentFlow";
import { Page } from "@/components/ui";

// shortcut: código fijo de ejemplo. Con la API real lo emite el servidor, de un solo uso y con vencimiento de 10 minutos.
const pairingCode = "TL-7H4K-92QX";

export default function NewAgentPage() {
  return (
    <Page>
      <NewAgentFlow pairingCode={pairingCode} />
    </Page>
  );
}
