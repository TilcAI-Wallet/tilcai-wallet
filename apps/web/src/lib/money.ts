const decimals = 7;
const unit = 10n ** BigInt(decimals);

/** Unidades atómicas (cadena) → "19,50 USDC". Mínimo 2 decimales, hasta 7 si hacen falta. */
export function formatUsdc(atomic: string): string {
  const value = BigInt(atomic);
  const whole = (value / unit).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = (value % unit).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole},${fraction.padEnd(2, "0")} USDC`;
}

/** Texto escrito por la persona ("12", "12,5", "12.50") → unidades atómicas, o null si no es un importe positivo válido. */
export function parseUsdc(input: string): string | null {
  const match = /^(\d{1,12})(?:[.,](\d{1,7}))?$/.exec(input.trim());
  if (!match) return null;
  const value = BigInt(match[1]!) * unit + BigInt((match[2] ?? "").padEnd(decimals, "0"));
  return value > 0n ? value.toString() : null;
}
