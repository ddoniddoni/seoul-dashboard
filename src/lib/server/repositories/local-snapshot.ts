import "server-only";
import type { AreaLatest, DataRepository } from "../../contracts/dashboard.ts";
import { overviewSchema } from "../../contracts/dashboard.ts";
import { monitoredAreaCatalog as areaCatalog } from "../../domain/catalog.ts";
import { getCoverage, getFreshness } from "../../domain/metrics.ts";
import { readLocalSnapshot } from "../local-snapshot/read.ts";
import { SnapshotError } from "../local-snapshot/contracts.ts";
import { readPublicCollection } from "../local-snapshot/scheduler-state.ts";
import { buildLiveHistory } from "./live.ts";

/** 개발용 실제 수집본만 조회한다. 누락 시 합성 값이나 원천 호출로 대체하지 않는다. */
export class LocalSnapshotRepository implements DataRepository {
  constructor(private readonly clock: () => number = Date.now) {}

  private async snapshot() {
    const snapshot = await readLocalSnapshot();
    if (!snapshot) throw new SnapshotError("SNAPSHOT_MISSING");
    return snapshot;
  }

  async getAreas() {
    const [, collection] = await Promise.all([this.snapshot(), readPublicCollection(this.clock())]);
    const enabled = collection?.status === "collecting" || collection?.status === "waiting";
    return areaCatalog.map((area) => ({ ...area, collectionEnabled: enabled, geometryAvailable: true, catalogVersion: "2026-04-02" }));
  }

  async getOverview() {
    const now = this.clock();
    const [snapshot, collection] = await Promise.all([this.snapshot(), readPublicCollection(now)]);
    const enabled = collection?.status === "collecting" || collection?.status === "waiting";
    const items = areaCatalog.map((known): AreaLatest => {
      const area = snapshot.areas.find((item) => item.areaCode === known.areaCode) ?? { ...known, lastAttemptAt: null,
        population: { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: "not-provided" },
        weather: { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: "not-provided" } };
      return { ...area, collectionEnabled: enabled,
      population: { ...area.population, freshness: area.population.value ? getFreshness(area.population.observedAt, now) : "missing" },
      weather: { ...area.weather, freshness: area.weather.value ? getFreshness(area.weather.observedAt, now, "weather") : "missing" },
    }; });
    return overviewSchema.parse({ meta: { schemaVersion: 1, dataset: "live", generatedAt: new Date(now).toISOString(),
      source: "seoul-citydata", displayTimeZone: "Asia/Seoul", storage: "local-snapshot", capturedAt: snapshot.capturedAt, collection,
      coverage: getCoverage(items, now, areaCatalog.length) }, data: { items } });
  }

  async getHistory(areaCodes: string[]) {
    const snapshot = await this.snapshot();
    const areas = areaCatalog.filter((area) => areaCodes.includes(area.areaCode));
    const available: Record<string, string | null> = {};
    for (const area of areas) available[area.areaCode] = snapshot.observations
      .filter((row) => row.area_code === area.areaCode).map((row) => row.observed_at).toSorted()[0] ?? null;
    const history = buildLiveHistory(areas, snapshot.observations, available, this.clock());
    return { ...history, meta: { ...history.meta, storage: "local-snapshot" as const, capturedAt: snapshot.capturedAt } };
  }
}
