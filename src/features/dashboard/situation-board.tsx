"use client";

import dynamic from "next/dynamic";
import type { UseQueryResult } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Skeleton from "@mui/material/Skeleton";
import Alert from "@mui/material/Alert";
import { CongestionBadge, FreshnessBadge, StateNotice } from "@/components/data-status";
import { PanelHeading } from "@/components/panel-heading";
import { Icon } from "@/components/icon";
import type { History, Overview } from "@/lib/contracts/dashboard";
import { monitoredAreaCatalog } from "@/lib/domain/catalog";
import { formatDateTime, formatRange, getFreshness } from "@/lib/domain/metrics";
import { getReadNotice } from "@/lib/domain/read-status";
import type { DashboardState } from "@/lib/url-state/dashboard";
import { dashboardPanel, numericText, pulseColors, wallboardAnalysis, wallboardLayout } from "@/theme/tokens";
import { BoardPlaces } from "./board-places";
import { ObservationSummary } from "./observation-summary";
import { MapBoundary, SeoulOverviewMap } from "./seoul-overview-map";
import { OverviewRankings } from "./overview-rankings";

const HistoryChart = dynamic(() => import("./history-chart"), { ssr: false,
  loading: () => <Skeleton variant="rounded" sx={{ m: 2, flex: 1, minHeight: 120 }} /> });
type ReadState<T> = Pick<UseQueryResult<T>, "data" | "isPending" | "isError" | "refetch">;
const catalog = monitoredAreaCatalog.toSorted((a, b) => a.areaName.localeCompare(b.areaName, "ko"));

export function SituationBoard({ state, now, overview, history, online, auto, issues, onSelect, onStatus }: {
  state: DashboardState; now: number; overview: ReadState<Overview>; history: ReadState<History>;
  online: boolean; auto: boolean; issues: string[]; onSelect: (code: string | null) => void; onStatus: () => void;
}) {
  const items = overview.data?.data.items ?? [];
  const selected = items.find((area) => area.areaCode === state.area);
  const selectedCode = catalog.some((area) => area.areaCode === state.area) ? state.area! : "";
  const collection = overview.data?.meta.collection;
  const collecting = collection?.status === "collecting" || collection?.status === "waiting";
  const collectionLabel = collecting ? `${collection.intervalMinutes}분 수집 중`
    : collection?.status === "paused" ? "수집 일시 중지" : collection?.status === "stopped" ? "수집 중지"
      : "수집 상태 미확인";
  const notice = getReadNotice(online, overview.isError, Boolean(overview.data)) || issues.join(" ");
  const freshness = selected?.population.value ? getFreshness(selected.population.observedAt, now) : "missing";
  return <Box data-situation-board sx={wallboardLayout}>
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 2, flexWrap: "wrap" }}>
        <Typography component="h1" sx={{ color: pulseColors.heading, fontSize: 24, fontWeight: 500, lineHeight: 1.3 }}>서울 주요 장소 현황</Typography>
        <Typography variant="caption" color={collecting ? "textSecondary" : "warning"}>{collectionLabel} / {!online ? "화면 오프라인" : auto ? "화면 1분 확인" : "화면 자동 확인 중지"}</Typography>
      </Stack>
      <Button color="inherit" onClick={onStatus} startIcon={<Icon name="clock" />} sx={{ ...numericText, color: "text.secondary", fontSize: 14, minHeight: 32, py: 0.5 }} aria-label="자료 시각과 수집 상태 확인">{formatDateTime(new Date(now).toISOString())} KST</Button>
      {notice ? <Alert severity="warning" sx={{ width: "100%", py: 0 }}>{notice}</Alert> : null}
    </Stack>

    {overview.isPending ? <>
      <Skeleton variant="rounded" height={96} />
      <Box role="status" aria-label="현황 불러오는 중" sx={wallboardAnalysis}>{[0, 1].map((key) => <Skeleton key={key} variant="rounded" sx={{ minHeight: 240 }} />)}</Box>
      <Skeleton variant="rounded" height={240} />
    </> : overview.isError && !overview.data ? <StateNotice error title="현황을 조회하지 못했습니다" description="저장된 실데이터 연결을 확인한 뒤 다시 조회해 주세요."><Button variant="outlined" onClick={() => { void overview.refetch(); }}>다시 조회</Button></StateNotice> : <>
      <ObservationSummary items={items} now={now} monitored={monitoredAreaCatalog.length} onStatus={onStatus} />
      <Box sx={wallboardAnalysis}>
        <MapBoundary><SeoulOverviewMap items={items} state={state} now={now} presentation="board" /></MapBoundary>
        {selectedCode ? <Paper component="section" aria-labelledby="board-history-heading" sx={{ ...dashboardPanel, minHeight: 0 }}>
          <PanelHeading id="board-history-heading" title="최근 24시간 인구 흐름" density="compact" action={<Button size="small" aria-label="전체 장소 현황으로 돌아가기" onClick={() => onSelect(null)} startIcon={<Icon name="overview" />} sx={{ minHeight: 28, py: 0, fontSize: 12 }}>전체 현황</Button>} />
          <Box sx={{ px: 2, pt: 0.5, flexShrink: 0 }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <TextField select label="살펴볼 장소" value={selectedCode} onChange={(event) => onSelect(event.target.value || null)} sx={{ minWidth: 0, width: { xs: "52%", lg: 208 }, "& .MuiSelect-select": { color: pulseColors.heading } }}>
                <MenuItem value="">전체 현황</MenuItem>
                {catalog.map((area) => <MenuItem key={area.areaCode} value={area.areaCode}>{area.areaName}</MenuItem>)}
              </TextField>
              <Typography aria-label={"추정 인구 범위 " + formatRange(selected?.population.value ?? null)} sx={{ ...numericText, fontSize: { xs: 20, xl: 28 }, whiteSpace: "nowrap" }}>{formatRange(selected?.population.value ?? null)}<Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>{selected?.population.value ? "명" : ""}</Typography></Typography>
            </Stack>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}><CongestionBadge level={selected?.population.value?.congestion ?? "unknown"} /><Typography variant="caption" color="textSecondary">원천 {formatDateTime(selected?.population.observedAt ?? null)}</Typography></Stack>
              <FreshnessBadge freshness={freshness} />
            </Stack>
          </Box>
          {history.isPending ? <Skeleton variant="rounded" sx={{ m: 2, flex: 1, minHeight: 120 }} />
              : history.isError && !history.data ? <StateNotice compact error title="기록 조회 실패" description="현재 장소 현황은 아래 목록에서 확인할 수 있습니다."><Button onClick={() => { void history.refetch(); }}>기록 다시 조회</Button></StateNotice>
                : history.data ? <>{history.isError ? <Typography role="status" variant="caption" color="warning" sx={{ px: 2 }}>기록 재조회 실패 / 마지막 조회 기록</Typography> : null}<HistoryChart history={history.data} presentation="board" /></> : null}
        </Paper> : <OverviewRankings items={items} state={state} now={now} monitored={monitoredAreaCatalog.length} />}
      </Box>

      <BoardPlaces items={items} state={state} now={now} onStatus={onStatus} />
    </>}
  </Box>;
}
