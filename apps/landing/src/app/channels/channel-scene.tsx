import { mcpDocsUrl } from "../project-footer";
import type { ChannelDemo } from "./channel-types";
import { ChatScene } from "./chat-scene";
import { TerminalScene } from "./terminal-scene";
import { WalletSurfaceScene } from "./wallet-surface-scene";
import styles from "./channel-scene.module.css";

export function ChannelScene({ scene }: { scene: ChannelDemo }) {
  return (
    <div className={styles.scene} data-channel={scene.id}>
      <div className={styles.copy}>
        <h3>{scene.name}</h3>
        <p>{scene.detail}</p>
        <span>{scene.status}</span>
        {scene.kind === "terminal" && scene.view === "mcp" && (
          <a href={mcpDocsUrl}>Configurar la conexión MCP ↗</a>
        )}
      </div>
      <div className={styles.preview}>
        {scene.kind === "chat" && <ChatScene scene={scene} />}
        {scene.kind === "terminal" && <TerminalScene scene={scene} />}
        {scene.kind === "surface" && <WalletSurfaceScene scene={scene} />}
      </div>
    </div>
  );
}
