/** Fixed test-report policy. Values are atomic USDC units on Stellar Testnet. */
export const testnetUsdcContract = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
export const testReportRecipient = "GAGK4SEOVSZDQXSBMO6KMUHNH36B3E2AZFDINVDFVRVV2ZYLP577OSHX";
export const testReportAmount = 5_000_000n;

/** WalletFoundation v2 binds recipient and policy revision to the signed spend. Broadcast is disabled by
 * default; single-authorized mode also needs one named order and a stored human authorization. */
export const broadcastBlocker =
  "Broadcast gate closed: TESTNET_BROADCAST accepts only disabled (default) or single-authorized with " +
  "TESTNET_BROADCAST_ORDER_ID and a stored human authorization for that order's exact envelope hash.";
