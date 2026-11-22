// shortcut: patrón con forma de QR (esquinas de posición + módulos pseudoaleatorios por semilla), no un QR escaneable.
// Sustituir por un generador real de QR cuando exista el protocolo de vinculación.
const size = 25;

function rng(seed: string) {
  let state = [...seed].reduce((hash, char) => (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0, 7);
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x >= size - 8 && y < 8) || (x < 8 && y >= size - 8);

function finder(x: number, y: number): boolean {
  const fx = x >= size - 8 ? x - (size - 8) : x;
  const fy = y >= size - 8 ? y - (size - 8) : y;
  if (fx === 7 || fy === 7 || fx < 0 || fy < 0) return false;
  const ring = Math.max(Math.abs(fx - 3), Math.abs(fy - 3));
  return ring !== 2;
}

export function QrArt({ seed, label }: { seed: string; label: string }) {
  const next = rng(seed);
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      if (inFinder(x, y) ? finder(x, y) : next() > 0.52) cells.push({ x, y });
    }
  return (
    <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={label} className="w-full rounded-2xl bg-ivory" shapeRendering="crispEdges">
      {cells.map(({ x, y }) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#0b0b0d" />
      ))}
    </svg>
  );
}
