import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { SupabaseCollectorStore } from "../../src/lib/server/collector/store.ts";
import type { ActiveRun } from "../../src/lib/server/collector/contracts.ts";

let admin: SupabaseClient; let reader: SupabaseClient; let store: SupabaseCollectorStore; let run: ActiveRun | undefined;
let original: { code: string; collection_enabled: boolean }[] = [];

/** 명시 실행을 승인받은 전용 로컬 테스트 DB만 허용한다. 원천 HTTP 요청은 없다. */
beforeAll(async () => {
  const url = process.env.M3_TEST_SUPABASE_URL;
  const publishable = process.env.M3_TEST_SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.M3_TEST_SUPABASE_SECRET_KEY;
  if (process.env.M3_DB_TEST_ENABLED !== "true" || !["http://127.0.0.1:54321","http://localhost:54321"].includes(url ?? "")
    || !publishable?.startsWith("sb_publishable_") || !secret?.startsWith("sb_secret_") || process.env.COLLECTOR_ENABLED === "true") {
    throw new Error("수집을 중지한 전용 로컬 테스트 DB 설정과 명시 실행이 필요합니다. 값은 출력하지 않습니다.");
  }
  const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } };
  admin = createClient(url!,secret,options); reader = createClient(url!,publishable,options); store = new SupabaseCollectorStore(admin);
  const { data, error } = await admin.from("sp_areas").select("code,collection_enabled");
  if (error || !Array.isArray(data)) throw new Error("테스트 migration을 적용한 전용 DB가 필요합니다.");
  original = data;
  const update = await admin.from("sp_areas").update({ collection_enabled: true }).in("code",["POI014","POI007"]);
  if (update.error) throw new Error("테스트 수집 대상 설정 실패");
  const acquired = await store.acquire(5);
  if (acquired.state !== "acquired") throw new Error("비어 있는 전용 DB의 새 10분 슬롯이 필요합니다. 기존 실행을 삭제하지 않습니다.");
  run = acquired;
});
afterAll(async () => {
  try {
    if (run) await store.finish(run,{status:"skipped",reason:"LOCAL_DB_TEST",runId:run.runId,bucketStart:run.bucketStart,
      counts:{success:0,partial:0,failed:0,skipped:run.areaCodes.length,sourceRequests:0,reservations:1}});
  } finally {
    if (admin && original.length) for (const row of original) {
      const restored = await admin.from("sp_areas").update({collection_enabled:row.collection_enabled}).eq("code",row.code);
      if (restored.error) throw new Error("전용 테스트 DB의 수집 대상 복원 실패");
    }
  }
});
describe("M3 실제 DB 경합/권한 통합: 미실행", () => {
  it("중복 슬롯을 원천 없이 차단하고 예산 1회의 병렬 예약은 정확히 하나만 성공한다", async () => {
    expect((await store.acquire(5)).state).toBe("duplicate");
    const [first,second] = await Promise.all([store.reserve(run!,"POI014",1,1,AbortSignal.timeout(5000)),store.reserve(run!,"POI007",1,1,AbortSignal.timeout(5000))]);
    expect([first,second].filter((value) => value.allowed)).toHaveLength(1);
    expect([first,second].some((value) => value.reason === "budget")).toBe(true);
  });
  it("익명은 공개 카탈로그만 읽고 테이블 쓰기/관리 RPC/private 조회는 거부된다", async () => {
    const catalog = await reader.from("sp_areas").select("code");
    if (catalog.error) throw new Error("익명 공개 읽기 확인 실패");
    expect(catalog.data?.length).toBeGreaterThan(0);
    const write = await reader.from("sp_areas").update({collection_enabled:false}).eq("code","POI014");
    const rpc = await reader.rpc("sp_acquire_collection_run",{p_max_areas:5});
    const privateRead = await reader.schema("private").from("provider_budgets").select("provider");
    expect(Boolean(write.error)).toBe(true); expect(Boolean(rpc.error)).toBe(true); expect(Boolean(privateRead.error)).toBe(true);
  });
});
