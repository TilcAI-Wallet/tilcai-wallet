import { FundFlow } from "@/components/flows";
import { Page, PageHeader } from "@/components/ui";
import { demoAddress } from "@/lib/stellar";

export default function FundPage() {
  return (
    <Page>
      <PageHeader title="Fondear" />
      <FundFlow address={demoAddress} />
    </Page>
  );
}
