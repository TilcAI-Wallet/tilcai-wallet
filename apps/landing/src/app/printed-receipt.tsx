import styles from "./landing-hero.module.css";

const amount = "5,00 USDC";
const receiptDetails = [
  ["Agente", "Codex · Portátil"],
  ["Permiso", `Tope ${amount}`],
  ["Orden", "Informe de mercado"],
  ["Entrega", "Verificada"],
] as const;

export function PrintedReceipt() {
  return (
    <div className={styles.printer}>
      <div className={styles.printerFace} aria-hidden="true" />
      <div className={styles.ticketWindow}>
        <article className={styles.ticket} id="recibo" aria-labelledby="receipt-title">
          <h2 id="receipt-title">Recibo de compra</h2>
          <p className={styles.testNetwork}>Stellar Testnet · Ejemplo</p>
          <dl className={styles.ticketItems}>
            {receiptDetails.map(([label, value]) => (
              <div className={styles.ticketRow} key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p className={styles.total}>
            <span>Pago confirmado</span>
            <data value="5.00">{amount}</data>
          </p>
        </article>
      </div>
    </div>
  );
}
