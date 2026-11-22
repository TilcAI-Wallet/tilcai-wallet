// Sin colores de error en la paleta: el estado lo dice siempre el texto; el color solo lo refuerza.
const tones = {
  ok: "bg-mint text-ink",
  wait: "bg-mist text-ink",
  bad: "border border-ivory text-ivory",
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof tones; children: string }) {
  return <span className={`rounded-full px-3 py-1 text-sm ${tones[tone]}`}>{children}</span>;
}
