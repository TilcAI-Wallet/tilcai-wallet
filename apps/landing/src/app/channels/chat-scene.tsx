import { BookOpen, Camera, CheckCheck, CornerUpLeft, Mic, MoreHorizontal, Paperclip, Smile } from "lucide-react";
import Image from "next/image";
import type { CSSProperties } from "react";
import { PhoneFrame } from "../walkthrough/phone-frame";
import type { ChatDemo } from "./channel-types";
import playback from "./playback.module.css";
import styles from "./chat-scene.module.css";

const arrival = [0, 720, 1520];

export function ChatScene({ scene }: { scene: ChatDemo }) {
  const telegram = scene.theme === "telegram";
  return (
    <PhoneFrame tone={telegram ? "light" : "dark"}>
      <figure className={styles.chat} data-theme={scene.theme} aria-label={`Recorrido de conversación en ${scene.name}`}>
        <div className={styles.header}>
          <span className={styles.avatar} aria-hidden="true" />
          <div><strong>TilcAI Wallet</strong><span>{telegram ? "Bot de Telegram" : "Cuenta de empresa"}</span></div>
          <span className={styles.brand} aria-hidden="true" />
          <MoreHorizontal size={17} aria-hidden="true" />
        </div>
        <div className={styles.thread}>
          <span className={styles.day}>Hoy</span>
          <ol className={styles.messages}>
            {scene.messages.map(({ from, text, time, title, attachment, actions }, index) => (
              <li className={`${styles.message} ${playback.cue}`} data-from={from} key={text}
                style={{ "--cue-delay": `${arrival[index] ?? index * 440}ms` } as CSSProperties}>
                <div className={styles.bubble}>
                  <span className="sr-only">{from === "you" ? "Tú: " : "TilcAI Wallet: "}</span>
                  {attachment && (
                    <div className={styles.attachment}>
                      <Image src="/brand/agent-card.webp" alt="Tarjeta lila de TilcAI Wallet" fill
                        sizes="220px" unoptimized />
                    </div>
                  )}
                  {title && <strong>{title}</strong>}
                  <p>{text}</p>
                  <span className={styles.meta} aria-hidden="true">{time}{from === "you" && <CheckCheck size={14} />}</span>
                </div>
                {actions && (
                  <div className={styles.keys} role="group" aria-label={telegram ? "Menú del bot" : "Respuestas rápidas"}>
                    {actions.map((row) => (
                      <div key={row.join(" ")} className={styles.keyRow}>
                        {row.map((action) => (
                          <span key={action}>{!telegram && <CornerUpLeft size={13} aria-hidden="true" />}{action}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
            <li className={`${styles.typing} ${playback.typing}`} aria-hidden="true"><i /><i /><i /></li>
          </ol>
        </div>
        <div className={styles.composer} aria-hidden="true">
          {telegram && <span className={styles.botMenu}><BookOpen size={13} /> Menú</span>}
          <div><Smile size={15} /><span>Mensaje</span><Paperclip size={14} /><Camera size={14} /></div>
          <span className={styles.mic}><Mic size={15} /></span>
        </div>
      </figure>
    </PhoneFrame>
  );
}
