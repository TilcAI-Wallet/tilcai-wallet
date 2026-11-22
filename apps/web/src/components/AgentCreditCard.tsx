import type { Agent, AgentStatus } from "@/lib/ledger";
import { Icon } from "./Icon";
import { AgentLogo, Logo } from "./Logo";

// Acabados de la tarjeta: solo tintes de la paleta (morado, marfil y ink) con brillo suave, como una tarjeta metálica.
const themes = {
  accent: {
    surface: "linear-gradient(135deg, color-mix(in srgb, #c8a6ff 80%, #fff) 0%, #c8a6ff 42%, color-mix(in srgb, #c8a6ff 58%, #0b0b0d) 100%)",
    text: "text-ink",
    sub: "text-ink/65",
    edge: "rgba(255,255,255,.45)",
    glow: "radial-gradient(70% 60% at 100% 100%, rgba(11,11,13,.28), transparent 70%)",
  },
  ivory: {
    surface: "linear-gradient(135deg, #fffefa 0%, #f8f6ee 45%, color-mix(in srgb, #f8f6ee 72%, #c8a6ff) 100%)",
    text: "text-ink",
    sub: "text-ink/60",
    edge: "rgba(255,255,255,.9)",
    glow: "radial-gradient(70% 60% at 100% 100%, rgba(200,166,255,.45), transparent 70%)",
  },
  ink: {
    surface: "linear-gradient(135deg, color-mix(in srgb, #0b0b0d 80%, #c8a6ff) 0%, #0b0b0d 55%, color-mix(in srgb, #0b0b0d 88%, #c8a6ff) 100%)",
    text: "text-ivory",
    sub: "text-ivory/65",
    edge: "rgba(248,246,238,.22)",
    glow: "radial-gradient(70% 60% at 100% 100%, rgba(200,166,255,.35), transparent 70%)",
  },
} as const;

const statusLabel: Record<AgentStatus, string> = { active: "Activo", paused: "En pausa", limit: "Al límite", setup: "Sin tarjeta" };

/** Logo del cliente al que pertenece la tarjeta: Claude, ChatGPT/Codex o, si no hay cliente, el isotipo de Tilcai. */
export function BrandMark({ brand, size }: { brand: Agent["brand"]; size: number }) {
  return brand === "tilcai" ? <Logo size={size} color="bg-current" /> : <AgentLogo name={brand} size={size} />;
}

/** Los 4 últimos caracteres del código de la tarjeta, como los dígitos finales de una tarjeta de crédito. */
export const lastFour = (code: string | null) => (code ? code.replace(/[^A-Z0-9]/gi, "").slice(-4).toUpperCase() : "••••");

/** Tarjeta de crédito de un agente. Su franja superior (nombre y estado) es lo único que se ve cuando va apilada. */
export function AgentCreditCard({ agent, status }: { agent: Agent; status: AgentStatus }) {
  const theme = themes[agent.theme];
  const noCard = agent.card === null;

  return (
    <div
      className={`relative aspect-[1.586] w-full overflow-hidden rounded-[1.6rem] ${theme.text}`}
      style={{
        background: theme.surface,
        boxShadow: `inset 0 1px 0 ${theme.edge}, inset 0 0 0 1px ${theme.edge}, 0 18px 36px -14px rgba(0,0,0,.75)`,
      }}
    >
      {/* Brillo y marca de agua: dan profundidad sin salirse de la paleta. */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(120% 90% at 0% 0%, rgba(255,255,255,.3), transparent 55%)" }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: theme.glow }} />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(115deg, transparent 38%, rgba(255,255,255,.14) 50%, transparent 62%)" }}
      />
      <span aria-hidden="true" className="card-sheen pointer-events-none absolute inset-0" style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,.34) 50%, transparent 60%)" }} />
      <span aria-hidden="true" className="pointer-events-none absolute -right-6 -bottom-10 opacity-[0.13]">
        <Logo size={190} color="bg-current" />
      </span>
      {noCard && <span aria-hidden="true" className="pointer-events-none absolute inset-2 rounded-[1.2rem] border border-dashed border-current opacity-40" />}

      <div className="relative flex h-full flex-col px-5 pt-3.5 pb-4">
        <div className="flex h-9 items-center gap-2.5">
          <BrandMark brand={agent.brand} size={26} />
          <span className="min-w-0 flex-1 truncate text-xl leading-none">{agent.name}</span>
          <span className={`shrink-0 rounded-full border border-current px-2.5 py-0.5 text-xs ${status === "active" ? "" : "opacity-80"}`}>{statusLabel[status]}</span>
        </div>

        <div className="mt-2 flex items-center justify-between">
          <svg width="46" height="35" viewBox="0 0 46 35" fill="none" aria-hidden="true">
            <rect x=".75" y=".75" width="44.5" height="33.5" rx="7" fill="currentColor" fillOpacity=".16" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5" />
            <path d="M.75 12h14M.75 23h14M31 12h14.25M31 23h14.25M15 .75v33.5M31 .75v33.5" stroke="currentColor" strokeOpacity=".4" strokeWidth="1.2" />
            <rect x="15" y="12" width="16" height="11" rx="3" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.2" />
          </svg>
          <svg width="26" height="30" viewBox="0 0 26 30" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" className="opacity-70">
            <path d="M5 9c2.4 3.6 2.4 8.4 0 12M11 5c4.2 6.2 4.2 14.8 0 21M17 1.5c6 8.4 6 18.6 0 27" />
          </svg>
        </div>

        <div className="mt-auto flex flex-col gap-1.5">
          <p className="font-data text-lg tracking-[0.18em]">••••&nbsp;••••&nbsp;••••&nbsp;{lastFour(agent.card)}</p>
          <div className={`flex items-end justify-between text-xs ${theme.sub}`}>
            <span className="flex flex-col leading-tight">
              <span className="text-[0.65rem] tracking-widest">VÁLIDA HASTA</span>
              <span className={`text-sm ${theme.text}`}>12/28</span>
            </span>
            <span className={`flex items-center gap-1.5 text-sm ${theme.text}`}>
              <Icon name="stellar" size={18} />
              USDC · Stellar
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
