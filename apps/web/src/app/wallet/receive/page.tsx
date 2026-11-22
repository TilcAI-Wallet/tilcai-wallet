import { CopyAddress } from "@/components/flows";
import { QrArt } from "@/components/QrArt";
import { Banner, Page, PageHeader } from "@/components/ui";
import { demoAddress } from "@/lib/stellar";

export default function ReceivePage() {
  return (
    <Page>
      <PageHeader title="Recibir" />
      <Banner tone="info">Envía aquí solo USDC de Stellar Testnet. Los fondos de otras redes o activos pueden perderse.</Banner>
      <div className="mx-auto w-56">
        <QrArt seed={demoAddress} label="Código QR de tu dirección" />
      </div>
      <CopyAddress address={demoAddress} />
    </Page>
  );
}
