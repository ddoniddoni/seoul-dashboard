import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { buildLiveHistory, type PopulationRow } from "../../src/lib/server/repositories/live.ts";

const now = Date.parse("2026-10-14T08:10:31Z");
const areas = [{ areaCode: "POI014", areaName: "강남역" },{ areaCode: "POI007", areaName: "홍대 관광특구" }];
function row(at: string, min = 10): PopulationRow { return { area_code: "POI014", observed_at: at, ppl_min: min, ppl_max: min + 10, congestion: "normal" }; }
describe("저장된 실제 이력의 DTO 변환: 합성 입력, 실행 대기", () => {
  it("인접한 두 5분 관측을 별도 버킷으로 보존한다", () => {
    const history = buildLiveHistory(areas, [row("2026-10-14T08:00:00Z", 10), row("2026-10-14T08:05:00Z", 20)], {}, now);
    expect(history.data.resolutionMinutes).toBe(5);
    const recorded = history.data.series[0].points.filter((point) => point.min !== null);
    expect(recorded.map((point) => [point.bucketAt, point.min])).toEqual([
      ["2026-10-14T08:00:00.000Z", 10], ["2026-10-14T08:05:00.000Z", 20],
    ]);
  });
  it("같은 버킷은 마지막 관측 범위를 사용하고 관측을 합산하지 않는다", () => {
    const history = buildLiveHistory(areas, [row("2026-10-14T08:06:00Z",10),row("2026-10-14T08:09:00Z",20)],{},now);
    const point = history.data.series[0].points.find((value) => value.bucketAt === "2026-10-14T08:05:00.000Z");
    expect(point).toMatchObject({ min: 20, max: 30, observedAt: "2026-10-14T08:09:00.000Z", observationCount: 2 });
    expect(history.meta.source).toBe("seoul-citydata");
  });
  it("결측은 null, 수집 전 가용 시작도 null이며 demo를 섞지 않는다", () => {
    const history = buildLiveHistory(areas, [], {}, now);
    expect(history.data.series.every((series) => series.availableSince === null && series.points.every((point) => point.min === null && point.observedAt === null))).toBe(true);
    expect(history.meta.dataset).toBe("live");
  });
  it("양 끝의 부분 버킷과 모든 장소의 공통 실구간을 명시한다", () => {
    const history = buildLiveHistory(areas, [], {}, now);
    expect(history.data.series[0].points).toHaveLength(289);
    expect(history.data.series[0].points[0]).toMatchObject({ partial: true, windowFrom: history.data.from });
    expect(history.data.series[0].points.at(-1)).toMatchObject({ partial: true, windowTo: history.data.to });
    expect(history.data.series[0].points.map((point) => point.bucketAt)).toEqual(history.data.series[1].points.map((point) => point.bucketAt));
  });
  it("[from,to) 밖과 미래 관측을 제외하고 기록 시작 전을 채우지 않는다", () => {
    const available = { POI014: "2026-10-14T08:00:00Z" };
    const history = buildLiveHistory(areas, [row("2026-10-13T08:10:30Z"),row("2026-10-14T08:10:31Z"),row("2026-10-14T09:00:00Z"),row("2026-10-14T08:00:00Z")],available,now);
    expect(history.data.series[0].points.filter((point) => point.observedAt !== null)).toHaveLength(1);
    expect(history.data.series[0].availableSince).toBe(available.POI014);
  });
});
