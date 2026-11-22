import Image from "next/image";
import { projectName } from "@tilcai-wallet/config";
import { PrintedReceipt } from "./printed-receipt";
import styles from "./landing-hero.module.css";

export function LandingHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Image
          src="/brand/tilcai-wallet.png"
          width={492}
          height={169}
          className={styles.logo}
          alt={projectName}
          unoptimized
        />
        <nav className={styles.nav} aria-label="Navegación">
          <a href="#canales">Canales</a>
          <a href="#piloto">Piloto</a>
        </nav>
      </div>
    </header>
  );
}

export function LandingHero() {
  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.heroInner}>
        <div>
          <h1 className={styles.title} id="landing-title">
            <span>Tu agente compra.</span>
            <span>Tú pones el límite.</span>
          </h1>
          <a className={styles.primary} href="#como-funciona">
            Cómo funciona
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M12 5v14m-5-5 5 5 5-5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>

        <figure className={styles.artifact}>
          <div className={styles.card}>
            <Image
              src="/brand/agent-card.webp"
              width={1536}
              height={1024}
              alt="Tarjeta de presupuesto lila de TilcAI Wallet"
              preload
              unoptimized
            />
            <Image
              src="/brand/agent-engraving.svg"
              width={1536}
              height={1024}
              className={styles.engraving}
              alt=""
              aria-hidden="true"
              unoptimized
            />
          </div>
          <PrintedReceipt />
        </figure>
      </div>
    </section>
  );
}
