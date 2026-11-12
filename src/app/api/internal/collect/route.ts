import { authenticateCollector } from "@/lib/server/collector/auth";
import { collectOnce } from "@/lib/server/collector/service";
import { CollectorConfigurationError } from "@/lib/server/collector/config";
import { apiError } from "@/lib/server/http";
import { isEmptyCollectorRequest } from "@/lib/server/collector/request";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!authenticateCollector(request)) return apiError("UNAUTHORIZED_COLLECTOR", "수집 인증을 확인하세요.", 401);
  if (!await isEmptyCollectorRequest(request)) return apiError("INVALID_QUERY", "수집 요청에는 조회 조건을 지정할 수 없습니다.", 400);
  try {
    const result = await collectOnce(process.env, request.signal);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof CollectorConfigurationError) return apiError(error.code, error.message, 503);
    return apiError("COLLECTOR_UNAVAILABLE", "수집을 처리하지 못했습니다. 서버 설정과 DB 연결을 확인하세요.", 503, true);
  }
}
