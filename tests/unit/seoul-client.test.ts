import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { fetchSeoulArea } from "../../src/lib/server/seoul/client.ts";
import { createSeoulRequestUrl, readSeoulConfig, SEOUL_MAX_BYTES, SEOUL_TIMEOUT_MS } from "../../src/lib/server/seoul/config.ts";
import { safeSeoulError } from "../../src/lib/server/seoul/errors.ts";
import { authErrorXml, fetchedAt, realXml, sourceErrorXml } from "../helpers/seoul.ts";

const settings = { SEOUL_API_KEY: "fixtureKey2026", SEOUL_API_BASE_URL: "http://openapi.seoul.go.kr:8088",
  SEOUL_ALLOW_INSECURE_HTTP: "true", SEOUL_SOURCE_TIME_ZONE: "Asia/Seoul" };
const config = () => readSeoulConfig(settings);
const xmlResponse = (body: string, init: ResponseInit = {}) => new Response(body, { ...init, headers: { "Content-Type": "application/xml;charset=UTF-8", ...init.headers } });
afterEach(() => vi.useRealTimers());

describe("서울시 요청 설정 경계", () => {
  it("HTTP와 시간대 기본값은 미허용이며 호출 전에 명시하도록 한다", () => {
    expect(() => readSeoulConfig({ ...settings, SEOUL_ALLOW_INSECURE_HTTP: undefined })).toThrow("별도 허용");
    expect(() => readSeoulConfig({ ...settings, SEOUL_SOURCE_TIME_ZONE: undefined })).toThrow("시간대를 명시");
    expect(readSeoulConfig({ ...settings, SEOUL_ALLOW_INSECURE_HTTP: "false" }, true).allowInsecureHttp).toBe(true);
  });

  it("다른 host, port, 경로와 확인되지 않은 HTTPS origin을 거부한다", () => {
    for (const base of ["http://synthetic.invalid:8088", "http://openapi.seoul.go.kr:8089", "https://openapi.seoul.go.kr",
      "http://openapi.seoul.go.kr:8088/private", "http://user:pass@openapi.seoul.go.kr:8088", "http://openapi.seoul.go.kr:8088/?key=synthetic-secret"]) {
      expect(() => readSeoulConfig({ ...settings, SEOUL_API_BASE_URL: base })).toThrow("서버 설정");
    }
  });

  it("장소/키/활성화 설정으로 경로를 주입할 수 없다", () => {
    expect(() => createSeoulRequestUrl(config(), "POI014/../other")).toThrow("등록된 장소");
    expect(() => readSeoulConfig({ ...settings, SEOUL_API_KEY: "fixtureKey/secret" })).toThrow("서버 설정");
    expect(() => readSeoulConfig({ ...settings, SEOUL_ALLOW_INSECURE_HTTP: "yes" })).toThrow("서버 설정");
    expect(() => createSeoulRequestUrl({ ...config(), origin: "http://synthetic.invalid" }, "POI014")).toThrow("서버 설정");
  });
});

