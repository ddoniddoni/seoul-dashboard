"use client";

import { useState } from "react";
import NextLink from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Alert from "@mui/material/Alert";
import MuiLink from "@mui/material/Link";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import { AppShell } from "@/components/app-shell";
import { PanelHeading } from "@/components/panel-heading";
import { DashboardSkeleton, StateNotice } from "@/components/data-status";
import { Icon } from "@/components/icon";
import { dashboardLayout, dashboardPanel, detailAnalysisLayout, explorationLayout } from "@/theme/tokens";
import type { History, Overview } from "@/lib/contracts/dashboard";
import { monitoredAreaCatalog as areaCatalog } from "@/lib/domain/catalog";
import { congestionOrder, formatDateTime, formatTime } from "@/lib/domain/metrics";
import { useLiveRefresh } from "@/lib/query/use-live-refresh";
import { getCollectionNotice, getReadNotice } from "@/lib/domain/read-status";
import { historyOptions, overviewOptions } from "@/lib/query/dashboard";
import { dashboardHref, parseDashboardState, type DashboardState } from "@/lib/url-state/dashboard";
import { MapBoundary, SeoulOverviewMap } from "./seoul-overview-map";
import { DashboardDialog } from "./dashboard-dialog";
import { DataStatusDetails, MetricCards, SelectedAreaDetails, SelectedAreaSummary } from "./dashboard-panels";
import { ComparisonTray } from "@/features/compare/comparison-tray";
import { PlacesPanel } from "./places-panel";
import { SituationBoard } from "./situation-board";
import { dashboardViews, type DashboardView } from "./dashboard-views";

