import type { MetadataRoute } from "next";
import { projectName } from "@tilcai-wallet/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: projectName,
    short_name: "TilcAI",
    description: "Sigue el pago de tu agente y abre el recibo.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["finance"],
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    // El logo ocupa la zona segura central, así que el mismo PNG sirve como "maskable".
    icons: [
      { src: "/wallet-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/wallet-icon.png", sizes: "512x512", type: "image/png" },
      { src: "/wallet-icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
