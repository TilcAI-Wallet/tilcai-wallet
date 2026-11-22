import { Icon, type IconName } from "./Icon";

const tiles = [
  { rotate: -12, x: 22, y: 40, cx: 62, cy: 80 },
  { rotate: 0, x: 118, y: 14, cx: 160, cy: 56 },
  { rotate: 12, x: 218, y: 40, cx: 258, cy: 80 },
] as const;

/** Ilustración de la marca: tres fichas conectadas a la wallet. Colores solo de la paleta, sin degradados. */
export function WalletArt({ icons, className }: { icons: readonly [IconName, IconName, IconName]; className?: string }) {
  return (
    <svg viewBox="0 0 320 260" className={className} aria-hidden="true">
      <ellipse cx="160" cy="236" rx="112" ry="14" fill="#c8a6ff" opacity=".18" />
      <g fill="none" stroke="#c8a6ff" strokeWidth="2.5" strokeLinecap="round">
        <path d="M60 124C60 150 125 138 128 168" />
        <path d="M160 98V168" />
        <path d="M260 124C260 150 195 138 192 168" />
      </g>
      {tiles.map((tile, i) => (
        <g key={i} transform={`rotate(${tile.rotate} ${tile.cx} ${tile.cy})`}>
          <rect x={tile.x} y={tile.y} width="84" height="84" rx="22" fill="#c8a6ff" opacity=".22" />
          <g color="#c8a6ff">
            <Icon name={icons[i]!} x={tile.x + 21} y={tile.y + 21} size={42} strokeWidth={1.6} />
          </g>
        </g>
      ))}
      <rect x="108" y="156" width="100" height="24" rx="12" fill="#c8a6ff" opacity=".7" />
      <rect x="95" y="168" width="130" height="70" rx="18" fill="#c8a6ff" />
      <image href="/img/logo/tilcai-logo.svg" x="118" y="182" width="50" height="46" />
      <rect x="198" y="190" width="42" height="30" rx="15" fill="#c8a6ff" stroke="#0b0b0d" strokeWidth="3" />
      <circle cx="220" cy="205" r="6" fill="#0b0b0d" />
      <rect x="128" y="224" width="64" height="32" rx="16" fill="#a7f3d0" />
      <g color="#0b0b0d">
        <Icon name="shield" x={148} y={228} size={24} strokeWidth={2} />
      </g>
      <g stroke="#a7f3d0" strokeWidth="4" strokeLinecap="round">
        <path d="M250 146l6 11M262 163l11 5M264 182h11" />
      </g>
    </svg>
  );
}
