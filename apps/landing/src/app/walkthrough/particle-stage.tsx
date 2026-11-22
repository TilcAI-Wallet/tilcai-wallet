"use client";

import { useEffect, useRef } from "react";
import { sampleOutline } from "./particle-paths";
import styles from "./particle-stage.module.css";

const count = 540;
const size = 320;
const duration = 580;

function grain(index: number, salt: number) {
  const value = Math.sin(index * 41.413 + salt * 19.7201) * 43758.5453;
  return value - Math.floor(value);
}

export function ParticleStage({ index }: { index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previous = useRef<ReturnType<typeof sampleOutline>>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!context || !window.matchMedia("(min-width: 840px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)").matches) return;
    const target = sampleOutline(index, count);
    const from = previous.current ?? target;
    const start = performance.now();
    let frame = 0;

    function draw(now: number) {
      if (!context) return;
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - progress) ** 3;
      const drift = Math.sin(progress * Math.PI);
      context.clearRect(0, 0, size, size);
      for (let i = 0; i < count; i++) {
        const a = from[i];
        const b = target[i];
        const x = a.x + (b.x - a.x) * ease + (grain(i, 1) - .5) * (10 + drift * 32);
        const y = a.y + (b.y - a.y) * ease + (grain(i, 2) - .5) * (10 + drift * 32);
        context.globalAlpha = .27 + grain(i, 3) * .6;
        context.fillStyle = i % 5 === 0 ? "#a776dc" : "#55377d";
        context.beginPath();
        context.arc(x * 1.7 + 24, y * 1.7 + 24, .8 + grain(i, 4) * 1.28, 0, 2 * Math.PI);
        context.fill();
      }
      if (progress < 1 && from !== target) frame = requestAnimationFrame(draw);
    }

    draw(start);
    previous.current = target;
    return () => cancelAnimationFrame(frame);
  }, [index]);

  return <canvas ref={canvasRef} width={size} height={size} className={styles.particles} />;
}
