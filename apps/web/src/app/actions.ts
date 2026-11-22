"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPrefs, prefsCookie, requireSession, sessionCookie, type Method, type Prefs } from "@/lib/auth";
import { fund, LedgerError, resolveRequest, setAgentPaused, setCodexSession, transfer } from "@/lib/ledger";
import { parseUsdc } from "@/lib/money";
import { demoAddress, isStellarAddress } from "@/lib/stellar";
import { resetDemo, store } from "@/lib/wallet";

export type Result = { ok: true; id?: string } | { ok: false; error: string };

const refresh = () => revalidatePath("/wallet", "layout");
const guard = async (run: () => Result | void): Promise<Result> => {
  await requireSession();
  try {
    const result = run();
    refresh();
    return result ?? { ok: true };
  } catch (error) {
    if (error instanceof LedgerError) return { ok: false, error: error.message };
    throw error;
  }
};

export async function login(method: Method): Promise<void> {
  (await cookies()).set(sessionCookie, method, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function logout(): Promise<void> {
  (await cookies()).delete(sessionCookie);
}

export async function fundWallet(amountText: string): Promise<Result> {
  return guard(() => {
    const amount = parseUsdc(amountText);
    if (!amount) return { ok: false, error: "Escribe un monto válido, por ejemplo 10 o 10,50." };
    if (BigInt(amount) > 1_000n * 10_000_000n) return { ok: false, error: "El faucet de Testnet entrega hasta 1.000 USDC por vez." };
    return { ok: true, id: fund(store(), BigInt(amount), new Date()) };
  });
}

export async function sendTransfer(to: string, amountText: string): Promise<Result> {
  return guard(() => {
    const destination = to.trim();
    if (!isStellarAddress(destination)) return { ok: false, error: "La dirección no es válida. Debe empezar con G y tener 56 caracteres." };
    if (destination === demoAddress) return { ok: false, error: "No puedes enviarte fondos a tu propia dirección." };
    const amount = parseUsdc(amountText);
    if (!amount) return { ok: false, error: "Escribe un monto válido, por ejemplo 10 o 10,50." };
    return { ok: true, id: transfer(store(), destination, BigInt(amount), new Date()) };
  });
}

export async function decideRequest(noticeId: string, approve: boolean): Promise<Result> {
  return guard(() => resolveRequest(store(), noticeId, approve));
}

export async function markAllRead(): Promise<Result> {
  return guard(() => void store().notices.forEach((notice) => (notice.read = true)));
}

export async function setAgentPausedAction(agentId: string, paused: boolean): Promise<Result> {
  return guard(() => setAgentPaused(store(), agentId, paused));
}

export async function setSessionActive(active: boolean): Promise<Result> {
  return guard(() => setCodexSession(store(), active));
}

export async function renameOwner(name: string): Promise<Result> {
  return guard(() => {
    const clean = name.trim().replace(/\s+/g, " ");
    if (clean.length < 2 || clean.length > 40) return { ok: false, error: "El nombre debe tener entre 2 y 40 caracteres." };
    store().ownerName = clean;
  });
}

export async function setPref(key: keyof Prefs, value: boolean): Promise<Result> {
  await requireSession();
  if (!["hideBalance", "notify", "requirePasskey"].includes(key)) return { ok: false, error: "Preferencia desconocida." };
  const prefs = { ...(await getPrefs()), [key]: value === true };
  (await cookies()).set(prefsCookie, JSON.stringify(prefs), { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  refresh();
  return { ok: true };
}

export async function resetAll(): Promise<Result> {
  return guard(() => resetDemo());
}
