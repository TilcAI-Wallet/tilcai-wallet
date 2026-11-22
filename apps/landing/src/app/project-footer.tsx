import { ArrowUp, ArrowUpRight } from "lucide-react";
import Image from "next/image";
import styles from "./project-footer.module.css";

export const walletUrl = "https://tilcai-wallet-pwa.vercel.app/";
export const repoUrl = "https://github.com/TilcAI-Wallet/tilcai-wallet";
export const mcpDocsUrl = `${repoUrl}/tree/main/apps/mcp#conexión-local`;

const groups = [
  {
    label: "Producto",
    links: [
      { text: "Cómo funciona", href: "#como-funciona" },
      { text: "Canales", href: "#canales" },
      { text: "Piloto en La Paz", href: "#piloto" },
    ],
  },
  {
    label: "Desarrolladores",
    links: [
      { text: "Conexión MCP", href: mcpDocsUrl },
      { text: "Código en GitHub", href: repoUrl },
      { text: "Stellar", href: "https://stellar.org/" },
    ],
  },
];

export function ProjectFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.invitation}>
          <h2>Tu wallet. Tus reglas.</h2>
          <div className={styles.actions}>
            <a href={walletUrl}>Abrir la wallet <ArrowUpRight size={16} aria-hidden="true" /></a>
            <a href="#como-funciona">Ver el recorrido <ArrowUp size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <div className={styles.directory}>
          <div className={styles.identity}>
            <Image src="/brand/tilcai-wallet.png" width={492} height={169} alt="TilcAI Wallet" unoptimized />
            <p>Presupuestos y recibos para compras de agentes de IA.</p>
          </div>
          {groups.map(({ label, links }) => (
            <nav key={label} aria-label={label}>
              <h3>{label}</h3>
              <ul>
                {links.map(({ text, href }) => (
                  <li key={href}>
                    <a href={href}>
                      {text} {href.startsWith("https:") && <ArrowUpRight size={14} aria-hidden="true" />}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className={styles.credit}>Hecho en La Paz, Bolivia</div>
      </div>
    </footer>
  );
}
