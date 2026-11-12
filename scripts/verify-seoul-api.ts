import nextEnv from "@next/env";
import { isAreaCode } from "../src/lib/domain/catalog.ts";
import { readSeoulConfig } from "../src/lib/server/seoul/config.ts";
import { fetchSeoulArea } from "../src/lib/server/seoul/client.ts";
import { safeSeoulError } from "../src/lib/server/seoul/errors.ts";

const args = process.argv.slice(2);
if (args.length === 1 && args[0] === "--help") {
  console.log(`서울시 API 로컬 확인
기본 실행은 설정 확인만 수행하며 원천 요청은 없습니다.

npm run verify:seoul
npm run verify:seoul -- --execute --area=POI014 --source-time-zone=Asia/Seoul --allow-insecure-http-once

--execute                      한 장소만 1회 호출합니다. DB 쓰기와 자동 재시도는 없습니다.
--area=POI014                   등록된 장소 코드. 기본값은 강남역입니다.
--source-time-zone=Asia/Seoul   offset 없는 시각을 해석할 기준을 명시합니다.
--allow-insecure-http-once     이 실행에서만 평문 HTTP 전송을 허용합니다.

실호출에는 사용자의 별도 실행 지시가 필요합니다. 이전 1회 승인은 재사용하지 않습니다.
키는 .env.local에서 읽으며 명령행 인자로 받거나 출력하지 않습니다.
시간대 설정은 공식 확인의 증거가 아니며, 현재 PM25 단위 연결은 보류 상태입니다.`);
} else {
  try {
    let areaCode = "POI014";
    let execute = false;
    let allowOnce = false;
    let timeZone: string | undefined;
    const seen = new Set<string>();
    for (const arg of args) {
      const name = arg.split("=", 1)[0];
      if (seen.has(name)) throw new Error();
      seen.add(name);
      if (arg === "--execute") execute = true;
      else if (arg === "--allow-insecure-http-once") allowOnce = true;
      else if (/^--area=POI\d{3}$/.test(arg)) areaCode = arg.slice(7);
      else if (arg === "--source-time-zone=Asia/Seoul") timeZone = "Asia/Seoul";
      else throw new Error();
    }
    if (!isAreaCode(areaCode)) throw new Error();
    nextEnv.loadEnvConfig(process.cwd(), true, { info() {}, error() { throw new Error(); } });
    const source: Record<string, string | undefined> = { ...process.env, ...(timeZone ? { SEOUL_SOURCE_TIME_ZONE: timeZone } : {}) };
    if (!execute) {
      let blocker = null;
      try { readSeoulConfig(source, allowOnce); } catch (error) { blocker = safeSeoulError(error); }
      console.log(JSON.stringify({ mode: "dry-run", networkRequests: 0, areaCode,
        keyConfigured: Boolean(source.SEOUL_API_KEY?.trim()), readyForExplicitExecution: blocker === null,
        blocker, verification: "연결 성공이나 운영 승인 결과가 아닙니다." }, null, 2));
    } else {
      const result = await fetchSeoulArea(readSeoulConfig(source, allowOnce), areaCode);
      // 원본 XML과 오류 본문을 제외하고 정규화된 안전한 항목만 출력한다.
      const { area, issues, request } = result;
      console.log(JSON.stringify({ areaCode: area.areaCode, areaName: area.areaName, population: {
        value: area.population.value && { min: area.population.value.min, max: area.population.value.max,
          midpoint: area.population.value.midpoint, congestion: area.population.value.congestion },
        observedAt: area.population.observedAt, fetchedAt: area.population.fetchedAt,
        freshness: area.population.freshness, lastResult: area.population.lastResult,
      }, weather: area.weather, issues, request, sourceTimeZone: "Asia/Seoul",
        timeZoneBasis: "실행자가 명시한 해석 기준. 공식 시간대 확인은 대기 상태입니다." }, null, 2));
    }
  } catch (error) {
    // 인증 URL이나 환경변수를 포함할 수 있는 원본 예외는 로그에 전달하지 않는다.
    console.error(JSON.stringify(error instanceof Error && error.name === "SeoulApiError" ? safeSeoulError(error)
      : { code: "VERIFY_CONFIGURATION", message: "명령 인자와 로컬 설정을 확인하세요. 값은 출력하지 않습니다." }));
    process.exitCode = 1;
  }
}
