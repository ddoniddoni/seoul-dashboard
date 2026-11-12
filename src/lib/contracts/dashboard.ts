import { z } from "zod";

export const datasetSchema = z.enum(["demo", "live"]);
export const congestionSchema = z.enum(["relaxed", "normal", "slightly-busy", "busy", "unknown"]);
export const freshnessSchema = z.enum(["fresh", "stale", "expired", "missing"]);
export const scenarioSchema = z.enum(["normal", "loading", "error", "empty", "partial", "stale", "short-history"]);
const instant = z.string().datetime({ offset: true });
export const collectionIntervalSchema = z.union([z.literal(3), z.literal(5), z.literal(10), z.literal(30)]);
export type CollectionInterval = z.infer<typeof collectionIntervalSchema>;
export const collectionStatusSchema = z.object({
  intervalMinutes: collectionIntervalSchema,
  status: z.enum(["collecting", "waiting", "paused", "stopped", "unknown"]),
  nextRunAt: instant.nullable(), lastCompletedAt: instant.nullable(),
});
export type CollectionStatus = z.infer<typeof collectionStatusSchema>;

export const populationSchema = z.object({
  min: z.number().int().nonnegative(),
  max: z.number().int().nonnegative(),
  midpoint: z.number().nonnegative(),
  congestion: congestionSchema,
  message: z.string().nullable(),
}).refine((value) => value.min <= value.max && value.midpoint === (value.min + value.max) / 2,
  { message: "추정 인구 범위와 중앙값이 일치하지 않습니다." });

export const weatherSchema = z.object({
  temperatureC: z.number().finite().nullable(),
  humidityPct: z.number().min(0).max(100).nullable(),
  pm25MicrogramsPerM3: z.number().nonnegative().nullable(),
});

function sectionSchema<T extends z.ZodType>(value: T) {
  return z.object({
    value: value.nullable(),
    observedAt: instant.nullable(),
    fetchedAt: instant.nullable(),
    freshness: freshnessSchema,
    lastResult: z.enum(["valid", "not-provided", "invalid", "fetch-failed"]),
  });
}

export const populationSectionSchema = sectionSchema(populationSchema);
export const weatherSectionSchema = sectionSchema(weatherSchema);
export const areaLatestSchema = z.object({
  areaCode: z.string(), areaName: z.string(), category: z.string(),
  collectionEnabled: z.boolean().optional(),
  population: populationSectionSchema,
  weather: weatherSectionSchema,
  lastAttemptAt: instant.nullable(),
}).refine((area) => [area.population, area.weather].every((section) => section.value === null || section.observedAt !== null && section.fetchedAt !== null),
  { message: "유효 자료의 기준 시각과 수신 시각이 필요합니다." });

const metaSchema = z.object({
  schemaVersion: z.literal(1), dataset: datasetSchema,
  generatedAt: instant, displayTimeZone: z.literal("Asia/Seoul"),
  source: z.enum(["synthetic-demo", "seoul-citydata"]),
  storage: z.enum(["supabase", "local-snapshot"]).optional(),
  capturedAt: instant.optional(),
  collection: collectionStatusSchema.optional(),
});

export const overviewSchema = z.object({
  meta: metaSchema.extend({
    coverage: z.object({ monitored: z.number().int(), fresh: z.number().int(), stale: z.number().int(), expired: z.number().int(), missing: z.number().int() }),
  }),
  data: z.object({ items: z.array(areaLatestSchema) }),
}).refine((response) => response.meta.dataset === "demo" ? response.meta.source === "synthetic-demo" : response.meta.source === "seoul-citydata",
  { message: "데이터 모드와 출처가 일치하지 않습니다." });

const pointSchema = z.object({
  bucketAt: instant, observedAt: instant.nullable(),
  min: z.number().nonnegative().nullable(), max: z.number().nonnegative().nullable(),
  congestion: congestionSchema,
  windowFrom: instant.optional(), windowTo: instant.optional(), partial: z.boolean().optional(),
  observationCount: z.number().int().nonnegative().optional(),
}).refine((point) => point.min === null && point.max === null && point.observedAt === null
  || point.min !== null && point.max !== null && point.observedAt !== null && point.min <= point.max,
{ message: "관측 범위 또는 결측 상태가 일치하지 않습니다." });

export const historySchema = z.object({
  meta: metaSchema,
  data: z.object({
    from: instant, to: instant, resolutionMinutes: z.union([z.literal(5), z.literal(10)]),
    aggregation: z.literal("last-observation").optional(),
    series: z.array(z.object({
      areaCode: z.string(), areaName: z.string(), availableSince: instant.nullable(),
      points: z.array(pointSchema),
    })),
  }),
}).refine((response) => response.meta.dataset === "demo" ? response.meta.source === "synthetic-demo" : response.meta.source === "seoul-citydata",
  { message: "데이터 모드와 출처가 일치하지 않습니다." });

export type Dataset = z.infer<typeof datasetSchema>;
export type Congestion = z.infer<typeof congestionSchema>;
export type Freshness = z.infer<typeof freshnessSchema>;
export type DemoScenario = z.infer<typeof scenarioSchema>;
export type AreaLatest = z.infer<typeof areaLatestSchema>;
export type Overview = z.infer<typeof overviewSchema>;
export type History = z.infer<typeof historySchema>;
export type HistorySeries = History["data"]["series"][number];

export interface DataRepository {
  getOverview(scenario?: DemoScenario): Overview | Promise<Overview>;
  getHistory(areaCodes: string[], scenario?: DemoScenario): History | Promise<History>;
}
