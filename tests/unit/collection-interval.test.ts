import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { localCollectionPolicy, workerHealthSchema } from "../../src/lib/server/local-snapshot/scheduler-state.ts";

describe("수집 주기와 기존 상태 호환", () => {
  it("기본 5분 주기로 20곳을 하루 최대 5,760회 요청한다", () => {
    expect(localCollectionPolicy()).toEqual({ intervalMinutes: 5, intervalMs: 300_000, dailyBudget: 5_760 });
    expect(localCollectionPolicy(10).dailyBudget).toBe(2_880);
    expect(localCollectionPolicy(30).dailyBudget).toBe(960);
  });
  it("새 5분 상태와 이전 수집기의 상태를 읽을 수 있다", () => {
    const health = { schemaVersion: 1, runId: "00000000-0000-4000-8000-000000000001", pid: 1,
      updatedAt: "2026-11-10T00:00:00Z", status: "stopped", nextRunAt: null, lastCompletedAt: null, lastResult: null };
    for (const intervalMinutes of [3, 5, 10, 30]) {
      expect(workerHealthSchema.safeParse({ ...health, intervalMinutes }).success).toBe(true);
    }
  });
});
