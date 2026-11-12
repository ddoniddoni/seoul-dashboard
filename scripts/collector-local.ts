import nextEnv from "@next/env";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { copyFile, mkdir, open, rename, stat, truncate } from "node:fs/promises";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as pause } from "node:timers/promises";
import { monitoredAreaCatalog as areaCatalog } from "../src/lib/domain/catalog.ts";
import { createDatabaseAdminClient } from "../src/lib/server/database/admin-client.ts";
import { DatabaseError } from "../src/lib/server/database/errors.ts";
import { collectOnce } from "../src/lib/server/collector/service.ts";
import { CollectorConfigurationError, readCollectorConfig } from "../src/lib/server/collector/config.ts";
import { readLiveDataBackend } from "../src/lib/server/env.ts";
import { readSeoulConfig } from "../src/lib/server/seoul/config.ts";
import { SeoulApiError, safeSeoulError } from "../src/lib/server/seoul/errors.ts";
import { snapshotPath, SnapshotError } from "../src/lib/server/local-snapshot/contracts.ts";
import { captureLocalSnapshot } from "../src/lib/server/local-snapshot/capture.ts";
import { withPrivateLock, withSnapshotLock, writePrivateJson, saveCollectionLedger } from "../src/lib/server/local-snapshot/write.ts";
import { collectorPath, DEFAULT_COLLECTION_INTERVAL, LOCAL_COLLECTION_BATCH_MS, localCollectionPolicy,
  readCollectionLedger, readCollectorJson, readPublicCollection, readWorkerHealth, stopRequestSchema,
  workerHealthSchema, workerIsActive, type WorkerHealth } from "../src/lib/server/local-snapshot/scheduler-state.ts";

let storage: "local-snapshot" | "supabase" = "local-snapshot";
const raw = process.argv.slice(2);
const command = raw[0] ?? "status";
const options = raw.slice(1);
const allowed = new Set(["--execute", "--source-time-zone=Asia/Seoul", "--allow-insecure-http-recurring", "--interval-minutes=5", "--interval-minutes=10", "--interval-minutes=30"]);
const intervalOptions = options.filter((option) => option.startsWith("--interval-minutes="));
const policy = localCollectionPolicy(intervalOptions[0] === "--interval-minutes=30" ? 30 : intervalOptions[0] === "--interval-minutes=10" ? 10 : DEFAULT_COLLECTION_INTERVAL);
const runOption = options.find((option) => option.startsWith("--run-id="));
const internalRunId = runOption?.slice("--run-id=".length);
const publicOptions = options.filter((option) => option !== runOption);
const help = `개발용 5분, 10분 또는 30분/전체 ${areaCatalog.length}곳 정기 수집
npm run collector:local -- status                  상태 확인, 원천 요청 없음
npm run collector:local -- start                   기본 5분 실행 설정 확인만 수행
npm run collector:local -- start --interval-minutes=30  30분 설정 확인만 수행
npm run collector:local -- start --interval-minutes=5 --execute --source-time-zone=Asia/Seoul --allow-insecure-http-recurring
npm run collector:local -- stop                    진행 중 요청을 중단하고 종료
npm run collector:local -- resume                  인증/요청 제한의 일시 중지를 명시적으로 해제

start --execute는 중지할 때까지 선택한 간격으로 실행합니다. 기본값은 5분입니다.
5분의 하루 요청 예산은 ${localCollectionPolicy(5).dailyBudget}회, 10분은 ${localCollectionPolicy(10).dailyBudget}회, 30분은 ${localCollectionPolicy(30).dailyBudget}회입니다.
실행 중 주기를 바꾸려면 stop 후 새 주기로 start하세요. 같은 날의 사용량은 유지됩니다.
HTTP 반복 전송 승인을 받은 경우에만 --allow-insecure-http-recurring을 사용하세요.
기존 단일 조회 승인은 반복 전송 승인으로 사용할 수 없습니다. 전역 HTTP/수집 활성화 설정은 바꾸지 않습니다.
컴퓨터와 프로세스가 실행 중인 개발 환경에서만 동작하며 재부팅 후 자동 시작하지 않습니다.
원천 URL/인증키/원본 XML은 출력하지 않습니다. LIVE_DATA_BACKEND=supabase이면 같은 개발용 프로세스가 DB 수집기를 5분마다 실행합니다.
원격 Cron과 실제 배포는 변경하지 않습니다.`;

