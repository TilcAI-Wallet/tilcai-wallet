// The PWA walkthrough uses the confirmed Testnet transfer recorded here.
const txHash = "0f624b09c43169743b81deacf956f3415dc5feef87ddb61fdd52f676a76143d8";

export const demoPurchase = {
  agent: "Codex · Portátil",
  order: "Informe de mercado",
  initial: "20,00 USDC",
  limit: "0,50 USDC",
  payment: "0,50 USDC",
  paymentValue: "0.50",
  balance: "19,50 USDC",
  remaining: "0,00 USDC",
  network: "Stellar Testnet",
  ledger: "5859035",
  explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
} as const;
