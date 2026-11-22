import { ChevronRight, GitBranch, Plug, SquareTerminal } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { demoPurchase as purchase } from "../story/demo-purchase";
import type { TerminalDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./terminal-scene.module.css";

function cue(delay: number) {
  return { "--cue-delay": `${delay}ms` } as CSSProperties;
}

export function TerminalScene({ scene }: { scene: TerminalDemo }) {
  const health = scene.view === "health";

  return (
    <figure className={styles.terminal} data-theme={scene.theme} aria-label={`Recorrido de ${scene.name} en terminal`}>
      <div className={styles.bar}>
        <span className={styles.windowLights} aria-hidden="true"><i /><i /><i /></span>
        <span className={styles.workspace}>~/tilcai-wallet</span>
        <span className={styles.branch}><GitBranch size={13} aria-hidden="true" /> main</span>
      </div>
      <div className={styles.client}>
        <div className={styles.mark}>
          {health ? <SquareTerminal size={27} aria-hidden="true" />
            : <Image src={`/brand/channel-${scene.theme}.svg`} alt="" width={36} height={36} unoptimized />}
        </div>
        <div>
          <strong>{health ? "TilcAI Wallet CLI" : scene.name}</strong>
          <small>{health ? "Gateway local" : "TilcAI Wallet · stdio"}</small>
        </div>
        <span>Stellar Testnet</span>
      </div>
      <div className={styles.transcript}>
        <div className={styles.setup}>
          <span className={styles.label}>Shell · raíz del repo</span>
          <ol>
            {scene.setup.map((command, index) => (
              <li key={command} className={playback.cue} style={cue(index * 310)}>
                <span aria-hidden="true">$</span><code>{command}</code>
              </li>
            ))}
          </ol>
        </div>
        <div className={`${styles.prompt} ${playback.cue}`} style={cue(760)}>
          {health ? <span aria-hidden="true">$</span> : <ChevronRight size={15} aria-hidden="true" />}
          {health ? <code>{scene.prompt}</code> : <span>{scene.prompt}</span>}
        </div>
        <div className={`${styles.tool} ${playback.cue}`} style={cue(1120)}>
          <Plug size={14} aria-hidden="true" /><code>{scene.tool}</code>
        </div>
        {health && (
          <pre className={`${styles.response} ${playback.cue}`} style={cue(1420)}>
            <code>{'{ status: "ok", service: "wallet-api" }'}</code>
          </pre>
        )}
        <div className={`${styles.result} ${playback.cue}`} style={cue(1550)}>
          <div className={styles.resultTitle}>
            <span>{purchase.agent}</span><span>{health ? "Vista previa TUI" : "Respuesta de demostración"}</span>
          </div>
          <dl>
            <div><dt>Saldo de la tarjeta</dt><dd>{purchase.initial}</dd></div>
            <div><dt>Disponible para gastar</dt><dd>{purchase.limit}</dd></div>
          </dl>
        </div>
      </div>
      <div className={styles.footer}>
        <span className={styles.cursor} aria-hidden="true"><ChevronRight size={15} /><i /></span>
        <span>{health ? "wallet-api / health" : "tilcai-wallet / MCP"}</span>
      </div>
    </figure>
  );
}
