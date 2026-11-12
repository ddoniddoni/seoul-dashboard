import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { readDatabaseReadConfig } from "../../src/lib/server/database/config.ts";
import { readDatabaseAdminConfig } from "../../src/lib/server/database/admin-client.ts";

const url = "https://testproject.supabase.co";
const publicKey = "sb_publishable_test_only_123456";
function legacy(role: string, ref = "testproject", exp = 4_102_444_800) {
  return [Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify({ role, ref, exp, iss: "supabase" })).toString("base64url"), "synthetic_signature"].join(".");
}

describe("기존 환경변수 이름과 서버 키 호환", () => {
  it("사용자가 설정한 URL과 공개 키 변수를 서버 조회에서 읽는다", () => {
    expect(readDatabaseReadConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey })).toEqual({ url, key: publicKey });
  });
  it("서버에서 기존 service_role 키를 지원한다", () => {
    const key = legacy("service_role");
    expect(readDatabaseAdminConfig({ NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key })).toEqual({ url, key });
  });
  it("공개 조회 키에 관리자 키를 넣으면 거부한다", () => {
    for (const key of [legacy("service_role"), "sb_secret_test_only_123456"]) {
      expect(() => readDatabaseReadConfig({ NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: key })).toThrow("서버 설정");
    }
  });
  it("관리자 legacy 키의 역할, 대상과 만료를 점검한다", () => {
    for (const key of [legacy("anon"), legacy("service_role", "anotherproject"), legacy("service_role", "testproject", 1), "eyJ.invalid.value"]) {
      expect(() => readDatabaseAdminConfig({ SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: key })).toThrow("서버 설정");
    }
  });
  it("새 변수와 호환 변수가 다르면 다른 프로젝트를 임의 선택하지 않는다", () => {
    expect(() => readDatabaseReadConfig({ SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_URL: "https://other.supabase.co", SUPABASE_PUBLISHABLE_KEY: publicKey })).toThrow("서버 설정");
    expect(() => readDatabaseReadConfig({ SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: publicKey, NEXT_PUBLIC_SUPABASE_ANON_KEY: publicKey + "other" })).toThrow("서버 설정");
  });
});
