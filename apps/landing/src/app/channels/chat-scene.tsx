import { CheckCheck, Send } from "lucide-react";
import type { CSSProperties } from "react";
import type { ChatDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./chat-scene.module.css";

const arrival = [0, 720, 1110, 1750];

export function ChatScene({ scene }: { scene: ChatDemo }) {
  return (
    <figure className={styles.chat} data-theme={scene.theme} aria-label={`Conversación simulada en ${scene.name}`}>
      <div className={styles.header}>
        <span className={styles.avatar} aria-hidden="true" />
        <div><strong>TilcAI Wallet</strong><span>{scene.name} · conversación de ejemplo</span></div>
        <span className={styles.brand} aria-hidden="true" />
      </div>
      <ol className={styles.messages}>
        {scene.messages.map(({ from, text, time }, index) => (
          <li className={`${styles.bubble} ${playback.cue}`} data-from={from} key={text}
            style={{ "--cue-delay": `${arrival[index] ?? index * 440}ms` } as CSSProperties}>
            <span className="sr-only">{from === "you" ? "Tú: " : "TilcAI Wallet: "}</span>
            <p>{text}</p>
            <span className={styles.meta} aria-hidden="true">{time}{from === "you" && <CheckCheck size={14} />}</span>
          </li>
        ))}
        <li className={`${styles.typing} ${playback.typing}`} aria-hidden="true"><i /><i /><i /></li>
      </ol>
      <div className={styles.footer}><Send size={14} aria-hidden="true" /> Consulta simulada · Stellar Testnet</div>
    </figure>
  );
}
