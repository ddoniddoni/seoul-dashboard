import { describe, expect, it } from "vitest";
import { createDemoData } from "../../src/lib/fixtures/demo";
import { getHourlyHistory } from "../../src/lib/domain/hourly-history";
import { comparisonHistoryOptions } from "../../src/lib/query/dashboard";
import { dashboardHref, parseDashboardState } from "../../src/lib/url-state/dashboard";

const now = Date.parse("2026-11-08T06:20:00+09:00");
const codes = ["POI014", "POI007", "POI003"];

describe("장소 비교 계약", () => {
  it("순서와 중복이 다른 같은 조합은 동일한 캐시 키를 사용한다", () => {
    expect(comparisonHistoryOptions("demo", "normal", [codes[1], codes[0], codes[0]]).queryKey)
      .toEqual(comparisonHistoryOptions("demo", "normal", codes.slice(0, 2)).queryKey);
    expect(comparisonHistoryOptions("live", "normal", codes).queryKey)
      .not.toEqual(comparisonHistoryOptions("demo", "normal", codes).queryKey);
  });
  it("선택이 2~3개인 경우에만 비교 기록 조회를 활성화한다", () => {
    expect(comparisonHistoryOptions("demo", "normal", []).enabled).toBe(false);
    expect(comparisonHistoryOptions("demo", "normal", [codes[0]]).enabled).toBe(false);
    expect(comparisonHistoryOptions("demo", "normal", codes).enabled).toBe(true);
    expect(comparisonHistoryOptions("demo", "normal", [...codes, "POI072"]).enabled).toBe(false);
  });
  it("공유 링크에서 선택 순서를 보존하고 실데이터를 사용한다", () => {
    const state = parseDashboardState(new URLSearchParams("dataset=demo&places=POI014,POI007,POI003&scenario=partial")).state;
    const url = new URL(dashboardHref(state, {}, "/compare"), "https://example.invalid");
    expect(url.pathname).toBe("/compare");
    expect(parseDashboardState(url.searchParams).state).toEqual(state);
  });
  it("다른 장소의 관측이 누락돼도 모든 시간축은 같다", () => {
    const history = createDemoData(now).history(codes);
    const first = getHourlyHistory(history, history.data.series[0]);
    const absent = getHourlyHistory(history, null);
    expect(absent.map((hour) => [hour.start, hour.end, hour.partial])).toEqual(first.map((hour) => [hour.start, hour.end, hour.partial]));
    expect(first.some((hour) => hour.midpoint !== null)).toBe(true);
    expect(absent.every((hour) => hour.midpoint === null && hour.point === null)).toBe(true);
  });
  it("완전히 누락된 시간은 0으로 바꾸지 않고 관측된 0명은 보존한다", () => {
    const history = createDemoData(now).history([codes[0]]);
    const source = history.data.series[0];
    source.points = source.points.map((point, index) => index === 0 ? { ...point, min: 0, max: 0 } : { ...point, min: null, max: null, observedAt: null });
    const hours = getHourlyHistory(history, source);
    expect(hours[0].midpoint).toBe(0);
    expect(hours.slice(1).every((hour) => hour.midpoint === null)).toBe(true);
  });
});
