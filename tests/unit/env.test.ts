import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { readAppEnvironment, readEnvironmentStatus } from "../../src/lib/server/env";

describe("M0 서버 환경변수 경계", () => {
  it("실데이터를 기본으로 두고 수집과 HTTP는 기본 비활성으로 둔다", () => {
    expect(readAppEnvironment({})).toEqual({ dataMode: "live" });
    const status = readEnvironmentStatus({});
    expect(status.collectorRequested).toBe(false);
    expect(status.insecureHttpRequested).toBe(false);
    expect(Object.values(status.configured).every((value) => !value)).toBe(true);
  });

  it("false 문자열을 true로 바꾸지 않는다", () => {
    const status = readEnvironmentStatus({
      COLLECTOR_ENABLED: "false",
      SEOUL_ALLOW_INSECURE_HTTP: "false",
    });
    expect(status.collectorRequested).toBe(false);
    expect(status.insecureHttpRequested).toBe(false);
  });

  it("잘못된 모드를 demo로 대체하거나 오류에 입력값을 포함하지 않는다", () => {
    expect(() => readAppEnvironment({ DATA_MODE: "invalid-test-input" }))
      .toThrow("환경변수 형식을 확인하세요: DATA_MODE");
  });

  it("실데이터 설정을 demo로 자동 전환하지 않는다", () => {
    expect(readAppEnvironment({ DATA_MODE: "live" })).toEqual({ dataMode: "live" });
    expect(readAppEnvironment({ DATA_MODE: "demo" })).toEqual({ dataMode: "live" });
  });

  it("비밀과 URL은 점검 결과에 값 대신 존재 여부만 반환한다", () => {
    const status = readEnvironmentStatus({
      SEOUL_API_KEY: "synthetic-seoul-secret",
      SEOUL_API_BASE_URL: "https://synthetic.invalid/private-path",
      SUPABASE_SECRET_KEY: "synthetic-db-secret",
      COLLECTOR_SECRET: "synthetic-collector-secret",
    });
    expect(status.configured.SEOUL_API_KEY).toBe(true);
    expect(JSON.stringify(status)).not.toContain("synthetic");
    expect(status.collectorImplemented).toBe(true);
  });

  it("명시적인 true/false 외에는 활성화 요청을 허용하지 않는다", () => {
    expect(() => readEnvironmentStatus({ COLLECTOR_ENABLED: "yes" }))
      .toThrow("환경변수 형식을 확인하세요: COLLECTOR_ENABLED");
  });
});
