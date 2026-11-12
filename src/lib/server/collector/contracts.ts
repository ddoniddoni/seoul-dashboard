import "server-only";
import { z } from "zod";
import type { SeoulFetchResult } from "../seoul/client.ts";
import type { AreaLatest } from "../../contracts/dashboard.ts";

const instant = z.string().datetime({ offset: true });
const base = { runId: z.string().uuid(), bucketStart: instant };
export const acquiredSchema = z.discriminatedUnion("state", [
  z.object({ ...base, state: z.literal("acquired"), leaseToken: z.string().uuid(), serverNow: instant, deadlineAt: instant,
    areaCodes: z.array(z.string().regex(/^POI\d{3}$/)).min(1).max(20) }),
  z.object({ ...base, state: z.literal("duplicate"), previousStatus: z.enum(["running","success","partial","error","skipped"]) }),
  z.object({ ...base, state: z.enum(["locked","no-active-areas","area-limit"]) }),
]);
export const reservationSchema = z.object({ allowed: z.boolean(), reason: z.enum(["deadline","duplicate-attempt","circuit","budget"]).nullable() });
export type Acquisition = z.infer<typeof acquiredSchema>;
export type ActiveRun = Extract<Acquisition, { state: "acquired" }>;
export type Reservation = z.infer<typeof reservationSchema>;
export type Outcome = "success" | "partial" | "failed" | "skipped";
export interface CollectionSummary {
  status: "success" | "partial" | "error" | "skipped";
  reason: string | null; runId: string; bucketStart: string;
  counts: { success: number; partial: number; failed: number; skipped: number; sourceRequests: number; reservations: number };
}
export interface CollectorStore {
  acquire(maxAreas: number): Promise<Acquisition>;
  reserve(run: ActiveRun, areaCode: string, attempt: number, dailyLimit: number, signal: AbortSignal): Promise<Reservation>;
  commit(run: ActiveRun, area: AreaLatest, signal: AbortSignal): Promise<boolean>;
  openCircuit(run: ActiveRun, code: "RATE_LIMITED" | "SOURCE_AUTHENTICATION", seconds: number | null): Promise<void>;
  finish(run: ActiveRun, summary: CollectionSummary): Promise<void>;
}
export type FetchArea = (areaCode: string, signal: AbortSignal) => Promise<SeoulFetchResult>;
