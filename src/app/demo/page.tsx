import { redirect } from "next/navigation";
import { dashboardHref, parseDashboardState, toSearchParams, type SearchInput } from "@/lib/url-state/dashboard";

export default async function DemoPage({ searchParams }: { searchParams: Promise<SearchInput> }) {
  const { state } = parseDashboardState(toSearchParams(await searchParams));
  redirect(dashboardHref(state));
}
