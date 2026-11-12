import { describe, expect, it } from "vitest";
import { dashboardHref, parseDashboardState } from "../../src/lib/url-state/dashboard";

describe("공유 가능한 M1 URL 상태", () => {
  it("기존 demo 링크를 포함해 공개 화면은 실데이터만 사용한다", () => {
    expect(parseDashboardState(new URLSearchParams()).state.dataset).toBe("live");
    expect(parseDashboardState(new URLSearchParams("dataset=demo")).state.dataset).toBe("live");
  });
  it("잘못된 모드가 live 기본 환경을 demo로 전환하지 않는다", () => {
    const result = parseDashboardState(new URLSearchParams("dataset=invalid"));
    expect(result.state.dataset).toBe("live");
    expect(result.state.scenario).toBe("normal");
  });
  it("장소, 검색, 복수 단계와 정렬을 보존하고 시연 옵션은 제거한다", () => {
    const { state } = parseDashboardState(new URLSearchParams("dataset=demo&area=POI014&q=강남&level=normal&level=busy&sort=population&scenario=partial"));
    const restored = parseDashboardState(new URL(dashboardHref(state), "https://example.invalid").searchParams).state;
    expect(restored).toEqual({ ...state, levels: ["busy", "normal"] });
    expect(restored).toMatchObject({ dataset: "live", scenario: "normal" });
    expect(dashboardHref(state)).not.toMatch(/dataset=|scenario=/);
  });
  it("필터 변경에도 선택 장소를 유지하고 명시적으로 선택 해제할 수 있다", () => {
    const { state } = parseDashboardState(new URLSearchParams("dataset=demo&area=POI014"));
    const filtered = new URL(dashboardHref(state, { q: "성수" }), "https://example.invalid").searchParams;
    expect(filtered.get("area")).toBe("POI014");
    expect(new URL(dashboardHref(state, { area: null }), "https://example.invalid").searchParams.has("area")).toBe(false);
  });
  it("잘못된 장소를 알려주고 임의의 다른 장소를 선택하지 않는다", () => {
    const result = parseDashboardState(new URLSearchParams("area=INVALID"));
    expect(result.state.area).toBeNull();
    expect(result.issues.join(" ")).toContain("등록되지 않은 장소");
  });
  it("비교 코드의 중복과 미등록 값을 제거하며 4번째 제한을 설명한다", () => {
    const result = parseDashboardState(new URLSearchParams("places=POI014,POI014,POI007,POI003,POI072,INVALID"));
    expect(result.state.places).toEqual(["POI014", "POI007", "POI003"]);
    expect(result.issues.join(" ")).toContain("최대 3곳");
  });
  it("길이 제한과 허용 enum을 적용하고 live 링크에는 시연 상태를 넣지 않는다", () => {
    const { state } = parseDashboardState(new URLSearchParams({ q: "가".repeat(70), level: "invalid,busy,busy", sort: "invalid", scenario: "stale" }));
    expect(state.q).toHaveLength(50);
    expect(state.levels).toEqual(["busy"]);
    expect(state.sort).toBe("congestion");
    expect(dashboardHref(state, { dataset: "live" })).not.toContain("scenario");
  });
});
