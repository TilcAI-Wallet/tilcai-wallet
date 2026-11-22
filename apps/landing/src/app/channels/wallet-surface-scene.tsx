import { Layers, Puzzle, ShieldCheck } from "lucide-react";
import { demoPurchase as purchase } from "../story/demo-purchase";
import { PhoneFrame } from "../walkthrough/phone-frame";
import { PhoneSession } from "../walkthrough/phone-session";
import type { SurfaceDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./wallet-surface-scene.module.css";

export function WalletSurfaceScene({ scene }: { scene: SurfaceDemo }) {
  if (scene.surface !== "extension") {
    return <PhoneSession phase={scene.surface === "web" ? "wallet" : "welcome"} />;
  }
  return (
    <PhoneFrame>
      <div className={styles.browser} aria-label="Vista previa de la extensión">
        <div className={styles.tab}><Puzzle size={15} aria-hidden="true" /> TilcAI Wallet <span>Extensión</span></div>
        <div className={styles.panel}>
          <span className={styles.mark} aria-hidden="true" />
          <h4>{scene.action}</h4><p>{purchase.agent}</p>
          <dl className={`${styles.amounts} ${playback.cue}`}>
            <div><dt>Orden</dt><dd>{scene.result}</dd></div>
            <div><dt>Importe</dt><dd>{purchase.payment}</dd></div>
          </dl>
          <p className={`${styles.approval} ${playback.cue}`}><ShieldCheck size={17} aria-hidden="true" /> Revisión en la wallet</p>
        </div>
        <div className={styles.footer}><Layers size={14} aria-hidden="true" /> {purchase.network}</div>
      </div>
    </PhoneFrame>
  );
}
