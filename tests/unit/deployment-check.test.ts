import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { checkDeploymentEnvironment } from "../../src/lib/server/deployment-check.ts";

const read = { DATA_MODE: "live", LIVE_DATA_BACKEND: "supabase", APP_BASE_URL: "https://example.com",
  SUPABASE_URL: "https://example.supabase.co", SUPABASE_PUBLISHABLE_KEY: "sb_publishable_testing_only" };

describe("배포 설정 사전 점검", () => {
  it("개발 파일 저장소와 로컬 DB를 운영 준비로 통과시키지 않는다", () => {
    const checks = checkDeploymentEnvironment({ ...read, LIVE_DATA_BACKEND: "local-snapshot", SUPABASE_URL: "http://localhost:54321" }, false);
    expect(checks.filter((check) => !check.ok).map((check) => check.name)).toEqual(["운영 저장소", "운영 DB 읽기 설정"]);
  });
  it("읽기 전용 배포에는 수집 비밀을 요구하지 않지만 수집 준비에는 요구한다", () => {
    expect(checkDeploymentEnvironment(read, false).every((check) => check.ok)).toBe(true);
    expect(checkDeploymentEnvironment(read, true).every((check) => check.ok)).toBe(false);
  });
  it("20곳/5분 수집 설정을 검증하고 비밀값을 출력 객체에 포함하지 않는다", () => {
    const source = { ...read, COLLECTOR_ENABLED: "true", COLLECTOR_SECRET: "secret_for_test_only_0123456789012345",
      SUPABASE_SECRET_KEY: "sb_secret_testing_only_12345678", SEOUL_API_KEY: "testingonly",
      SEOUL_API_BASE_URL: "http://openapi.seoul.go.kr:8088", SEOUL_SOURCE_TIME_ZONE: "Asia/Seoul", SEOUL_ALLOW_INSECURE_HTTP: "true" };
    const checks = checkDeploymentEnvironment(source, true);
    expect(checks.every((check) => check.ok)).toBe(true);
    expect(JSON.stringify(checks)).not.toContain(source.COLLECTOR_SECRET);
    expect(JSON.stringify(checks)).not.toContain(source.SUPABASE_SECRET_KEY);
    expect(checkDeploymentEnvironment({ ...source, MAX_MONITORED_AREAS: "5" }, true).some((check) => !check.ok)).toBe(true);
  });
});
