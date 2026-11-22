export class RpcDeadlineError extends Error {
  constructor(readonly method: string) { super(`RPC ${method} exceeded its deadline`); }
}

/** Wrap every method of a read-only RPC client so a stalled call rejects instead of hanging the worker.
 * A rejection is handled like any RPC error: the attempt stays uncertain and nothing is released. */
export function withRpcDeadline<T extends object>(target: T, timeoutMs: number): T {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 60_000) throw new Error("invalid RPC deadline");
  return new Proxy(target, {
    get(object, property) {
      const value = Reflect.get(object, property, object) as unknown;
      if (typeof value !== "function") return value;
      return (...args: unknown[]) => {
        let timer: NodeJS.Timeout | undefined;
        const deadline = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new RpcDeadlineError(String(property))), timeoutMs); });
        return Promise.race([Promise.resolve().then(() => value.apply(object, args)), deadline]).finally(() => clearTimeout(timer));
      };
    },
  });
}