function safeFailure(error: unknown) {
  return error instanceof SnapshotError || error instanceof DatabaseError || error instanceof CollectorConfigurationError ? { code: error.code, message: error.message }
    : error instanceof SeoulApiError ? safeSeoulError(error)
      : { code: "LOCAL_COLLECTOR_UNAVAILABLE", message: "개발용 정기 수집을 처리하지 못했습니다." };
}
function databaseSource() {
  return { ...process.env, COLLECTOR_ENABLED: "true", SEOUL_SOURCE_TIME_ZONE: "Asia/Seoul",
    SEOUL_DAILY_CALL_BUDGET: String(Math.min(policy.dailyBudget, Number(process.env.SEOUL_DAILY_CALL_BUDGET ?? policy.dailyBudget))),
    SEOUL_ALLOW_INSECURE_HTTP: publicOptions.includes("--allow-insecure-http-recurring") ? "true" : process.env.SEOUL_ALLOW_INSECURE_HTTP };
}
async function status() {
  const [collection, ledger] = await Promise.all([readPublicCollection(), readCollectionLedger()]);
  const reported = localCollectionPolicy(collection?.intervalMinutes ?? policy.intervalMinutes);
  console.log(JSON.stringify({ storage, intervalMinutes: reported.intervalMinutes, targetCount: areaCatalog.length,
    collection: collection ?? { status: "stopped" }, ...(storage === "local-snapshot" ? { requestsReservedToday: ledger.requests,
      dailyBudget: reported.dailyBudget, pauseReason: ledger.pauseReason, pauseUntil: ledger.pauseUntil }
      : { note: "요청 예산과 circuit은 DB에서 관리합니다. 원격 Cron 상태는 확인하지 않습니다." }) }, null, 2));
}
async function record(value: unknown) {
  if ((await stat(collectorPath("log"))).size > 5 * 1024 * 1024) {
    await copyFile(collectorPath("log"), collectorPath("previous.log"));
    await truncate(collectorPath("log"), 0);
  }
  console.log(JSON.stringify(value));
}

