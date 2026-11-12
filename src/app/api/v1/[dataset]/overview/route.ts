import { handlePublicRead } from "@/lib/server/public-response";
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  return handlePublicRead(request, (await params).dataset, "overview");
}
