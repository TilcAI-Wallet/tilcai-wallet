import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { projectName } from "@tilcai-wallet/config";
import "./globals.css";

const bargain = localFont({ src: "../fonts/bargain.otf", weight: "400", display: "swap" });

export const metadata: Metadata = {
  title: projectName,
  description: "Control y evidencia para las compras de agentes.",
  appleWebApp: { capable: true, title: projectName, statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={bargain.className}>
      <body>{children}</body>
    </html>
  );
}