describe("서버 전용 서울시 client: 실행 대기", () => {
  it("한 장소를 1회 조회하고 캐시/redirect를 사용하지 않으며 안전한 측정치만 반환한다", async () => {
    const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(xmlResponse(realXml));
    const result = await fetchSeoulArea(config(), "POI014", { fetch: fakeFetch, clock: () => new Date(fetchedAt) });
    expect(fakeFetch).toHaveBeenCalledTimes(1);
    expect(fakeFetch.mock.calls[0][1]).toMatchObject({ cache: "no-store", redirect: "manual", method: "GET" });
    expect(result.request).toMatchObject({ areaCode: "POI014", bytes: Buffer.byteLength(realXml), fetchedAt, upstreamCode: "INFO-000" });
    expect(JSON.stringify(result)).not.toContain(settings.SEOUL_API_KEY);
    expect(JSON.stringify(result)).not.toContain("openapi.seoul.go.kr");
  });

  it("HTTP 200의 XML 실패 코드를 성공으로 처리하지 않는다", async () => {
    for (const [body, code] of [[authErrorXml, "SOURCE_AUTHENTICATION"], [sourceErrorXml, "SOURCE_REJECTED"]]) {
      const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(xmlResponse(body));
      await expect(fetchSeoulArea(config(), "POI014", { fetch: fakeFetch })).rejects.toMatchObject({ code });
      expect(fakeFetch).toHaveBeenCalledTimes(1);
    }
  });

  it("redirect, 요청 제한과 HTTP 오류에 자동 재시도하지 않는다", async () => {
    for (const [status, code] of [[302, "REDIRECT"], [429, "RATE_LIMITED"], [401, "SOURCE_AUTHENTICATION"], [503, "HTTP_ERROR"]] as const) {
      const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response("synthetic-secret", { status, headers: { Location: "https://synthetic.invalid/fixtureKey2026" } }));
      await expect(fetchSeoulArea(config(), "POI014", { fetch: fakeFetch })).rejects.toMatchObject({ code });
      expect(fakeFetch).toHaveBeenCalledTimes(1);
    }
  });

  it("HTML MIME과 잘못된 UTF-8 본문을 거부한다", async () => {
    const responses = [new Response("<html>오류</html>", { headers: { "Content-Type": "text/html" } }),
      new Response(new Uint8Array([0xff]), { headers: { "Content-Type": "application/xml" } })];
    for (const response of responses) {
      await expect(fetchSeoulArea(config(), "POI014", { fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })).rejects.toMatchObject({ code: "RESPONSE_FORMAT" });
    }
  });

  it("Content-Length와 길이 헤더 없는 스트림 모두 바이트 제한을 적용한다", async () => {
    const oversize = new ReadableStream<Uint8Array>({ start(controller) {
      controller.enqueue(new Uint8Array(SEOUL_MAX_BYTES + 1)); controller.close();
    } });
    const responses = [xmlResponse("<x/>", { headers: { "Content-Length": String(SEOUL_MAX_BYTES + 1) } }),
      new Response(oversize, { headers: { "Content-Type": "application/xml" } })];
    for (const response of responses) {
      await expect(fetchSeoulArea(config(), "POI014", { fetch: vi.fn<typeof fetch>().mockResolvedValue(response) })).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
    }
  });

  it("연결이 멈추어도 deadline에 종료하며 원본 오류/키/cause를 노출하지 않는다", async () => {
    vi.useFakeTimers();
    const fakeFetch = vi.fn<typeof fetch>().mockImplementation(() => new Promise(() => {}));
    const pending = fetchSeoulArea(config(), "POI014", { fetch: fakeFetch });
    const assertion = expect(pending).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(SEOUL_TIMEOUT_MS);
    await assertion;
    expect(fakeFetch).toHaveBeenCalledTimes(1);
  });

  it("응답 헤더 뒤 본문 수신이 멈춘 경우도 같은 timeout을 적용한다", async () => {
    vi.useFakeTimers();
    const body = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new TextEncoder().encode("<x>")); } });
    const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(body, { headers: { "Content-Type": "application/xml" } }));
    const pending = fetchSeoulArea(config(), "POI014", { fetch: fakeFetch });
    const assertion = expect(pending).rejects.toMatchObject({ code: "TIMEOUT" });
    await vi.advanceTimersByTimeAsync(SEOUL_TIMEOUT_MS);
    await assertion;
  });

  it("이미 취소된 요청은 원천 호출하지 않는다", async () => {
    const controller = new AbortController(); controller.abort();
    const fakeFetch = vi.fn<typeof fetch>();
    await expect(fetchSeoulArea(config(), "POI014", { fetch: fakeFetch, signal: controller.signal })).rejects.toMatchObject({ code: "ABORTED" });
    expect(fakeFetch).not.toHaveBeenCalled();
  });

  it("네트워크 예외에 담긴 인증 URL과 비밀을 안전한 오류로 바꾼다", async () => {
    const fakeFetch = vi.fn<typeof fetch>().mockRejectedValue(new Error("http://openapi.seoul.go.kr:8088/fixtureKey2026/xml/citydata"));
    try { await fetchSeoulArea(config(), "POI014", { fetch: fakeFetch }); expect.unreachable(); }
    catch (error) {
      expect(safeSeoulError(error).code).toBe("NETWORK");
      expect(JSON.stringify(safeSeoulError(error))).not.toContain("fixtureKey2026");
      expect(error).not.toHaveProperty("cause");
    }
  });

  it("본문 전송 중단과 UTF-8 오류를 구분해 전송 중단만 재시도 가능으로 표시한다", async () => {
    const failed = new ReadableStream<Uint8Array>({ start(controller) { controller.error(new TypeError("synthetic-secret")); } });
    const fakeFetch = vi.fn<typeof fetch>().mockResolvedValue(new Response(failed, { headers: { "Content-Type": "application/xml" } }));
    await expect(fetchSeoulArea(config(), "POI014", { fetch: fakeFetch })).rejects.toMatchObject({ code: "NETWORK", retryable: true });
    const invalidUtf8 = vi.fn<typeof fetch>().mockResolvedValue(new Response(new Uint8Array([0xff]), { headers: { "Content-Type": "application/xml" } }));
    await expect(fetchSeoulArea(config(), "POI014", { fetch: invalidUtf8 })).rejects.toMatchObject({ code: "RESPONSE_FORMAT", retryable: false });
  });
});
