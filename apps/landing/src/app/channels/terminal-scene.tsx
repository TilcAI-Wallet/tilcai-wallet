import { ArrowRight, Check, Plug, SquareTerminal } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { TerminalDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./terminal-scene.module.css";

export function TerminalScene({ scene }: { scene: TerminalDemo }) {
  return (
    <figure className={styles.terminal} data-theme={scene.theme} aria-label={`Terminal ilustrativa de ${scene.name}`}>
      <div className={styles.bar}>
        {scene.theme === "cli" ? <SquareTerminal size={24} aria-hidden="true" />
          : <Image src={`/brand/channel-${scene.theme}.svg`} alt="" width={29} height={29} unoptimized />}
        <strong>{scene.name}</strong>
        <span>{scene.theme === "cli" ? "CLI" : "MCP · stdio"}</span>
      </div>
      <ol className={styles.lines}>
        {scene.lines.map(({ tone, text }, index) => {
          const Icon = tone === "tool" ? Plug : tone === "result" ? Check : ArrowRight;
          return (
            <li key={text} data-tone={tone} className={`${styles.line} ${playback.cue}`}
              style={{ "--cue-delay": `${index * 460}ms` } as CSSProperties}>
              <Icon size={15} aria-hidden="true" />
              <code>{text}</code>
            </li>
          );
        })}
      </ol>
      <div className={styles.footer}>TilcAI Wallet <span>Stellar Testnet · Ejemplo</span></div>
    </figure>
  );
}
