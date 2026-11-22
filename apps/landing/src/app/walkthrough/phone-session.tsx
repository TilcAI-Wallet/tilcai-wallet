import Image from "next/image";
import { PhoneFrame } from "./phone-frame";
import styles from "./phone-session.module.css";

export type SessionPhase = "card" | "limit" | "purchase" | "receipt";
type WalletScreen = SessionPhase | "welcome" | "wallet";

const screens: Record<WalletScreen, [string, string]> = {
  card: ["tarjeta", "Tarjeta Codex Portátil de la PWA con saldo de 20 USDC."],
  limit: ["sesiones", "Sesiones de la PWA con un tope de 0,50 USDC para Codex."],
  purchase: ["compra", "Tarjeta en la PWA después del pago. Saldo 19,50 USDC."],
  receipt: ["recibo", "Recibo de la PWA con pago de 0,50 USDC y el ledger 5859035 de Stellar Testnet."],
  welcome: ["inicio", "Pantalla de bienvenida de la PWA TilcAI Wallet."],
  wallet: ["wallet", "Inicio de TilcAI Wallet con saldo, actividad y navegación inferior."],
};

export function PhoneSession({ phase }: { phase: WalletScreen }) {
  const [filename, description] = screens[phase];
  return (
    <PhoneFrame>
      <Image src={`/brand/pwa/${filename}.webp`} alt={description} fill
        sizes="(max-width: 700px) 290px, 400px" className={styles.capture} unoptimized />
    </PhoneFrame>
  );
}
