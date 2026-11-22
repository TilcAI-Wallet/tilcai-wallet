import { demoPurchase as purchase } from "../story/demo-purchase";
import type { SessionPhase } from "./phone-session";

export const walkthroughSteps = [
  {
    phase: "card",
    label: "Tarjeta",
    title: "Dale una tarjeta a tu agente.",
    detail: `La sesión de ${purchase.agent} arranca con ${purchase.initial} de saldo propio.`,
  },
  {
    phase: "limit",
    label: "Límite",
    title: "Tú fijas cuánto puede gastar.",
    detail: `El agente dispone de ${purchase.limit} en su ventana de gasto. El resto sigue en la tarjeta.`,
  },
  {
    phase: "purchase",
    label: "Compra",
    title: "El agente hace la compra.",
    detail: `El informe cuesta ${purchase.payment}. Quedan ${purchase.balance} en la tarjeta y el tope disponible baja a cero.`,
  },
  {
    phase: "receipt",
    label: "Recibo",
    title: "Tú puedes verificarla.",
    detail: "El recibo reúne el permiso, la orden, el pago y la evidencia de entrega.",
  },
] as const satisfies readonly { phase: SessionPhase; label: string; title: string; detail: string }[];
