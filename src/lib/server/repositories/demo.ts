import "server-only";
import { historySchema, overviewSchema, type DataRepository, type DemoScenario } from "../../contracts/dashboard";
import { createDemoData } from "../../fixtures/demo";
import type { DashboardState } from "../../url-state/dashboard";
import { monitoredAreaCatalog as areaCatalog } from "../../domain/catalog";

export class DemoRepository implements DataRepository {
  constructor(private readonly clock: () => number = Date.now, private readonly seed = 20261014) {}
  getOverview(scenario: DemoScenario = "normal") {
    return overviewSchema.parse(createDemoData(this.clock(), this.seed, scenario).overview);
  }
  getHistory(areaCodes: string[], scenario: DemoScenario = "normal") {
    return historySchema.parse(createDemoData(this.clock(), this.seed, scenario).history(areaCodes));
  }
  getAreas() {
    return areaCatalog.map((area) => ({ ...area, collectionEnabled: false, geometryAvailable: false, catalogVersion: "2026-04-02" }));
  }
}

/** 요청의 clock을 데이터 준비 단계에서 한 번 확정해 최신값/이력/SSR에 공유한다. */
export function readDemoPageData(state: DashboardState) {
  const now = Date.now();
  const repository = new DemoRepository(() => now);
  const preload = state.dataset === "demo" && state.scenario !== "loading" && state.scenario !== "error";
  return {
    initialNow: now,
    initialOverview: preload ? repository.getOverview(state.scenario) : undefined,
    initialHistory: preload && state.area ? repository.getHistory([state.area], state.scenario) : undefined,
  };
}
