import { ScrollStory } from "../story/scroll-story";
import { channels } from "./channel-order";
import { ChannelScene } from "./channel-scene";
import styles from "./channel-story.module.css";

export function ChannelStory() {
  return (
    <ScrollStory
      id="canales"
      title="La misma wallet, varios canales"
      note="Recorrido de canales · Stellar Testnet"
      className={styles.section}
      slides={channels.map((scene) => ({ label: scene.name, content: <ChannelScene scene={scene} /> }))}
    />
  );
}
