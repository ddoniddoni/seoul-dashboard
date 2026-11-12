"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Chip from "@mui/material/Chip";
import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import CircularProgress from "@mui/material/CircularProgress";
import { AppShell } from "@/components/app-shell";
import { Icon } from "@/components/icon";
import { CongestionBadge, FreshnessBadge, StateNotice } from "@/components/data-status";
import { DashboardDialog } from "@/features/dashboard/dashboard-dialog";
import { monitoredAreaCatalog as areaCatalog } from "@/lib/domain/catalog";
import { formatDateTime, formatTime, formatRange, getFreshness } from "@/lib/domain/metrics";
import { useLiveRefresh } from "@/lib/query/use-live-refresh";
import { getReadNotice } from "@/lib/domain/read-status";
import { comparisonHistoryOptions, overviewOptions } from "@/lib/query/dashboard";
import { dashboardHref, parseDashboardState, type DashboardState } from "@/lib/url-state/dashboard";
import type { History, Overview } from "@/lib/contracts/dashboard";
import { comparisonCards, comparisonColors, dashboardPanel, numericText } from "@/theme/tokens";
import { ComparisonStarters } from "./comparison-starters";

function ChartLoading() {
  return <Stack role="status" spacing={2} sx={{ minHeight: 260, justifyContent: "center", alignItems: "center" }}><CircularProgress size={24} /><Typography variant="body2" color="textSecondary">같은 시간대의 기록을 불러오고 있습니다.</Typography></Stack>;
}
const ComparisonChart = dynamic(() => import("./comparison-chart"), { ssr: false, loading: () => <ChartLoading /> });
function samePlaces(a: string[], b: string[]) { return [...a].sort().join(",") === [...b].sort().join(","); }

