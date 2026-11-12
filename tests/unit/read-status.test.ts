import { describe, expect, it } from "vitest";
import { getCollectionNotice, getReadNotice } from "../../src/lib/domain/read-status.ts";

describe("실제로 보유한 자료와 확인된 수집 상태만 안내한다", () => {
  it("최초 실패와 자료를 보유한 재조회 실패를 구분한다", () => {
    expect(getReadNotice(true, true, false)).toContain("현황 조회 실패");
    expect(getReadNotice(true, true, false)).not.toContain("마지막 정상");
    expect(getReadNotice(true, true, true)).toContain("마지막 정상");
    expect(getReadNotice(true, false, false)).toBe("");
  });
  it("오프라인에서도 보유하지 않은 자료를 표시한다고 하지 않는다", () => {
    expect(getReadNotice(false, false, false)).toContain("연결 후");
    expect(getReadNotice(false, false, true)).toContain("마지막 조회");
  });
  it("상태가 없거나 unknown이면 수동 수집이나 중지라고 단정하지 않는다", () => {
    const unknown = getCollectionNotice({ intervalMinutes: 5, status: "unknown", nextRunAt: null, lastCompletedAt: null });
    expect(getCollectionNotice()).toBe(unknown);
    expect(unknown).toContain("확인되지 않았습니다");
    expect(unknown).not.toMatch(/수동|중지됐/);
    expect(getCollectionNotice({ intervalMinutes: 5, status: "stopped", nextRunAt: null, lastCompletedAt: null })).toContain("중지됐습니다");
  });
});
