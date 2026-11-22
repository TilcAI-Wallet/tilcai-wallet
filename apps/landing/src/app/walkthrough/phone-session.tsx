import Image from "next/image";
import { demoPurchase as purchase } from "../story/demo-purchase";
import { PhoneFrame } from "./phone-frame";
import styles from "./phone-session.module.css";

export type SessionPhase = "card" | "limit" | "purchase" | "receipt";
type WalletScreen = SessionPhase | "welcome" | "wallet";

const screens: Record<WalletScreen, [string, string]> = {
  card: ["tarjeta", `Tarjeta de la PWA con saldo de ${purchase.initial}.`],
  limit: ["sesiones", `Sesiones de la PWA con un tope de ${purchase.limit}.`],
  purchase: ["compra", `Tarjeta de la PWA después de la compra de demostración. Saldo ${purchase.balance}.`],
  receipt: ["recibo", `Recibo de demostración de la PWA por ${purchase.payment}.`],
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
