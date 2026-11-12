export type MapPoint<T> = { x: number; y: number; value: T };
export type MarkerGroup<T> = { x: number; y: number; points: MapPoint<T>[] };

/** 화면 픽셀 기준으로 클릭 영역을 분리한다. 원래 좌표는 points에 보존한다. */
export function groupMapMarkers<T>(points: MapPoint<T>[], spacing = 44): MarkerGroup<T>[] {
  const groups = points.map((point) => ({ x: point.x, y: point.y, points: [point] }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < groups.length && !merged; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        if (Math.abs(groups[i].x - groups[j].x) >= spacing || Math.abs(groups[i].y - groups[j].y) >= spacing) continue;
        const members = [...groups[i].points, ...groups[j].points];
        groups[i] = { points: members, x: members.reduce((sum, point) => sum + point.x, 0) / members.length,
          y: members.reduce((sum, point) => sum + point.y, 0) / members.length };
        groups.splice(j, 1);
        merged = true;
        break;
      }
    }
  }
  return groups;
}
