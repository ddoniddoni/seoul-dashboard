import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CongestionBadge, DashboardSkeleton, FreshnessBadge, StateNotice } from "../../src/components/data-status";

describe("색상에 의존하지 않는 상태 표시", () => {
  it("알 수 없는 혼잡도를 여유로 표시하지 않는다", () => {
    const markup = renderToStaticMarkup(createElement(CongestionBadge, { level: "unknown" }));
    expect(markup).toContain("확인 불가"); expect(markup).not.toContain("여유");
  });
  it("자료 누락과 지연을 서로 다른 한국어 문구로 알린다", () => {
    expect(renderToStaticMarkup(createElement(FreshnessBadge, { freshness: "missing" }))).toContain("자료 없음");
    expect(renderToStaticMarkup(createElement(FreshnessBadge, { freshness: "stale" }))).toContain("갱신 지연");
  });
  it("조회 오류 안내에 alert 의미를 제공하며 수치나 비밀을 넣지 않는다", () => {
    const markup = renderToStaticMarkup(createElement(StateNotice, { error: true, title: "데이터를 불러오지 못했습니다", description: "다시 조회하세요." }));
    expect(markup).toContain('role="alert"'); expect(markup).toContain("다시 조회하세요.");
  });
  it("첫 로딩에 접근 가능한 안내를 제공한다", () => {
    const markup = renderToStaticMarkup(createElement(DashboardSkeleton));
    expect(markup).toContain('role="status"'); expect(markup).toContain("데이터를 불러오고 있습니다.");
  });
});
