import { connection } from "next/server";
import { notFound } from "next/navigation";
import { readDashboardPageData } from "@/lib/server/page-data";
import { isAreaCode } from "@/lib/domain/catalog";
import { parseDashboardState, toSearchParams, type SearchInput } from "@/lib/url-state/dashboard";
import { Dashboard } from "./dashboard";
import type { DashboardView } from "./dashboard-views";

export async function DashboardPage({ searchParams, areaCode, view = "overview" }: { searchParams: Promise<SearchInput>; areaCode?: string; view?: DashboardView }) {
  await connection();
  if (areaCode && !isAreaCode(areaCode)) notFound();
  const params = toSearchParams(await searchParams);
  if (areaCode) params.set("area", areaCode);
  const { state } = parseDashboardState(params);
  const data = await readDashboardPageData(state, areaCode || view === "overview" ? undefined : []);
  return <Dashboard initialState={state} fixedArea={areaCode} view={areaCode ? "detail" : view} {...data} />;
}
