import { useId } from "react";
import { Icon, type IconName } from "./Icon";

// Fichas de los agentes: giradas y con un brillo morado suave detrás, como en la ilustración de la marca.
const tiles = [
  { rotate: -8, x: 50, y: 82 },
  { rotate: 0, x: 156, y: 58 },
  { rotate: 8, x: 261, y: 82 },
] as const;
const size = 89;

/** Ilustración de la marca: tres fichas de agentes conectadas a la wallet. Solo colores de la paleta (morado, marfil, menta, ink). */
export function WalletArt({ icons, className }: { icons: readonly [IconName, IconName, IconName]; className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="30 40 340 310" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-tile`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b3d66" />
          <stop offset="1" stopColor="#2b2240" />
        </linearGradient>
        <radialGradient id={`${id}-floor`}>
          <stop offset="0" stopColor="#c8a6ff" stopOpacity=".34" />
          <stop offset="1" stopColor="#c8a6ff" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <ellipse cx="200" cy="323" rx="136" ry="22" fill={`url(#${id}-floor)`} />

      {tiles.map((tile, i) => (
        <g key={`glow-${i}`} transform={`rotate(${tile.rotate} ${tile.x + size / 2} ${tile.y + size / 2})`}>
          <rect x={tile.x + 4} y={tile.y + 8} width={size - 8} height={size - 8} rx="24" fill="#c8a6ff" opacity=".3" filter={`url(#${id}-glow)`} />
        </g>
      ))}

      {/* Cables: bajan de cada ficha y entran a la wallet por detrás del frente. */}
      <g fill="none" stroke="#c8a6ff" strokeWidth="3.4" strokeLinecap="round">
        <path d="M96 167c0 27 30 25 56 28 13 2 14 12 14 29" />
        <path d="M200 146V226" />
        <path d="M304 167c0 27-30 25-56 28-13 2-14 12-14 29" />
      </g>

      {tiles.map((tile, i) => (
        <g key={i} transform={`rotate(${tile.rotate} ${tile.x + size / 2} ${tile.y + size / 2})`}>
          <rect x={tile.x} y={tile.y} width={size} height={size} rx="25" fill={`url(#${id}-tile)`} stroke="#c8a6ff" strokeOpacity=".22" strokeWidth="1.2" />
          <rect x={tile.x + 1} y={tile.y + 1} width={size - 2} height={size / 2} rx="24" fill="#fff" opacity=".04" />
          <g color="#f8f6ee">
            <Icon name={icons[i]!} x={tile.x + 21} y={tile.y + 21} size={47} strokeWidth={1.9} />
          </g>
        </g>
      ))}

      {/* Wallet: solapa trasera, cuerpo, cierre, gato de la marca y escudo. */}
      <rect x="136" y="212" width="128" height="62" rx="20" fill="#a287cf" />
      <rect x="123" y="226" width="153" height="96" rx="24" fill="#c8a6ff" />
      <rect x="124" y="227" width="151" height="40" rx="23" fill="#fff" opacity=".1" />
      <rect x="240" y="246" width="46" height="39" rx="19.5" fill="#c8a6ff" stroke="#0b0b0d" strokeWidth="3.2" />
      <circle cx="265" cy="265.5" r="7.5" fill="#0b0b0d" />

      <g transform="translate(146.5 236) scale(.2)">
        <path
          fill="#0b0b0d"
          stroke="#0b0b0d"
          strokeWidth="14"
          strokeLinejoin="round"
          d="M88 94 L136 138 L243 129 L336 45 L318 245 Q314 275 282 279 L100 296 Q58 296 58 268 L58 180 Q58 172 62 164 Z"
          transform="translate(-46 -30)"
        />
        <rect x="135" y="181" width="30" height="70" rx="15" fill="#f8f6ee" transform="translate(-46 -30)" />
        <rect x="230" y="175" width="31" height="70" rx="15.5" fill="#f8f6ee" transform="translate(-46 -30)" />
      </g>

      <rect x="162" y="299" width="76" height="37" rx="18.5" fill="#a7f3d0" />
      <g color="#0b0b0d">
        <Icon name="shield" x={188} y={303} size={26} strokeWidth={1.9} />
      </g>

      {/* Las tres rayas de asombro destellan una tras otra. */}
      <g stroke="#a7f3d0" strokeWidth="4.6" strokeLinecap="round">
        <path className="spark" style={{ animationDelay: "0s" }} d="M286 222l8-11" />
        <path className="spark" style={{ animationDelay: ".35s" }} d="M294 232l16-6" />
        <path className="spark" style={{ animationDelay: ".7s" }} d="M295 243l14 4" />
      </g>
    </svg>
  );
}
