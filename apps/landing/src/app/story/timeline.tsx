import styles from "./timeline.module.css";

export function Timeline({ labels, current }: { labels: readonly string[]; current: number }) {
  return (
    <ol className={styles.timeline} aria-label="Progreso de la demostración">
      {labels.map((label, index) => (
        <li key={label} aria-current={index === current ? "step" : undefined}>
          <span className="sr-only">{label}</span>
        </li>
      ))}
    </ol>
  );
}
