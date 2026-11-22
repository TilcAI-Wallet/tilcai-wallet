export function SimulatedBadge({ simulated }: { simulated: boolean }) {
  if (!simulated) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-amber-600/40 bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-900">
      Datos simulados · adaptador de prueba
    </span>
  );
}
