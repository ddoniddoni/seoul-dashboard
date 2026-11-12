import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { adaptSeoulXml, parseSourceTime, readNumber } from "../../src/lib/server/seoul/adapter.ts";
import { safeSeoulError } from "../../src/lib/server/seoul/errors.ts";
import { parseSeoulXml } from "../../src/lib/server/seoul/xml.ts";
import { authErrorXml, fetchedAt, options, realXml, sourceErrorXml, syntheticCity,
  syntheticPopulation, syntheticWeather } from "../helpers/seoul.ts";

describe("M2 서울시 XML 계약: 실행 대기", () => {
  it("보관한 강남역 전체 응답을 현재 인구와 날씨로 분리하고 예측을 읽지 않는다", () => {
    const result = adaptSeoulXml(realXml, options);
    expect(result.area.population.value).toMatchObject({ min: 78000, max: 80000, midpoint: 79000, congestion: "busy" });
    expect(result.area.population.observedAt).toBe("2026-10-14T07:40:00.000Z");
    expect(result.area.population.freshness).toBe("stale");
    expect(result.area.weather.observedAt).toBe("2026-10-14T07:50:00.000Z");
    expect(result.area.weather.value).toEqual({ temperatureC: 18.4, humidityPct: 28, pm25MicrogramsPerM3: null });
    expect(result.issues).toContain("pm25-unit-unconfirmed");
    expect(result.area.lastAttemptAt).toBe(fetchedAt);
  });

  it("HTML, 잘못된 XML과 확인되지 않은 envelope를 거부한다", () => {
    for (const xml of ["<html>오류</html>", "<SeoulRtd.citydata>", "<another>INFO-000</another>",
      "<RESULT><CODE>INFO-000</CODE></RESULT>", "<one/><two/>"]) {
      expect(() => adaptSeoulXml(xml, options)).toThrow();
    }
  });

  it("DOCTYPE와 ENTITY를 외부 참조 전에 거부한다", () => {
    for (const prefix of ['<!DOCTYPE x [<!ENTITY xxe SYSTEM "file:///synthetic-secret">]>',
      '<!ENTITY expansion "synthetic-secret">', '<!doctype x>']) {
      expect(() => parseSeoulXml(prefix + syntheticCity())).toThrow("허용되지 않는 XML");
    }
  });

  it("바이트와 깊이 제한을 지킨다", () => {
    expect(() => parseSeoulXml(" ".repeat(8 * 1024 * 1024 + 1))).toThrow("응답 크기");
    expect(() => parseSeoulXml("<a>".repeat(34) + "x" + "</a>".repeat(34))).toThrow();
  });

  it("합성 실패 envelope를 정상 CITYDATA로 처리하지 않고 원본 메시지를 숨긴다", () => {
    for (const [xml, code] of [[authErrorXml, "SOURCE_AUTHENTICATION"], [sourceErrorXml, "SOURCE_REJECTED"]]) {
      try { adaptSeoulXml(xml, options); expect.unreachable(); }
      catch (error) {
        expect(safeSeoulError(error).code).toBe(code);
        expect(JSON.stringify(safeSeoulError(error))).not.toContain("synthetic-secret");
      }
    }
  });

  it("요청 장소와 응답 코드/정식명/인구 내부 식별자가 다르면 거부한다", () => {
    for (const xml of [syntheticCity({ areaCode: "POI009" }), syntheticCity({ areaName: "강남권" }),
      syntheticCity({ population: syntheticPopulation + "<AREA_CD>POI007</AREA_CD>" })]) {
      expect(() => adaptSeoulXml(xml, options)).toThrow("요청한 장소와 다릅니다");
    }
  });

  it("없는 section을 0으로 만들지 않고 서로의 상태를 독립적으로 처리한다", () => {
    const absent = adaptSeoulXml(syntheticCity({ population: null, weather: null }), options).area;
    expect(absent.population).toMatchObject({ value: null, lastResult: "not-provided" });
    expect(absent.weather).toMatchObject({ value: null, lastResult: "not-provided" });
    expect(absent.population.fetchedAt).toBeNull();
    expect(absent.lastAttemptAt).toBe(fetchedAt);
    const partial = adaptSeoulXml(syntheticCity({ population: syntheticPopulation.replace("<AREA_PPLTN_MIN>10", "<AREA_PPLTN_MIN> ") }), options).area;
    expect(partial.population.lastResult).toBe("invalid");
    expect(partial.weather.value?.temperatureC).toBe(-3.5);
  });

  it("빈 숫자와 잘못된 범위는 invalid지만 0명과 쉼표 표기는 유효하다", () => {
    for (const [min, max] of [["", "20"], ["-1", "20"], ["30", "20"], ["1,00", "200"], ["1.5", "20"]]) {
      const xml = syntheticCity({ population: syntheticPopulation.replace(">10<", `>${min}<`).replace(">20<", `>${max}<`) });
      expect(adaptSeoulXml(xml, options).area.population.lastResult).toBe("invalid");
    }
    const zero = syntheticCity({ population: syntheticPopulation.replace(">10<", ">0<").replace(">20<", ">0<") });
    expect(adaptSeoulXml(zero, options).area.population.value?.min).toBe(0);
    const commas = syntheticCity({ population: syntheticPopulation.replace(">10<", ">1,000<").replace(">20<", ">2,000<") });
    expect(adaptSeoulXml(commas, options).area.population.value?.midpoint).toBe(1500);
  });

  it("알 수 없는 혼잡 단계는 unknown이며 메시지의 키/URL을 제거한다", () => {
    const xml = syntheticCity({ population: syntheticPopulation.replace("보통", "새로운 단계")
      + "<AREA_CONGEST_MSG>fixtureKey2026 https://synthetic.invalid/fixtureKey2026</AREA_CONGEST_MSG>" });
    const result = adaptSeoulXml(xml, { ...options, redactionSecrets: ["fixtureKey2026"] });
    expect(result.area.population.value?.congestion).toBe("unknown");
    expect(result.issues).toContain("congestion-unknown");
    expect(JSON.stringify(result)).not.toContain("fixtureKey2026");
    expect(result.area.population.value?.message).not.toContain("https://");
    expect(adaptSeoulXml(syntheticCity({ population: syntheticPopulation.replace("보통", "toString") }), options)
      .area.population.value?.congestion).toBe("unknown");
  });

  it("문자 엔티티는 한 번 치환하고 CDATA 텍스트를 다시 해석하지 않는다", () => {
    const escaped = syntheticCity({ population: syntheticPopulation + "<AREA_CONGEST_MSG>A &amp; B</AREA_CONGEST_MSG>" });
    const literal = syntheticCity({ population: syntheticPopulation + "<AREA_CONGEST_MSG><![CDATA[A &amp; B]]></AREA_CONGEST_MSG>" });
    expect(adaptSeoulXml(escaped, options).area.population.value?.message).toBe("A & B");
    expect(adaptSeoulXml(literal, options).area.population.value?.message).toBe("A &amp; B");
  });

  it("날씨의 일부 잘못된 숫자만 null로 두고 인구 시각을 대신 쓰지 않는다", () => {
    const xml = syntheticCity({ weather: syntheticWeather.replace("<HUMIDITY>0", "<HUMIDITY>101") });
    const area = adaptSeoulXml(xml, options).area;
    expect(area.population.lastResult).toBe("valid");
    expect(area.weather).toMatchObject({ value: { temperatureC: -3.5, humidityPct: null }, lastResult: "invalid" });
    const noTime = syntheticCity({ weather: syntheticWeather.replace(/<WEATHER_TIME>.*?<\/WEATHER_TIME>/, "") });
    expect(adaptSeoulXml(noTime, options).area.weather).toMatchObject({ value: null, observedAt: null, lastResult: "invalid" });
  });

  it("예측만 있을 때 현재 날씨로 채우지 않는다", () => {
    const xml = syntheticCity({ weather: "<FCST24HOURS><FCST24HOURS><TEMP>99</TEMP></FCST24HOURS></FCST24HOURS>" });
    expect(adaptSeoulXml(xml, options).area.weather).toMatchObject({ value: null, lastResult: "not-provided" });
  });

  it("단일 직접 블록과 동일한 반복은 허용하고 충돌하는 반복은 거부한다", () => {
    expect(adaptSeoulXml(syntheticCity({ wrapped: false }), options).area.population.value?.min).toBe(10);
    const single = syntheticCity();
    const identical = single.replace("</LIVE_PPLTN_STTS></LIVE_PPLTN_STTS>",
      `</LIVE_PPLTN_STTS><LIVE_PPLTN_STTS>${syntheticPopulation}</LIVE_PPLTN_STTS></LIVE_PPLTN_STTS>`);
    expect(adaptSeoulXml(identical, options).area.population.lastResult).toBe("valid");
    const conflict = identical.replace(">10<", ">11<");
    expect(adaptSeoulXml(conflict, options)).toMatchObject({ area: { population: { value: null, lastResult: "invalid" } },
      issues: expect.arrayContaining(["pm25-unit-unconfirmed", "population-conflict"]) });
  });

  it("미래/누락 시각은 인구 자료를 무효로 하며 새 수신 시각으로 교체하지 않는다", () => {
    for (const time of ["", "2026-10-14 17:20", "2026-02-30 16:40"]) {
      const xml = syntheticCity({ population: syntheticPopulation.replace("2026-10-14 16:40", time) });
      expect(adaptSeoulXml(xml, options).area.population).toMatchObject({ value: null, observedAt: null, lastResult: "invalid" });
    }
  });
});

describe("원천 숫자/시각 변환", () => {
  it("빈 값/결측 기호와 명시적 0을 구분한다", () => {
    for (const value of [undefined, "", "  ", "-", "N/A"]) expect(readNumber(value)).toEqual({ value: null, invalid: false });
    expect(readNumber("0")).toEqual({ value: 0, invalid: false });
    expect(readNumber("-3.5")).toEqual({ value: -3.5, invalid: false });
    expect(readNumber("1e3").invalid).toBe(true);
  });

  it("한국 시간 자정과 윤일을 OS 시간대와 무관하게 ISO로 변환한다", () => {
    expect(parseSourceTime("2026-10-15 00:00", "Asia/Seoul", Date.parse("2026-10-14T15:01:00Z"))).toBe("2026-10-14T15:00:00.000Z");
    expect(parseSourceTime("2024-02-29 12:00", "Asia/Seoul", Date.parse(fetchedAt))).toBe("2024-02-29T03:00:00.000Z");
    expect(parseSourceTime("2026-02-29 12:00", "Asia/Seoul", Date.parse(fetchedAt))).toBeNull();
  });
});
