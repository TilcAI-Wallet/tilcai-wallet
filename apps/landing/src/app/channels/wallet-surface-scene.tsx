import { BadgeCheck, PanelsTopLeft, Puzzle, Smartphone } from "lucide-react";
import { demoPurchase as purchase } from "../story/demo-purchase";
import { PhoneSession } from "../walkthrough/phone-session";
import type { SurfaceDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./wallet-surface-scene.module.css";

export function WalletSurfaceScene({ scene }: { scene: SurfaceDemo }) {
  const Icon = scene.surface === "extension" ? Puzzle : scene.surface === "mobile" ? Smartphone : PanelsTopLeft;

  if (scene.surface === "mobile") {
    return (
      <figure className={`${styles.mobile} ${playback.cue}`} aria-label="Escena de la app móvil">
        <PhoneSession phase="purchase" />
      </figure>
    );
  }

  return (
    <figure className={styles.surface} data-surface={scene.surface} aria-label={`Vista ilustrativa de ${scene.name}`}>
      <header><Icon size={17} aria-hidden="true" /><strong>TilcAI Wallet</strong><span>{scene.action}</span></header>
      <div className={styles.body}>
        <div className={styles.agent}><b>{purchase.agent}</b><span>{purchase.network}</span></div>
        <dl className={`${styles.amounts} ${playback.cue}`}>
          <div><dt>Saldo de la tarjeta</dt><dd>{purchase.balance}</dd></div>
          <div><dt>Disponible</dt><dd>{purchase.remaining}</dd></div>
        </dl>
        <div className={`${styles.result} ${playback.cue}`}>
          <BadgeCheck size={18} aria-hidden="true" /> <strong>{scene.result}</strong><span>{purchase.payment}</span>
        </div>
      </div>
    </figure>
  );
}
