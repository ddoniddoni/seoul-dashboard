import "server-only";
import { setTimeout as pause } from "node:timers/promises";
import { areaCatalog } from "../../domain/catalog.ts";
import type { AreaLatest } from "../../contracts/dashboard.ts";
import { fetchSeoulArea } from "../seoul/client.ts";
import type { SeoulConfig } from "../seoul/config.ts";
import { SeoulApiError, safeSeoulError } from "../seoul/errors.ts";
import { SNAPSHOT_MAX_OBSERVATIONS, type LocalSnapshot } from "./contracts.ts";
import { readLocalSnapshot } from "./read.ts";
import { withSnapshotLock, writeLocalSnapshot, saveCollectionLedger } from "./write.ts";
import { LOCAL_COLLECTION_MAX_DAILY_BUDGET, readCollectionLedger } from "./scheduler-state.ts";

type Outcome = { areaCode: string; population: string; weather: string; issues?: string[]; error?: string };
export type CaptureSummary = {
  status: "success" | "partial" | "failed" | "skipped"; reason: string | null;
  sourceRequests: number; targetCount: number; capturedAt: string | null;
  populationValid: number; weatherValid: number; issues: string[]; unsuccessful: Outcome[];
};
function emptyArea(area: typeof areaCatalog[number], attemptedAt: string | null): AreaLatest {
  return { ...area, collectionEnabled: false, lastAttemptAt: attemptedAt,
    population: { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: attemptedAt ? "fetch-failed" : "not-provided" },
    weather: { value: null, observedAt: null, fetchedAt: null, freshness: "missing", lastResult: attemptedAt ? "fetch-failed" : "not-provided" } };
}
function merge<T extends AreaLatest["population"] | AreaLatest["weather"]>(previous: T | undefined, incoming: T): T {
  if (previous?.value && (!incoming.value || Date.parse(previous.observedAt!) > Date.parse(incoming.observedAt!))) {
    return { ...previous, lastResult: incoming.lastResult };
  }
  return incoming;
}

