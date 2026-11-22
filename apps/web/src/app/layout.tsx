import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { palette, projectName } from "@tilcai-wallet/config";
import "./globals.css";

export const metadata: Metadata = {
  title: projectName,
  description: "Control y evidencia para las compras de agentes.",
  appleWebApp: { capable: true, title: "TilcAI", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: palette.violet,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
