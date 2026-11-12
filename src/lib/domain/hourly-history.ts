import type { History, HistorySeries } from "../contracts/dashboard";

type HistoryPoint = HistorySeries["points"][number];
export type HourlyHistoryPoint = {
  start: number;
  end: number;
  partial: boolean;
  point: HistoryPoint | null;
  midpoint: number | null;
  availableBuckets: number;
  totalBuckets: number;
};

// 한국 시간도 정시가 UTC의 정시에 대응한다. 조회 경계의 일부 시간은 그대로 표시한다.
export function getHourlyHistory(history: History, series: HistorySeries | null = history.data.series[0] ?? null): HourlyHistoryPoint[] {
  const hour = 60 * 60_000;
  const from = Date.parse(history.data.from);
  const to = Date.parse(history.data.to);
  const start = Math.floor(from / hour) * hour;
  const hours: HourlyHistoryPoint[] = [];
  for (let time = start; time < to; time += hour) {
    hours.push({ start: time, end: Math.min(time + hour, to), partial: time < from || time + hour > to,
      point: null, midpoint: null, availableBuckets: 0, totalBuckets: 0 });
  }
  for (const point of series?.points ?? []) {
    const time = Date.parse(point.windowFrom ?? point.bucketAt);
    if (time < from || time >= to) continue;
    const bucket = hours[Math.floor((time - start) / hour)];
    if (!bucket) continue;
    bucket.totalBuckets++;
    if (point.min === null || point.max === null || !point.observedAt) continue;
    bucket.availableBuckets++;
    if (!bucket.point?.observedAt || Date.parse(point.observedAt) >= Date.parse(bucket.point.observedAt)) {
      bucket.point = point;
      bucket.midpoint = (point.min + point.max) / 2;
    }
  }
  return hours;
}