/** 명시적인 서버 작업 전용. 요청별 재시도 없음. 공개 조회에서는 import하지 않는다. */
export async function captureLocalSnapshot({ config, targets, intervalMs, deadlineMs, dailyBudget = LOCAL_COLLECTION_MAX_DAILY_BUDGET, signal, onProgress }: {
  config: SeoulConfig; targets: typeof areaCatalog; intervalMs: number; deadlineMs: number; signal?: AbortSignal;
  dailyBudget?: number;
  onProgress?: (completed: number, sourceRequests: number) => void;
}): Promise<CaptureSummary> {
  return withSnapshotLock(async () => {
    const previous = await readLocalSnapshot();
    const startedAt = Date.now();
    const summary: CaptureSummary = { status: "skipped", reason: null, sourceRequests: 0, targetCount: targets.length,
      capturedAt: null, populationValid: 0, weatherValid: 0, issues: [], unsuccessful: [] };
    let ledger = await readCollectionLedger(startedAt);
    if (ledger.pauseReason === "SOURCE_AUTHENTICATION" || ledger.pauseUntil && Date.parse(ledger.pauseUntil) > startedAt) {
      return { ...summary, reason: ledger.pauseReason };
    }
    const lastStartedAt = ledger.lastStartedAt ?? previous?.capturedAt;
    if (lastStartedAt && Math.floor(Date.parse(lastStartedAt) / intervalMs) >= Math.floor(startedAt / intervalMs)) {
      return { ...summary, reason: "DUPLICATE_SLOT" };
    }
    if (signal?.aborted) return { ...summary, reason: "STOP_REQUESTED" };
    ledger.lastStartedAt = new Date(startedAt).toISOString();
    ledger.pauseReason = null; ledger.pauseUntil = null;
    await saveCollectionLedger(ledger);
    const deadline = AbortSignal.any([AbortSignal.timeout(deadlineMs), ...(signal ? [signal] : [])]);
    const rows = new Map((previous?.observations ?? []).map((row) => [row.area_code + "/" + row.observed_at, row]));
    const areas = new Map(areaCatalog.map((known) => [known.areaCode,
      previous?.areas.find((area) => area.areaCode === known.areaCode) ?? emptyArea(known, null)]));
    const results: Outcome[] = [];
    let halted = false;
    for (const known of targets) {
      if (halted || deadline.aborted) {
        results.push({ areaCode: known.areaCode, population: "skipped", weather: "skipped" }); continue;
      }
      const prior = areas.get(known.areaCode);
      let incoming = emptyArea(known, null);
      try {
        if (summary.sourceRequests) await pause(250, undefined, { signal: deadline });
        ledger = await readCollectionLedger();
        if (ledger.requests >= dailyBudget) {
          ledger.pauseReason = "BUDGET_EXHAUSTED";
          await saveCollectionLedger(ledger); summary.reason = ledger.pauseReason; halted = true;
          results.push({ areaCode: known.areaCode, population: "skipped", weather: "skipped" }); continue;
        }
        if (deadline.aborted) { results.push({ areaCode: known.areaCode, population: "skipped", weather: "skipped" }); continue; }
        // 먼저 영속 예약한다. 프로세스 중단/실패 시에도 요청 예산을 되돌리지 않는다.
        ledger.requests++;
        await saveCollectionLedger(ledger);
        if (deadline.aborted) { results.push({ areaCode: known.areaCode, population: "skipped", weather: "skipped" }); continue; }
        incoming = emptyArea(known, new Date().toISOString());
        summary.sourceRequests++;
        const result = await fetchSeoulArea(config, known.areaCode, { signal: deadline });
        incoming = result.area;
        const population = incoming.population;
        if (population.value && population.observedAt) rows.set(known.areaCode + "/" + population.observedAt, {
          area_code: known.areaCode, observed_at: population.observedAt, ppl_min: population.value.min,
          ppl_max: population.value.max, congestion: population.value.congestion,
        });
        results.push({ areaCode: known.areaCode, population: population.lastResult, weather: incoming.weather.lastResult, issues: result.issues });
      } catch (error) {
        const safe = safeSeoulError(error);
        if (error instanceof SeoulApiError && ["SOURCE_AUTHENTICATION", "RATE_LIMITED"].includes(error.code)) {
          halted = true;
          ledger.pauseReason = error.code as "SOURCE_AUTHENTICATION" | "RATE_LIMITED";
          ledger.pauseUntil = error.code === "RATE_LIMITED" ? new Date(Date.now() + Math.max(180_000, error.retryAfterMs ?? 900_000)).toISOString() : null;
          await saveCollectionLedger(ledger);
          summary.reason = error.code;
        }
        // 저장 실패를 네트워크 오류로 숨긴 채 다음 원천 요청을 진행하지 않는다.
        if (!(error instanceof SeoulApiError) && !deadline.aborted) throw error;
        if (deadline.aborted && !incoming.lastAttemptAt) {
          results.push({ areaCode: known.areaCode, population: "skipped", weather: "skipped" }); continue;
        }
        results.push({ areaCode: known.areaCode, population: "fetch-failed", weather: "fetch-failed", error: deadline.aborted ? "ABORTED" : safe.code });
      }
      areas.set(known.areaCode, { ...incoming, collectionEnabled: false,
        population: merge(prior?.population, incoming.population), weather: merge(prior?.weather, incoming.weather) });
      if (results.length % 10 === 0) onProgress?.(results.length, summary.sourceRequests);
    }
    if (!summary.sourceRequests) return { ...summary, reason: summary.reason ?? "STOP_REQUESTED" };
    // 그래프와 같은 최근 24시간만 남긴다. 장소별 최신값은 areas에 별도로 유지한다.
    const completedAt = Date.now();
    const snapshot: LocalSnapshot = { schemaVersion: 1, source: "seoul-citydata", capturedAt: new Date(completedAt).toISOString(), areas: [...areas.values()],
      observations: [...rows.values()].filter((row) => Date.parse(row.observed_at) >= completedAt - 86_400_000)
        .toSorted((a, b) => a.observed_at.localeCompare(b.observed_at)).slice(-SNAPSHOT_MAX_OBSERVATIONS) };
    await writeLocalSnapshot(snapshot);
    summary.capturedAt = snapshot.capturedAt;
    summary.populationValid = results.filter((result) => result.population === "valid").length;
    summary.weatherValid = results.filter((result) => result.weather === "valid").length;
    summary.issues = [...new Set(results.flatMap((result) => result.issues ?? []))];
    summary.unsuccessful = results.filter((result) => result.population !== "valid" || result.weather !== "valid");
    summary.status = summary.populationValid === targets.length && summary.weatherValid === targets.length ? "success"
      : summary.populationValid || summary.weatherValid ? "partial" : "failed";
    return summary;
  });
}
