import { demoPurchase as purchase } from "../story/demo-purchase";
import type { ChatDemo } from "./channel-types";

export const chatDemos = [
  {
    id: "whatsapp",
    kind: "chat",
    theme: "whatsapp",
    name: "WhatsApp",
    status: "Flujo previsto",
    detail: "Consulta el saldo de una tarjeta y el importe que aún puede usar el agente.",
    messages: [
      { from: "you", text: "¿Cuánto le queda a Codex?", time: "09:41" },
      { from: "wallet", text: `Saldo de la tarjeta: ${purchase.balance}.\nDisponible para gastar: ${purchase.remaining}.`, time: "09:41" },
      { from: "you", text: "Muéstrame la última compra.", time: "09:42" },
      { from: "wallet", text: `${purchase.order} · ${purchase.payment}\nTransferencia confirmada en Stellar Testnet.`, time: "09:42" },
    ],
  },
  {
    id: "telegram",
    kind: "chat",
    theme: "telegram",
    name: "Telegram",
    status: "Adaptador en desarrollo",
    detail: "Consulta tu sesión y encuentra el recibo de la compra en el mismo chat.",
    messages: [
      { from: "you", text: "Mi wallet", time: "09:41" },
      { from: "wallet", text: `Sesión vinculada: ${purchase.agent}.\nSaldo: ${purchase.balance}.`, time: "09:41" },
      { from: "you", text: "Ver recibo", time: "09:42" },
      { from: "wallet", text: `${purchase.payment} · ${purchase.order}\nStellar Testnet · Ledger ${purchase.ledger}`, time: "09:42" },
    ],
  },
] as const satisfies readonly ChatDemo[];
