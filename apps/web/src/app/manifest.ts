import type { MetadataRoute } from "next";
import { palette, projectName } from "@tilcai-wallet/config";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: projectName,
    short_name: "TilcAI",
    start_url: "/",
    display: "standalone",
    background_color: palette.background,
    theme_color: palette.violet,
    icons: [{ src: "/wallet-icon.png", sizes: "512x512", type: "image/png" }],
  };
}
