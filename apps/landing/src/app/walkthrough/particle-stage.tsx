"use client";

import { useEffect, useRef } from "react";
import { sampleOutline } from "./particle-paths";
import styles from "./particle-stage.module.css";

const count = 1900;
const size = 160;
const duration = 600;
const motionQuery = "(min-width: 840px) and (min-height: 700px) and (prefers-reduced-motion: no-preference)";

function grain(index: number, salt: number) {
  const value = Math.sin(index * 41.413 + salt * 19.7201) * 43758.5453;
  return value - Math.floor(value);
}

const dots = Array.from({ length: count }, (_, index) => ({
  x: grain(index, 1) - .5,
  y: grain(index, 2) - .5,
  radius: .24 + grain(index, 3) * .33,
  opacity: .4 + grain(index, 4) * .52,
  color: index % 6 === 0 ? "#9f70d6" : "#573a7d",
}));

export function ParticleStage({ index }: { index: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previous = useRef<ReturnType<typeof sampleOutline>>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const media = window.matchMedia(motionQuery);
    const target = sampleOutline(index, count);
    const from = previous.current?.map((point) => ({ ...point })) ?? target;
    const current = from.map((point) => ({ ...point }));
    let start = performance.now();
    let frame = 0;

    function draw(now: number) {
      if (!context || !media.matches) return;
      const progress = Math.min(1, (now - start) / duration);
      const ease = 1 - (1 - progress) ** 3;
      const spread = 2.2 + Math.sin(progress * Math.PI) * 11;
      context.clearRect(0, 0, size, size);
      dots.forEach((dot, i) => {
        const point = current[i];
        point.x = from[i].x + (target[i].x - from[i].x) * ease;
        point.y = from[i].y + (target[i].y - from[i].y) * ease;
        context.globalAlpha = dot.opacity;
        context.fillStyle = dot.color;
        context.beginPath();
        context.arc(point.x + dot.x * spread, point.y + dot.y * spread, dot.radius, 0, 2 * Math.PI);
        context.fill();
      });
      context.globalAlpha = 1;
      previous.current = current;
      if (progress < 1 && from !== target) frame = requestAnimationFrame(draw);
    }

    const fit = () => {
      cancelAnimationFrame(frame);
      if (!media.matches) {
        previous.current = null;
        return;
      }
      const width = Math.round(canvas.clientWidth * Math.min(window.devicePixelRatio, 3));
      if (!width) return;
      if (canvas.width !== width) {
        canvas.width = width;
        canvas.height = width;
      }
      context.setTransform(width / size, 0, 0, width / size, 0, 0);
      if (from === target) start = performance.now() - duration;
      draw(performance.now());
    };
    const observer = new ResizeObserver(fit);
    observer.observe(canvas);
    media.addEventListener("change", fit);
    fit();
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      media.removeEventListener("change", fit);
    };
  }, [index]);

  return <canvas ref={canvasRef} width={size} height={size} className={styles.particles} aria-hidden="true" />;
}
