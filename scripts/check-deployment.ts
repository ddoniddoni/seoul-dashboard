import nextEnv from "@next/env";
import { checkDeploymentEnvironment } from "../src/lib/server/deployment-check.ts";
import { LiveRepository } from "../src/lib/server/repositories/live.ts";
import { monitoredAreaCatalog } from "../src/lib/domain/catalog.ts";

const args = process.argv.slice(2);
try {
  if (args.includes("--help")) {
    console.log(`배포 설정 점검: npm run check:deployment [-- --collector] [--read]
기본: 운영 환경 형식만 점검. 네트워크 요청 없음.
--collector: 운영 수집 설정도 점검. 원천 호출/DB 쓰기/예약 활성화 없음.
--read: 공개 읽기 키로 Supabase의 20곳과 이력 RPC를 실제 조회.
Next.js production 환경 파일 우선순위를 사용합니다. 값과 원본 오류는 출력하지 않습니다.
Cron, RLS 쓰기 차단과 실제 수집 성공은 별도의 DB/운영 검증이 필요합니다.`);
  } else {
    if (args.some((arg) => !["--collector", "--read"].includes(arg))) throw new Error();
    nextEnv.loadEnvConfig(process.cwd(), false, { info() {}, error() { throw new Error(); } });
    const checks = checkDeploymentEnvironment(process.env, args.includes("--collector"));
    let read: Record<string, unknown> | undefined;
    if (args.includes("--read") && checks.every((check) => check.ok)) {
      try {
        const repository = new LiveRepository();
        const overview = await repository.getOverview();
        const history = await repository.getHistory([monitoredAreaCatalog[0].areaCode]);
        const catalogComplete = monitoredAreaCatalog.every((area) => overview.data.items.some((item) => item.areaCode === area.areaCode));
        read = { ok: catalogComplete && history.data.series.length === 1, places: overview.data.items.length,
          withPopulation: overview.data.items.filter((item) => item.population.value).length,
          coverage: overview.meta.coverage, historyObservations: history.data.series[0]?.points.filter((point) => point.min !== null).length ?? 0,
          note: "공개 조회 결과입니다. 수집 예약, 쓰기 차단과 보존 작업의 실행 여부는 별도 확인해야 합니다." };
      } catch { read = { ok: false, note: "공개 DB 연결, sp_ 스키마 migration 적용과 읽기 권한을 확인하세요." }; }
    }
    const ok = checks.every((check) => check.ok) && (!args.includes("--read") || read?.ok === true);
    console.log(JSON.stringify({ ok, checks, ...(read ? { read } : {}), sourceRequests: 0, databaseWrites: 0 }, null, 2));
    if (!ok) process.exitCode = 1;
  }
} catch {
  console.error("배포 점검 실패. 환경 파일과 인자를 확인하세요. 값과 원본 오류는 출력하지 않습니다.");
  process.exitCode = 1;
}
