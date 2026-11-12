import "server-only";
import type { DashboardState } from "../url-state/dashboard.ts";
import { createReadRepository } from "./repositories/read.ts";

export async function readDashboardPageData(state: DashboardState, historyPlaces = state.area ? [state.area] : []) {
  const now = Date.now();
  try {
    const repository = createReadRepository(state.dataset, now);
    const [initialOverview, initialHistory] = await Promise.all([
      repository.getOverview(), historyPlaces.length ? repository.getHistory(historyPlaces) : undefined,
    ]);
    return { initialNow: now, initialOverview, initialHistory };
  } catch {
    // 브라우저가 같은 공개 조회로 loading/error 상태를 처리한다. 실데이터를 demo로 대체하지 않는다.
    return { initialNow: now };
  }
}
