import "server-only";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { monitoredAreaCatalog as areaCatalog } from "../../domain/catalog.ts";
import { getCoverage, getFreshness } from "../../domain/metrics.ts";
import { historySchema, overviewSchema, populationSectionSchema, weatherSectionSchema,
  congestionSchema, type AreaLatest, type DataRepository, type History } from "../../contracts/dashboard.ts";
import { createDatabaseReadClient } from "../database/read-client.ts";
import { DatabaseError } from "../database/errors.ts";
import { assertDatabaseResult } from "../database/transport.ts";

const instant = z.string().datetime({ offset: true });
const catalogSchema = z.array(z.object({ code: z.string(), official_name: z.string(), category: z.string(),
  collection_enabled: z.boolean(), geometry_available: z.boolean(), catalog_version: z.string() })).max(areaCatalog.length);
const observationSchema = z.object({ area_code: z.string(), observed_at: instant, ppl_min: z.number().int().nonnegative(),
  ppl_max: z.number().int().nonnegative(), congestion: congestionSchema }).refine((row) => row.ppl_min <= row.ppl_max);
export type PopulationRow = z.infer<typeof observationSchema>;

function meta(now: number) {
  return { schemaVersion: 1 as const, dataset: "live" as const, generatedAt: new Date(now).toISOString(),
    displayTimeZone: "Asia/Seoul" as const, source: "seoul-citydata" as const, storage: "supabase" as const };
}
function object(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
function readSection(kind: "population", value: unknown, now: number): AreaLatest["population"];
function readSection(kind: "weather", value: unknown, now: number): AreaLatest["weather"];
function readSection(kind: "population" | "weather", value: unknown, now: number) {
  const raw = object(value);
  const parsed = (kind === "population" ? populationSectionSchema : weatherSectionSchema).safeParse({ ...raw,
    freshness: raw.value ? getFreshness(typeof raw.observedAt === "string" ? raw.observedAt : null, now, kind) : "missing" });
  if (!parsed.success || parsed.data.value && (!parsed.data.observedAt || !parsed.data.fetchedAt)) {
    return { value: null, observedAt: null, fetchedAt: null, freshness: "missing" as const, lastResult: value === undefined ? "not-provided" as const : "invalid" as const };
  }
  return parsed.data;
}

/** 저장된 실제 관측만 사용하고 빈 버킷에 관측값을 만들어 넣지 않는다. */
export function buildLiveHistory(areas: { areaCode: string; areaName: string }[], rows: PopulationRow[],
  available: Record<string, string | null>, now: number): History {
  const to = now; const from = to - 24 * 60 * 60_000; const interval = 5 * 60_000;
  return historySchema.parse({ meta: meta(now), data: { from: new Date(from).toISOString(), to: new Date(to).toISOString(),
    resolutionMinutes: 5, aggregation: "last-observation", series: areas.map((area) => {
      const buckets = new Map<number, PopulationRow[]>();
      for (const row of rows) {
        const at = Date.parse(row.observed_at);
        if (row.area_code !== area.areaCode || at < from || at >= to) continue;
        const bucket = Math.floor(at / interval) * interval;
        const values = buckets.get(bucket) ?? []; values.push(row); buckets.set(bucket, values);
      }
      const points: History["data"]["series"][number]["points"] = [];
      for (let bucket = Math.floor(from / interval) * interval; bucket < to; bucket += interval) {
        const values = buckets.get(bucket) ?? [];
        const last = values.toSorted((a, b) => Date.parse(b.observed_at) - Date.parse(a.observed_at))[0];
        const windowFrom = Math.max(bucket, from); const windowTo = Math.min(bucket + interval, to);
        points.push({ bucketAt: new Date(bucket).toISOString(), observedAt: last ? new Date(last.observed_at).toISOString() : null,
          min: last?.ppl_min ?? null, max: last?.ppl_max ?? null, congestion: last?.congestion ?? "unknown",
          windowFrom: new Date(windowFrom).toISOString(), windowTo: new Date(windowTo).toISOString(),
          partial: windowFrom !== bucket || windowTo !== bucket + interval, observationCount: values.length });
      }
      return { ...area, availableSince: available[area.areaCode] ?? null, points };
    }) } });
}

export class LiveRepository implements DataRepository {
  private readonly client: SupabaseClient;
  private readonly clock: () => number;
  constructor(client: SupabaseClient = createDatabaseReadClient(), clock: () => number = Date.now) { this.client = client; this.clock = clock; }

  async getAreas() {
    const { data, error } = await this.client.from("sp_areas").select("code,official_name,category,collection_enabled,geometry_available,catalog_version")
      .eq("is_public", true).in("code", areaCatalog.map((area) => area.areaCode)).order("code");
    assertDatabaseResult(error);
    const parsed = catalogSchema.safeParse(data);
    if (!parsed.success || parsed.data.some((row) => !areaCatalog.some((area) => area.areaCode === row.code && area.areaName === row.official_name && area.category === row.category))) throw new DatabaseError("DB_CONTRACT");
    return parsed.data.map((row) => ({ areaCode: row.code, areaName: row.official_name, category: row.category,
      collectionEnabled: row.collection_enabled, geometryAvailable: row.geometry_available, catalogVersion: row.catalog_version }));
  }

  async getOverview() {
    const now = this.clock();
    const areas = await this.getAreas();
    let raw: unknown = [];
    if (areas.length) {
      const result = await this.client.from("sp_area_latest").select("area_code,population,weather,last_attempt_at")
        .in("area_code", areas.map((area) => area.areaCode)).limit(areas.length);
      assertDatabaseResult(result.error); raw = result.data;
    }
    if (!Array.isArray(raw)) throw new DatabaseError("DB_CONTRACT");
    const records = new Map(raw.map((row: unknown) => { const value = object(row); return [value.area_code, value]; }));
    const items = areas.map((area): AreaLatest => {
      const row = records.get(area.areaCode) ?? {};
      const attempt = instant.safeParse(row.last_attempt_at);
      return { areaCode: area.areaCode, areaName: area.areaName, category: area.category, collectionEnabled: area.collectionEnabled,
        population: readSection("population", row.population, now), weather: readSection("weather", row.weather, now),
        lastAttemptAt: attempt.success ? attempt.data : null };
    });
    return overviewSchema.parse({ meta: { ...meta(now), coverage: getCoverage(items, now, areas.length) }, data: { items } });
  }

  async getHistory(areaCodes: string[]) {
    const now = this.clock();
    const areas = (await this.getAreas()).filter((area) => areaCodes.includes(area.areaCode));
    const from = new Date(now - 24 * 60 * 60_000).toISOString(); const to = new Date(now).toISOString();
    if (!areas.length) return buildLiveHistory([], [], {}, now);
    const { data, error } = await this.client.rpc("sp_read_population_history", {
      p_area_codes: areas.map((area) => area.areaCode), p_from: from, p_to: to,
    });
    assertDatabaseResult(error);
    const parsed = z.object({ rows: z.array(observationSchema).max(20_000),
      available: z.record(z.string(), instant.nullable()) }).safeParse(data);
    if (!parsed.success) throw new DatabaseError("DB_CONTRACT");
    return buildLiveHistory(areas, parsed.data.rows, parsed.data.available, now);
  }
}
