import { congestionSchema, type Congestion, type Dataset, type DemoScenario } from "../contracts/dashboard";
import { isAreaCode } from "../domain/catalog";

export type DashboardState = {
  dataset: Dataset; area: string | null; q: string; levels: Congestion[];
  sort: "congestion" | "population" | "name" | "sourceTime";
  places: string[]; range: "24h" | "7d"; scenario: DemoScenario; page?: number;
};
export type SearchInput = Record<string, string | string[] | undefined>;

export function toSearchParams(input: SearchInput) {
  const result = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) result.append(key, item);
  }
  return result;
}

export function parseDashboardState(params: URLSearchParams) {
  const issues: string[] = [];
  // 이전 dataset/scenario 링크도 공개 화면에서는 실데이터로 해석한다.
  const rawArea = params.get("area");
  if (rawArea && !isAreaCode(rawArea)) issues.push("등록되지 않은 장소입니다. 목록에서 장소를 선택하세요.");
  const rawPlaces = [...new Set(params.getAll("places").flatMap((value) => value.split(",")).filter(Boolean))];
  if (rawPlaces.length > 3) issues.push("비교 장소는 최대 3곳입니다. 처음 3곳만 유지했습니다.");
  if (rawPlaces.some((code) => !isAreaCode(code))) issues.push("등록되지 않은 비교 장소를 제외했습니다.");
  const levels = [...new Set(params.getAll("level").flatMap((value) => value.split(",")))]
    .flatMap((value) => { const result = congestionSchema.safeParse(value); return result.success ? [result.data] : []; });
  const rawSort = params.get("sort");
  const sort = rawSort === "population" || rawSort === "name" || rawSort === "sourceTime" ? rawSort : "congestion";
  const state: DashboardState = {
    dataset: "live",
    area: rawArea && isAreaCode(rawArea) ? rawArea : null,
    q: (params.get("q") ?? "").slice(0, 50), levels, sort,
    places: rawPlaces.filter(isAreaCode).slice(0, 3),
    range: params.get("range") === "7d" ? "7d" : "24h",
    scenario: "normal",
  };
  const page = Number(params.get("page"));
  if (Number.isSafeInteger(page) && page > 1 && page <= 10_000) state.page = page;
  return { state, issues };
}

export function dashboardHref(state: DashboardState, changes: Partial<DashboardState> = {}, pathname = "/") {
  const next = { ...state, ...changes };
  if (!Object.hasOwn(changes, "page") && ["area", "q", "levels", "sort", "dataset", "scenario"].some((key) => Object.hasOwn(changes, key))) next.page = undefined;
  const params = new URLSearchParams();
  if (next.area) params.set("area", next.area);
  if (next.q) params.set("q", next.q.slice(0, 50));
  for (const level of [...next.levels].sort()) params.append("level", level);
  if (next.sort !== "congestion") params.set("sort", next.sort);
  if (next.places.length) params.set("places", [...new Set(next.places)].slice(0, 3).join(","));
  if (next.range !== "24h") params.set("range", next.range);
  if (next.page && next.page > 1) params.set("page", String(next.page));
  return params.size ? `${pathname}?${params.toString()}` : pathname;
}
