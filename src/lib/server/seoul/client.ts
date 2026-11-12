import "server-only";
import { performance } from "node:perf_hooks";
import { adaptSeoulXml, type SeoulObservation } from "./adapter.ts";
import { createSeoulRequestUrl, SEOUL_MAX_BYTES, SEOUL_TIMEOUT_MS, type SeoulConfig } from "./config.ts";
import { SeoulApiError } from "./errors.ts";

interface ClientOptions {
  signal?: AbortSignal;
  fetch?: typeof globalThis.fetch;
  clock?: () => Date;
}
export interface SeoulFetchResult extends SeoulObservation {
  request: { areaCode: string; fetchedAt: string; bytes: number; durationMs: number; upstreamCode: "INFO-000" };
}

export function readRetryAfter(value: string | null, now: number): number | null {
  if (!value) return null;
  if (/^\d{1,8}$/.test(value)) return Math.min(Number(value) * 1000, 86_400_000);
  if (!/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/.test(value)) return null;
  const date = Date.parse(value);
  return Number.isFinite(date) ? Math.min(Math.max(0, date - now), 86_400_000) : null;
}

function abortable<T>(operation: () => Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const aborted = () => reject(new SeoulApiError("ABORTED"));
    if (signal.aborted) { aborted(); return; }
    signal.addEventListener("abort", aborted, { once: true });
    // 동기 예외도 정리 경로를 통과시킨다. 중단 뒤의 원본 예외는 원문으로 전파하지 않는다.
    Promise.resolve().then(() => {
      if (signal.aborted) throw new SeoulApiError("ABORTED");
      return operation();
    }).then(resolve, reject).finally(() => signal.removeEventListener("abort", aborted));
  });
}

async function readXml(response: Response, signal: AbortSignal): Promise<{ xml: string; bytes: number }> {
  const type = response.headers.get("content-type") ?? "";
  if (!/^(?:application|text)\/(?:xml|[\w.-]+\+xml)(?:\s*;|\s*$)/i.test(type)
    || /charset\s*=\s*["']?(?!utf-8\b)[\w-]+/i.test(type)) throw new SeoulApiError("RESPONSE_FORMAT");
  const length = response.headers.get("content-length");
  if (length && /^\d+$/.test(length) && Number(length) > SEOUL_MAX_BYTES) throw new SeoulApiError("RESPONSE_TOO_LARGE");
  if (!response.body) throw new SeoulApiError("RESPONSE_FORMAT");
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const decode = (data?: Uint8Array, stream = false) => {
    try { return decoder.decode(data, { stream }); }
    catch { throw new SeoulApiError("RESPONSE_FORMAT"); }
  };
  const pieces: string[] = [];
  let bytes = 0;
  try {
    while (true) {
      const part = await abortable(() => reader.read(), signal);
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > SEOUL_MAX_BYTES) throw new SeoulApiError("RESPONSE_TOO_LARGE");
      pieces.push(decode(part.value, true));
    }
    pieces.push(decode());
    return { xml: pieces.join(""), bytes };
  } catch (error) {
    if (error instanceof SeoulApiError) throw error;
    if (signal.aborted) throw new SeoulApiError("ABORTED");
    throw new SeoulApiError("NETWORK", true);
  } finally {
    // 취소를 기다리며 deadline을 넘기지 않는다. 원본 스트림 오류를 출력하지 않는다.
    void reader.cancel().catch(() => {});
    try { reader.releaseLock(); } catch { /* 취소 중인 read의 lock은 스트림 종료 시 해제된다. */ }
  }
}

/** 명시적으로 호출한 서버 작업만 사용한다. 자동 재시도, DB 쓰기와 공개 조회 연결은 없다. */
export async function fetchSeoulArea(config: SeoulConfig, areaCode: string, options: ClientOptions = {}): Promise<SeoulFetchResult> {
  const url = createSeoulRequestUrl(config, areaCode);
  const controller = new AbortController();
  let timedOut = false;
  const externalAbort = () => controller.abort();
  options.signal?.addEventListener("abort", externalAbort, { once: true });
  if (options.signal?.aborted) externalAbort();
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, SEOUL_TIMEOUT_MS);
  const started = performance.now();
  let response: Response | undefined;
  try {
    response = await abortable(() => (options.fetch ?? globalThis.fetch)(url, {
      method: "GET", headers: { Accept: "application/xml, text/xml" }, redirect: "manual",
      cache: "no-store", signal: controller.signal,
    }), controller.signal);
    if (response.status >= 300 && response.status < 400 || response.type === "opaqueredirect" || response.redirected) throw new SeoulApiError("REDIRECT");
    if (response.status === 429) throw new SeoulApiError("RATE_LIMITED", true, null, readRetryAfter(response.headers.get("retry-after"), Date.now()));
    if (response.status === 401 || response.status === 403) throw new SeoulApiError("SOURCE_AUTHENTICATION");
    if (!response.ok) throw new SeoulApiError("HTTP_ERROR", response.status >= 500);
    const { xml, bytes } = await readXml(response, controller.signal);
    const fetchedAt = (options.clock?.() ?? new Date()).toISOString();
    const observation = adaptSeoulXml(xml, { areaCode, fetchedAt, sourceTimeZone: config.sourceTimeZone, redactionSecrets: [config.apiKey] });
    if (performance.now() - started > SEOUL_TIMEOUT_MS) throw new SeoulApiError("TIMEOUT", true);
    return { ...observation, request: { areaCode, fetchedAt, bytes,
      durationMs: Math.round(performance.now() - started), upstreamCode: "INFO-000" } };
  } catch (error) {
    if (timedOut) throw new SeoulApiError("TIMEOUT", true);
    if (options.signal?.aborted) throw new SeoulApiError("ABORTED");
    if (error instanceof SeoulApiError) throw error;
    throw new SeoulApiError("NETWORK", true);
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", externalAbort);
    if (response?.body && !response.body.locked) void response.body.cancel().catch(() => {});
  }
}
