import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { authenticateCollector } from "../../src/lib/server/collector/auth.ts";
import { isEmptyCollectorRequest } from "../../src/lib/server/collector/request.ts";
import { readCollectorConfig } from "../../src/lib/server/collector/config.ts";
import { readDatabaseReadConfig } from "../../src/lib/server/database/config.ts";
import { readRetryAfter } from "../../src/lib/server/seoul/client.ts";

const secret = "syntheticCollectorSecret000000000000000000";
describe("M3 인증/활성화/입력 경계: 실행 대기", () => {
  it("고정 길이 digest로 토큰을 비교하며 비밀 없는 설정도 인증 실패다", () => {
    const request = (token: string) => new Request("https://synthetic.invalid/api/internal/collect", { headers: { Authorization: "Bearer " + token } });
    expect(authenticateCollector(request(secret), { COLLECTOR_SECRET: secret })).toBe(true);
    expect(authenticateCollector(request(secret + "x"), { COLLECTOR_SECRET: secret })).toBe(false);
    expect(authenticateCollector(request("short"), { COLLECTOR_SECRET: secret })).toBe(false);
    expect(authenticateCollector(request(secret), {})).toBe(false);
  });
  it("수집은 false/누락 상태에서 설정이나 원천 호출 전에 거부한다", () => {
    expect(() => readCollectorConfig({})).toThrow("비활성"); expect(() => readCollectorConfig({ COLLECTOR_ENABLED: "false" })).toThrow("비활성");
    expect(() => readCollectorConfig({ COLLECTOR_ENABLED: "yes" })).toThrow("서버 설정");
  });
  it("읽기 설정에 secret/legacy 키와 임의 host를 전달할 수 없다", () => {
    const source = { SUPABASE_URL: "https://synthetic.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic00000000" };
    expect(readDatabaseReadConfig(source).url).toBe(source.SUPABASE_URL);
    expect(() => readDatabaseReadConfig({ ...source, SUPABASE_PUBLISHABLE_KEY: "sb_secret_synthetic000000" })).toThrow("서버 설정");
    expect(() => readDatabaseReadConfig({ ...source, SUPABASE_URL: "https://synthetic.invalid/private" })).toThrow("서버 설정");
  });
  it("collect의 장소/URL 입력, 비어 있지 않은 JSON과 과대 본문을 거부한다", async () => {
    const request = (body: string, query = "") => new Request("https://synthetic.invalid/api/internal/collect" + query, { method: "POST", body });
    expect(await isEmptyCollectorRequest(request("{}"))).toBe(true);
    expect(await isEmptyCollectorRequest(request("{  }"))).toBe(true);
    for (const body of ['{"area":"POI014"}', "[]", "null", "x".repeat(1025)]) expect(await isEmptyCollectorRequest(request(body))).toBe(false);
    expect(await isEmptyCollectorRequest(request("{}", "?url=https://synthetic.invalid"))).toBe(false);
  });
  it("Retry-After 숫자/HTTP 날짜에 상한을 적용하고 다른 문자열을 거부한다", () => {
    const now = Date.parse("2026-10-14T08:00:00Z");
    expect(readRetryAfter("120", now)).toBe(120000);
    expect(readRetryAfter("Wed, 14 Oct 2026 08:01:00 GMT", now)).toBe(60000);
    expect(readRetryAfter("99999999", now)).toBe(86400000);
    expect(readRetryAfter("synthetic-secret", now)).toBeNull();
  });
});
