import { demoPurchase } from "../story/demo-purchase";
import styles from "./session-card.module.css";

export function SessionCard({ spent }: { spent: boolean }) {
  return (
    <div className={styles.card}>
      <span className={styles.mark} aria-hidden="true" />
      <span>Saldo de la tarjeta</span>
      <strong>{spent ? demoPurchase.balance : demoPurchase.initial}</strong>
      <div>
        <span>Disponible para el agente</span>
        <b>{spent ? demoPurchase.remaining : demoPurchase.limit}</b>
      </div>
    </div>
  );
}
