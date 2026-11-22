const decimals = 7;

/** Unidades atómicas (cadena) → "19,50 USDC". Mínimo 2 decimales, hasta 7 si hacen falta. */
export function formatUsdc(atomic: string): string {
  const value = BigInt(atomic);
  const whole = (value / 10n ** BigInt(decimals)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const fraction = (value % 10n ** BigInt(decimals)).toString().padStart(decimals, "0").replace(/0+$/, "");
  return `${whole},${fraction.padEnd(2, "0")} USDC`;
}
