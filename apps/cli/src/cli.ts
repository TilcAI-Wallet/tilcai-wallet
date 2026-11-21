import { Command } from "commander";
import { localApiUrl, projectVersion } from "@tilcai-wallet/config";
import { createWalletClient } from "@tilcai-wallet/wallet-sdk";

const program = new Command()
  .name("tilcai-wallet")
  .description("CLI de TilcAI Wallet")
  .version(projectVersion);

program
  .command("health")
  .description("Consultar el punto de salud de la API")
  .option("--api-url <url>", "URL de desarrollo", process.env.WALLET_API_URL || localApiUrl)
  .action(async ({ apiUrl }: { apiUrl: string }) => {
    const client = createWalletClient(apiUrl);
    console.log(await client.health({ signal: AbortSignal.timeout(5000) }));
  });

try {
  await program.parseAsync();
} catch (error: unknown) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
