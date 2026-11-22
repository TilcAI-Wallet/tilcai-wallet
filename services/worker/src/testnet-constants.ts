/** Fixed test-report policy. Values are atomic USDC units on Stellar Testnet. */
export const testnetUsdcContract = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const testReportRecipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
export const testReportAmount = 5_000_000n;

/** WalletFoundation v2 binds recipient and policy revision to the signed spend. Real broadcast still
 * requires a reviewed activation, dedicated infrastructure and explicit human authorization. */
export const broadcastBlocker =
  "Broadcast gate closed: real Testnet broadcast requires a reviewed activation and explicit authorization. " +
  "Only WalletFoundation v2 spend(amount, recipient, expected_policy_revision) envelopes are prepared.";
