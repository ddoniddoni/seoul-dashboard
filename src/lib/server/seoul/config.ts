import "server-only";
import { isAreaCode } from "../../domain/catalog.ts";
import { SeoulApiError } from "./errors.ts";

export const SEOUL_TIMEOUT_MS = 8_000;
export const SEOUL_MAX_BYTES = 8 * 1024 * 1024;
export type SeoulSourceTimeZone = "Asia/Seoul";
type Environment = Record<string, string | undefined>;

export interface SeoulConfig {
  apiKey: string;
  origin: string;
  sourceTimeZone: SeoulSourceTimeZone;
  allowInsecureHttp: true;
}

/** 두 번째 인자는 해당 CLI 실행 범위에 대한 명시적인 전송 허용이다. 전역 설정은 바꾸지 않는다. */
export function readSeoulConfig(source: Environment = process.env, allowInsecureHttpForRun = false): SeoulConfig {
  const key = source.SEOUL_API_KEY?.trim();
  const base = source.SEOUL_API_BASE_URL?.trim();
  if (!key || !/^[A-Za-z0-9]{1,256}$/.test(key) || !base) throw new SeoulApiError("CONFIGURATION");
  let url: URL;
  try { url = new URL(base); } catch { throw new SeoulApiError("CONFIGURATION"); }
  // 실제 키로 확인된 origin만 허용한다. 아직 검증되지 않은 HTTPS 주소를 추측하지 않는다.
  if (url.origin !== "http://openapi.seoul.go.kr:8088" || url.pathname !== "/"
    || url.username || url.password || url.search || url.hash) throw new SeoulApiError("CONFIGURATION");
  if (source.SEOUL_ALLOW_INSECURE_HTTP !== undefined && !["true", "false"].includes(source.SEOUL_ALLOW_INSECURE_HTTP)) {
    throw new SeoulApiError("CONFIGURATION");
  }
  if (allowInsecureHttpForRun !== true && source.SEOUL_ALLOW_INSECURE_HTTP !== "true") throw new SeoulApiError("INSECURE_TRANSPORT");
  if (source.SEOUL_SOURCE_TIME_ZONE !== "Asia/Seoul") throw new SeoulApiError("TIME_ZONE_UNCONFIRMED");
  return { apiKey: key, origin: url.origin, sourceTimeZone: source.SEOUL_SOURCE_TIME_ZONE, allowInsecureHttp: true };
}

export function createSeoulRequestUrl(config: SeoulConfig, areaCode: string): URL {
  if (!isAreaCode(areaCode)) throw new SeoulApiError("UNKNOWN_AREA");
  if (config.allowInsecureHttp !== true) throw new SeoulApiError("INSECURE_TRANSPORT");
  // 호출자가 config 객체를 직접 만들더라도 allowlist와 경로 구성을 우회할 수 없다.
  const checked = readSeoulConfig({
    SEOUL_API_KEY: config.apiKey, SEOUL_API_BASE_URL: config.origin,
    SEOUL_SOURCE_TIME_ZONE: config.sourceTimeZone,
  }, true);
  return new URL(`/${checked.apiKey}/xml/citydata/1/5/${areaCode}`, checked.origin);
}
