import { describe, expect, it } from "vitest";
import type { AreaLatest, Congestion } from "../../src/lib/contracts/dashboard";
import { getPlaceRankings } from "../../src/lib/domain/place-rankings";

const now = Date.parse("2026-11-10T12:00:00+09:00");
function place(name: string, congestion: Congestion, min = 100, max = 200): AreaLatest {
  return {
    areaCode: name, areaName: name, category: "테스트 자료", lastAttemptAt: null,
    population: { value: { min, max, midpoint: (min + max) / 2, congestion, message: null }, observedAt: "2026-11-10T11:20:00+09:00", fetchedAt: "2026-11-10T11:55:00+09:00", freshness: "stale", lastResult: "valid" },
    weather: { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: "not-provided" },
  };
}

describe("마지막 관측의 장소 순위", () => {
  it("혼잡 단계가 같으면 인구가 달라도 공동 순위이며 전체 동률 수를 반영한다", () => {
    const data = [place("나", "busy", 1000, 2000), place("다", "normal"), place("가", "busy", 100, 200)];
    const ranking = getPlaceRankings(data, now, 3, 1).congestion;
    expect(ranking.entries.map(({ area, rank, tied }) => [area.areaName, rank, tied])).toEqual([["가", 1, true]]);
    expect(getPlaceRankings(data, now, 3).congestion.entries[2].rank).toBe(3);
    expect(ranking.eligible).toBe(3);
  });

  it("인구는 범위 중앙값으로 정렬하며 실제 0과 누락을 구분한다", () => {
    const missing = place("누락", "relaxed");
    missing.population.value = null;
    const data = [place("동률나", "normal", 100, 200), place("영", "unknown", 0, 0), missing, place("동률가", "busy", 0, 300)];
    const result = getPlaceRankings(data, now, 5);
    expect(result.population.entries.map(({ area, rank, tied }) => [area.areaName, rank, tied])).toEqual([["영", 1, false], ["동률가", 2, true], ["동률나", 2, true]]);
    expect(result.population.excluded).toBe(2);
    expect(result.congestion.eligible).toBe(2);
  });

  it("시각 누락과 잘못된 미래 관측은 제외하고 만료 자료의 원천 시각은 보존한다", () => {
    const expired = place("과거", "relaxed");
    expired.population.observedAt = "2026-11-10T09:00:00+09:00";
    const absent = place("시각없음", "busy"); absent.population.observedAt = null;
    const invalid = place("잘못된시각", "busy"); invalid.population.observedAt = "invalid";
    const future = place("미래", "busy"); future.population.observedAt = "2026-11-10T13:00:00+09:00";
    const ranking = getPlaceRankings([expired, absent, invalid, future], now, 4).congestion;
    expect(ranking.entries.map(({ area }) => area.areaName)).toEqual(["과거"]);
    expect(ranking.entries[0].area.population.observedAt).toBe("2026-11-10T09:00:00+09:00");
    expect(ranking.excluded).toBe(3);
    expect(getPlaceRankings([], now, 20).population).toEqual({ entries: [], eligible: 0, excluded: 20 });
  });
});
