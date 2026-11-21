import type { Metadata } from "next";
import type { ReactNode } from "react";
import { projectName } from "@tilcai-wallet/config";
import "./globals.css";

export const metadata: Metadata = {
  title: projectName,
  description: "Control y evidencia para las compras de agentes.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
