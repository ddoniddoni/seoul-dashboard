import type { AreaLatest, DemoScenario, History, Overview } from "../contracts/dashboard";
import { monitoredAreaCatalog as areaCatalog } from "../domain/catalog";
import { getCoverage, getFreshness } from "../domain/metrics";

const step = 10 * 60_000;
const presets = [
  { min: 32000, max: 35000, level: "busy", age: 10 },
  { min: 18000, max: 20000, level: "slightly-busy", age: 10 },
  { min: 12000, max: 14000, level: "normal", age: 20 },
  { min: 7000, max: 8500, level: "relaxed", age: 10 },
  { min: 9000, max: 10500, level: "normal", age: 40 },
  { min: 14000, max: 16000, level: "slightly-busy", age: 10 },
  { min: 24000, max: 27000, level: "busy", age: 20 },
  { min: 3500, max: 4500, level: "relaxed", age: 10 },
  { min: 11000, max: 13000, level: "normal", age: 10 },
  { min: 17000, max: 19000, level: "slightly-busy", age: 20 },
  { min: 21000, max: 24000, level: "busy", age: 10 },
  { min: 13000, max: 15000, level: "normal", age: 20 },
  { min: 8000, max: 9500, level: "normal", age: 10 },
  { min: 10000, max: 12000, level: "slightly-busy", age: 10 },
  { min: 6000, max: 7500, level: "busy", age: 20 },
  { min: 5000, max: 6500, level: "slightly-busy", age: 10 },
  { min: 4000, max: 5500, level: "normal", age: 20 },
  { min: 2500, max: 3500, level: "relaxed", age: 10 },
  { min: 4500, max: 6000, level: "relaxed", age: 20 },
  { min: 8000, max: 10000, level: "normal", age: 10 },
] as const;
const iso = (time: number) => new Date(time).toISOString();

/** 시각과 seed를 주입한다. 이 값은 공식 관측과 무관한 고정 시연용 합성 데이터다. */
export function createDemoData(now: number, seed = 20261014, scenario: DemoScenario = "normal") {
  const anchor = Math.floor(now / step) * step;
  const items: AreaLatest[] = scenario === "empty" ? [] : areaCatalog.map((area, index) => {
    const preset = presets[index];
    const missing = scenario === "partial" && index === 4;
    const age = scenario === "stale" ? (index % 2 ? 80 : 40) : preset.age;
    const observedAt = missing ? null : iso(anchor - age * 60_000);
    const weatherMissing = scenario === "partial" && index === 1;
    return {
      ...area,
      population: {
        value: missing ? null : { min: preset.min, max: preset.max, midpoint: (preset.min + preset.max) / 2,
          congestion: preset.level, message: "시연을 위해 구성한 혼잡 단계입니다. 실제 현장 상황을 나타내지 않습니다." },
        observedAt, fetchedAt: missing ? null : iso(anchor - (age - 2) * 60_000),
        freshness: getFreshness(observedAt, now),
        lastResult: missing || scenario === "partial" && index === 2 ? "fetch-failed" : "valid",
      },
      weather: {
        value: weatherMissing ? null : { temperatureC: 21 + index * 0.3, humidityPct: 43 + index * 2, pm25MicrogramsPerM3: 11 + index },
        observedAt: weatherMissing ? null : iso(anchor - 30 * 60_000),
        fetchedAt: weatherMissing ? null : iso(anchor - 28 * 60_000),
        freshness: weatherMissing ? "missing" : "fresh", lastResult: weatherMissing ? "not-provided" : "valid",
      },
      lastAttemptAt: iso(anchor - 60_000),
    };
  });
  const overview: Overview = {
    meta: { schemaVersion: 1, dataset: "demo", source: "synthetic-demo", displayTimeZone: "Asia/Seoul", generatedAt: iso(now),
      coverage: getCoverage(items, now, areaCatalog.length) },
    data: { items },
  };
  function history(areaCodes: string[]): History {
    const from = anchor - 24 * 60 * 60_000;
    return {
      meta: { schemaVersion: 1, dataset: "demo", source: "synthetic-demo", displayTimeZone: "Asia/Seoul", generatedAt: iso(now) },
      data: { from: iso(from), to: iso(anchor), resolutionMinutes: 10, series: areaCodes.filter((code) => items.some((item) => item.areaCode === code)).map((areaCode) => {
        const index = areaCatalog.findIndex((area) => area.areaCode === areaCode);
        const area = items.find((item) => item.areaCode === areaCode)!;
        const preset = presets[index];
        const startIndex = scenario === "short-history" ? 126 : 0;
        const points = Array.from({ length: 144 }, (_, bucket) => {
          const time = from + bucket * step;
          const hour = ((time / 3_600_000 + 9) % 24 + 24) % 24;
          const wave = 0.42 + 0.58 * (Math.sin((hour - 8 - index * 0.6) * Math.PI / 24) ** 2);
          const noise = ((Math.floor(time / step) + seed + index * 17) % 11) / 100;
          const min = Math.round(preset.min * (wave + noise) / 100) * 100;
          const gap = bucket < startIndex || bucket >= 58 && bucket <= 61 || !area.population.value
            || scenario === "stale" && bucket >= (index % 2 ? 136 : 140);
          const isLatest = iso(time) === area.population.observedAt;
          return {
            bucketAt: iso(time), observedAt: gap ? null : iso(time),
            min: gap ? null : isLatest ? preset.min : min,
            max: gap ? null : isLatest ? preset.max : min + (preset.max - preset.min),
            congestion: gap ? "unknown" as const : preset.level,
          };
        });
        // 최신 자료의 원천 시각 이후를 과거 관측으로 채우지 않는다.
        for (const point of points) {
          if (!area.population.observedAt || point.bucketAt > area.population.observedAt) {
            point.observedAt = null; point.min = null; point.max = null; point.congestion = "unknown";
          }
        }
        return { areaCode, areaName: area.areaName, availableSince: points.find((point) => point.observedAt)?.observedAt ?? null, points };
      }) },
    };
  }
  return { overview, history };
}
