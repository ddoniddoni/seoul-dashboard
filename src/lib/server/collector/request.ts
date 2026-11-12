import "server-only";

/** 인증을 통과한 요청에서도 본문 크기와 대기시간을 제한한다. 장소/URL 인자는 없다. */
export async function isEmptyCollectorRequest(request: Request): Promise<boolean> {
  if (new URL(request.url).search || Number(request.headers.get("content-length") ?? 0) > 1024) return false;
  if (!request.body) return true;
  const reader = request.body.getReader();
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(2000)]);
  let size = 0; let body = "";
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const part = await new Promise<ReadableStreamReadResult<Uint8Array>>((resolve, reject) => {
        const aborted = () => reject(new Error());
        if (signal.aborted) { aborted(); return; }
        signal.addEventListener("abort", aborted, { once: true });
        reader.read().then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
      });
      if (part.done) break;
      size += part.value.byteLength; if (size > 1024) return false;
      body += decoder.decode(part.value, { stream: true });
    }
    body += decoder.decode();
    if (!body.trim()) return true;
    const parsed: unknown = JSON.parse(body);
    return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length === 0;
  } catch { return false; }
  finally { void reader.cancel().catch(() => {}); try { reader.releaseLock(); } catch { /* 중단한 read가 종료되면 해제된다. */ } }
}
