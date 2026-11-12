import type { AreaLatest } from "../contracts/dashboard";
import { congestionOrder, getFreshness } from "./metrics";

export type RankedPlace = { area: AreaLatest; rank: number; tied: boolean };
export type PlaceRanking = { entries: RankedPlace[]; eligible: number; excluded: number };

function rankPlaces(items: AreaLatest[], score: (area: AreaLatest) => number, descending: boolean, monitored: number, limit: number): PlaceRanking {
  const ordered = items.map((area) => ({ area, value: score(area) })).toSorted((a, b) =>
    (descending ? b.value - a.value : a.value - b.value) || a.area.areaName.localeCompare(b.area.areaName, "ko"));
  const counts = new Map<number, number>();
  for (const entry of ordered) counts.set(entry.value, (counts.get(entry.value) ?? 0) + 1);
  let rank = 0;
  const entries = ordered.map((entry, index) => {
    if (index === 0 || entry.value !== ordered[index - 1].value) rank = index + 1;
    return { area: entry.area, rank, tied: counts.get(entry.value)! > 1 };
  });
  return { entries: entries.slice(0, limit), eligible: items.length, excluded: Math.max(0, monitored - items.length) };
}

export function getPlaceRankings(items: AreaLatest[], now: number, monitored: number, limit = 4) {
  // 지연/만료를 포함한 마지막 관측이다. 누락과 유효하지 않은 원천 시각은 순위에서 제외한다.
  const observed = items.filter((area) => area.population.value && getFreshness(area.population.observedAt, now) !== "missing");
  const classified = observed.filter((area) => area.population.value!.congestion !== "unknown");
  return {
    congestion: rankPlaces(classified, (area) => congestionOrder[area.population.value!.congestion], true, monitored, limit),
    population: rankPlaces(observed, (area) => area.population.value!.midpoint, false, monitored, limit),
  };
}
