import { TransferFlow } from "@/components/flows";
import { Page, PageHeader } from "@/components/ui";
import { getPrefs } from "@/lib/auth";
import { wallet } from "@/lib/wallet";
import { demoCardId } from "@/lib/wallet-mock";

export default async function TransferPage() {
  const [card, prefs] = await Promise.all([wallet.card(demoCardId), getPrefs()]);
  return (
    <Page>
      <PageHeader title="Transferir" />
      <TransferFlow balance={card.balance} requirePasskey={prefs.requirePasskey} />
    </Page>
  );
}
