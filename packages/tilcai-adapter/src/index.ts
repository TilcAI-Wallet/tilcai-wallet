import { Networks } from "@stellar/stellar-sdk";
import type { WalletNetwork } from "@tilcai-wallet/domain";

export function networkPassphrase(network: WalletNetwork): string {
  return network === "testnet" ? Networks.TESTNET : Networks.PUBLIC;
}
