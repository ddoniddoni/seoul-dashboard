import "server-only";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Environment } from "../database/config.ts";

export function authenticateCollector(request: Request, source: Environment = process.env): boolean {
  const secret = source.COLLECTOR_SECRET;
  const bearer = /^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!secret || !/^[A-Za-z0-9_-]{32,256}$/.test(secret) || !bearer) return false;
  const digest = (value: string) => createHash("sha256").update(value).digest();
  return timingSafeEqual(digest(secret), digest(bearer));
}
