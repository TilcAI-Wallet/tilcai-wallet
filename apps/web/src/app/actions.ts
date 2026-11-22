"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getPrefs, prefsCookie, requireSession, sessionCookie, type Method, type Prefs } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { approvePairing, configureAgentCard, createPairing, findPairing, fund, LedgerError, rejectPairing, resolveRequest, setAgentPaused, setCodexSession, transfer } from "@/lib/ledger";
import { handleMcp } from "@/lib/mcp";
import { parseUsdc } from "@/lib/money";
import { demoAddress, isStellarAddress } from "@/lib/stellar";
import { parseUsername } from "@/lib/username";
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

export async function login(method: Method, username?: string): Promise<Result> {
  if (username !== undefined) {
    const parsed = parseUsername(username);
    if (!parsed.ok) return parsed;
    store().ownerName = parsed.value;
  }
  (await cookies()).set(sessionCookie, method, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return { ok: true };
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

export type PairingStatus = "waiting" | "connected" | "approved" | "missing";

/** Abre una vinculación con un código aleatorio de un solo uso; devuelve el código en `id`. */
export async function createPairingAction(client: string, alias: string, previous?: string): Promise<Result> {
  return guard(() => {
    const code = `tl_${randomBytes(18).toString("base64url")}`;
    return { ok: true, id: createPairing(store(), client, alias, code, new Date(), previous) };
  });
}

/** ¿Ya se conectó el agente? La pantalla lo consulta mientras espera. */
export async function pairingStatusAction(code: string): Promise<PairingStatus> {
  await requireSession();
  return findPairing(store(), code, new Date())?.status ?? "missing";
}

export async function approvePairingAction(code: string): Promise<Result> {
  return guard(() => ({ ok: true, id: approvePairing(store(), code, new Date()) }));
}

export async function rejectPairingAction(code: string): Promise<Result> {
  return guard(() => rejectPairing(store(), code));
}

const rpc = (id: number, method: string, params: unknown) => ({ jsonrpc: "2.0", id, method, params });

/** Hace de cliente MCP: llama al servidor con el código, igual que lo haría Claude o ChatGPT, sin salir de la app. */
export async function simulateConnectionAction(code: string): Promise<Result> {
  await requireSession();
  const reply = handleMcp(store(), code, rpc(1, "initialize", { protocolVersion: "2025-06-18", clientInfo: { name: "simulador-mcp", version: "1" } }), new Date());
  return reply.status === 200 ? { ok: true } : { ok: false, error: "El código venció. Vuelve atrás para generar uno nuevo." };
}

/** El agente conectado pide una compra de prueba de 0,50 USDC por el mismo camino MCP que usaría de verdad. */
export async function simulatePurchaseAction(agentId: string): Promise<Result> {
  await requireSession();
  const pairing = store().pairings.find((p) => p.agentId === agentId);
  if (!pairing) return { ok: false, error: "Este agente no se conectó por MCP." };
  const reply = handleMcp(store(), pairing.code, rpc(2, "tools/call", { name: "request_purchase", arguments: { amount: "0.50", description: "Compra de prueba (MCP simulado)" } }), new Date());
  const result = (reply.body as { result?: { isError?: boolean; content: { text: string }[] } } | undefined)?.result;
  refresh();
  return result?.isError ? { ok: false, error: result.content[0]?.text ?? "Compra rechazada." } : { ok: true };
}

export async function configureAgentCardAction(agentId: string, limitText: string, maxText: string): Promise<Result> {
  return guard(() => {
    const limit = parseUsdc(limitText);
    const max = parseUsdc(maxText);
    if (!limit || !max) return { ok: false, error: "Escribe montos válidos, por ejemplo 50 o 10,50." };
    configureAgentCard(store(), agentId, BigInt(limit), BigInt(max), new Date());
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
