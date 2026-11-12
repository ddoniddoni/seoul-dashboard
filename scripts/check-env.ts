import nextEnv from "@next/env";
import { readEnvironmentStatus } from "../src/lib/server/env.ts";
import { readPublicCollection } from "../src/lib/server/local-snapshot/scheduler-state.ts";

try {
  // Next.js와 동일한 로컬 환경변수 우선순위. 로더 오류도 원문을 노출하지 않는다.
  nextEnv.loadEnvConfig(process.cwd(), true, {
    info() {},
    error() { throw new Error("환경변수 파일을 읽지 못했습니다."); },
  });
  const environment = readEnvironmentStatus();
  const localCollection = environment.liveDataBackend === "local-snapshot" ? await readPublicCollection() : undefined;
  console.log(JSON.stringify({ ...environment, localCollection: localCollection ?? { status: "stopped" } }, null, 2));
} catch {
  console.error("환경변수 점검 실패. 로컬 파일과 설정 형식을 확인하세요. 값은 출력하지 않습니다.");
  process.exitCode = 1;
}
