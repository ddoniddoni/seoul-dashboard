import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readDatabaseReadConfig, type Environment } from "./config.ts";
import { databaseFetch } from "./transport.ts";

/** 공개 조회에서는 publishable key만 사용한다. 관리자 client와 수집 모듈을 import하지 않는다. */
export function createDatabaseReadClient(source: Environment = process.env) {
  const config = readDatabaseReadConfig(source);
  return createClient(config.url, config.key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: databaseFetch(5_000) },
  });
}
