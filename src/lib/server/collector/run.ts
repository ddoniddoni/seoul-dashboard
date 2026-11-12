import "server-only";
import { performance } from "node:perf_hooks";
import { monitoredAreaCatalog as areaCatalog } from "../../domain/catalog.ts";
import type { AreaLatest } from "../../contracts/dashboard.ts";
import { SeoulApiError } from "../seoul/errors.ts";
import { DatabaseError } from "../database/errors.ts";
import type { CollectorStore, CollectionSummary, FetchArea, Outcome } from "./contracts.ts";

export const COLLECTOR_WORK_MS = 45_000;
const START_MARGIN_MS = 12_000;

function failureArea(areaCode: string, clock: () => number): AreaLatest {
  const area = areaCatalog.find((item) => item.areaCode === areaCode)!;
  const section = { value: null, observedAt: null, fetchedAt: null, freshness: "missing" as const, lastResult: "fetch-failed" as const };
  return { ...area, population: section, weather: section, lastAttemptAt: new Date(clock()).toISOString() };
}
function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    if (signal.aborted) { resolve(); return; }
    const done = () => { clearTimeout(timer); signal.removeEventListener("abort", done); resolve(); };
    const timer = setTimeout(done, ms); signal.addEventListener("abort", done, { once: true });
  });
}

