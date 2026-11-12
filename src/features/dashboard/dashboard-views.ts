export type DashboardView = "overview" | "places" | "map" | "status" | "detail";

export const dashboardViews = {
  overview: { title: "종합 현황", description: "서울 주요 장소의 혼잡도와 인구 흐름", path: "/" },
  places: { title: "장소 탐색", description: "장소를 검색하고, 상세를 확인하거나 최대 3곳을 비교하세요.", path: "/places" },
  map: { title: "지도 보기", description: "서울 지도에서 장소를 선택해 혼잡도와 인구 흐름을 살펴보세요.", path: "/map" },
  status: { title: "자료 상태", description: "장소별 원천 기준 시각, 수집 시각과 자료 최신성을 확인하세요.", path: "/data-status" },
  detail: { title: "장소 상세", description: "시간대별 인구 흐름과 환경 정보", path: "/areas" },
} as const;
