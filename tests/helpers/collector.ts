import { vi } from "vitest";
import { areaCatalog } from "../../src/lib/domain/catalog.ts";
import type { AreaLatest } from "../../src/lib/contracts/dashboard.ts";
import type { ActiveRun, Acquisition, CollectionSummary, CollectorStore, Reservation } from "../../src/lib/server/collector/contracts.ts";

export const collectorNow = Date.parse("2026-10-14T08:10:31.201Z");
/** 아래 런/관측은 전부 합성 테스트 자료다. DB/원천 호출에 사용하지 않는다. */
export function testRun(codes = ["POI014"]): ActiveRun {
  return { state: "acquired", runId: "00000000-0000-4000-8000-000000000001", leaseToken: "00000000-0000-4000-8000-000000000002",
    bucketStart: "2026-10-14T08:10:00Z", serverNow: new Date(collectorNow).toISOString(),
    deadlineAt: new Date(collectorNow + 50_000).toISOString(), areaCodes: codes };
}
export function testArea(code: string): AreaLatest {
  const area = areaCatalog.find((item) => item.areaCode === code)!;
  const at = new Date(collectorNow).toISOString();
  return { ...area, lastAttemptAt: at, population: { value: { min: 10, max: 20, midpoint: 15, congestion: "normal", message: null },
    observedAt: at, fetchedAt: at, freshness: "fresh", lastResult: "valid" },
    weather: { value: { temperatureC: -3.5, humidityPct: 0, pm25MicrogramsPerM3: null }, observedAt: at, fetchedAt: at, freshness: "fresh", lastResult: "valid" } };
}
export function testFetchResult(code: string) { return { area: testArea(code), issues: [], request: { areaCode: code,
  fetchedAt: new Date(collectorNow).toISOString(), bytes: 100, durationMs: 1, upstreamCode: "INFO-000" as const } }; }
export class MemoryCollectorStore implements CollectorStore {
  acquisition: Acquisition = testRun();
  remaining = 1000;
  reserved = new Set<string>();
  committed: AreaLatest[] = [];
  circuit: { code: string; seconds: number | null } | null = null;
  summaries: CollectionSummary[] = [];
  acquire = vi.fn(async () => this.acquisition);
  reserve = vi.fn(async (_run: ActiveRun, code: string, attempt: number): Promise<Reservation> => {
    const key = code + ":" + attempt;
    if (this.circuit) return { allowed: false, reason: "circuit" };
    if (this.reserved.has(key)) return { allowed: false, reason: "duplicate-attempt" };
    if (!this.remaining) return { allowed: false, reason: "budget" };
    this.remaining--; this.reserved.add(key); return { allowed: true, reason: null };
  });
  commit = vi.fn(async (_run: ActiveRun, area: AreaLatest) => { this.committed.push(area); return true; });
  openCircuit = vi.fn(async (_run: ActiveRun, code: "RATE_LIMITED" | "SOURCE_AUTHENTICATION", seconds: number | null) => { this.circuit = { code, seconds }; });
  finish = vi.fn(async (_run: ActiveRun, summary: CollectionSummary) => { this.summaries.push(summary); });
}
