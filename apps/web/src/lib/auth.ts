import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const sessionCookie = "tilcai_session";
export const prefsCookie = "tilcai_prefs";
export type Method = "passkey" | "key" | "phrase" | "device";
export type Prefs = { hideBalance: boolean; notify: boolean; requirePasskey: boolean };
export const defaultPrefs: Prefs = { hideBalance: false, notify: true, requirePasskey: true };

// shortcut: la sesión es una cookie sin firmar que solo indica el método usado; es una simulación.
// Con la Wallet API real será una sesión emitida y verificada por el servidor (P0.1B).
export async function getSession(): Promise<Method | null> {
  const value = (await cookies()).get(sessionCookie)?.value;
  return value === "passkey" || value === "key" || value === "phrase" || value === "device" ? value : null;
}

export async function requireSession(): Promise<Method> {
  const method = await getSession();
  if (!method) redirect("/connect");
  return method;
}

export async function getPrefs(): Promise<Prefs> {
  try {
    const raw = (await cookies()).get(prefsCookie)?.value;
    const parsed = raw ? (JSON.parse(raw) as Partial<Prefs>) : {};
    return {
      hideBalance: parsed.hideBalance === true,
      notify: parsed.notify !== false,
      requirePasskey: parsed.requirePasskey !== false,
    };
  } catch {
    return defaultPrefs;
  }
}