export function ComparePage({ initialState, initialNow, initialOverview, initialHistory }: {
  initialState: DashboardState; initialNow: number; initialOverview?: Overview; initialHistory?: History;
}) {
  const search = useSearchParams();
  const { state, issues } = parseDashboardState(new URLSearchParams(search.toString()));
  const router = useRouter();
  const { now, auto, setAuto, online, refetchInterval } = useLiveRefresh(initialNow);
  const [shareUrl, setShareUrl] = useState("");
  const [copyNotice, setCopyNotice] = useState("");
  const matchingInitial = state.dataset === initialState.dataset && state.scenario === initialState.scenario;
  const overview = useQuery({ ...overviewOptions(state.dataset, state.scenario), refetchInterval,
    initialData: matchingInitial ? initialOverview : undefined, initialDataUpdatedAt: initialOverview ? Date.parse(initialOverview.meta.generatedAt) : undefined });
  const history = useQuery({ ...comparisonHistoryOptions(state.dataset, state.scenario, state.places), refetchInterval,
    initialData: matchingInitial && samePlaces(state.places, initialState.places) ? initialHistory : undefined,
    initialDataUpdatedAt: initialHistory ? Date.parse(initialHistory.meta.generatedAt) : undefined });
  const catalog = areaCatalog;
  const selected = state.places.flatMap((code) => { const area = areaCatalog.find((item) => item.areaCode === code); return area ? [area] : []; });
  const items = overview.data?.data.items ?? [];
  const fetching = overview.isFetching || history.isFetching;
  function navigate(changes: Partial<DashboardState>) { router.push(dashboardHref(state, changes, "/compare"), { scroll: false }); }

  function refresh() { void overview.refetch(); if (state.places.length >= 2) void history.refetch(); }
  const actions = <><Button color="inherit" aria-pressed={auto} disabled={!online} onClick={() => setAuto((value) => !value)}>{!online ? "오프라인" : auto ? "자동 확인 켜짐" : "자동 확인 꺼짐"}</Button><Button variant="outlined" startIcon={fetching ? <CircularProgress size={16} /> : <Icon name="refresh" />} disabled={fetching || !online} onClick={refresh}>다시 조회</Button></>;
  return <AppShell state={state} active="compare" actions={actions} layout="compare">
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, gap: 1.5 }}>
      <Box><Typography component="h1" variant="h1" sx={{ fontSize: 24 }}>장소 비교</Typography><Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>최대 3곳의 혼잡도와 추정 인구를 같은 기준으로 살펴봅니다.</Typography></Box>
      <Button variant="outlined" disabled={state.places.length < 2} onClick={() => { setCopyNotice(""); setShareUrl(window.location.origin + dashboardHref(state, { range: "24h" }, "/compare")); }}>비교 링크 공유</Button>
    </Stack>
    {issues.length ? <Alert severity="warning">{issues.join(" ")}</Alert> : null}
    {state.range === "7d" ? <Alert severity="info" action={<Button size="small" onClick={() => navigate({ range: "24h" })}>24시간으로 변경</Button>}>7일 비교는 준비 중입니다. 최근 24시간 기록을 표시합니다.</Alert> : null}
    {!online ? <Alert severity="warning">{getReadNotice(false, overview.isError, Boolean(overview.data))}</Alert> : null}
    <Paper component="section" aria-label="비교 장소 선택" sx={{ p: 1.5 }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ alignItems: { md: "flex-start" } }}>
        <Autocomplete multiple options={catalog} value={selected} filterSelectedOptions
          getOptionLabel={(area) => area.areaName} isOptionEqualToValue={(a, b) => a.areaCode === b.areaCode}
          getOptionDisabled={() => state.places.length >= 3}
          onChange={(_, areas) => { if (areas.length <= 3) navigate({ places: areas.map((area) => area.areaCode) }); }}
          noOptionsText="검색한 장소가 없습니다" openText="장소 목록 열기" closeText="장소 목록 닫기" clearText="비교 장소 모두 해제"
          renderValue={(value, getItemProps) => value.map((area, index) => {
            const { key, ...props } = getItemProps({ index });
            return <Chip key={key} {...props} label={area.areaName} sx={{ color: comparisonColors[index], maxWidth: "100%" }} />;
          })}
          renderInput={(params) => <TextField {...params} label={`비교 장소 ${state.places.length}/3`} placeholder={state.places.length < 3 ? "장소명으로 검색" : "최대 3곳 선택됨"}
            helperText={state.places.length < 2 ? "2곳 이상 선택하면 같은 시간대의 기록을 비교할 수 있습니다." : undefined} />}
          sx={{ flex: 1, minWidth: 0, width: "100%" }} />

      </Stack>
    </Paper>
    {state.places.length < 2 ? <ComparisonStarters selected={state.places} onSelect={(places) => navigate({ places, range: "24h" })} /> : <>
      {overview.isError ? <Alert severity="warning" action={<Button size="small" onClick={() => { void overview.refetch(); }}>다시 조회</Button>}>{overview.data ? "현황 재조회에 실패했습니다. 마지막 자료의 기준 시각을 확인하세요." : "현재 상태를 불러오지 못했습니다. 아래 기록은 별도로 조회합니다."}</Alert> : null}
      <Box component="section" aria-label="선택 장소별 마지막 현황" sx={comparisonCards}>
        {selected.map((place, index) => {
          const area = items.find((item) => item.areaCode === place.areaCode);
          const value = area?.population.value;
          const freshness = value ? getFreshness(area.population.observedAt, now) : "missing";
          return <Paper component="article" key={place.areaCode} sx={{ p: 1.5, minWidth: 0, borderTop: "3px solid", borderTopColor: comparisonColors[index] }}>
            <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
              <Typography component="h2" variant="body2" sx={{ fontWeight: 600, color: comparisonColors[index] }}>{place.areaName}</Typography>
              <Button component={NextLink} href={dashboardHref(state, { area: place.areaCode }, "/areas/" + place.areaCode)} size="small" aria-label={place.areaName + " 상세 보기"} endIcon={<Icon name="arrow" />} sx={{ minWidth: 0, minHeight: 28, flexShrink: 0 }} nativeButton={false}>상세</Button>
            </Stack>
            {overview.isPending ? <><Skeleton width="45%" height={30} /><Skeleton width="90%" height={50} /><Skeleton /></> : overview.isError && !overview.data ? <Typography variant="body2" color="error">현황 조회 실패. 다시 조회해 주세요.</Typography> : <>
              <Stack direction="row" sx={{ alignItems: "center", gap: 0.5, flexWrap: "wrap" }}><CongestionBadge level={value?.congestion ?? "unknown"} /><FreshnessBadge freshness={freshness} /></Stack>
              <Typography sx={{ ...numericText, fontSize: { xs: 22, xl: 26 }, letterSpacing: 0, mt: 0.5 }}>{formatRange(value ?? null)}<Typography component="span" variant="caption" sx={{ ml: 0.5 }}>{value ? "명" : ""}</Typography></Typography>
              <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 0.5 }}>기준 {formatDateTime(area?.population.observedAt ?? null)} / 수신 {formatTime(area?.population.fetchedAt ?? null)}</Typography>
              {!area ? <Typography variant="caption" color="textSecondary">이 모드에서 제공된 자료 없음</Typography> : null}
              {area?.population.lastResult !== "valid" && area?.population.lastResult ? <Typography variant="caption" color="warning">최근 인구 자료 일부 누락 또는 실패</Typography> : null}
            </>}
          </Paper>;
        })}
      </Box>
      <Paper component="section" aria-labelledby="comparison-history-heading" sx={dashboardPanel}>
        <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: "divider" }}><Typography component="h2" variant="h2" id="comparison-history-heading">최근 24시간 인구 흐름 비교</Typography><Typography variant="caption" color="textSecondary">같은 시간축과 인구축 / 막대는 시간별 마지막 추정 범위의 중앙값</Typography></Box>
        {history.isPending ? <ChartLoading /> : history.isError && !history.data ? <StateNotice compact error title="비교 기록을 불러오지 못했습니다" description="선택한 장소와 현재 상태는 유지됩니다."><Button variant="outlined" onClick={() => { void history.refetch(); }}>기록 다시 조회</Button></StateNotice> : history.data ? <>
          {history.isError ? <Alert severity="warning">기록 재조회에 실패했습니다. 마지막 정상 기록을 표시합니다.</Alert> : null}
          <ComparisonChart history={history.data} places={state.places} />
        </> : null}
      </Paper>
    </>}
    <DashboardDialog id="compare-share-title" title="비교 링크 공유" open={Boolean(shareUrl)} onClose={() => setShareUrl("")}>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>선택한 장소와 데이터 모드가 담긴 링크입니다. 방문 시점의 저장 자료를 조회하므로 수치는 달라질 수 있습니다.</Typography>
      <TextField fullWidth label="비교 링크" value={shareUrl} onFocus={(event) => event.target.select()} slotProps={{ input: { readOnly: true } }} />
      <Button variant="contained" sx={{ mt: 2 }} onClick={async () => {
        try { await navigator.clipboard.writeText(shareUrl); setCopyNotice("링크를 복사했습니다."); }
        catch { setCopyNotice("자동 복사를 사용할 수 없습니다. 위 링크를 선택해 직접 복사하세요."); }
      }}>링크 복사</Button>
      {copyNotice ? <Typography role="status" variant="body2" sx={{ mt: 1 }}>{copyNotice}</Typography> : null}
    </DashboardDialog>
  </AppShell>;
}
