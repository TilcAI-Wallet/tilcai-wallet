import { CircleCheck, ReceiptText } from "lucide-react";
import { demoPurchase } from "../story/demo-purchase";
import styles from "./receipt-view.module.css";

export function ReceiptView() {
  return (
    <div className={styles.receipt}>
      <ReceiptText size={20} aria-hidden="true" />
      <strong>Recibo de compra</strong>
      <span>{demoPurchase.order}</span>
      <dl>
        <div><dt>Permiso</dt><dd>{demoPurchase.limit}</dd></div>
        <div><dt>Pago</dt><dd>{demoPurchase.payment}</dd></div>
        <div><dt>Entrega</dt><dd>Verificada</dd></div>
      </dl>
      <p><CircleCheck size={13} aria-hidden="true" /> Pago confirmado</p>
    </div>
  );
}
