import "server-only";

export class DatabaseError extends Error {
  readonly code: "DB_CONFIGURATION" | "DB_UNAVAILABLE" | "DB_CONTRACT" | "LEASE_LOST" | "DEADLINE";
  constructor(code: DatabaseError["code"] = "DB_UNAVAILABLE") {
    super(code === "DB_CONFIGURATION" ? "실데이터 서버 설정을 확인하세요." : "저장된 자료를 처리하지 못했습니다.");
    this.name = "DatabaseError"; this.code = code;
  }
}
