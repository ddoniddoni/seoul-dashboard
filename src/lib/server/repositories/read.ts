import "server-only";
import type { Dataset } from "../../contracts/dashboard.ts";
import { LiveRepository } from "./live.ts";
import { LocalSnapshotRepository } from "./local-snapshot.ts";
import { readLiveDataBackend } from "../env.ts";

/** 이 factory에는 수집/관리 client 의존성이 없다. */
export function createReadRepository(dataset: Dataset, now: number) {
  if (dataset !== "live") throw new Error("공개 조회는 실데이터만 지원합니다.");
  return readLiveDataBackend() === "local-snapshot" ? new LocalSnapshotRepository(() => now) : new LiveRepository(undefined, () => now);
}
