import nextEnv from "@next/env";
import { readEnvironmentStatus } from "../src/lib/server/env.ts";
import { collectOnce } from "../src/lib/server/collector/service.ts";
import { CollectorConfigurationError } from "../src/lib/server/collector/config.ts";
import { DatabaseError } from "../src/lib/server/database/errors.ts";
import { safeSeoulError, SeoulApiError } from "../src/lib/server/seoul/errors.ts";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(`서울시 데이터 단일 배치 수집
npm run collect:once             설정 확인만 수행. 네트워크/DB 쓰기 없음
npm run collect:once -- --execute 별도 실행 승인 후 사용. 활성 장소 최대 20곳

실행에는 COLLECTOR_ENABLED=true, 서울시 전송/시간대와 관리자 DB 설정이 필요합니다.
원천 요청은 동시성 2, 재시도 최대 1회, 배치 기한 50초 이내로 제한합니다.
같은 5분 슬롯은 다시 호출하지 않으며 매 시도마다 DB 예산을 예약합니다.
운영 활성화나 이전 HTTP 1회 승인은 이 명령 작성만으로 부여되지 않습니다.
키/토큰/URL 인자는 받거나 출력하지 않습니다. DB migration과 Cron은 실행하지 않습니다.`);
} else {
  try {
    if (args.length && !(args.length === 1 && args[0] === "--execute")) throw new CollectorConfigurationError("COLLECTOR_CONFIGURATION");
    nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() { throw new CollectorConfigurationError("COLLECTOR_CONFIGURATION"); } });
    if (!args.length) console.log(JSON.stringify({ mode: "dry-run", networkRequests: 0, databaseWrites: 0,
      status: readEnvironmentStatus(), verification: "설정 존재 여부이며 연결 성공/운영 승인을 뜻하지 않습니다." }, null, 2));
    else {
      const result = await collectOnce();
      console.log(JSON.stringify(result, null, 2));
      if (result.status === "error" || result.status === "partial") process.exitCode = 1;
    }
  } catch (error) {
    const output = error instanceof CollectorConfigurationError || error instanceof DatabaseError ? { code: error.code, message: error.message }
      : error instanceof SeoulApiError ? safeSeoulError(error) : { code: "COLLECTOR_UNAVAILABLE", message: "수집을 처리하지 못했습니다. 원본 오류는 출력하지 않습니다." };
    console.error(JSON.stringify(output)); process.exitCode = 1;
  }
}
