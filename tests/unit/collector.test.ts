import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { runCollection } from "../../src/lib/server/collector/run.ts";
import { SeoulApiError } from "../../src/lib/server/seoul/errors.ts";
import { DatabaseError } from "../../src/lib/server/database/errors.ts";
import { MemoryCollectorStore, collectorNow, testFetchResult, testRun } from "../helpers/collector.ts";
import { monitoredAreaCatalog } from "../../src/lib/domain/catalog.ts";

function collect(store: MemoryCollectorStore, fetchArea = vi.fn(async (code: string) => testFetchResult(code))) {
  return runCollection({ store, fetchArea, maxAreas: 20, dailyLimit: 6000, clock: () => collectorNow, monotonic: () => 0 });
}
describe("M3 수집 orchestration: 실행 대기", () => {
  it("실제 Node 시계로도 수집 실행을 시작할 수 있다", async () => {
    const store = new MemoryCollectorStore();
    store.acquisition = { ...testRun(), state: "duplicate", previousStatus: "success" };
    const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    await expect(runCollection({ store, fetchArea, maxAreas: 20, dailyLimit: 6000 }))
      .resolves.toMatchObject({ status: "skipped", reason: "DUPLICATE_SLOT" });
    expect(store.acquire).toHaveBeenCalledOnce();
    expect(fetchArea).not.toHaveBeenCalled();
  });
  it("같은 슬롯은 원천/예약/저장을 실행하지 않는다", async () => {
    const store = new MemoryCollectorStore(); store.acquisition = { ...testRun(), state: "duplicate", previousStatus: "success" };
    const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    expect(await collect(store, fetchArea)).toMatchObject({ status: "skipped", reason: "DUPLICATE_SLOT" });
    expect(fetchArea).not.toHaveBeenCalled(); expect(store.reserve).not.toHaveBeenCalled(); expect(store.commit).not.toHaveBeenCalled();
  });
  it("남은 예산 1회에서 두 worker가 경쟁해도 소스 호출을 한 번만 시작한다", async () => {
    const store = new MemoryCollectorStore(); store.acquisition = testRun(["POI014","POI007"]); store.remaining = 1;
    const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    const result = await collect(store, fetchArea);
    expect(fetchArea).toHaveBeenCalledTimes(1); expect(result.counts).toMatchObject({ reservations: 1, sourceRequests: 1, success: 1, skipped: 1 });
    expect(result.status).toBe("partial");
  });
  it("동시에 처리하는 원천 요청은 두 개를 넘지 않는다", async () => {
    const store = new MemoryCollectorStore(); store.acquisition = testRun(monitoredAreaCatalog.map((area) => area.areaCode));
    let active = 0; let maximum = 0;
    const fetchArea = vi.fn(async (code: string) => { active++; maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1)); active--; return testFetchResult(code); });
    const result = await collect(store, fetchArea);
    expect(maximum).toBe(2); expect(result.counts.success).toBe(20); expect(store.finish).toHaveBeenCalledTimes(1);
  });
  it("일시 오류의 재시도도 예약하며 성공 시 원천 예외 메시지를 기록하지 않는다", async () => {
    const store = new MemoryCollectorStore(); const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    fetchArea.mockRejectedValueOnce(new SeoulApiError("NETWORK", true));
    const result = await collect(store, fetchArea);
    expect(fetchArea).toHaveBeenCalledTimes(2); expect(store.reserve).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ status: "success", reason: null, counts: { sourceRequests: 2, reservations: 2 } });
  });
  it("인증 장애는 재시도 없이 circuit을 열고 다음 장소 호출을 멈춘다", async () => {
    const store = new MemoryCollectorStore(); store.acquisition = testRun(["POI014","POI007","POI003"]);
    const fetchArea = vi.fn(async (code: string) => { if (code === "POI014") throw new SeoulApiError("SOURCE_AUTHENTICATION"); return testFetchResult(code); });
    const result = await collect(store, fetchArea);
    expect(store.openCircuit).toHaveBeenCalledWith(expect.anything(), "SOURCE_AUTHENTICATION", null);
    expect(fetchArea.mock.calls.map(([code]) => code)).not.toContain("POI003");
    expect(result.counts.failed).toBe(1); expect(store.committed.some((area) => area.population.lastResult === "fetch-failed")).toBe(true);
  });
  it("429 Retry-After를 circuit에 전달하며 429를 즉시 재시도하지 않는다", async () => {
    const store = new MemoryCollectorStore(); const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    fetchArea.mockRejectedValueOnce(new SeoulApiError("RATE_LIMITED", true, null, 120000));
    await collect(store, fetchArea);
    expect(fetchArea).toHaveBeenCalledTimes(1); expect(store.circuit).toEqual({ code: "RATE_LIMITED", seconds: 120 });
  });
  it("첫 소스 실패 후 재시도 예산이 없으면 이미 시도한 장소를 실패로 기록한다", async () => {
    const store = new MemoryCollectorStore(); store.remaining = 1;
    const fetchArea = vi.fn(async () => { throw new SeoulApiError("NETWORK", true); });
    const result = await collect(store, fetchArea);
    expect(result.counts.failed).toBe(1); expect(result.counts.skipped).toBe(0);
    expect(store.committed[0].population).toMatchObject({ value: null, lastResult: "fetch-failed" });
  });
  it("인구 성공과 날씨 실패는 부분 성공으로 저장한다", async () => {
    const store = new MemoryCollectorStore(); const fetchArea = vi.fn(async (code: string) => {
      const result = testFetchResult(code); result.area.weather = { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: "invalid" }; return result;
    });
    const result = await collect(store, fetchArea);
    expect(result).toMatchObject({ status: "partial", counts: { partial: 1 } }); expect(store.committed[0].population.value?.min).toBe(10);
  });
  it("lease를 잃은 예약은 소스 호출 전에 멈춘다", async () => {
    const store = new MemoryCollectorStore(); store.reserve.mockRejectedValue(new DatabaseError("LEASE_LOST"));
    const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    const result = await collect(store, fetchArea);
    expect(fetchArea).not.toHaveBeenCalled(); expect(result).toMatchObject({ status: "error", reason: "LEASE_LOST" });
  });
  it("DB 저장 오류에 소스 호출을 다시 실행하지 않는다", async () => {
    const store = new MemoryCollectorStore(); store.commit.mockRejectedValue(new DatabaseError());
    const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    expect((await collect(store, fetchArea)).status).toBe("error"); expect(fetchArea).toHaveBeenCalledTimes(1);
  });
  it("실행 기한에 가까우면 호출 없이 skipped로 정리한다", async () => {
    const store = new MemoryCollectorStore(); store.acquisition = { ...testRun(), deadlineAt: new Date(collectorNow + 10_000).toISOString() };
    const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
    expect(await collect(store, fetchArea)).toMatchObject({ status: "skipped", reason: "SKIPPED_DEADLINE" }); expect(fetchArea).not.toHaveBeenCalled();
  });
  it("미등록 코드/중복 계획은 원천 없이 오류로 종료한다", async () => {
    for (const codes of [["POI999"],["POI014","POI014"]]) {
      const store = new MemoryCollectorStore(); store.acquisition = testRun(codes);
      const fetchArea = vi.fn(async (code: string) => testFetchResult(code));
      expect((await collect(store, fetchArea)).status).toBe("error"); expect(fetchArea).not.toHaveBeenCalled();
    }
  });
});
