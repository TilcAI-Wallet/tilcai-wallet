/** Fixed test-report policy. Values are atomic USDC units on Stellar Testnet. */
export const testnetUsdcContract = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const testReportRecipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
export const testReportAmount = 5_000_000n;

/** Real broadcast stays blocked until the Soroban contract binds the recipient to the signed call. */
export const broadcastBlocker =
  "P0 open: WalletFoundation.spend(amount) does not bind the recipient in the signed invocation; " +
  "the owner can change it with set_policy before inclusion. Real Testnet broadcast is disabled.";