async function runWorker() {
  if (!internalRunId || !/^[0-9a-f-]{36}$/.test(internalRunId)) throw new SnapshotError("COLLECTOR_CONFIGURATION");
  await withPrivateLock(collectorPath("lock"), async () => {
    const config = readSeoulConfig({ ...process.env, SEOUL_SOURCE_TIME_ZONE: "Asia/Seoul" }, publicOptions.includes("--allow-insecure-http-recurring"));
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once("SIGTERM", stop); process.once("SIGINT", stop);
    const previous = await readWorkerHealth();
    const health: WorkerHealth = { schemaVersion: 1, runId: internalRunId, pid: process.pid, intervalMinutes: policy.intervalMinutes, updatedAt: new Date().toISOString(),
      status: "waiting", nextRunAt: new Date().toISOString(), lastCompletedAt: previous?.lastCompletedAt ?? null, lastResult: null };
    let writes = Promise.resolve();
    const heartbeat = () => {
      writes = writes.then(async () => {
        const request = await readCollectorJson("stop.json", stopRequestSchema);
        if (request?.runId === internalRunId) controller.abort();
        health.updatedAt = new Date().toISOString();
        await writePrivateJson(collectorPath("health.json"), workerHealthSchema.parse({ ...health }));
      });
      return writes;
    };
    await heartbeat();
    const timer = setInterval(() => { void heartbeat().catch(stop); }, 5_000);
    try {
      while (!controller.signal.aborted) {
        const cycleStartedAt = Date.now();
        const ledger = await readCollectionLedger();
        const paused = storage === "local-snapshot" && (ledger.pauseReason === "SOURCE_AUTHENTICATION" || ledger.requests >= policy.dailyBudget
          || Boolean(ledger.pauseUntil && Date.parse(ledger.pauseUntil) > Date.now()));
        health.status = paused ? "paused" : "collecting"; health.nextRunAt = null;
        await heartbeat();
        if (controller.signal.aborted) break;
        if (!paused) {
          try {
            if (storage === "supabase") {
              const result = await collectOnce(databaseSource(), controller.signal);
              health.lastResult = result.status === "error" ? "failed" : result.status;
              if (result.counts.success + result.counts.partial > 0) health.lastCompletedAt = new Date().toISOString();
              await record({ event: "collection", storage, at: new Date().toISOString(), ...result });
              const cleanup = await createDatabaseAdminClient().rpc("sp_cleanup_seoul_pulse");
              if (cleanup.error) throw new DatabaseError("DB_UNAVAILABLE");
            } else {
              const result = await captureLocalSnapshot({ config, targets: areaCatalog, intervalMs: policy.intervalMs,
                deadlineMs: LOCAL_COLLECTION_BATCH_MS, dailyBudget: policy.dailyBudget, signal: controller.signal });
              health.lastResult = result.status;
              if (result.capturedAt) health.lastCompletedAt = result.capturedAt;
              await record({ event: "collection", storage, at: new Date().toISOString(), ...result });
            }
          } catch (error) {
            if (storage === "supabase" && error instanceof DatabaseError && error.code === "DB_UNAVAILABLE") {
              health.lastResult = "failed";
              await record({ event: "database-error", code: error.code, at: new Date().toISOString() });
            } else {
              if (!(error instanceof SnapshotError && error.code === "SNAPSHOT_LOCKED")) throw error;
              health.lastResult = "skipped";
              await record({ event: "skipped", reason: "SNAPSHOT_LOCKED", at: new Date().toISOString() });
            }
          }
        }
        const next = Math.max(cycleStartedAt + policy.intervalMs,
          Date.now() >= cycleStartedAt + policy.intervalMs ? Date.now() + policy.intervalMs : 0);
        const after = storage === "local-snapshot" ? await readCollectionLedger() : { pauseReason: null, pauseUntil: null, requests: 0 };
        const indefinitelyPaused = after.pauseReason === "SOURCE_AUTHENTICATION" || after.requests >= policy.dailyBudget;
        health.status = indefinitelyPaused || after.pauseUntil && Date.parse(after.pauseUntil) > Date.now() ? "paused" : "waiting";
        health.nextRunAt = indefinitelyPaused ? null
          : new Date(after.pauseUntil ? next + Math.max(0, Math.ceil((Date.parse(after.pauseUntil) - next) / policy.intervalMs)) * policy.intervalMs : next).toISOString();
        await heartbeat();
        while (Date.now() < next && !controller.signal.aborted) await pause(Math.min(1_000, next - Date.now()));
      }
    } catch (error) {
      health.lastResult = "failed"; console.error(JSON.stringify(safeFailure(error))); process.exitCode = 1;
    } finally {
      clearInterval(timer);
      await writes.catch(() => {});
      health.status = "stopped"; health.nextRunAt = null; health.updatedAt = new Date().toISOString();
      await writePrivateJson(collectorPath("health.json"), workerHealthSchema.parse(health));
      process.removeListener("SIGTERM", stop); process.removeListener("SIGINT", stop);
    }
  });
}

