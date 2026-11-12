import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { createDatabaseAdminClient } from "../database/admin-client.ts";
import { DatabaseError } from "../database/errors.ts";
import { areaLatestSchema, type AreaLatest } from "../../contracts/dashboard.ts";
import { acquiredSchema, reservationSchema, type ActiveRun, type CollectionSummary, type CollectorStore } from "./contracts.ts";

export class SupabaseCollectorStore implements CollectorStore {
  private readonly client: SupabaseClient;
  constructor(client: SupabaseClient = createDatabaseAdminClient()) { this.client = client; }

  private async rpc(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<unknown> {
    try {
      const query = this.client.rpc(name, args);
      const { data, error } = await (signal ? query.abortSignal(signal) : query);
      if (error) {
        if (error.message === "LEASE_LOST" || error.message === "DEADLINE") throw new DatabaseError(error.message);
        throw new DatabaseError();
      }
      return data;
    } catch (error) {
      if (error instanceof DatabaseError) throw error;
      throw new DatabaseError();
    }
  }
  async acquire(maxAreas: number) {
    const result = acquiredSchema.safeParse(await this.rpc("sp_acquire_collection_run", { p_max_areas: maxAreas }));
    if (!result.success) throw new DatabaseError("DB_CONTRACT");
    return result.data;
  }
  async reserve(run: ActiveRun, areaCode: string, attempt: number, dailyLimit: number, signal: AbortSignal) {
    const result = reservationSchema.safeParse(await this.rpc("sp_reserve_provider_attempt", {
      p_run_id: run.runId, p_lease_token: run.leaseToken, p_area_code: areaCode, p_attempt: attempt, p_daily_limit: dailyLimit,
    }, signal));
    if (!result.success || result.data.allowed && result.data.reason !== null || !result.data.allowed && result.data.reason === null) throw new DatabaseError("DB_CONTRACT");
    return result.data;
  }
  async commit(run: ActiveRun, raw: AreaLatest, signal: AbortSignal) {
    const parsed = areaLatestSchema.safeParse(raw);
    if (!parsed.success || !parsed.data.lastAttemptAt) throw new DatabaseError("DB_CONTRACT");
    const area = parsed.data;
    const storedSection = (section: AreaLatest["population"] | AreaLatest["weather"]) => ({
      value: section.value, observedAt: section.observedAt, fetchedAt: section.fetchedAt, lastResult: section.lastResult,
    });
    const result = z.object({ stored: z.boolean(), reason: z.string().nullable() }).safeParse(await this.rpc("sp_commit_area_update", {
      p_run_id: run.runId, p_lease_token: run.leaseToken, p_area_code: area.areaCode, p_attempt_at: area.lastAttemptAt,
      p_population: storedSection(area.population), p_weather: storedSection(area.weather),
    }, signal));
    if (!result.success) throw new DatabaseError("DB_CONTRACT");
    return result.data.stored;
  }
  async openCircuit(run: ActiveRun, code: "RATE_LIMITED" | "SOURCE_AUTHENTICATION", seconds: number | null) {
    await this.rpc("sp_record_provider_failure", { p_run_id: run.runId, p_lease_token: run.leaseToken,
      p_error_code: code, p_retry_after_seconds: seconds });
  }
  async finish(run: ActiveRun, summary: CollectionSummary) {
    const { counts } = summary;
    await this.rpc("sp_finish_collection_run", { p_run_id: run.runId, p_lease_token: run.leaseToken, p_status: summary.status,
      p_success: counts.success, p_partial: counts.partial, p_failed: counts.failed, p_skipped: counts.skipped,
      p_source_requests: counts.sourceRequests, p_error_code: summary.reason });
  }
}
