import "server-only";
import { readFile, stat } from "node:fs/promises";
import { snapshotPath, snapshotSchema, SnapshotError, SNAPSHOT_MAX_BYTES, type LocalSnapshot } from "./contracts.ts";

/** 읽기 전용. 이 경로는 서울시 API나 수집 모듈을 가져오지 않는다. */
export async function readLocalSnapshot(): Promise<LocalSnapshot | null> {
  const path = snapshotPath();
  try {
    if ((await stat(path)).size > SNAPSHOT_MAX_BYTES) throw new SnapshotError("SNAPSHOT_INVALID");
    const parsed = snapshotSchema.safeParse(JSON.parse(await readFile(path, "utf8")));
    if (!parsed.success) throw new SnapshotError("SNAPSHOT_INVALID");
    return parsed.data;
  } catch (error) {
    if (error instanceof SnapshotError) throw error;
    if (error !== null && typeof error === "object" && "code" in error && error.code === "ENOENT") return null;
    throw new SnapshotError("SNAPSHOT_IO");
  }
}
