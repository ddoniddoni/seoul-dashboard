import { connection } from "next/server";
import { DataInfo } from "@/features/data-info/data-info";
import { parseDashboardState, toSearchParams, type SearchInput } from "@/lib/url-state/dashboard";

export default async function DataInfoPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  await connection();
  const { state } = parseDashboardState(toSearchParams(await searchParams));
  return <DataInfo state={state} />;
}
