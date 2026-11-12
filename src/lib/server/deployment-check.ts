import "server-only";
import { readDatabaseReadConfig, type Environment } from "./database/config.ts";
import { readCollectorConfig } from "./collector/config.ts";

type Check = { name: string; ok: boolean; hint: string };
function valid(check: () => unknown) { try { check(); return true; } catch { return false; } }

/** 값이나 원본 오류를 반환하지 않는다. 네트워크와 DB 변경도 수행하지 않는다. */
export function checkDeploymentEnvironment(source: Environment, collector: boolean): Check[] {
  const checks: Check[] = [
    { name: "운영 저장소", ok: source.LIVE_DATA_BACKEND === "supabase", hint: "LIVE_DATA_BACKEND=supabase" },
    { name: "실데이터 모드", ok: source.DATA_MODE === undefined || source.DATA_MODE === "live", hint: "DATA_MODE=live" },
    { name: "고정 HTTPS 주소", ok: valid(() => {
      const url = new URL(source.APP_BASE_URL ?? "");
      if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new Error();
    }), hint: "APP_BASE_URL에 운영 HTTPS origin 설정" },
    { name: "운영 DB 읽기 설정", ok: valid(() => {
      const config = readDatabaseReadConfig(source);
      if (!config.url.startsWith("https://")) throw new Error();
    }), hint: "SUPABASE_URL과 SUPABASE_PUBLISHABLE_KEY 설정" },
  ];
  if (collector) checks.push(
    { name: "수집 설정", ok: valid(() => readCollectorConfig(source)), hint: "수집 활성화, 서버 비밀, 원천 전송 및 시간대 설정 확인" },
    { name: "수집 인증", ok: /^[A-Za-z0-9_-]{32,256}$/.test(source.COLLECTOR_SECRET ?? ""), hint: "COLLECTOR_SECRET을 Vault와 동일하게 설정" },
    { name: "20곳 / 5분", ok: (source.MAX_MONITORED_AREAS ?? "20") === "20" && (source.COLLECTION_INTERVAL_MINUTES ?? "5") === "5", hint: "MAX_MONITORED_AREAS=20, COLLECTION_INTERVAL_MINUTES=5" },
  );
  return checks;
}
