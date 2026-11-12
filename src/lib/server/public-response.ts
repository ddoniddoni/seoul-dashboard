import "server-only";
import type { Dataset } from "../contracts/dashboard.ts";
import { areaCatalog } from "../domain/catalog.ts";
import { createReadRepository } from "./repositories/read.ts";
import { apiError } from "./http.ts";
export function publicJson(data: unknown, dataset: Dataset) {
  return Response.json(data, { headers: { "Cache-Control": dataset === "demo" ? "no-store" : "public, s-maxage=15, stale-while-revalidate=30" } });
}
export async function readPublicRequest(request: Request, rawDataset: string) {
  if (rawDataset !== "live") return { response: apiError("DATASET_NOT_FOUND", "실데이터 조회만 제공합니다.", 404) } as const;
  const url = new URL(request.url);
  if (url.searchParams.has("scenario") && url.searchParams.get("scenario") !== "normal") {
    return { response: apiError("INVALID_QUERY", "지원하지 않는 조회 조건입니다.", 400) } as const;
  }
  const now = Date.now();
  return { dataset: "live", scenario: "normal", url, now } as const;
}
export async function handlePublicRead(request: Request, rawDataset: string, kind: "overview" | "history" | "areas" | "area" | "status", areaCode?: string) {
  const parsed = await readPublicRequest(request, rawDataset);
  if (parsed.response) return parsed.response;
  const { dataset, now, url } = parsed;
  try {
    let places: string[] = [];
    if (kind === "history") {
      places = [...new Set(url.searchParams.getAll("places").flatMap((value) => value.split(",")).filter(Boolean))];
      if (!places.length || places.length > 3 || places.some((code) => !areaCatalog.some((area) => area.areaCode === code))
        || (url.searchParams.get("range") ?? "24h") !== "24h") return apiError("INVALID_QUERY", "등록된 장소 1~3곳과 24시간 범위를 선택하세요.", 400);
    }
    if (kind === "area" && !areaCatalog.some((area) => area.areaCode === areaCode)) return apiError("AREA_NOT_FOUND", "등록된 장소를 확인하세요.", 404);
    const repository = createReadRepository(dataset, now);
    if (kind === "history") return publicJson(await repository.getHistory(places), dataset);
    if (kind === "areas") {
      const areas = await repository.getAreas();
      return publicJson({ meta: { schemaVersion: 1, dataset, generatedAt: new Date(now).toISOString(), displayTimeZone: "Asia/Seoul",
        source: "seoul-citydata" }, data: { items: areas } }, dataset);
    }
    const overview = await repository.getOverview();
    if (kind === "overview") return publicJson(overview, dataset);
    if (kind === "area") {
      const area = overview.data.items.find((item) => item.areaCode === areaCode);
      return area ? publicJson({ meta: overview.meta, data: area }, dataset) : apiError("AREA_NOT_FOUND", "공개된 장소를 확인하세요.", 404);
    }
    return publicJson({ meta: overview.meta, data: { items: overview.data.items.map((area) => ({ areaCode: area.areaCode,
      collectionEnabled: area.collectionEnabled ?? false, lastAttemptAt: area.lastAttemptAt, populationObservedAt: area.population.observedAt, weatherObservedAt: area.weather.observedAt,
      populationFreshness: area.population.freshness, weatherFreshness: area.weather.freshness,
      populationLastResult: area.population.lastResult, weatherLastResult: area.weather.lastResult })) } }, dataset);
  } catch {
    return dataset === "live" ? apiError("LIVE_UNAVAILABLE", "저장된 실데이터를 조회할 수 없습니다. 잠시 뒤 다시 시도하세요.", 503, true)
      : apiError("INTERNAL_ERROR", "데이터를 불러오지 못했습니다.", 500, true);
  }
}
