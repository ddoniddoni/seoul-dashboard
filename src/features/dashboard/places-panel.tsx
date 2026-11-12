"use client";

import { useEffect, useRef, useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import InputAdornment from "@mui/material/InputAdornment";
import ToggleButton from "@mui/material/ToggleButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Pagination from "@mui/material/Pagination";
import Tooltip from "@mui/material/Tooltip";
import { CongestionBadge, StateNotice } from "@/components/data-status";
import { Icon } from "@/components/icon";
import { PanelHeading } from "@/components/panel-heading";
import type { AreaLatest, Congestion } from "@/lib/contracts/dashboard";
import { congestionLabels, formatRange, formatTime, freshnessLabels, getFreshness, getOverviewMetrics } from "@/lib/domain/metrics";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { getPlacePage } from "@/lib/domain/place-pagination";
import { dashboardPanel, numericText, placeCard, placeCardAction, placeCardFooter, placeGrid, placesPanelLayout, wallboardMedia } from "@/theme/tokens";
import { DashboardDialog } from "./dashboard-dialog";
import { usePlaceGrid } from "./use-place-grid";

const levels: Congestion[] = ["relaxed", "normal", "slightly-busy", "busy", "unknown"];

function SearchField({ query, onSearch }: { query: string; onSearch: (value: string) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const onSearchRef = useRef(onSearch);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => { onSearchRef.current = onSearch; }, [onSearch]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (input.current && input.current.value !== query) input.current.value = query;
  }, [query]);
  function change(value: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => onSearchRef.current(value), 300);
  }
  return <Box component="form" role="search" onSubmit={(event) => {
    event.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    onSearch(input.current?.value ?? "");
  }}>
    <TextField inputRef={input} id="place-search" type="search" label="장소명 검색" fullWidth defaultValue={query}
      placeholder="장소명 검색" onChange={(event) => change(event.target.value)}
      slotProps={{ inputLabel: { shrink: true }, htmlInput: { maxLength: 50 }, input: { startAdornment: <InputAdornment position="start"><Icon name="search" /></InputAdornment> } }} />
  </Box>;
}

