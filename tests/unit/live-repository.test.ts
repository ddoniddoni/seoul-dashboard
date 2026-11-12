import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
vi.mock("server-only", () => ({}));
import { monitoredAreaCatalog } from "../../src/lib/domain/catalog.ts";
import { LiveRepository } from "../../src/lib/server/repositories/live.ts";

const now = Date.parse("2026-11-11T04:00:00Z");
const at = new Date(now - 5 * 60_000).toISOString();

// limit가 실제 반환 행 수에 적용되도록 Supabase 조회 체인을 재현한다.
function database(missingCode?: string) {
  const catalog = monitoredAreaCatalog.map((area) => ({ code: area.areaCode, official_name: area.areaName,
    category: area.category, collection_enabled: true, geometry_available: true, catalog_version: "test" }));
  const latest = monitoredAreaCatalog.filter((area) => area.areaCode !== missingCode).map((area, index) => ({
    area_code: area.areaCode, last_attempt_at: at,
    population: { value: { min: 100 + index, max: 200 + index, midpoint: 150 + index,
      congestion: "normal", message: null }, observedAt: at, fetchedAt: at, freshness: "fresh", lastResult: "valid" },
    weather: { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: "not-provided" },
  }));
  return { from: vi.fn((table: string) => {
    if (!["sp_areas", "sp_area_latest"].includes(table)) throw new Error("예상하지 않은 DB 테이블");
    let rows: unknown[] = table === "sp_areas" ? catalog : latest;
    const query = { select: () => query, eq: () => query, in: () => query, order: () => query,
      limit: (count: number) => { rows = rows.slice(0, count); return query; },
      then: (resolve: (value: { data: unknown[]; error: null }) => unknown) => Promise.resolve(resolve({ data: rows, error: null })),
    };
    return query;
  }) } as unknown as SupabaseClient;
}

describe("운영 저장소의 20곳 조회", () => {
  it("등록된 20곳의 실제 최신 행을 모두 반환한다", async () => {
    const overview = await new LiveRepository(database(), () => now).getOverview();
    expect(overview.data.items).toHaveLength(20);
    expect(overview.data.items.filter((item) => item.population.value !== null)).toHaveLength(20);
    expect(overview.meta.coverage).toMatchObject({ monitored: 20, fresh: 20, missing: 0 });
  });
  it("DB에 없는 장소만 자료 없음으로 보존한다", async () => {
    const missing = monitoredAreaCatalog[19].areaCode;
    const overview = await new LiveRepository(database(missing), () => now).getOverview();
    expect(overview.data.items.filter((item) => item.population.value === null).map((item) => item.areaCode)).toEqual([missing]);
    expect(overview.meta.coverage).toMatchObject({ fresh: 19, missing: 1 });
  });
});