/** 런타임 잠금 대신 DB의 슬롯/lease/예약을 사용한다. 외부 호출은 동시성 2, 재시도 최대 1회다. */
export async function runCollection({ store, fetchArea, maxAreas, dailyLimit, signal, clock = Date.now, monotonic = () => performance.now() }: {
  store: CollectorStore; fetchArea: FetchArea; maxAreas: number; dailyLimit: number; signal?: AbortSignal;
  clock?: () => number; monotonic?: () => number;
}): Promise<CollectionSummary> {
  const started = monotonic();
  const acquired = await store.acquire(maxAreas);
  const summary: CollectionSummary = { status: "skipped", reason: null, runId: acquired.runId, bucketStart: acquired.bucketStart,
    counts: { success: 0, partial: 0, failed: 0, skipped: 0, sourceRequests: 0, reservations: 0 } };
  if (acquired.state !== "acquired") {
    summary.reason = acquired.state === "duplicate" ? "DUPLICATE_SLOT" : acquired.state === "locked" ? "LEASE_BUSY" : acquired.state === "area-limit" ? "AREA_LIMIT" : "NO_ACTIVE_AREAS";
    if (acquired.state === "area-limit") summary.status = "error";
    return summary;
  }
  const run = acquired;
  const serverRemaining = Date.parse(run.deadlineAt) - Date.parse(run.serverNow) - (monotonic() - started) - 5_000;
  const budget = Math.max(0, Math.min(COLLECTOR_WORK_MS - (monotonic() - started), serverRemaining));
  const workEnds = monotonic() + budget;
  const controller = new AbortController();
  const externalAbort = () => controller.abort();
  signal?.addEventListener("abort", externalAbort, { once: true });
  if (signal?.aborted) externalAbort();
  const timer = setTimeout(() => controller.abort(), budget);
  const outcomes = new Map<string, Outcome>();
  let stop = false;
  let index = 0;
  const skip = (code: string, reason: string) => { outcomes.set(code, "skipped"); summary.reason ??= reason; };

  async function processArea(code: string) {
    if (stop) { skip(code, summary.reason ?? "BATCH_STOPPED"); return; }
    if (controller.signal.aborted || workEnds - monotonic() < START_MARGIN_MS) { skip(code, "SKIPPED_DEADLINE"); return; }
    let result: AreaLatest | null = null;
    let fetchFailed = false;
    let attempted = false;
    let failureAt = 0;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (stop || controller.signal.aborted || workEnds - monotonic() < START_MARGIN_MS) {
        if (attempted) { fetchFailed = true; result = failureArea(code, () => failureAt); break; }
        skip(code, "SKIPPED_DEADLINE"); return;
      }
      let reserved;
      try { reserved = await store.reserve(run, code, attempt, dailyLimit, controller.signal); }
      catch (error) { stop = true; summary.reason = error instanceof DatabaseError ? error.code : "DB_UNAVAILABLE"; outcomes.set(code, "failed"); return; }
      if (!reserved.allowed) {
        const reason = reserved.reason === "budget" ? "SKIPPED_BUDGET" : reserved.reason === "circuit" ? "CIRCUIT_OPEN" : reserved.reason === "duplicate-attempt" ? "DUPLICATE_ATTEMPT" : "SKIPPED_DEADLINE";
        summary.reason ??= reason;
        if (attempted) { fetchFailed = true; result = failureArea(code, () => failureAt); break; }
        skip(code, reason); return;
      }
      summary.counts.reservations++;
      if (controller.signal.aborted || stop) { skip(code, "SKIPPED_DEADLINE"); return; }
      summary.counts.sourceRequests++;
      attempted = true;
      try { result = (await fetchArea(code, controller.signal)).area; break; }
      catch (error) {
        const safe = error instanceof SeoulApiError ? error : new SeoulApiError("NETWORK", true);
        failureAt = clock();
        if (safe.code === "SOURCE_AUTHENTICATION" || safe.code === "RATE_LIMITED") {
          stop = true;
          summary.reason ??= safe.code;
          try { await store.openCircuit(run, safe.code, safe.retryAfterMs === null ? null : Math.ceil(safe.retryAfterMs / 1000)); }
          catch { summary.reason = "DB_UNAVAILABLE"; }
        }
        if (!stop && safe.retryable && safe.code !== "RATE_LIMITED" && attempt === 1 && !controller.signal.aborted
          && workEnds - monotonic() > START_MARGIN_MS + 500) { await pause(500, controller.signal); continue; }
        summary.reason ??= safe.code;
        fetchFailed = true; result = failureArea(code, () => failureAt); break;
      }
    }
    if (!result) { skip(code, "SKIPPED_DEADLINE"); return; }
    if (controller.signal.aborted) { outcomes.set(code, "failed"); summary.reason ??= "SKIPPED_DEADLINE"; return; }
    try {
      const stored = await store.commit(run, result, controller.signal);
      if (!stored) { outcomes.set(code, "skipped"); summary.reason ??= "OLDER_ATTEMPT"; return; }
      const population = result.population.value !== null && result.population.lastResult === "valid";
      const weather = result.weather.value !== null && result.weather.lastResult === "valid";
      outcomes.set(code, fetchFailed || !population && !weather ? "failed" : population && weather ? "success" : "partial");
    } catch (error) { stop = true; summary.reason = error instanceof DatabaseError ? error.code : "DB_UNAVAILABLE"; outcomes.set(code, "failed"); }
  }
  try {
    if (new Set(run.areaCodes).size !== run.areaCodes.length || run.areaCodes.length > maxAreas
      || run.areaCodes.some((code) => !areaCatalog.some((area) => area.areaCode === code))) {
      stop = true; summary.reason = "AREA_LIMIT";
    }
    const worker = async () => { while (index < run.areaCodes.length) { const code = run.areaCodes[index++]; await processArea(code); } };
    await Promise.all([worker(), worker()]);
  } finally {
    clearTimeout(timer); signal?.removeEventListener("abort", externalAbort);
    for (const code of run.areaCodes) if (!outcomes.has(code)) outcomes.set(code, "skipped");
    for (const outcome of outcomes.values()) summary.counts[outcome]++;
    summary.status = summary.counts.failed ? summary.counts.success + summary.counts.partial ? "partial" : "error"
      : summary.counts.partial || summary.counts.skipped && summary.counts.success ? "partial" : summary.counts.success ? "success" : "skipped";
    if (summary.reason === "AREA_LIMIT") summary.status = "error";
    try { await store.finish(run, summary); }
    catch (error) { summary.status = "error"; summary.reason = error instanceof DatabaseError ? error.code : "DB_UNAVAILABLE"; }
  }
  return summary;
}