export function PlacesPanel({ items, filtered, state, now, monitored, navigate, onStatus, openDetails = false, expanded = false }: {
  items: AreaLatest[]; filtered: AreaLatest[]; state: DashboardState; now: number; monitored: number;
  navigate: (changes: Partial<DashboardState>, replace?: boolean) => void; onStatus: () => void; openDetails?: boolean; expanded?: boolean;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const gridViewport = useRef<HTMLDivElement>(null);
  const grid = usePlaceGrid(expanded, gridViewport);
  const { coverage } = getOverviewMetrics(items, now, monitored);
  const paging = getPlacePage(filtered, state.area, state.page, expanded ? grid.pageSize : undefined);
  const visible = filtered.slice(paging.start, paging.start + paging.pageSize);
  return <Paper component="section" aria-labelledby="places-heading" sx={expanded ? placesPanelLayout : { ...dashboardPanel, bgcolor: "background.default" }}>
    <PanelHeading id="places-heading" title={"장소 탐색 " + filtered.length + "/" + items.length}
      action={<Button size="small" sx={{ minHeight: 28, px: 0.5 }} color={state.levels.length ? "primary" : "inherit"} onClick={() => setFiltersOpen(true)} endIcon={<Icon name="expand" />}>
        {state.levels.length ? "필터 " + state.levels.length : "필터 / 정렬"}
      </Button>} />
    <Box sx={{ p: 2, flexShrink: 0 }}><SearchField query={state.q} onSearch={(q) => navigate({ q }, true)} /></Box>
    <Box ref={gridViewport} sx={{ mx: 2, mb: 1, minWidth: 0, ...(expanded ? { [wallboardMedia]: { flex: "1 1 0", minHeight: placeGrid.minRowHeight } } : { display: "flex", flex: 1 }) }}>
    {!items.length ? <StateNotice compact title="아직 표시할 자료가 없습니다" description={state.dataset === "demo" ? "빈 데이터 시연 중입니다. 현황을 0으로 해석하지 않습니다." : "저장된 자료가 없습니다. 기록은 수집 시작 이후부터 표시합니다."} /> : !filtered.length ?
      <StateNotice compact title="조건에 맞는 장소가 없습니다" description="검색어나 혼잡 단계 필터를 바꿔보세요."><Button onClick={() => navigate({ q: "", levels: [] })}>검색과 필터 초기화</Button></StateNotice> :
      <List disablePadding aria-label="모니터링 장소별 혼잡도와 추정 인구" sx={{ flex: 1, display: "grid", gridTemplateColumns: `repeat(${expanded ? grid.columns : 1}, minmax(0, 1fr))`, alignContent: "start",
        columnGap: `${placeGrid.columnGap}px`, rowGap: `${placeGrid.rowGap}px`, gridAutoRows: `minmax(${expanded ? placeGrid.minRowHeight : placeGrid.compactRowHeight}px, auto)`,
        ...(expanded ? { [wallboardMedia]: { height: "100%", gridTemplateRows: `repeat(${grid.rows}, minmax(${placeGrid.minRowHeight}px, 1fr))` } } : {}) }}>
        {visible.map((item) => {
          const value = item.population.value;
          const freshness = value ? getFreshness(item.population.observedAt, now) : "missing";
          const selected = state.area === item.areaCode;
          const comparing = state.places.includes(item.areaCode);
          const freshnessLabel = <Typography variant="caption" color={freshness === "stale" ? "warning" : freshness === "expired" ? "error" : "textSecondary"} aria-label={"인구 기준 " + formatTime(item.population.observedAt) + ", " + freshnessLabels[freshness]}>{formatTime(item.population.observedAt)} {freshnessLabels[freshness]}</Typography>;
          return <ListItem key={item.areaCode} disablePadding data-selected={selected || comparing ? "true" : undefined}
            sx={{ flex: 1, minWidth: 0, minHeight: "min-content", ...placeCard }}>
            <ListItemButton component={NextLink} href={dashboardHref(state, { area: item.areaCode }, openDetails ? "/areas/" + item.areaCode : "/")} scroll={openDetails} selected={selected}
              aria-current={selected ? "true" : undefined} nativeButton={false}
              sx={{ width: "100%", minWidth: 0, display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "center", ...placeCardAction, py: expanded ? 1.5 : 1 }}>
              <Typography variant="caption" sx={{ ...numericText, color: "text.secondary", mb: 0.5 }}>{item.areaCode}</Typography>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                <Tooltip title={item.areaName}><Typography variant="body2" noWrap sx={{ fontWeight: 600, minWidth: 0, fontSize: 15 }}>{item.areaName}</Typography></Tooltip><Box sx={{ flexShrink: 0 }}><CongestionBadge level={value?.congestion ?? "unknown"} /></Box>
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", columnGap: 1 }}>
                <Typography sx={{ ...numericText, fontSize: 20, lineHeight: 1.5, mt: 0.5 }}>{formatRange(value)}<Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>{value ? "명" : ""}</Typography></Typography>
              </Stack>
            </ListItemButton>
            <Box sx={{ display: "flex", width: "100%", ...placeCardFooter }}>
              {freshnessLabel}
              <Button size="small" variant={comparing ? "outlined" : "text"} aria-pressed={comparing}
                aria-label={item.areaName + (comparing ? " 비교에서 제외" : " 비교에 추가")}
                disabled={!comparing && state.places.length >= 3}
                onClick={() => navigate({ places: comparing ? state.places.filter((code) => code !== item.areaCode) : [...state.places, item.areaCode] })}
                startIcon={<Icon name="compare" />} sx={{ minHeight: 32 }}>{comparing ? "비교 선택됨" : state.places.length >= 3 ? "최대 3곳 선택됨" : "비교에 추가"}</Button>
            </Box>
          </ListItem>;
        })}
      </List>}
    </Box>
    {expanded || paging.count > 1 ? <Stack direction={expanded ? { xs: "column", sm: "row" } : "column"} sx={{ alignItems: "center", justifyContent: expanded ? "space-between" : "center", gap: 0.25, px: expanded ? 2 : 0, py: 0.5, minHeight: expanded ? 60 : undefined, flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="caption" color="textSecondary" aria-live="polite">{filtered.length ? `${paging.start + 1}–${Math.min(paging.start + paging.pageSize, filtered.length)} / ${filtered.length}곳` : "0곳"}</Typography>
      {filtered.length ?
      <Pagination aria-label="장소 목록 페이지" count={paging.count} page={paging.page} onChange={(_, page) => navigate({ page })} size="small" siblingCount={0} boundaryCount={1}
        getItemAriaLabel={(type, page) => type === "page" ? `${page}페이지` : type === "next" ? "다음 페이지" : type === "previous" ? "이전 페이지" : type === "first" ? "첫 페이지" : "마지막 페이지"} /> : null}
    </Stack> : null}
    <Button onClick={onStatus} endIcon={<Icon name="arrow" />} sx={{ flexShrink: 0, borderTop: 1, borderColor: "divider", borderRadius: 0, justifyContent: "space-between", px: 2 }}>
      <Typography variant="caption" color="textSecondary">자료 최신성</Typography><Typography variant="caption">{coverage.fresh}/{monitored}곳 최신</Typography>
    </Button>
    <DashboardDialog id="place-filters-title" title="장소 필터와 정렬" open={filtersOpen} onClose={() => setFiltersOpen(false)}>
      <Stack spacing={3}>
        <TextField select label="장소 정렬" value={state.sort} onChange={(event) => navigate({ sort: event.target.value as DashboardState["sort"] })}>
          <MenuItem value="congestion">혼잡 단계순</MenuItem><MenuItem value="population">추정 범위 중앙값순</MenuItem><MenuItem value="name">장소 이름순</MenuItem><MenuItem value="sourceTime">기준 시각순</MenuItem>
        </TextField>
        <Box><Typography variant="body2" sx={{ mb: 1 }}>혼잡 단계 선택</Typography><Stack direction="row" aria-label="혼잡 단계 필터" sx={{ flexWrap: "wrap", gap: 1 }}>
          <ToggleButton value="all" selected={!state.levels.length} onChange={() => navigate({ levels: [] })}>전체</ToggleButton>
          {levels.map((level) => <ToggleButton key={level} value={level} selected={state.levels.includes(level)} onChange={() => navigate({ levels: state.levels.includes(level) ? state.levels.filter((item) => item !== level) : [...state.levels, level] })}>{congestionLabels[level]}</ToggleButton>)}
        </Stack></Box>
        <Button variant="contained" onClick={() => setFiltersOpen(false)}>적용한 장소 보기</Button>
      </Stack>
    </DashboardDialog>
  </Paper>;
}
