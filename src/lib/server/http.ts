import "server-only";
export function apiError(code: string, message: string, status: number, retryable = false) {
  return Response.json({ error: { code, message, retryable }, requestId: crypto.randomUUID() },
    { status, headers: { "Cache-Control": "no-store" } });
}
