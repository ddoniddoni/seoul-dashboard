import "server-only";
import { readFile, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { areaCatalog, monitoredAreaCatalog } from "../../domain/catalog.ts";
import { collectionIntervalSchema, type CollectionInterval, type CollectionStatus } from "../../contracts/dashboard.ts";
import { snapshotPath, SnapshotError } from "./contracts.ts";

export const DEFAULT_COLLECTION_INTERVAL = 5;
// 이전 3분 원장의 누적 요청도 읽는다. 실제 실행 예산은 선택한 주기로 계산한다.
export const LOCAL_COLLECTION_MAX_DAILY_BUDGET = areaCatalog.length * 480;
export const LOCAL_COLLECTION_BATCH_MS = 150_000;
export function localCollectionPolicy(intervalMinutes: CollectionInterval = DEFAULT_COLLECTION_INTERVAL) {
  return { intervalMinutes, intervalMs: intervalMinutes * 60_000,
    dailyBudget: monitoredAreaCatalog.length * (1_440 / intervalMinutes) };
}
const instant = z.string().datetime({ offset: true });
export const ledgerSchema = z.object({
  schemaVersion: z.literal(1), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  requests: z.number().int().min(0).max(LOCAL_COLLECTION_MAX_DAILY_BUDGET),
  lastStartedAt: instant.nullable(),
  pauseReason: z.enum(["SOURCE_AUTHENTICATION", "RATE_LIMITED", "BUDGET_EXHAUSTED"]).nullable(),
  pauseUntil: instant.nullable(),
});
export type CollectionLedger = z.infer<typeof ledgerSchema>;
export const workerHealthSchema = z.object({
  schemaVersion: z.literal(1), runId: z.string().uuid(), pid: z.number().int().positive(),
  intervalMinutes: collectionIntervalSchema.default(3),
  updatedAt: instant, status: z.enum(["collecting", "waiting", "paused", "stopped"]),
  nextRunAt: instant.nullable(), lastCompletedAt: instant.nullable(),
  lastResult: z.enum(["success", "partial", "failed", "skipped"]).nullable(),
});
export type WorkerHealth = z.infer<typeof workerHealthSchema>;
export const stopRequestSchema = z.object({ runId: z.string().uuid() });

export function collectorPath(name: "state.json" | "health.json" | "stop.json" | "lock" | "log" | "previous.log") {
  return join(dirname(snapshotPath()), "seoul-collector." + name);
}

export async function readCollectorJson<T extends z.ZodType>(name: "state.json" | "health.json" | "stop.json", schema: T): Promise<z.output<T> | null> {
  try {
    const path = collectorPath(name);
    if ((await stat(path)).size > 16_384) throw new SnapshotError("COLLECTOR_STATE");
    const result = schema.safeParse(JSON.parse(await readFile(path, "utf8")));
    if (!result.success) throw new SnapshotError("COLLECTOR_STATE");
    return result.data;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw new SnapshotError("COLLECTOR_STATE");
  }
}

export function koreanDay(now: number) {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  return ["year", "month", "day"].map((type) => parts.find((part) => part.type === type)!.value).join("-");
}

export async function readCollectionLedger(now = Date.now()): Promise<CollectionLedger> {
  const previous = await readCollectorJson("state.json", ledgerSchema);
  const today = koreanDay(now);
  if (previous?.day === today) return previous;
  return { schemaVersion: 1, day: today, requests: 0, lastStartedAt: previous?.lastStartedAt ?? null,
    pauseReason: previous?.pauseReason === "SOURCE_AUTHENTICATION" || previous?.pauseReason === "RATE_LIMITED" ? previous.pauseReason : null,
    pauseUntil: previous?.pauseReason === "RATE_LIMITED" ? previous.pauseUntil : null };
}

export const readWorkerHealth = () => readCollectorJson("health.json", workerHealthSchema);
export function workerIsActive(health: WorkerHealth | null, now = Date.now()) {
  return Boolean(health && health.status !== "stopped" && Date.parse(health.updatedAt) <= now + 5_000 && now - Date.parse(health.updatedAt) < 30_000);
}

/** 공개 읽기에는 프로세스 식별자나 원천/수집 클라이언트를 넘기지 않는다. */
export async function readPublicCollection(now = Date.now()): Promise<CollectionStatus | undefined> {
  try {
    const health = await readWorkerHealth();
    if (!health) return undefined;
    const active = workerIsActive(health, now);
    return { intervalMinutes: health.intervalMinutes, status: active ? health.status : "stopped",
      nextRunAt: active ? health.nextRunAt : null, lastCompletedAt: health.lastCompletedAt };
  } catch {
    return { intervalMinutes: DEFAULT_COLLECTION_INTERVAL, status: "unknown", nextRunAt: null, lastCompletedAt: null };
  }
}
