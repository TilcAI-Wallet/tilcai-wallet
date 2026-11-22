"use client";

import { CreditCard, LockKeyhole, ReceiptText, ShoppingBag } from "lucide-react";
import { ScrollStory } from "../story/scroll-story";
import { demoPurchase } from "../story/demo-purchase";
import { ParticleStage } from "./particle-stage";
import { PhoneSession } from "./phone-session";
import { walkthroughSteps } from "./walkthrough-steps";
import styles from "./walkthrough.module.css";

const icons = { card: CreditCard, limit: LockKeyhole, purchase: ShoppingBag, receipt: ReceiptText };

export function Walkthrough() {
  return (
    <ScrollStory
      id="como-funciona"
      title="Cómo funciona"
      note="Recorrido de la PWA · Stellar Testnet"
      className={styles.section}
      backdrop={(index) => <ParticleStage index={index} />}
      slides={walkthroughSteps.map(({ label, title, detail, phase }) => {
        const Icon = icons[phase];
        return {
          label,
          content: (
            <div className={styles.scene} data-wallet-phase={phase}>
              <div className={styles.copy}>
                <Icon size={25} strokeWidth={1.6} aria-hidden="true" />
                <h3>{title}</h3>
                <p>{detail}</p>
                {phase === "receipt" && (
                  <a href={demoPurchase.explorerUrl}>Ver transferencia en Stellar ↗</a>
                )}
              </div>
              <div className={styles.phone}><PhoneSession phase={phase} /></div>
            </div>
          ),
        };
      })}
    />
  );
}
