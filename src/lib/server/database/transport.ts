import "server-only";
import { DatabaseError } from "./errors.ts";

export function databaseFetch(timeoutMs: number): typeof fetch {
  return async (input, init) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const incoming = init?.signal;
    const signal = incoming ? AbortSignal.any([incoming, timeout]) : timeout;
    try { return await fetch(input, { ...init, signal, cache: "no-store", redirect: "error" }); }
    catch { throw new DatabaseError(); }
  };
}
export function assertDatabaseResult(error: unknown) {
  if (error) throw new DatabaseError();
}
