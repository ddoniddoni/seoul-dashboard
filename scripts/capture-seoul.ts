import nextEnv from "@next/env";
import { areaCatalog, monitoredAreaCatalog } from "../src/lib/domain/catalog.ts";
import { readSeoulConfig } from "../src/lib/server/seoul/config.ts";
import { SeoulApiError, safeSeoulError } from "../src/lib/server/seoul/errors.ts";
import { snapshotPath, SnapshotError } from "../src/lib/server/local-snapshot/contracts.ts";
import { captureLocalSnapshot } from "../src/lib/server/local-snapshot/capture.ts";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(`개발 화면용 서울시 실데이터 단일 수집
npm run capture:seoul                              설정 확인만 수행, 외부 요청 없음
npm run capture:seoul -- --execute --source-time-zone=Asia/Seoul --allow-insecure-http-once
npm run capture:seoul -- --all --execute --source-time-zone=Asia/Seoul --allow-insecure-http-once

기본은 모니터링 ${monitoredAreaCatalog.length}곳, --all은 공식 전체 ${areaCatalog.length}곳을 각 1회 조회합니다.
단일 명령은 같은 5분 구간 중복을 막습니다. 정기 수집은 collector:local 명령을 사용하세요.
요청 사이 250ms, 자동 재시도 없음. 인증/요청 제한 후 중지하며 기존 유효 값을 유지합니다.
HTTP 허용은 이번 단일 실행만의 전송 승인이 필요하며 정기 수집 승인으로 재사용하지 않습니다.
원본 XML/인증 URL/키를 저장하거나 출력하지 않습니다. 운영 환경과 DB/Cron은 변경하지 않습니다.`);
} else {
  try {
    const allowed = new Set(["--execute", "--all", "--source-time-zone=Asia/Seoul", "--allow-insecure-http-once"]);
    if (args.some((arg) => !allowed.has(arg)) || new Set(args).size !== args.length) throw new SnapshotError("SNAPSHOT_ARGUMENTS");
    nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() { throw new SnapshotError("SNAPSHOT_ARGUMENTS"); } });
    snapshotPath();
    const source = { ...process.env, ...(args.includes("--source-time-zone=Asia/Seoul") ? { SEOUL_SOURCE_TIME_ZONE: "Asia/Seoul" } : {}) };
    const config = readSeoulConfig(source, args.includes("--allow-insecure-http-once"));
    const targets = args.includes("--all") ? areaCatalog : monitoredAreaCatalog;
    if (!args.includes("--execute")) {
      console.log(JSON.stringify({ mode: "dry-run", networkRequests: 0, targetCount: targets.length,
        areas: targets.map((area) => area.areaCode), storage: "local-snapshot", sourceTimeZone: config.sourceTimeZone }, null, 2));
    } else {
      const result = await captureLocalSnapshot({ config, targets, intervalMs: 300_000, deadlineMs: args.includes("--all") ? 600_000 : 150_000,
        onProgress: (completed, sourceRequests) => console.log(JSON.stringify({ mode: "progress", completed, targetCount: targets.length, sourceRequests })) });
      console.log(JSON.stringify({ mode: "captured", storage: "local-snapshot", sourceTimeZone: config.sourceTimeZone,
        timeZoneBasis: "실행자가 지정한 한국 시간 해석 기준", ...result }, null, 2));
      if (result.populationValid !== targets.length) process.exitCode = 1;
    }
  } catch (error) {
    console.error(JSON.stringify(error instanceof SnapshotError ? { code: error.code, message: error.message }
      : error instanceof SeoulApiError ? safeSeoulError(error) : { code: "CAPTURE_UNAVAILABLE", message: "수집을 처리하지 못했습니다. 원본 오류는 출력하지 않습니다." }));
    process.exitCode = 1;
  }
}
