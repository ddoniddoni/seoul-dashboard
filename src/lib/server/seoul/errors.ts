import "server-only";

const messages = {
  CONFIGURATION: "서울시 API 서버 설정을 확인하세요.",
  INSECURE_TRANSPORT: "HTTP 원천 전송은 별도 허용이 필요합니다.",
  TIME_ZONE_UNCONFIRMED: "원천 시각을 해석할 시간대를 명시해야 합니다.",
  UNKNOWN_AREA: "등록된 장소 코드만 조회할 수 있습니다.",
  TIMEOUT: "서울시 API 응답 대기시간을 초과했습니다.",
  ABORTED: "서울시 API 조회가 취소됐습니다.",
  NETWORK: "서울시 API에 연결하지 못했습니다.",
  REDIRECT: "서울시 API의 다른 주소 이동을 거부했습니다.",
  HTTP_ERROR: "서울시 API가 HTTP 오류를 반환했습니다.",
  RATE_LIMITED: "서울시 API 요청 제한에 도달했습니다.",
  RESPONSE_TOO_LARGE: "서울시 API 응답 크기가 제한을 초과했습니다.",
  RESPONSE_FORMAT: "서울시 API 응답 형식을 확인할 수 없습니다.",
  UNSAFE_XML: "허용되지 않는 XML 선언 또는 깊이입니다.",
  INVALID_XML: "서울시 API XML을 읽을 수 없습니다.",
  INVALID_ENVELOPE: "서울시 API 응답 구조가 확인된 계약과 다릅니다.",
  SOURCE_REJECTED: "서울시 API가 성공 이외의 결과를 반환했습니다.",
  SOURCE_AUTHENTICATION: "서울시 API 인증 설정을 확인하세요.",
  SOURCE_NO_DATA: "서울시 API가 자료 없음 결과를 반환했습니다.",
  AREA_MISMATCH: "서울시 API 응답의 장소가 요청한 장소와 다릅니다.",
} as const;

export type SeoulErrorCode = keyof typeof messages;

/** 원본 예외, URL, 응답 메시지와 cause는 보관하거나 출력하지 않는다. */
export class SeoulApiError extends Error {
  readonly code: SeoulErrorCode;
  readonly retryable: boolean;
  readonly upstreamCode: string | null;
  readonly retryAfterMs: number | null;

  constructor(code: SeoulErrorCode, retryable = false, upstreamCode: string | null = null, retryAfterMs: number | null = null) {
    super(messages[code]);
    this.name = "SeoulApiError";
    this.code = code;
    this.retryable = retryable;
    this.upstreamCode = upstreamCode && /^(INFO|ERROR)-\d{3}$/.test(upstreamCode) ? upstreamCode : null;
    this.retryAfterMs = retryAfterMs !== null && Number.isFinite(retryAfterMs) && retryAfterMs >= 0 ? Math.min(retryAfterMs, 86_400_000) : null;
  }
}

export function safeSeoulError(error: unknown) {
  const safe = error instanceof SeoulApiError ? error : new SeoulApiError("NETWORK", true);
  return { code: safe.code, message: safe.message, retryable: safe.retryable, upstreamCode: safe.upstreamCode };
}
