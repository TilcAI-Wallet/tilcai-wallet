import { ArrowRight, Check, ChevronRight, GitBranch, Plug, SquareTerminal } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import type { TerminalDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./terminal-scene.module.css";

export function TerminalScene({ scene }: { scene: TerminalDemo }) {
  return (
    <figure className={styles.terminal} data-theme={scene.theme} aria-label={`Recorrido de ${scene.name} en terminal`}>
      <div className={styles.bar}>
        <SquareTerminal size={17} aria-hidden="true" />
        <span className={styles.workspace}>tilcai-wallet</span>
        <span className={styles.branch}><GitBranch size={13} aria-hidden="true" /> main</span>
      </div>
      <div className={styles.client}>
        <div className={styles.mark}>
          {scene.theme === "cli" ? <SquareTerminal size={31} aria-hidden="true" />
            : <Image src={`/brand/channel-${scene.theme}.svg`} alt="" width={36} height={36} unoptimized />}
        </div>
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
      <div className={styles.footer}>
        <span className={styles.cursor} aria-hidden="true"><ChevronRight size={15} /><i /></span>
        <span>TilcAI Wallet · Stellar Testnet</span>
      </div>
    </figure>
  );
}
