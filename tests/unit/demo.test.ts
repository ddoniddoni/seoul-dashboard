import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { DemoRepository } from "../../src/lib/server/repositories/demo";
import { historySchema, overviewSchema } from "../../src/lib/contracts/dashboard";
import { getFreshness, getOverviewMetrics } from "../../src/lib/domain/metrics";
import { areaCatalog, monitoredAreaCatalog } from "../../src/lib/domain/catalog";

const now = Date.parse("2026-10-14T01:37:00Z");
const repository = new DemoRepository(() => now, 42);

describe("합성 데이터와 해석 경계", () => {
  it("공식 20곳 모두 최신값과 개별 24시간 그래프를 제공한다", () => {
    const areas = repository.getAreas();
    expect(areas).toHaveLength(20);
    expect(new Set(areas.map((area) => area.areaCode)).size).toBe(20);
    expect(repository.getOverview().meta.coverage.monitored).toBe(20);
    for (const area of monitoredAreaCatalog) {
      expect(areaCatalog).toContainEqual(area);
      const latest = repository.getOverview().data.items.find((item) => item.areaCode === area.areaCode)!;
      const history = repository.getHistory([area.areaCode]);
      expect(historySchema.safeParse(history).success).toBe(true);
      expect(history.data.series).toHaveLength(1);
      expect(history.data.series[0].points).toHaveLength(144);
      expect(history.data.series[0].points.find((point) => point.observedAt === latest.population.observedAt))
        .toMatchObject({ min: latest.population.value!.min, max: latest.population.value!.max });
    }
  });
  it("동일 clock과 seed는 같은 자료를 반환하고 모든 자료에 demo 출처가 있다", () => {
    expect(repository.getOverview()).toEqual(new DemoRepository(() => now, 42).getOverview());
    const history = repository.getHistory(["POI014"]);
    expect(history).toEqual(new DemoRepository(() => now, 42).getHistory(["POI014"]));
    expect(history.meta).toMatchObject({ dataset: "demo", source: "synthetic-demo", displayTimeZone: "Asia/Seoul" });
  });
  it("demo 자료의 출처만 live로 바꾸면 계약 검증이 거부한다", () => {
    const overview = repository.getOverview();
    expect(overviewSchema.safeParse({ ...overview, meta: { ...overview.meta, dataset: "live" } }).success).toBe(false);
  });
  it("모든 시연 fixture가 같은 DTO와 범위 계약을 따른다", () => {
    for (const scenario of ["normal", "empty", "partial", "stale", "short-history"] as const) {
      expect(overviewSchema.safeParse(repository.getOverview(scenario)).success).toBe(true);
      expect(historySchema.safeParse(repository.getHistory(["POI014"], scenario)).success).toBe(true);
    }
  });
  it("누락 값을 0으로 만들지 않고 부분 누락에서도 나머지 자료를 유지한다", () => {
    const items = repository.getOverview("partial").data.items;
    expect(items).toHaveLength(20);
    expect(items.find((item) => item.areaCode === "POI068")?.population.value).toBeNull();
    expect(items.find((item) => item.areaCode === "POI007")?.weather.value).toBeNull();
    expect(items.find((item) => item.areaCode === "POI003")?.population).toMatchObject({ lastResult: "fetch-failed", freshness: "fresh" });
  });
  it("최신 자료가 없으면 붐빔/여유 KPI를 0으로 단정하지 않는다", () => {
    const stale = getOverviewMetrics(repository.getOverview("stale").data.items, now, 20);
    expect(stale.busy).toBeNull(); expect(stale.relaxed).toBeNull();
    expect(stale.coverage.fresh).toBe(0);
    const empty = getOverviewMetrics([], now, 20);
    expect(empty.delayed).toBeNull(); expect(empty.coverage.missing).toBe(20);
  });
  it("자료 기준 시각만으로 최신성을 계산하고 정확한 경계와 미래 시각을 처리한다", () => {
    expect(getFreshness(new Date(now - 30 * 60_000).toISOString(), now)).toBe("fresh");
    expect(getFreshness(new Date(now - 30 * 60_000 - 1).toISOString(), now)).toBe("stale");
    expect(getFreshness(new Date(now - 60 * 60_000 - 1).toISOString(), now)).toBe("expired");
    expect(getFreshness(new Date(now + 6 * 60_000).toISOString(), now)).toBe("missing");
  });
  it("동일 구간을 사용하고 결측과 보유 시작 이전을 채우지 않는다", () => {
    const history = repository.getHistory(["POI014", "POI007"], "short-history");
    const [first, second] = history.data.series;
    expect(first.points.map((point) => point.bucketAt)).toEqual(second.points.map((point) => point.bucketAt));
    expect(first.points.slice(0, 126).every((point) => point.min === null && point.max === null && point.observedAt === null)).toBe(true);
    expect(first.availableSince).toBe(first.points[126].observedAt);
    expect(new Set(first.points.map((point) => point.bucketAt)).size).toBe(144);
  });
  it("재수신 시각이 원천 시각과 다르고 최신 관측 이후는 비어 있다", () => {
    const area = repository.getOverview().data.items[0];
    expect(area.population.fetchedAt).not.toBe(area.population.observedAt);
    const history = repository.getHistory([area.areaCode]).data.series[0];
    const latest = history.points.find((point) => point.observedAt === area.population.observedAt);
    expect(latest?.min).toBe(area.population.value?.min);
    expect(latest?.max).toBe(area.population.value?.max);
    expect(history.points.filter((point) => point.bucketAt > area.population.observedAt!).every((point) => point.min === null)).toBe(true);
  });
});
