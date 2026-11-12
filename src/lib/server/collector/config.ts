import "server-only";
import { readSeoulConfig } from "../seoul/config.ts";
import { readDatabaseAdminConfig } from "../database/admin-client.ts";
import type { Environment } from "../database/config.ts";

export class CollectorConfigurationError extends Error {
  readonly code: "COLLECTOR_DISABLED" | "COLLECTOR_CONFIGURATION";
  constructor(code: CollectorConfigurationError["code"]) {
    super(code === "COLLECTOR_DISABLED" ? "수집이 비활성 상태입니다." : "수집 서버 설정을 확인하세요.");
    this.name = "CollectorConfigurationError"; this.code = code;
  }
}
function integer(source: Environment, name: string, fallback: number, max: number) {
  const value = source[name] ?? String(fallback);
  if (!/^\d+$/.test(value)) throw new CollectorConfigurationError("COLLECTOR_CONFIGURATION");
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 1 || number > max) throw new CollectorConfigurationError("COLLECTOR_CONFIGURATION");
  return number;
}
export function readCollectorConfig(source: Environment = process.env) {
  if (source.COLLECTOR_ENABLED === undefined || source.COLLECTOR_ENABLED === "false") throw new CollectorConfigurationError("COLLECTOR_DISABLED");
  if (source.COLLECTOR_ENABLED !== "true") throw new CollectorConfigurationError("COLLECTOR_CONFIGURATION");
  const interval = integer(source, "COLLECTION_INTERVAL_MINUTES", 5, 5);
  if (interval !== 5) throw new CollectorConfigurationError("COLLECTOR_CONFIGURATION");
  readDatabaseAdminConfig(source);
  return { seoul: readSeoulConfig(source), maxAreas: integer(source, "MAX_MONITORED_AREAS", 20, 20),
    dailyLimit: integer(source, "SEOUL_DAILY_CALL_BUDGET", 6000, 6000) };
}
