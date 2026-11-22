import { CircleCheck, CircleDollarSign, ShieldCheck } from "lucide-react";
import { demoPurchase } from "../story/demo-purchase";
import { PhoneFrame } from "./phone-frame";
import { ReceiptView } from "./receipt-view";
import { SessionCard } from "./session-card";
import styles from "./phone-session.module.css";

export type SessionPhase = "card" | "limit" | "purchase" | "receipt";

export function PhoneSession({ phase }: { phase: SessionPhase }) {
  return (
    <PhoneFrame>
      <div className={styles.session}>
        <div className={styles.title}><span>Sesión del agente</span><strong>{demoPurchase.agent}</strong></div>
        {phase === "receipt" ? <ReceiptView /> : (
          <>
            <SessionCard spent={phase === "purchase"} />
            {phase === "purchase" ? (
              <div className={styles.activity}>
                <CircleCheck size={15} aria-hidden="true" />
                <span>{demoPurchase.order}<small>Pago confirmado</small></span>
                <b>{demoPurchase.payment}</b>
              </div>
            ) : (
              <div className={styles.activity}>
                {phase === "limit" ? <ShieldCheck size={15} aria-hidden="true" /> : <CircleDollarSign size={15} aria-hidden="true" />}
                <span>{phase === "limit" ? "Tope de gasto" : "Estado"}<small>{phase === "limit" ? "Ventana de gasto" : "Tarjeta de presupuesto"}</small></span>
                <b>{phase === "limit" ? demoPurchase.limit : "Activa"}</b>
              </div>
            )}
          </>
        )}
        <div className={styles.network}>{demoPurchase.network} · Ejemplo</div>
      </div>
    </PhoneFrame>
  );
}
