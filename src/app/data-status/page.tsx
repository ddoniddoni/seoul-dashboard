import { DashboardPage } from "@/features/dashboard/dashboard-page";
import type { SearchInput } from "@/lib/url-state/dashboard";

export default async function Page({ searchParams }: { searchParams: Promise<SearchInput> }) {
  return <DashboardPage searchParams={searchParams} view="status" />;
}
