import { DashboardPage } from "@/features/dashboard/dashboard-page";
import type { SearchInput } from "@/lib/url-state/dashboard";

export default async function AreaPage({ params, searchParams }: { params: Promise<{ areaCode: string }>; searchParams: Promise<SearchInput> }) {
  return <DashboardPage searchParams={searchParams} areaCode={(await params).areaCode} />;
}
