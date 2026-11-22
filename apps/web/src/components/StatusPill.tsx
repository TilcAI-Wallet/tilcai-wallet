const tones = {
  ok: "bg-emerald-100 text-emerald-900",
  wait: "bg-amber-100 text-amber-900",
  bad: "bg-red-100 text-red-900",
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof tones; children: string }) {
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}
