import type { MetadataRoute } from "next";
import { projectName } from "@tilcai-wallet/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: projectName,
    short_name: projectName,
    description: "Sigue el pago de tu agente y abre el recibo.",
    lang: "es",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    categories: ["finance"],
    background_color: "#0b0b0d",
    theme_color: "#0b0b0d",
    // El icono "maskable" va a sangre y con el logo dentro de la zona segura central.
    icons: [
      { src: "/wallet-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/wallet-icon.png", sizes: "512x512", type: "image/png" },
      { src: "/wallet-icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
