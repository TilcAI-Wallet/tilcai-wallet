/** Nombre de usuario del passkey: 3 a 20 caracteres, sin espacios. Devuelve el texto limpio o el motivo del rechazo. */
export function parseUsername(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const value = input.trim();
  if (value.length < 3 || value.length > 20) return { ok: false, error: "El nombre de usuario debe tener entre 3 y 20 caracteres." };
  if (!/^[\p{L}\d._-]+$/u.test(value)) return { ok: false, error: "Usa solo letras, números, punto, guion o guion bajo, sin espacios." };
  return { ok: true, value };
}
