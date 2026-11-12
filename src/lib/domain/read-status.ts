import type { CollectionStatus } from "../contracts/dashboard.ts";

export function getReadNotice(online: boolean, failed: boolean, hasData: boolean): string {
  if (!online) return hasData ? "오프라인 / 마지막 조회 자료를 표시합니다" : "오프라인 / 연결 후 자료를 불러올 수 있습니다";
  if (failed) return hasData ? "재조회 실패 / 마지막 정상 자료를 표시합니다" : "현황 조회 실패 / 잠시 뒤 다시 조회해 주세요";
  return "";
}

export function getCollectionNotice(collection?: CollectionStatus): string {
  if (collection?.status === "collecting" || collection?.status === "waiting") {
    return `${collection.intervalMinutes}분 간격으로 수집 중입니다. 원천 기준 시각과 수신 시각은 아래에서 확인할 수 있습니다.`;
  }
  if (collection?.status === "paused") return "정기 수집이 일시 중지됐습니다. 저장된 자료의 기준 시각을 확인하세요.";
  if (collection?.status === "stopped") return "정기 수집이 중지됐습니다. 저장된 자료의 기준 시각을 확인하세요.";
  return "수집기의 실행 상태는 확인되지 않았습니다. 아래 원천 기준 시각과 수신 시각으로 자료의 최신성을 확인하세요.";
}
