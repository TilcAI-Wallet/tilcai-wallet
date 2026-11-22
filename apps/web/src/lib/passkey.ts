// Passkeys reales del navegador (WebAuthn). shortcut: el servidor no emite el desafío ni verifica la firma; solo se
// comprueba que el dispositivo autentique a la persona. Con la Wallet API, el desafío y la verificación pasan al servidor.
const storageKey = "tilcai_passkey_id";

export type PasskeyResult = { ok: true; simulated: boolean } | { ok: false; reason: "cancelled" | "none" | "error" };

const toBase64 = (buffer: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (text: string) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));
const supported = () => typeof window !== "undefined" && window.isSecureContext && "PublicKeyCredential" in window && !!navigator.credentials;
const challenge = () => crypto.getRandomValues(new Uint8Array(32));

export const hasStoredPasskey = () => typeof localStorage !== "undefined" && !!localStorage.getItem(storageKey);

export async function createPasskey(userName: string): Promise<PasskeyResult> {
  if (!supported()) return { ok: true, simulated: true };
  try {
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge: challenge(),
        rp: { name: "Tilcai Wallet" },
        user: { id: crypto.getRandomValues(new Uint8Array(16)), name: userName, displayName: userName },
        pubKeyCredParams: [
          { type: "public-key", alg: -7 },
          { type: "public-key", alg: -257 },
        ],
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
        timeout: 60_000,
      },
    })) as PublicKeyCredential | null;
    if (!credential) return { ok: false, reason: "error" };
    localStorage.setItem(storageKey, toBase64(credential.rawId));
    return { ok: true, simulated: false };
  } catch (error) {
    return { ok: false, reason: error instanceof DOMException && error.name === "NotAllowedError" ? "cancelled" : "error" };
  }
}

/** Pide al dispositivo que autentique con el passkey guardado. Sin passkey guardado: `none`. */
export async function verifyPasskey(): Promise<PasskeyResult> {
  const stored = localStorage.getItem(storageKey);
  if (!stored) return { ok: false, reason: "none" };
  if (!supported()) return { ok: true, simulated: true };
  try {
    await navigator.credentials.get({
      publicKey: {
        challenge: challenge(),
        allowCredentials: [{ type: "public-key", id: fromBase64(stored) }],
        userVerification: "required",
        timeout: 60_000,
      },
    });
    return { ok: true, simulated: false };
  } catch (error) {
    return { ok: false, reason: error instanceof DOMException && error.name === "NotAllowedError" ? "cancelled" : "error" };
  }
}

/** Describe este dispositivo a partir del navegador, para mostrarlo en la pantalla del passkey. */
export function describeDevice(userAgent: string): { device: string; method: string; backup: string } {
  if (/iPhone/.test(userAgent)) return { device: "iPhone", method: "Face ID o Touch ID", backup: "Sincronizado con iCloud" };
  if (/iPad/.test(userAgent)) return { device: "iPad", method: "Face ID o Touch ID", backup: "Sincronizado con iCloud" };
  if (/Android/.test(userAgent)) return { device: "Teléfono Android", method: "Huella o rostro", backup: "Sincronizado con Google" };
  if (/Macintosh/.test(userAgent)) return { device: "Mac", method: "Touch ID", backup: "Sincronizado con iCloud" };
  if (/Windows/.test(userAgent)) return { device: "PC con Windows", method: "Windows Hello", backup: "Guardado en este dispositivo" };
  return { device: "Este dispositivo", method: "Biometría del dispositivo", backup: "Guardado en este dispositivo" };
}
