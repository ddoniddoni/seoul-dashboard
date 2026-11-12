import { queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { historySchema, overviewSchema, type Dataset, type DemoScenario } from "../contracts/dashboard";

async function readData<T>(url: string, schema: z.ZodType<T>, signal: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(response.status === 503 ? "현재 데이터를 조회할 수 없습니다." : "데이터를 불러오지 못했습니다.");
  const result = schema.safeParse(await response.json());
  if (!result.success) throw new Error("데이터 형식을 확인하지 못했습니다.");
  return result.data;
}

export function overviewOptions(dataset: Dataset, scenario: DemoScenario) {
  return queryOptions({
    queryKey: ["overview", dataset, dataset === "demo" ? scenario : "normal"] as const,
    queryFn: ({ signal }) => readData(`/api/v1/${dataset}/overview?scenario=${dataset === "demo" ? scenario : "normal"}`, overviewSchema, signal),
    staleTime: 30_000, retry: false, refetchIntervalInBackground: false,
  });
}

export function historyOptions(dataset: Dataset, scenario: DemoScenario, areaCode: string | null) {
  return queryOptions({
    queryKey: ["history", dataset, dataset === "demo" ? scenario : "normal", areaCode, "24h", dataset === "demo" ? 10 : 5] as const,
    queryFn: ({ signal }) => readData(`/api/v1/${dataset}/history?places=${encodeURIComponent(areaCode ?? "")}&range=24h&scenario=${dataset === "demo" ? scenario : "normal"}`, historySchema, signal),
    enabled: Boolean(areaCode), staleTime: 60_000, retry: false, refetchIntervalInBackground: false,
  });
}

/** 비교 순서가 달라도 같은 장소 조합은 같은 요청과 캐시를 사용한다. */
export function comparisonHistoryOptions(dataset: Dataset, scenario: DemoScenario, places: string[]) {
  const codes = [...new Set(places)].sort();
  return queryOptions({
    queryKey: ["history", dataset, dataset === "demo" ? scenario : "normal", codes, "24h", dataset === "demo" ? 10 : 5] as const,
    queryFn: ({ signal }) => readData(`/api/v1/${dataset}/history?places=${encodeURIComponent(codes.join(","))}&range=24h&scenario=${dataset === "demo" ? scenario : "normal"}`, historySchema, signal),
    enabled: codes.length >= 2 && codes.length <= 3,
    staleTime: 60_000, retry: false, refetchIntervalInBackground: false,
  });
}
