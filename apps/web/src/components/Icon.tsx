const paths = {
  robot: "M5 9h14a1 1 0 0 1 1 1v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a1 1 0 0 1 1-1zM12 9V6M9.5 13v2M14.5 13v2M2.5 12.5v3M21.5 12.5v3",
  code: "M7 8h10a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3zM12 8V5M10.5 12 9 13.5l1.5 1.5M13.5 12l1.5 1.5-1.5 1.5M12.8 11.5l-1.6 4",
  headset: "M5 14v-2a7 7 0 0 1 14 0v2M3.5 13.5h2.5v5H3.5zM18 13.5h2.5v5H18zM9.5 12v1.5M14.5 12v1.5M19 18.5c0 2-2 2.5-5 2.5",
  face: "M4 9V7a3 3 0 0 1 3-3h2M15 4h2a3 3 0 0 1 3 3v2M20 15v2a3 3 0 0 1-3 3h-2M9 20H7a3 3 0 0 1-3-3v-2M9 10v1.5M15 10v1.5M12 10v3.2M9 15.5c1.7 1.4 4.3 1.4 6 0",
  fingerprint:
    "M5 10a7 7 0 0 1 14 0v1M8 20c1-1.7 1.5-3.6 1.5-6a2.5 2.5 0 0 1 5 0c0 2.6-.4 4.8-1.4 6.8M12 14c0 2.6-.3 4.7-1 6.4M16.5 19.5c.7-1.6 1.2-3.6 1.2-6.2M5.5 17c.7-1 1-2 1-3.5V12a5.5 5.5 0 0 1 9-4.2",
  shield: "M12 3l7 3v5.5c0 4.4-3 7.8-7 9.5-4-1.7-7-5.1-7-9.5V6zM9 12l2.2 2.2L15.5 10",
  key: "M10.5 12.5 19 4M16 7l2.5 2.5M14 9l2 2M8 11.5a3.75 3.75 0 1 1 0 7.5 3.75 3.75 0 0 1 0-7.5z",
  list: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  scan: "M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2",
  phone: "M9.5 3h5A2.5 2.5 0 0 1 17 5.5v13a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 7 18.5v-13A2.5 2.5 0 0 1 9.5 3z",
  cloud: "M7 18.5a4 4 0 0 1-.6-7.95A5.5 5.5 0 0 1 17 9a4.75 4.75 0 0 1 .5 9.5z",
  check: "M5 12.5l4.5 4.5L19 7",
  bell: "M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0",
  gear: "M10.3 3.5h3.4l.5 2.1 1.7 1 2-.8 1.7 3-1.5 1.5v2l1.5 1.5-1.7 3-2-.8-1.7 1-.5 2.1h-3.4l-.5-2.1-1.7-1-2 .8-1.7-3 1.5-1.5v-2L4.4 9.8l1.7-3 2 .8 1.7-1zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z",
  plus: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 8v8M8 12h8",
  card: "M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2zM3 10h18M7 15h3",
  send: "M21 3 10 14M21 3l-7 18-4-7-7-4z",
  chevron: "M9 6l6 6-6 6",
  layers: "M12 3 3 8l9 5 9-5zM3 12.5l9 5 9-5",
  home: "M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z",
  agent: "M5 18.5v-10L6.5 4 10 6.5h4L17.5 4 19 8.5v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1zM9.5 12v2M14.5 12v2",
  trend: "M3 17l5-6 4 3 5-8 4 4",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 20a7.5 7.5 0 0 1 15 0z",
  coins: "M12 4c4.4 0 8 1.1 8 2.5S16.4 9 12 9 4 7.9 4 6.5 7.6 4 12 4zM4 6.5v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5M4 11.5v5c0 1.4 3.6 2.5 8 2.5s8-1.1 8-2.5v-5",
  stellar: "M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM4 14l16-6.5M4 17.5l16-6.5",
} as const;

export type IconName = keyof typeof paths;

type Props = { name: IconName; size?: number; strokeWidth?: number; x?: number; y?: number; className?: string };

/** Iconos de trazo simple sobre rejilla de 24 px. Decorativos: el texto vecino da el significado. */
export function Icon({ name, size = 24, strokeWidth = 1.8, x, y, className }: Props) {
  return (
    <svg
      x={x}
      y={y}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={paths[name]} />
    </svg>
  );
}