async function start() {
  const execute = publicOptions.includes("--execute");
  if (execute && !publicOptions.includes("--source-time-zone=Asia/Seoul")) throw new SnapshotError("COLLECTOR_CONFIGURATION");
  // 설정 확인에는 키를 전송하지 않는다. 실제 실행의 전송 허용은 별도로 검사한다.
  readSeoulConfig({ ...process.env, SEOUL_SOURCE_TIME_ZONE: "Asia/Seoul" }, !execute || publicOptions.includes("--allow-insecure-http-recurring"));
  if (storage === "supabase" && execute) readCollectorConfig(databaseSource());
  if (!execute) {
    console.log(JSON.stringify({ mode: "dry-run", sourceRequests: 0, intervalMinutes: policy.intervalMinutes, targetCount: areaCatalog.length,
      dailyBudget: policy.dailyBudget, transportAllowed: publicOptions.includes("--allow-insecure-http-recurring")
        || process.env.SEOUL_ALLOW_INSECURE_HTTP === "true", storage }, null, 2));
    return;
  }
  if (workerIsActive(await readWorkerHealth())) { await status(); return; }
  const logPath = collectorPath("log");
  await mkdir(dirname(logPath), { recursive: true, mode: 0o700 });
  try { if ((await stat(logPath)).size > 5 * 1024 * 1024) await rename(logPath, collectorPath("previous.log")); }
  catch (error) { if (!(error && typeof error === "object" && "code" in error && error.code === "ENOENT")) throw new SnapshotError("SNAPSHOT_IO"); }
  const log = await open(logPath, "a", 0o600);
  const runId = randomUUID();
  try {
    const child = spawn(process.execPath, ["--conditions=react-server", fileURLToPath(import.meta.url), "run", ...publicOptions, "--run-id=" + runId],
      { cwd: process.cwd(), detached: true, stdio: ["ignore", log.fd, log.fd] });
    await new Promise<void>((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
    child.unref();
  } finally { await log.close(); }
  for (let attempt = 0; attempt < 40; attempt++) {
    await pause(250);
    const health = await readWorkerHealth();
    if (health?.runId === runId && workerIsActive(health)) { await status(); return; }
  }
  throw new SnapshotError("COLLECTOR_STATE");
}
async function requestStop() {
  const health = await readWorkerHealth();
  if (!workerIsActive(health) || !health) { await status(); return; }
  await writePrivateJson(collectorPath("stop.json"), { runId: health.runId });
  for (let attempt = 0; attempt < 60; attempt++) {
    await pause(250);
    if (!workerIsActive(await readWorkerHealth())) { await status(); return; }
  }
  console.log(JSON.stringify({ status: "stopping", message: "중지를 요청했습니다. status 명령으로 종료 상태를 확인하세요." }));
}

try {
  if (command === "--help" && raw.length === 1) console.log(help);
  else {
    if (!["status", "start", "stop", "resume", "run"].includes(command) || new Set(options).size !== options.length || intervalOptions.length > 1
      || publicOptions.some((option) => !allowed.has(option)) || command !== "run" && runOption
      || !["start", "run"].includes(command) && options.length) throw new SnapshotError("COLLECTOR_CONFIGURATION");
    nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() { throw new SnapshotError("COLLECTOR_CONFIGURATION"); } });
    snapshotPath();
    storage = readLiveDataBackend();
    if (storage === "supabase" && ["start", "run"].includes(command) && policy.intervalMinutes !== 5) throw new SnapshotError("COLLECTOR_CONFIGURATION");
    if (command === "status") await status();
    else if (command === "stop") await requestStop();
    else if (command === "resume") {
      if (storage === "supabase") throw new SnapshotError("COLLECTOR_CONFIGURATION");
      await withSnapshotLock(async () => {
        const ledger = await readCollectionLedger(); ledger.pauseReason = null; ledger.pauseUntil = null;
        await saveCollectionLedger(ledger);
      });
      await status();
    } else if (command === "start") await start();
    else {
      if (!publicOptions.includes("--execute") || !publicOptions.includes("--source-time-zone=Asia/Seoul")) throw new SnapshotError("COLLECTOR_CONFIGURATION");
      await runWorker();
    }
  }
} catch (error) {
  console.error(JSON.stringify(safeFailure(error))); process.exitCode = 1;
}
