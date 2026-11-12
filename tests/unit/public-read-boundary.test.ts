import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const fakeCollect = vi.hoisted(() => vi.fn());
vi.mock("../../src/lib/server/collector/service.ts", () => ({ collectOnce: fakeCollect }));
import { POST } from "../../src/app/api/internal/collect/route.ts";
import { readPublicRequest } from "../../src/lib/server/public-response.ts";

function dependencies(path: string, found = new Set<string>()) {
  const full = resolve(path); if (found.has(full)) return found; found.add(full);
  const source = readFileSync(full, "utf8");
  for (const match of source.matchAll(/import\s+(?!type\b)(?:[^;]*?\s+from\s+)?["']([^"']+)["']/g)) {
    const name = match[1];
    if (!name.startsWith(".") && !name.startsWith("@/")) continue;
    const base = name.startsWith("@/") ? resolve("src", name.slice(2)) : resolve(dirname(full),name);
    const file = [base,base+".ts",base+".tsx"].find(existsSync);
    if (file && /\.tsx?$/.test(file)) dependencies(file,found);
  }
  return found;
}
describe("공개 조회와 관리자 수집의 경계: 실행 대기", () => {
  it("공개 API는 합성 데이터와 시연 상태를 제공하지 않는다", async () => {
    const demo = await readPublicRequest(new Request("https://synthetic.invalid/api/v1/demo/overview"), "demo");
    expect(demo.response?.status).toBe(404);
    const scenario = await readPublicRequest(new Request("https://synthetic.invalid/api/v1/live/overview?scenario=error"), "live");
    expect(scenario.response?.status).toBe(400);
    const live = await readPublicRequest(new Request("https://synthetic.invalid/api/v1/live/overview"), "live");
    expect(live).toMatchObject({ dataset: "live", scenario: "normal" });
  });
  it("공개 route와 서버 화면의 런타임 의존성에 관리자/수집/원천 client가 없다", () => {
    for (const path of ["src/app/api/v1/[dataset]/overview/route.ts","src/app/api/v1/[dataset]/history/route.ts",
      "src/app/api/v1/[dataset]/status/route.ts","src/features/dashboard/dashboard-page.tsx"]) {
      const graph = [...dependencies(path)];
      expect(graph.some((file) => /server\/(collector|seoul)\//.test(file) || file.endsWith("database/admin-client.ts"))).toBe(false);
    }
  });
  it("인증되지 않은 내부 요청은 배치/DB/원천 작업을 시작하지 않는다", async () => {
    const response = await POST(new Request("https://synthetic.invalid/api/internal/collect",{method:"POST"}));
    expect(response.status).toBe(401); expect(fakeCollect).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ error: { code: "UNAUTHORIZED_COLLECTOR" } });
  });
});
