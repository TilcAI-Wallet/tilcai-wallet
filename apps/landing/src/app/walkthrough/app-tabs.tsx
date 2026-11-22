"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { Cat, House, Layers, TrendingUp, UserRound } from "lucide-react";
import { PhoneFrame } from "./phone-frame";
import styles from "./app-tabs.module.css";

// Captures of the deployed PWA (bottom navigation), stored in public/brand/pwa/tabs/.
const tabs = [
  {
    id: "inicio",
    label: "Inicio",
    icon: House,
    image: "inicio-referencia.jpg",
    detail: "Saldo total, lo que tiene disponible el agente, accesos rápidos y la actividad reciente.",
    alt: "Inicio de la PWA con saldo total de 17,00 USDC, 0,50 USDC para el agente, accesos rápidos y actividad reciente.",
  },
  {
    id: "sesiones",
    label: "Sesiones",
    icon: Layers,
    image: "sesiones.webp",
    detail: "Cada sesión es una ventana de compra con tope. La sigues en curso y la terminas cuando quieras.",
    alt: "Sesiones de la PWA: Informe de mercado en curso con tope de 0,50 USDC y una compra de datos terminada.",
  },
  {
    id: "agentes",
    label: "Agentes",
    icon: Cat,
    image: "agentes-referencia.jpg",
    detail: "Una tarjeta por agente, con sus límites y su estado: activo, en pausa o al límite.",
    alt: "Agentes de la PWA: tarjetas apiladas de Codex · Portátil, Agente SEO y Agente Analítica con su estado.",
  },
  {
    id: "actividad",
    label: "Actividad",
    icon: TrendingUp,
    image: "actividad.webp",
    detail: "Entradas y salidas de la wallet, con filtros y el estado de cada movimiento.",
    alt: "Actividad de la PWA con filtros Todo, Entradas y Salidas y un fondeo de prueba completado.",
  },
  {
    id: "perfil",
    label: "Perfil",
    icon: UserRound,
    image: "perfil.webp",
    detail: "Nombre, método de acceso, dirección en Stellar Testnet, avisos y ajustes.",
    alt: "Perfil de la PWA con acceso por passkey, ajustes, notificaciones, dirección y tarjetas.",
  },
] as const;

export function AppTabs() {
  const [current, setCurrent] = useState(0);
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const active = tabs[current];

  const select = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    setCurrent(next);
    buttons.current[next]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const moves: Record<string, number> = {
      ArrowRight: current + 1, ArrowDown: current + 1,
      ArrowLeft: current - 1, ArrowUp: current - 1,
      Home: 0, End: tabs.length - 1,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key]);
  };

  return (
    <div className={styles.tour} aria-labelledby="app-tabs-title">
      <div className={styles.shell}>
        <header className={styles.heading}>
          <h3 id="app-tabs-title">La app, pestaña por pestaña</h3>
          <span>Capturas de la PWA · Datos de demostración</span>
        </header>

        <div className={styles.grid}>
          <div className={styles.tabs} role="tablist" aria-label="Pestañas de la PWA" onKeyDown={onKeyDown}>
            {tabs.map(({ id, label, icon: Icon }, index) => (
              <button
                key={id}
                ref={(node) => { buttons.current[index] = node; }}
                id={`app-tab-${id}`}
                type="button"
                role="tab"
                aria-selected={index === current}
                aria-controls="app-tab-panel"
                tabIndex={index === current ? 0 : -1}
                onClick={() => setCurrent(index)}
              >
                <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          <div className={styles.panel} id="app-tab-panel" role="tabpanel" aria-labelledby={`app-tab-${active.id}`}>
            <div className={styles.copy}>
              <h4>{active.label}</h4>
              <p>{active.detail}</p>
            </div>
            <div className={styles.phone}>
              <PhoneFrame>
                {tabs.map(({ id, alt, image }, index) => (
                  <Image
                    key={id}
                    src={`/brand/pwa/tabs/${image}`}
                    alt={index === current ? alt : ""}
                    aria-hidden={index !== current}
                    data-active={index === current}
                    fill
                    sizes="(max-width: 700px) 290px, 400px"
                    className={styles.capture}
                    unoptimized
                  />
                ))}
              </PhoneFrame>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
