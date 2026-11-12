import "server-only";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";
import { snapshotPath, snapshotSchema, SnapshotError, SNAPSHOT_MAX_BYTES, type LocalSnapshot } from "./contracts.ts";
import { collectorPath, ledgerSchema, type CollectionLedger } from "./scheduler-state.ts";

export async function withSnapshotLock<T>(capture: () => Promise<T>): Promise<T> {
  return withPrivateLock(snapshotPath() + ".lock", capture);
}

/** 종료된 프로세스의 잠금만 회수한다. 살아 있거나 판별할 수 없으면 닫힌 상태로 유지한다. */
export async function withPrivateLock<T>(lockPath: string, action: () => Promise<T>): Promise<T> {
  await mkdir(dirname(lockPath), { recursive: true, mode: 0o700 });
  const acquire = () => open(lockPath, "wx", 0o600);
  let lock;
  try { lock = await acquire(); }
  catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === "EEXIST")) throw new SnapshotError("SNAPSHOT_IO");
    const recoveryPath = lockPath + ".recovery";
    const recovery = await open(recoveryPath, "wx", 0o600).catch(() => { throw new SnapshotError("SNAPSHOT_LOCKED"); });
    try {
      let stale = false;
      try {
        const owner = JSON.parse(await readFile(lockPath, "utf8"));
        if (Number.isSafeInteger(owner.pid) && owner.pid > 0) {
          try { process.kill(owner.pid, 0); }
          catch (failure) { stale = Boolean(failure && typeof failure === "object" && "code" in failure && failure.code === "ESRCH"); }
        }
      } catch { /* 소유자를 확인하지 못한 잠금은 삭제하지 않는다. */ }
      if (!stale) throw new SnapshotError("SNAPSHOT_LOCKED");
      await rm(lockPath);
      lock = await acquire().catch(() => { throw new SnapshotError("SNAPSHOT_LOCKED"); });
    } finally { await recovery.close(); await rm(recoveryPath, { force: true }); }
  }
  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid }));
    return await action();
  } finally { await lock.close(); await rm(lockPath, { force: true }); }
}

/** 경로는 서버 내부에서만 정한다. 원자적 교체와 비공개 파일 권한을 공유한다. */
export async function writePrivateJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = path + "." + randomUUID() + ".tmp";
  try {
    const file = await open(temporary, "wx", 0o600);
    try { await file.writeFile(JSON.stringify(value)); await file.sync(); }
    finally { await file.close(); }
    await rename(temporary, path);
  } catch { throw new SnapshotError("SNAPSHOT_IO"); }
  finally { await rm(temporary, { force: true }); }
}

/** 원천 응답 전체나 인증 URL 없이 검증된 표시 항목만 원자적으로 저장한다. */
export async function writeLocalSnapshot(snapshot: LocalSnapshot) {
  const result = snapshotSchema.safeParse(snapshot);
  if (!result.success || Buffer.byteLength(JSON.stringify(result.data)) > SNAPSHOT_MAX_BYTES) throw new SnapshotError("SNAPSHOT_INVALID");
  await writePrivateJson(snapshotPath(), result.data);
}

/** 호출자는 수집본 잠금을 소유해야 한다. 요청 전에 예약하고 실패해도 차감은 유지한다. */
export async function saveCollectionLedger(ledger: CollectionLedger) {
  await writePrivateJson(collectorPath("state.json"), ledgerSchema.parse(ledger));
}
