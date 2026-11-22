import { demoPurchase as purchase } from "../story/demo-purchase";
import type { ChatDemo } from "./channel-types";

export const chatDemos = [
  {
    id: "whatsapp",
    kind: "chat",
    theme: "whatsapp",
    name: "WhatsApp",
    status: "Vista previa · WhatsApp Business",
    detail: "El bot ofrece respuestas rápidas para consultar el saldo o pedir el recibo.",
    messages: [
      { from: "wallet", title: purchase.agent, text: `Saldo ${purchase.balance}\n¿Qué quieres consultar?`, time: "09:41",
        actions: [["Ver saldo"], ["Ver recibo"]] },
      { from: "you", text: "Ver recibo", time: "09:42" },
      { from: "wallet", attachment: "card", title: purchase.order,
        text: `${purchase.payment} · Compra de demostración`, time: "09:42" },
    ],
  },
  {
    id: "telegram",
    kind: "chat",
    theme: "telegram",
    name: "Telegram",
    status: "Vista previa · bot de Telegram",
    detail: "El menú del bot reúne la wallet, el saldo y las sesiones en el mismo chat.",
    messages: [
      { from: "you", text: "/start", time: "09:41" },
      { from: "wallet", title: "Menú de TilcAI Wallet", text: "Elige una opción para tu sesión.", time: "09:41",
        actions: [["Mi wallet"], ["Saldo", "Sesiones"], ["Último recibo"]] },
      { from: "wallet", title: purchase.agent, text: `Saldo ${purchase.balance}\nÚltima compra ${purchase.payment}`, time: "09:42" },
    ],
  },
] as const satisfies readonly ChatDemo[];
