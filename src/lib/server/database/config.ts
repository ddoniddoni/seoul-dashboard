import "server-only";
import { DatabaseError } from "./errors.ts";

export type Environment = Record<string, string | undefined>;
export function readAliasedSetting(source: Environment, primary: string, alias: string): string | undefined {
  const value = source[primary]?.trim() || undefined;
  const fallback = source[alias]?.trim() || undefined;
  if (value && fallback && value !== fallback) throw new DatabaseError("DB_CONFIGURATION");
  return value ?? fallback;
}
export function readDatabaseOrigin(source: Environment): string {
  let url: URL;
  try { url = new URL(readAliasedSetting(source, "SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL") ?? ""); } catch { throw new DatabaseError("DB_CONFIGURATION"); }
  const hosted = url.protocol === "https:" && /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname) && !url.port;
  const local = url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname) && url.port === "54321";
  if ((!hosted && !local) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) throw new DatabaseError("DB_CONFIGURATION");
  return url.origin;
}
export function readDatabaseReadConfig(source: Environment = process.env) {
  const key = readAliasedSetting(source, "SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!key || !/^sb_publishable_[A-Za-z0-9_-]{8,256}$/.test(key)) throw new DatabaseError("DB_CONFIGURATION");
  return { url: readDatabaseOrigin(source), key };
}