function ChartLoading({ text = "범위 차트를 준비하고 있습니다." }: { text?: string }) {
  return <Stack role="status" spacing={2} sx={{ alignItems: "center", justifyContent: "center", flex: 1, minHeight: 140 }}><CircularProgress size={24} /><Typography variant="body2" color="textSecondary">{text}</Typography></Stack>;
}
const CongestionChart = dynamic(() => import("./congestion-chart"), { ssr: false, loading: () => <ChartLoading text="혼잡 분포를 준비하고 있습니다." /> });
const HistoryChart = dynamic(() => import("./history-chart"), { ssr: false, loading: () => <ChartLoading /> });
export function Dashboard({ initialState, initialNow, initialOverview, initialHistory, fixedArea, view = "overview" }: {
  initialState: DashboardState; initialNow: number; initialOverview?: Overview; initialHistory?: History; fixedArea?: string; view?: DashboardView;
}) {
  const search = useSearchParams();
  const params = new URLSearchParams(search.toString());
  if (fixedArea) params.set("area", fixedArea);
  const { state, issues } = parseDashboardState(params);
  const router = useRouter();
  const showHistory = view === "overview" || view === "detail";
  const pathname = fixedArea ? "/areas/" + fixedArea : dashboardViews[view].path;
  const [statusOpen, setStatusOpen] = useState(false);
  const { now, auto, setAuto, online, refetchInterval } = useLiveRefresh(initialNow);
  const matchingInitial = state.dataset === initialState.dataset && state.scenario === initialState.scenario;
  const overview = useQuery({ ...overviewOptions(state.dataset, state.scenario),
    enabled: true, refetchInterval,
    initialData: matchingInitial ? initialOverview : undefined,
    initialDataUpdatedAt: initialOverview ? Date.parse(initialOverview.meta.generatedAt) : undefined,
  });
  const history = useQuery({ ...historyOptions(state.dataset, state.scenario, state.area),
    enabled: showHistory && Boolean(state.area), refetchInterval: showHistory && state.area ? refetchInterval : false,
    initialData: matchingInitial && initialHistory?.data.series[0]?.areaCode === state.area ? initialHistory : undefined,
    initialDataUpdatedAt: initialHistory ? Date.parse(initialHistory.meta.generatedAt) : undefined,
  });
  const items = overview.data?.data.items ?? [];
  const filtered = items.filter((item) => item.areaName.includes(state.q.trim()) && (!state.levels.length || state.levels.includes(item.population.value?.congestion ?? "unknown")))
    .toSorted((a, b) => {
      const names = a.areaName.localeCompare(b.areaName, "ko");
      if (state.sort === "name") return names;
      if (state.sort === "population") return (b.population.value?.midpoint ?? -1) - (a.population.value?.midpoint ?? -1) || names;
      if (state.sort === "sourceTime") return (b.population.observedAt ? Date.parse(b.population.observedAt) : 0) - (a.population.observedAt ? Date.parse(a.population.observedAt) : 0) || names;
      return congestionOrder[b.population.value?.congestion ?? "unknown"] - congestionOrder[a.population.value?.congestion ?? "unknown"] || names;
    });
  const selected = items.find((item) => item.areaCode === state.area);
  function navigate(changes: Partial<DashboardState>, replace = false) {
    const href = dashboardHref(state, changes, pathname);
    if (replace) router.replace(href, { scroll: false }); else router.push(href, { scroll: false });
  }

  const fetching = overview.isFetching || history.isFetching;
  const actions = <><Button variant="text" color="inherit" aria-pressed={auto} disabled={!online} onClick={() => setAuto((value) => !value)} startIcon={<Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: auto && online ? "success.main" : "text.secondary" }} />}>{!online ? "오프라인" : auto ? "자동 확인" : "자동 확인 중지"}</Button><Button variant="outlined" disabled={fetching || !online} onClick={() => { void overview.refetch(); if (showHistory && state.area) void history.refetch(); }} startIcon={fetching ? <CircularProgress size={16} /> : <Icon name="refresh" />}>{fetching ? "확인 중" : "다시 조회"}</Button></>;


  const monitored = overview.data?.meta.coverage.monitored ?? areaCatalog.length;
  const outsideFilter = Boolean(selected && !filtered.some((item) => item.areaCode === selected.areaCode));
  const collection = overview.data?.meta.collection;
  const collectionNotice = getCollectionNotice(collection);
  return <AppShell state={state} active={view} actions={actions} layout={view === "overview" ? "wallboard" : view === "detail" ? "detail" : view === "places" ? "places" : "dashboard"}>
    {view === "overview" ? <SituationBoard state={state} now={now} overview={overview} history={history} online={online} auto={auto} issues={issues}
      onSelect={(area) => navigate({ area })} onStatus={() => setStatusOpen(true)} /> : <>
    {view === "detail" ? <Stack direction={{ xs: "column", md: "row" }} sx={{ alignItems: { md: "center" }, justifyContent: "space-between", gap: 1.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="h1" component="h1">{areaCatalog.find((area) => area.areaCode === state.area)?.areaName ?? "장소 상세"}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>{dashboardViews[view].description}</Typography>
      </Box>
      <Stack direction="row" sx={{ alignItems: "center", gap: 1, flexShrink: 0 }}>
          <Autocomplete options={areaCatalog}
            value={areaCatalog.find((area) => area.areaCode === state.area) ?? null}
            getOptionLabel={(area) => area.areaName} isOptionEqualToValue={(a, b) => a.areaCode === b.areaCode}
            onChange={(_, area) => {
              if (fixedArea) router.push(dashboardHref(state, { area: area?.areaCode ?? null }, area ? "/areas/" + area.areaCode : "/places"));
              else navigate({ area: area?.areaCode ?? null });
            }}
            noOptionsText="검색한 장소가 없습니다" openText="장소 목록 열기" closeText="장소 목록 닫기" clearText="장소 선택 해제"
            renderInput={(params) => <TextField {...params} label="살펴볼 장소" placeholder="장소명으로 검색" />}
            sx={{ flex: { xs: 1, md: "initial" }, minWidth: 0, width: { md: 240 } }} />
          <Button size="small" color="inherit" sx={{ minHeight: { xs: 44, sm: 36 } }} onClick={() => setStatusOpen(true)} startIcon={<Icon name="clock" sx={{ fontSize: 16 }} />}>자료 상태</Button>
          <Button component={NextLink} href={dashboardHref(state, {}, "/places")} endIcon={<Icon name="arrow" />} sx={{ flexShrink: 0, minHeight: 44 }} nativeButton={false}>전체 장소</Button>
      </Stack>
    </Stack> : <Box>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap" }}>
        <Typography variant="h1" component="h1">{dashboardViews[view].title}</Typography>
        <Stack direction="row" spacing={0.5}>
          <Button size="small" color="inherit" sx={{ minHeight: { xs: 44, sm: 36 } }} onClick={() => setStatusOpen(true)} startIcon={<Icon name="clock" sx={{ fontSize: 16 }} />}>자료 상태</Button>
        </Stack>
      </Stack>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>{dashboardViews[view].description}</Typography>
    </Box>}
    {issues.length ? <Alert severity="warning" role="status">{issues.map((issue) => <Typography variant="caption" key={issue} sx={{ display: "block" }}>{issue}</Typography>)}</Alert> : null}
    {state.range === "7d" ? <Alert severity="warning">7일 조회는 준비 중입니다. 최근 24시간 {state.dataset === "demo" ? "시연 기록" : "수집 기록"}을 표시합니다. <MuiLink component={NextLink} href={dashboardHref(state, { range: "24h" }, pathname)} scroll={false}>24시간 조건으로 변경</MuiLink></Alert> : null}
    {!online ? <Alert severity="warning" role="status">{getReadNotice(false, overview.isError, Boolean(overview.data))}</Alert> : null}
    {overview.isPending ? view === "detail" ? <Box role="status" aria-label="장소 상세 불러오는 중" sx={detailAnalysisLayout}>
      {[0, 1].map((key) => <Skeleton key={key} variant="rounded" sx={{ height: "100%", minHeight: 240 }} />)}
    </Box> : <DashboardSkeleton /> : overview.isError && !overview.data ?
      <StateNotice error title="실데이터를 조회하지 못했습니다"
        description="저장된 자료를 조회하지 못했습니다. 잠시 뒤 다시 조회하세요.">
        <Button variant="outlined" onClick={() => { void overview.refetch(); }}>다시 조회</Button>
      </StateNotice> : <>
      {overview.isError ? <Alert severity="warning" role="status">다시 조회하지 못했습니다. 마지막 정상 자료와 그 기준 시각을 유지합니다.</Alert> : null}
      {view === "status" ? <MetricCards dataset={state.dataset} items={items} now={now} monitored={monitored} kind={view === "status" ? "freshness" : "congestion"} /> : null}
      {showHistory ? <>
      <Box sx={view === "detail" ? detailAnalysisLayout : dashboardLayout}>
        <Paper component="section" aria-labelledby="history-heading" sx={dashboardPanel}>
          <PanelHeading id="history-heading" title="시간대별 추정 인구" density={view === "detail" ? "compact" : "standard"} action={<Typography variant="caption" color="textSecondary">최근 24시간 / 한국 시간</Typography>} />
          <SelectedAreaSummary area={selected} state={state} now={now} outsideFilter={outsideFilter} standalone={view === "detail"} />
            {!state.area ? <StateNotice compact title="장소를 선택해 흐름을 확인하세요" description="기록의 기준 시각과 추정 범위를 함께 표시합니다." /> : history.isPending ? <ChartLoading text="기록을 불러오고 있습니다." /> : history.isError && !history.data ?
              <StateNotice compact error title="기록을 불러오지 못했습니다" description="장소 목록은 계속 탐색할 수 있습니다."><Button variant="outlined" onClick={() => { void history.refetch(); }}>기록 다시 조회</Button></StateNotice> : history.data ? <>
                {history.isError ? <Alert severity="warning">기록 재조회 실패. 마지막 정상 기록을 표시합니다.</Alert> : null}<HistoryChart history={history.data} presentation={view === "detail" ? "detail" : "standard"} />
              </> : null}
        </Paper>
        {view === "detail" ? <SelectedAreaDetails area={selected} state={state} now={now} outsideFilter={outsideFilter} standalone /> : <CongestionChart items={items} now={now} monitored={monitored} />}
      </Box>
      </> : null}
      {view === "map" ? <Box sx={explorationLayout}>
        <MapBoundary><SeoulOverviewMap items={filtered} state={state} now={now} openDetails /></MapBoundary>
        <PlacesPanel items={items} filtered={filtered} state={state} now={now} monitored={monitored} navigate={navigate} onStatus={() => setStatusOpen(true)} openDetails />
      </Box> : null}
      {view === "places" ? <PlacesPanel items={items} filtered={filtered} state={state} now={now} monitored={monitored} navigate={navigate} onStatus={() => setStatusOpen(true)} openDetails expanded /> : null}
      {view === "status" ? <Paper component="section" sx={{ p: { xs: 2, md: 3 }, minWidth: 0 }}>
        <Typography component="h2" variant="h2" sx={{ mb: 1 }}>장소별 자료 최신성</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{state.dataset === "demo" ? "시연 데이터의 갱신 상태입니다." : collectionNotice}</Typography>
        <DataStatusDetails items={items} state={state} now={now} monitored={monitored} />
      </Paper> : null}
    </>}
    <ComparisonTray state={state} onChange={(places) => navigate({ places })} />
    </>}
    <DashboardDialog id="data-status-title" title="자료 시각과 최신성" open={statusOpen} onClose={() => setStatusOpen(false)}>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>화면 응답 생성 {formatTime(overview.data?.meta.generatedAt ?? null)} / 원천 기준 시각과 다릅니다.</Typography>
      {overview.data?.meta.storage === "local-snapshot" ? <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>최근 수집 완료 {formatDateTime(overview.data.meta.capturedAt ?? null)} / {collection ? "설정된 수집 주기 " + collection.intervalMinutes + "분" : "수집 상태 미확인"}{collection?.nextRunAt ? " / 다음 수집 예정 " + formatDateTime(collection.nextRunAt) : ""}</Typography> : null}
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{collectionNotice}</Typography>
      {overview.data ? <DataStatusDetails items={items} state={state} now={now} monitored={monitored} /> : <Typography variant="body2">자료 상태를 아직 확인하지 못했습니다.</Typography>}
    </DashboardDialog>
  </AppShell>;
}
