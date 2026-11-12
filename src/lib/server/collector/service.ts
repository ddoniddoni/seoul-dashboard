import "server-only";
import type { Environment } from "../database/config.ts";
import { createDatabaseAdminClient } from "../database/admin-client.ts";
import { fetchSeoulArea } from "../seoul/client.ts";
import { readCollectorConfig } from "./config.ts";
import { runCollection } from "./run.ts";
import { SupabaseCollectorStore } from "./store.ts";

export function collectOnce(source: Environment = process.env, signal?: AbortSignal) {
  const config = readCollectorConfig(source);
  const store = new SupabaseCollectorStore(createDatabaseAdminClient(source));
  return runCollection({ store, maxAreas: config.maxAreas, dailyLimit: config.dailyLimit, signal,
    fetchArea: (code, requestSignal) => fetchSeoulArea(config.seoul, code, { signal: requestSignal }) });
}
