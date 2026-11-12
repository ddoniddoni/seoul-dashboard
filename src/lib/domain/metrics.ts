import type { AreaLatest, Congestion, Freshness } from "../contracts/dashboard";

export const congestionLabels: Record<Congestion, string> = {
  relaxed: "여유", normal: "보통", "slightly-busy": "약간 붐빔", busy: "붐빔", unknown: "확인 불가",
};
export const congestionOrder: Record<Congestion, number> = {
  busy: 4, "slightly-busy": 3, normal: 2, relaxed: 1, unknown: 0,
};
export const freshnessLabels: Record<Freshness, string> = {
  fresh: "최신", stale: "갱신 지연", expired: "자료 만료", missing: "자료 없음",
};

export function getFreshness(observedAt: string | null, now: number, kind: "population" | "weather" = "population"): Freshness {
  if (!observedAt) return "missing";
  const observed = Date.parse(observedAt);
  if (!Number.isFinite(observed) || observed > now + 5 * 60_000) return "missing";
  const age = (now - observed) / 60_000;
  const freshLimit = kind === "population" ? 30 : 120;
  return age <= freshLimit ? "fresh" : age <= freshLimit * 2 ? "stale" : "expired";
}

export function getCoverage(items: AreaLatest[], now: number, monitored = items.length) {
  const coverage = { monitored, fresh: 0, stale: 0, expired: 0, missing: Math.max(0, monitored - items.length) };
  for (const item of items) coverage[item.population.value ? getFreshness(item.population.observedAt, now) : "missing"]++;
  return coverage;
}

export function getOverviewMetrics(items: AreaLatest[], now: number, monitored: number) {
  const coverage = getCoverage(items, now, monitored);
  const fresh = items.filter((item) => item.population.value && getFreshness(item.population.observedAt, now) === "fresh");
  return {
    coverage,
    busy: fresh.length ? fresh.filter((item) => item.population.value?.congestion === "busy").length : null,
    relaxed: fresh.length ? fresh.filter((item) => item.population.value?.congestion === "relaxed").length : null,
    delayed: items.some((item) => item.population.value) ? coverage.stale + coverage.expired : null,
  };
}

// 마지막 관측의 분포다. 자료 최신성 판정과 분리하며 지연/만료 값을 최신으로 바꾸지 않는다.
export function getObservationSummary(items: AreaLatest[], now: number, monitored: number) {
  const counts: Record<Congestion, number> = { relaxed: 0, normal: 0, "slightly-busy": 0, busy: 0, unknown: 0 };
  const observed = items.filter((item) => item.population.value && getFreshness(item.population.observedAt, now) !== "missing");
  for (const item of observed) counts[item.population.value!.congestion]++;
  const times = observed.map((item) => Date.parse(item.population.observedAt!));
  return {
    counts,
    available: observed.length,
    classified: observed.length - counts.unknown,
    unknown: Math.max(0, monitored - observed.length) + counts.unknown,
    oldestAt: times.length ? new Date(Math.min(...times)).toISOString() : null,
    newestAt: times.length ? new Date(Math.max(...times)).toISOString() : null,
    coverage: getCoverage(items, now, monitored),
  };
}

const timeFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const dateFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
export function formatTime(value: string | number | null) { return value === null ? "—" : timeFormatter.format(new Date(value)); }
export function formatDateTime(value: string | null) { return value === null ? "제공된 시각 없음" : dateFormatter.format(new Date(value)); }
export function formatNumber(value: number | null) { return value === null ? "—" : value.toLocaleString("ko-KR"); }
export function formatRange(value: AreaLatest["population"]["value"]) { return value ? `${formatNumber(value.min)}~${formatNumber(value.max)}` : "—"; }
