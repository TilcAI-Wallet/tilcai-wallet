// Validación de claves Stellar (strkey): base32 + versión + CRC16-XModem. Sin dependencias.
const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const versions = { address: 6 << 3, secret: 18 << 3 } as const;

function crc16(bytes: number[]): number {
  let crc = 0;
  for (const byte of bytes) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function base32Decode(text: string): number[] | null {
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of text) {
    const index = alphabet.indexOf(char);
    if (index < 0) return null;
    value = (value << 5) | index;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return out;
}

function base32Encode(bytes: number[]): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

export function encodeStrkey(kind: keyof typeof versions, payload: number[]): string {
  const data = [versions[kind], ...payload];
  const crc = crc16(data);
  return base32Encode([...data, crc & 0xff, crc >> 8]);
}

function isStrkey(kind: keyof typeof versions, text: string): boolean {
  if (text.length !== 56) return false;
  const bytes = base32Decode(text);
  if (!bytes || bytes.length !== 35 || bytes[0] !== versions[kind]) return false;
  const crc = crc16(bytes.slice(0, 33));
  return (crc & 0xff) === bytes[33] && crc >> 8 === bytes[34];
}

export const isStellarAddress = (text: string) => isStrkey("address", text.trim());
export const isStellarSecret = (text: string) => isStrkey("secret", text.trim());

/** "GABC…WXYZ": suficiente para reconocer una dirección sin mostrarla entera. */
export const shortKey = (key: string) => (key.length > 12 ? `${key.slice(0, 5)}…${key.slice(-5)}` : key);

/** Dirección de ejemplo de la cuenta simulada (válida: pasa el checksum), derivada de un payload fijo. */
export const demoAddress = encodeStrkey("address", Array.from({ length: 32 }, (_, i) => (i * 37 + 11) & 0xff));
