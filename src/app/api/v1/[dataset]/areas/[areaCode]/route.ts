import { handlePublicRead } from "@/lib/server/public-response";
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string; areaCode: string }> }) {
  const { dataset, areaCode } = await params;
  return handlePublicRead(request, dataset, "area", areaCode);
}
