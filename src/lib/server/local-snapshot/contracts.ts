import "server-only";
import { join } from "node:path";
import { z } from "zod";
import { areaCatalog } from "../../domain/catalog.ts";
import { areaLatestSchema, congestionSchema } from "../../contracts/dashboard.ts";

const instant = z.string().datetime({ offset: true });
export const SNAPSHOT_MAX_BYTES = 32 * 1024 * 1024;
export const SNAPSHOT_MAX_OBSERVATIONS = 100_000;
const knownAreas = new Map(areaCatalog.map((area) => [area.areaCode, area]));
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1), source: z.literal("seoul-citydata"), capturedAt: instant,
  areas: z.array(areaLatestSchema).min(1).max(areaCatalog.length),
  observations: z.array(z.object({
    area_code: z.string(), observed_at: instant, ppl_min: z.number().int().nonnegative(),
    ppl_max: z.number().int().nonnegative(), congestion: congestionSchema,
  }).refine((row) => row.ppl_min <= row.ppl_max)).max(SNAPSHOT_MAX_OBSERVATIONS),
}).refine((snapshot) => new Set(snapshot.areas.map((area) => area.areaCode)).size === snapshot.areas.length
  && snapshot.areas.every((area) => {
    const known = knownAreas.get(area.areaCode);
    return known?.areaName === area.areaName && known.category === area.category;
  })
  && snapshot.observations.every((row) => knownAreas.has(row.area_code)),
{ message: "등록된 장소의 실제 수집본만 읽을 수 있습니다." });

export type LocalSnapshot = z.infer<typeof snapshotSchema>;

const messages = {
  SNAPSHOT_DISABLED: "로컬 수집본은 개발 환경에서만 사용할 수 있습니다.",
  SNAPSHOT_MISSING: "실제 수집본이 없습니다. 먼저 명시적인 단일 수집을 실행하세요.",
  SNAPSHOT_INVALID: "로컬 수집본의 형식을 확인하지 못했습니다.",
  SNAPSHOT_IO: "로컬 수집본을 읽거나 저장하지 못했습니다.",
  SNAPSHOT_LOCKED: "다른 단일 수집이 진행 중입니다.",
  SNAPSHOT_RECENT: "같은 수집 구간에 이미 실행한 기록이 있어 추가 원천 요청을 중지했습니다.",
  SNAPSHOT_ARGUMENTS: "단일 수집 명령의 인자를 확인하세요.",
  COLLECTOR_CONFIGURATION: "개발용 정기 수집 설정을 확인하세요.",
  COLLECTOR_STATE: "개발용 정기 수집 상태 파일을 확인하지 못했습니다.",
} as const;
export class SnapshotError extends Error {
  readonly code: keyof typeof messages;
  constructor(code: keyof typeof messages) { super(messages[code]); this.name = "SnapshotError"; this.code = code; }
}

/** 운영 저장소를 파일로 대체하지 않는다. 경로는 사용자 요청으로 받지 않는다. */
export function snapshotPath() {
  if (process.env.NODE_ENV === "production") throw new SnapshotError("SNAPSHOT_DISABLED");
  return join(process.cwd(), ".local", "data", "seoul-snapshot.json");
}
