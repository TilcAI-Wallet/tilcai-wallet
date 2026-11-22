/** Isotipo del repo como máscara (no se redibuja). Por defecto morado sobre negro; `color` cambia el relleno. */
export function Logo({ size = 40, color = "bg-accent" }: { size?: number; color?: string }) {
  return (
    <span
      role="img"
      aria-label="TilcAI Wallet"
      className={`inline-block shrink-0 ${color}`}
      style={{
        width: size,
        height: size * (280 / 304),
        mask: "url(/img/logo/tilcai-logo.svg) center / contain no-repeat",
        WebkitMask: "url(/img/logo/tilcai-logo.svg) center / contain no-repeat",
      }}
    />
  );
}

/** Firma horizontal: isotipo en placa morada + «Tilcai WALLET». */
export function Lockup({ size = 56, compact = false }: { size?: number; compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex items-center justify-center rounded-[22%] bg-accent" style={{ width: size, height: size }}>
        <Logo size={size * 0.62} color="bg-ink" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`${compact ? "text-3xl" : "text-4xl"} text-accent`}>Tilcai</span>
        <span className={`mt-1 ${compact ? "text-xs" : "text-sm"} tracking-[0.3em] text-accent`}>WALLET</span>
      </span>
    </div>
  );
}
