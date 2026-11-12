import { readFileSync } from "node:fs";

export const fetchedAt = "2026-10-14T08:10:31.201Z";
export const realXml = readFileSync(new URL("../fixtures/seoul/citydata-POI014-20261014.real.xml", import.meta.url), "utf8");
export const authErrorXml = readFileSync(new URL("../fixtures/seoul/auth-error.synthetic.xml", import.meta.url), "utf8");
export const sourceErrorXml = readFileSync(new URL("../fixtures/seoul/http-200-error.synthetic.xml", import.meta.url), "utf8");

export const options = { areaCode: "POI014", fetchedAt, sourceTimeZone: "Asia/Seoul" as const };
export const syntheticPopulation = `<AREA_PPLTN_MIN>10</AREA_PPLTN_MIN><AREA_PPLTN_MAX>20</AREA_PPLTN_MAX>
<AREA_CONGEST_LVL>보통</AREA_CONGEST_LVL><PPLTN_TIME>2026-10-14 16:40</PPLTN_TIME>`;
export const syntheticWeather = `<TEMP>-3.5</TEMP><HUMIDITY>0</HUMIDITY><PM25>4</PM25>
<WEATHER_TIME>2026-10-14 16:50</WEATHER_TIME>`;

/** 아래 생성 XML은 전부 합성 계약 사례이며 원천 실응답이 아니다. */
export function syntheticCity({ population = syntheticPopulation, weather = syntheticWeather,
  areaCode = "POI014", areaName = "강남역", wrapped = true }: {
    population?: string | null; weather?: string | null; areaCode?: string; areaName?: string; wrapped?: boolean;
  } = {}): string {
  const section = (name: string, body: string | null) => body === null ? ""
    : `<${name}>${wrapped ? `<${name}>${body}</${name}>` : body}</${name}>`;
  return `<SeoulRtd.citydata><RESULT><RESULT.CODE>INFO-000</RESULT.CODE></RESULT>
  <CITYDATA><AREA_CD>${areaCode}</AREA_CD><AREA_NM>${areaName}</AREA_NM>
  ${section("LIVE_PPLTN_STTS", population)}${section("WEATHER_STTS", weather)}</CITYDATA></SeoulRtd.citydata>`;
}
