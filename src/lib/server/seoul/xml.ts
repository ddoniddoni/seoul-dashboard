import "server-only";
import { XMLParser, XMLValidator } from "fast-xml-parser";
import { SEOUL_MAX_BYTES } from "./config.ts";
import { SeoulApiError } from "./errors.ts";

export type XmlRecord = Record<string, unknown>;
export function record(value: unknown): XmlRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as XmlRecord : null;
}

/** 최대 8 MiB, 깊이 32, 태그 수 50,000. 엔티티 확장과 외부 참조를 허용하지 않는다. */
export function parseSeoulXml(xml: string): XmlRecord {
  if (Buffer.byteLength(xml, "utf8") > SEOUL_MAX_BYTES) throw new SeoulApiError("RESPONSE_TOO_LARGE");
  if (/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml)) throw new SeoulApiError("UNSAFE_XML");
  if (/^\s*(?:<\?xml[^?]*\?>\s*)?<(?:html|!doctype\s+html)\b/i.test(xml)) throw new SeoulApiError("RESPONSE_FORMAT");
  if ((xml.match(/<[A-Za-z_]/g)?.length ?? 0) > 50_000) throw new SeoulApiError("UNSAFE_XML");
  // Validator/parser가 포함한 입력값이나 원문 오류를 외부로 전파하지 않는다.
  try {
    if (XMLValidator.validate(xml) !== true) throw new SeoulApiError("INVALID_XML");
    const parsed: unknown = new XMLParser({
      parseTagValue: false, parseAttributeValue: false, trimValues: true,
      ignoreAttributes: true, ignoreDeclaration: true, ignorePiTags: true,
      processEntities: false, htmlEntities: false, maxNestedTags: 32, strictReservedNames: true, cdataPropName: "#cdata",
    }).parse(xml);
    const root = record(parsed);
    if (!root || Object.keys(root).length !== 1) throw new SeoulApiError("INVALID_ENVELOPE");
    return root;
  } catch (error) {
    if (error instanceof SeoulApiError) throw error;
    throw new SeoulApiError("INVALID_XML");
  }
}

/** 표준 문자 엔티티만 한 번 치환한다. 선언 엔티티와 재귀 확장은 없다. */
export function scalar(value: unknown): string | null {
  const cdata = record(value);
  if (cdata && Object.keys(cdata).length === 1 && typeof cdata["#cdata"] === "string") return cdata["#cdata"].trim();
  if (typeof value !== "string") return null;
  const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return value.replace(/&(#x[\da-fA-F]{1,6}|#\d{1,7}|amp|lt|gt|quot|apos);/g, (whole, token: string) => {
    if (entities[token]) return entities[token];
    const code = token.startsWith("#x") ? Number.parseInt(token.slice(2), 16) : Number(token.slice(1));
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : whole;
  }).trim();
}

export function readCityData(root: XmlRecord): XmlRecord {
  const envelope = record(root["SeoulRtd.citydata"]);
  const result = record(envelope?.RESULT) ?? record(root.RESULT);
  if (!result) throw new SeoulApiError("INVALID_ENVELOPE");
  const code = scalar(result["RESULT.CODE"] ?? result.CODE);
  if (!code || !/^(INFO|ERROR)-\d{3}$/.test(code)) throw new SeoulApiError("INVALID_ENVELOPE");
  if (code !== "INFO-000") {
    if (code === "INFO-100") throw new SeoulApiError("SOURCE_AUTHENTICATION", false, code);
    if (code === "INFO-200") throw new SeoulApiError("SOURCE_NO_DATA", false, code);
    throw new SeoulApiError("SOURCE_REJECTED", ["ERROR-500", "ERROR-600", "ERROR-601"].includes(code), code);
  }
  // generic RESULT는 합성 오류 fixture용으로만 지원한다. 성공으로 인정하지 않는다.
  const city = record(envelope?.CITYDATA);
  if (!envelope || !city || scalar(result["RESULT.CODE"]) !== "INFO-000") throw new SeoulApiError("INVALID_ENVELOPE");
  return city;
}
