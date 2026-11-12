/** 장소 탐색은 화면에 맞는 크기를 전달하고, 지도 옆 목록은 기존 크기를 유지한다. */
export function getPlacePage(items: readonly { areaCode: string }[], selected: string | null, requested?: number, pageSize = items.length > 5 ? 3 : 5) {
  const count = Math.max(1, Math.ceil(items.length / pageSize));
  const selectedIndex = items.findIndex((item) => item.areaCode === selected);
  const page = Math.min(count, Math.max(1, requested ?? (selectedIndex >= 0 ? Math.floor(selectedIndex / pageSize) + 1 : 1)));
  return { page, pageSize, count, start: (page - 1) * pageSize };
}
