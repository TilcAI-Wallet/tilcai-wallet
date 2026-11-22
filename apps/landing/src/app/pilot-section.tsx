import { ArrowUpRight } from "lucide-react";
import { repoUrl, walletUrl } from "./project-footer";
import styles from "./pilot-section.module.css";

const fit = [
  "Tus agentes compran datos, informes o APIs para clientes.",
  "Necesitas saber qué compró cada uno y para qué proyecto.",
  "Quieres poner un tope por agente y poder detenerlo al instante.",
];

export function PilotSection() {
  return (
    <section id="piloto" className={styles.section} aria-labelledby="piloto-title">
      <div className={styles.inner}>
        <header className={styles.heading}>
          <h2 id="piloto-title">Piloto en La Paz</h2>
          <span>Agencias y freelancers · Stellar Testnet</span>
        </header>

        <div className={styles.grid}>
          <div className={styles.copy}>
            <p className={styles.lead}>
              Buscamos agencias de automatización con IA y freelancers para probar TilcAI Wallet con sus propios agentes.
            </p>
            <h3>Es para ti si</h3>
            <ul className={styles.fit}>
              {fit.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className={styles.terms}>
              Conectas tus agentes, les asignas tarjetas en Stellar Testnet y revisamos contigo cada recibo. Los dos primeros
              meses del piloto son gratis.
            </p>
            <div className={styles.actions}>
              <a href={walletUrl}>Probar la wallet <ArrowUpRight size={16} aria-hidden="true" /></a>
              <a href={repoUrl}>Ver el código <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>

          <div className={styles.pricing}>
            <h3>Pagas por las tarjetas que usas</h3>
            <dl className={styles.tiers}>
              <div>
                <dt>Primera tarjeta</dt>
                <dd><strong>Gratis</strong></dd>
              </div>
              <div>
                <dt>Cada tarjeta activa adicional</dt>
                <dd><strong>US$4</strong> al mes</dd>
              </div>
            </dl>
            <p className={styles.example}>Una agencia con 4 agentes paga US$12 al mes.</p>
            <p className={styles.note}>
              Una tarjeta está activa si tuvo saldo o alguna compra en el mes. Las tarjetas congeladas o vacías no se cobran.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
