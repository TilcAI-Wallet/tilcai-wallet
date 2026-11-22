export function SimulatedBadge({ simulated }: { simulated: boolean }) {
  if (!simulated) return null;
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-ivory/60 px-3 py-1 text-sm text-ivory">
      Datos simulados · adaptador de prueba
    </span>
  );
}
