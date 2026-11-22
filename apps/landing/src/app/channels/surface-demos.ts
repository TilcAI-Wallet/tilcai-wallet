import { demoPurchase as purchase } from "../story/demo-purchase";
import type { SurfaceDemo } from "./channel-types";

export const surfaceDemos = [
  {
    id: "web",
    kind: "surface",
    surface: "web",
    name: "Web / PWA",
    status: "PWA disponible",
    detail: "Desde el panel ves el saldo, el tope y el recibo de cada sesión.",
    action: "Sesiones",
    result: purchase.order,
  },
  {
    id: "mobile",
    kind: "surface",
    surface: "mobile",
    name: "App móvil",
    status: "PWA instalable · app nativa en desarrollo",
    detail: "Abre TilcAI Wallet en tu celular e instala la PWA desde el navegador.",
    action: "Actividad",
    result: "Pago confirmado",
  },
  {
    id: "extension",
    kind: "surface",
    surface: "extension",
    name: "Extensión",
    status: "Vista prevista · extensión en desarrollo",
    detail: "La extensión presenta la operación en el navegador y remite las aprobaciones a la wallet.",
    action: "Resumen de orden",
    result: purchase.order,
  },
] as const satisfies readonly SurfaceDemo[];
