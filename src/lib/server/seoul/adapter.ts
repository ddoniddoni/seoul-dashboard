import "server-only";
import { areaLatestSchema, type AreaLatest, type Congestion } from "../../contracts/dashboard.ts";
import { areaCatalog } from "../../domain/catalog.ts";
import { getFreshness } from "../../domain/metrics.ts";
import type { SeoulSourceTimeZone } from "./config.ts";
import { SeoulApiError } from "./errors.ts";
import { parseSeoulXml, readCityData, record, scalar, type XmlRecord } from "./xml.ts";

export type SeoulIssue = "population-invalid" | "population-conflict" | "congestion-unknown"
  | "weather-invalid" | "weather-conflict" | "pm25-unit-unconfirmed";
export interface AdaptOptions {
  areaCode: string;
  fetchedAt: string;
  sourceTimeZone: SeoulSourceTimeZone;
  redactionSecrets?: readonly string[];
}
export interface SeoulObservation { area: AreaLatest; issues: SeoulIssue[] }

/** 빈 값과 잘못된 숫자를 0으로 바꾸지 않고 정수와 소수를 검증한다. */
export function readNumber(value: unknown, integer = false): { value: number | null; invalid: boolean } {
  const text = scalar(value);
  if (value === undefined || value === null || text === "" || text === "-" || text === "N/A") return { value: null, invalid: false };
  if (text === null || !/^-?(?:\d+|[1-9]\d{0,2}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return { value: null, invalid: true };
  const number = Number(text.replaceAll(",", ""));
  const invalid = !Number.isFinite(number) || integer && !Number.isSafeInteger(number);
  return { value: invalid ? null : number, invalid };
}

/** offset 없는 원천 문자열을 명시한 한국 시간 기준으로만 해석한다. OS 시간대는 사용하지 않는다. */
export function parseSourceTime(value: unknown, timeZone: SeoulSourceTimeZone, fetchedAtMs: number): string | null {
  if (timeZone !== "Asia/Seoul") throw new SeoulApiError("TIME_ZONE_UNCONFIRMED");
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})(?::(\d{2}))?$/.exec(scalar(value) ?? "");
  if (!match) return null;
  const [year, month, day, hour, minute, second] = match.slice(1).map((part) => Number(part ?? "0"));
  if (year < 2000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31
    || hour > 23 || minute > 59 || second > 59) return null;
  const wall = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  if (wall.getUTCFullYear() !== year || wall.getUTCMonth() !== month - 1 || wall.getUTCDate() !== day) return null;
  const epoch = wall.getTime() - 9 * 60 * 60_000;
  return epoch > fetchedAtMs + 5 * 60_000 ? null : new Date(epoch).toISOString();
}

function currentBlocks(city: XmlRecord, key: string): { blocks: XmlRecord[]; invalid: boolean } {
  const outer = city[key];
  if (outer === undefined || outer === null || outer === "") return { blocks: [], invalid: false };
  const wrappers = Array.isArray(outer) ? outer : [outer];
  const blocks: XmlRecord[] = [];
  for (const wrapper of wrappers) {
    const object = record(wrapper);
    if (!object) return { blocks: [], invalid: true };
    const inner = object[key] ?? object;
    for (const entry of Array.isArray(inner) ? inner : [inner]) {
      if (entry === "") continue;
      const block = record(entry);
      if (!block || blocks.length >= 16) return { blocks: [], invalid: true };
      blocks.push(block);
    }
  }
  return { blocks, invalid: false };
}

function emptySection(lastResult: AreaLatest["population"]["lastResult"]) {
  return { value: null, observedAt: null, fetchedAt: null, freshness: "missing" as const, lastResult };
}
const levels: Record<string, Congestion> = { "여유": "relaxed", "보통": "normal", "약간 붐빔": "slightly-busy", "붐빔": "busy" };

function cleanMessage(value: unknown, secrets: readonly string[]): string | null {
  let message = scalar(value);
  if (!message) return null;
  if (message.length > 1024) return null;
  for (const secret of secrets) if (secret) message = message.split(secret).join("[비밀값 생략]");
  return message.replace(/https?:\/\/\S+/gi, "[원천 주소 생략]");
}

