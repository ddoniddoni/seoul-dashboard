import "server-only";
import { z } from "zod";

type Environment = Record<string, string | undefined>;

const booleanSetting = z.enum(["true", "false"]).default("false")
  .transform((value) => value === "true");

const appSchema = z.object({
  DATA_MODE: z.enum(["demo", "live"]).default("live"),
});
const liveBackendSchema = z.object({ LIVE_DATA_BACKEND: z.enum(["supabase", "local-snapshot"]).default("supabase") });

const safetySchema = z.object({
  COLLECTOR_ENABLED: booleanSetting,
  SEOUL_ALLOW_INSECURE_HTTP: booleanSetting,
});

function parseSettings<T extends z.ZodType>(schema: T, source: Environment): z.output<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    // Zod 원본 오류나 입력값을 출력하지 않는다. 키/URL이 오류에 섞일 수 있다.
    const fields = [...new Set(result.error.issues.map((issue) => issue.path.join(".")))];
    throw new Error(`환경변수 형식을 확인하세요: ${fields.join(", ")}`);
  }
  return result.data;
}

export function readAppEnvironment(source: Environment = process.env) {
  parseSettings(appSchema, source);
  // 과거 DATA_MODE=demo 설정을 읽어도 공개 서비스는 실데이터만 사용한다.
  return { dataMode: "live" as const };
}

export function readLiveDataBackend(source: Environment = process.env) {
  return parseSettings(liveBackendSchema, source).LIVE_DATA_BACKEND;
}

/** 비밀값 대신 설정 여부만 반환하는 로컬 점검용 정보다. 외부 요청은 없다. */
export function readEnvironmentStatus(source: Environment = process.env) {
  const app = readAppEnvironment(source);
  const safety = parseSettings(safetySchema, source);
  const present = (...names: string[]) => names.some((name) => Boolean(source[name]?.trim()));

  return {
    dataMode: app.dataMode,
    liveDataBackend: readLiveDataBackend(source),
    collectorRequested: safety.COLLECTOR_ENABLED,
    insecureHttpRequested: safety.SEOUL_ALLOW_INSECURE_HTTP,
    configured: {
      SEOUL_API_KEY: present("SEOUL_API_KEY"),
      SEOUL_API_BASE_URL: present("SEOUL_API_BASE_URL"),
      SEOUL_SOURCE_TIME_ZONE: present("SEOUL_SOURCE_TIME_ZONE"),
      SUPABASE_URL: present("SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL"),
      SUPABASE_PUBLISHABLE_KEY: present("SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
      SUPABASE_SECRET_KEY: present("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
      COLLECTOR_SECRET: present("COLLECTOR_SECRET"),
    },
    // 설정 존재 여부는 연결 성공이나 운영 활성화의 근거가 아니다.
    collectorImplemented: true,
    liveRepositoryImplemented: true,
    seoulAdapterImplemented: true,
    seoulApiVerified: false,
  };
}
