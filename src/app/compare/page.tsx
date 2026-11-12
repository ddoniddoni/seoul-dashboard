import { connection } from "next/server";
import { readDashboardPageData } from "@/lib/server/page-data";
import { parseDashboardState, toSearchParams, type SearchInput } from "@/lib/url-state/dashboard";
import { ComparePage } from "@/features/compare/compare-page";

export default async function ComparisonPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  await connection();
  const { state } = parseDashboardState(toSearchParams(await searchParams));
  const data = await readDashboardPageData(state, state.places.length >= 2 ? [...state.places].sort() : []);
  return <ComparePage initialState={state} {...data} />;
}
