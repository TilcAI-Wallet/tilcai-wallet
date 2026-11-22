"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./landing-hero.module.css";

const amount = "5,00 USDC";
const receiptDetails = [
  ["Agente", "Codex · Portátil"],
  ["Permiso", `Tope ${amount}`],
  ["Orden", "Informe de mercado"],
  ["Entrega", "Verificada"],
] as const;

const reducedMotion = "(prefers-reduced-motion: reduce)";

export function PrintedReceipt() {
  const stage = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLElement>(null);
  const motion = useRef<Animation>(null);
  const [printing, setPrinting] = useState(false);
  const [announcement, setAnnouncement] = useState("");

  const print = useCallback((announce: boolean) => {
    if (!paper.current || motion.current) return;
    if (announce) setAnnouncement("");

    const done = () => {
      setPrinting(false);
      if (announce) setAnnouncement(`Recibo de ejemplo. Pago de ${amount}.`);
    };
    if (window.matchMedia(reducedMotion).matches || !paper.current.animate) {
      done();
      return;
    }

    setPrinting(true);
    const animation = paper.current.animate(
      [
        { transform: "translateY(-105%)", offset: 0 },
        { transform: "translateY(-105%)", offset: .12, easing: "cubic-bezier(.38, .02, .24, .98)" },
        { transform: "translateY(-46%)", offset: .56, easing: "cubic-bezier(.22, .7, .24, 1)" },
        { transform: "translateY(1%)", offset: .9, easing: "ease-out" },
        { transform: "translateY(0)", offset: 1 },
      ],
      { duration: 1480 },
    );
    motion.current = animation;

    const settle = () => {
      if (motion.current !== animation) return;
      motion.current = null;
      done();
    };
    void animation.finished.then(settle, settle);
  }, []);

  useEffect(() => {
    const target = stage.current;
    if (!target) return;
    const prefersReduced = window.matchMedia(reducedMotion);
    const cancelIfReduced = () => {
      if (prefersReduced.matches) motion.current?.cancel();
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry || entry.intersectionRatio < .55) return;
      observer.disconnect();
      print(false);
    }, { threshold: .55 });
    observer.observe(target);
    prefersReduced.addEventListener("change", cancelIfReduced);

    return () => {
      observer.disconnect();
      prefersReduced.removeEventListener("change", cancelIfReduced);
      const animation = motion.current;
      motion.current = null;
      animation?.cancel();
    };
  }, [print]);

  return (
    <div className={styles.printer} ref={stage}>
      <div className={styles.printerFace} aria-hidden="true" />
      <div className={styles.ticketWindow}>
        <article className={styles.ticket} id="recibo" ref={paper} aria-labelledby="receipt-title">
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
      <button
        type="button"
        className={styles.replay}
        onClick={() => print(true)}
        aria-controls="recibo"
        aria-disabled={printing}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M21 4v6h-6m5.5 0a8.5 8.5 0 1 0 .4 3.8" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Repetir emisión
      </button>
      <span className="sr-only" role="status">{announcement}</span>
    </div>
  );
}
