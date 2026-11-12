import { describe, expect, it } from "vitest";
import { groupMapMarkers } from "../../src/lib/geo/marker-groups.ts";

describe("지도의 겹친 클릭 영역 묶기", () => {
  it("가까운 장소를 잃지 않고 묶으며 원래 좌표를 보존한다", () => {
    const points = [{ x: 0, y: 0, value: "DDP" }, { x: 10, y: 10, value: "동대문" }, { x: 200, y: 100, value: "강남" }];
    const groups = groupMapMarkers(points);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ x: 5, y: 5, points: points.slice(0, 2) });
    expect(groups.flatMap((group) => group.points)).toEqual(points);
  });
  it("묶은 뒤에도 사각형 클릭 영역과 간격이 겹치지 않는다", () => {
    const points = Array.from({ length: 20 }, (_, i) => ({ x: i % 5 * 35, y: Math.floor(i / 5) * 35, value: i }));
    const groups = groupMapMarkers(points);
    expect(new Set(groups.flatMap((group) => group.points.map((point) => point.value))).size).toBe(20);
    for (const a of groups) for (const b of groups) {
      if (a !== b) expect(Math.abs(a.x - b.x) >= 44 || Math.abs(a.y - b.y) >= 44).toBe(true);
    }
  });
  it("충분히 확대하면 가까웠던 장소가 별도 표식으로 나뉜다", () => {
    const points = [{ x: 10, y: 10, value: "a" }, { x: 30, y: 20, value: "b" }];
    expect(groupMapMarkers(points)).toHaveLength(1);
    expect(groupMapMarkers(points.map((point) => ({ ...point, x: point.x * 4, y: point.y * 4 })))).toHaveLength(2);
    expect(groupMapMarkers([])).toEqual([]);
  });
});