function population(block: XmlRecord, options: AdaptOptions, now: number, issues: Set<SeoulIssue>): AreaLatest["population"] {
  const min = readNumber(block.AREA_PPLTN_MIN, true);
  const max = readNumber(block.AREA_PPLTN_MAX, true);
  const observedAt = parseSourceTime(block.PPLTN_TIME, options.sourceTimeZone, now);
  if (min.invalid || max.invalid || min.value === null || max.value === null
    || min.value < 0 || max.value < min.value || !observedAt) {
    issues.add("population-invalid");
    return emptySection("invalid");
  }
  const label = scalar(block.AREA_CONGEST_LVL) ?? "";
  const congestion = Object.hasOwn(levels, label) ? levels[label] : "unknown";
  if (congestion === "unknown") issues.add("congestion-unknown");
  return {
    value: { min: min.value, max: max.value, midpoint: (min.value + max.value) / 2,
      congestion, message: cleanMessage(block.AREA_CONGEST_MSG, options.redactionSecrets ?? []) },
    observedAt, fetchedAt: options.fetchedAt, freshness: getFreshness(observedAt, now), lastResult: "valid",
  };
}

function weather(block: XmlRecord, options: AdaptOptions, now: number, issues: Set<SeoulIssue>): AreaLatest["weather"] {
  const temp = readNumber(block.TEMP);
  const humidity = readNumber(block.HUMIDITY);
  if (humidity.value !== null && (humidity.value < 0 || humidity.value > 100)) { humidity.value = null; humidity.invalid = true; }
  const invalid = temp.invalid || humidity.invalid;
  const provided = temp.value !== null || humidity.value !== null;
  // 공식 화면의 PM25 단위 표기가 ㎍/㎡와 ㎍/㎥로 충돌한다. 현재 DTO 단위로 단정하지 않는다.
  if (scalar(block.PM25)) issues.add("pm25-unit-unconfirmed");
  if (!provided) {
    if (invalid) issues.add("weather-invalid");
    return emptySection(invalid ? "invalid" : "not-provided");
  }
  const observedAt = parseSourceTime(block.WEATHER_TIME, options.sourceTimeZone, now);
  if (!observedAt) { issues.add("weather-invalid"); return emptySection("invalid"); }
  if (invalid) issues.add("weather-invalid");
  return { value: { temperatureC: temp.value, humidityPct: humidity.value, pm25MicrogramsPerM3: null },
    observedAt, fetchedAt: options.fetchedAt, freshness: getFreshness(observedAt, now, "weather"),
    lastResult: invalid ? "invalid" : "valid" };
}

function section<K extends "population" | "weather">(city: XmlRecord, key: string, kind: K, options: AdaptOptions,
  normalize: (block: XmlRecord) => AreaLatest[K], issues: Set<SeoulIssue>): AreaLatest[K] {
  const current = currentBlocks(city, key);
  if (current.invalid) { issues.add(`${kind}-invalid`); return emptySection("invalid"); }
  if (!current.blocks.length) return emptySection("not-provided");
  const sections = current.blocks.map(normalize);
  // 여러 현재 값의 우선순위를 임의로 정하지 않는다. 같은 정규화 값만 중복으로 허용한다.
  if (sections.some((value) => JSON.stringify(value) !== JSON.stringify(sections[0]))) {
    issues.add(`${kind}-conflict`);
    return emptySection("invalid");
  }
  return sections[0];
}

export function adaptSeoulXml(xml: string, options: AdaptOptions): SeoulObservation {
  const area = areaCatalog.find((entry) => entry.areaCode === options.areaCode);
  if (!area) throw new SeoulApiError("UNKNOWN_AREA");
  if (options.sourceTimeZone !== "Asia/Seoul") throw new SeoulApiError("TIME_ZONE_UNCONFIRMED");
  const now = Date.parse(options.fetchedAt);
  if (!Number.isFinite(now) || !/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(options.fetchedAt)) throw new SeoulApiError("CONFIGURATION");
  const city = readCityData(parseSeoulXml(xml));
  if (scalar(city.AREA_CD) !== area.areaCode || scalar(city.AREA_NM) !== area.areaName) throw new SeoulApiError("AREA_MISMATCH");
  for (const block of currentBlocks(city, "LIVE_PPLTN_STTS").blocks) {
    if (block.AREA_CD !== undefined && scalar(block.AREA_CD) !== area.areaCode
      || block.AREA_NM !== undefined && scalar(block.AREA_NM) !== area.areaName) throw new SeoulApiError("AREA_MISMATCH");
  }
  const issues = new Set<SeoulIssue>();
  const normalized = {
    ...area, lastAttemptAt: options.fetchedAt,
    population: section(city, "LIVE_PPLTN_STTS", "population", options, (block) => population(block, options, now, issues), issues),
    weather: section(city, "WEATHER_STTS", "weather", options, (block) => weather(block, options, now, issues), issues),
  };
  const result = areaLatestSchema.safeParse(normalized);
  if (!result.success) throw new SeoulApiError("INVALID_ENVELOPE");
  return { area: result.data, issues: [...issues] };
}
