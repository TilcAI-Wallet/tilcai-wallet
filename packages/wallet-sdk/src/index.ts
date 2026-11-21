import { healthPath, healthSchema, type Health } from "@tilcai-wallet/api-contracts";
import { localApiUrl } from "@tilcai-wallet/config";

export function createWalletClient(baseUrl = localApiUrl) {
  return {
    async health(options: { signal?: AbortSignal } = {}): Promise<Health> {
      const response = await fetch(new URL(healthPath, baseUrl), {
        signal: options.signal,
      });
      if (!response.ok) {
        throw new Error(`Wallet API responded with HTTP ${response.status}`);
      }
      return healthSchema.parse(await response.json());
    },
  };
}
