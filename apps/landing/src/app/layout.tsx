import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import { projectName } from "@tilcai-wallet/config";
import "./globals.css";

const sans = localFont({
  src: "./schibsted-grotesk-latin.woff2",
  weight: "400 900",
  display: "swap",
  variable: "--font-schibsted",
});
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: `${projectName}: tarjetas de gasto para agentes de IA`,
  description:
    "Dale a cada agente de IA una tarjeta con saldo y tope propios. Apruebas desde el celular y cada compra deja un recibo verificable en Stellar.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
