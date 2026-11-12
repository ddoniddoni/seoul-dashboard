import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readAliasedSetting, readDatabaseOrigin, type Environment } from "./config.ts";
import { DatabaseError } from "./errors.ts";
import { databaseFetch } from "./transport.ts";

export function readDatabaseAdminConfig(source: Environment = process.env) {
  const url = readDatabaseOrigin(source);
  const key = readAliasedSetting(source, "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!key || !(/^sb_secret_[A-Za-z0-9_-]{8,256}$/.test(key) || isLegacyServiceKey(key, url))) throw new DatabaseError("DB_CONFIGURATION");
  return { url, key };
}

// 기존 키의 오설정만 검사한다. 서명과 실제 권한 검증은 Supabase 서버가 수행한다.
function isLegacyServiceKey(key: string, url: string): boolean {
  if (key.length > 4096 || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
  try {
    const claims: unknown = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object") return false;
    const payload = claims as Record<string, unknown>;
    return payload.role === "service_role" && payload.ref === new URL(url).hostname.split(".")[0]
      && typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch { return false; }
}
/** 인증과 활성화 검사를 끝낸 수집 작업에서만 생성한다. */
export function createDatabaseAdminClient(source: Environment = process.env) {
  const config = readDatabaseAdminConfig(source);
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: databaseFetch(4_000) },
  });
}
