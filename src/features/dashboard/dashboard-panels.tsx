"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import Alert from "@mui/material/Alert";
import MuiLink from "@mui/material/Link";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { CongestionBadge, FreshnessBadge, StateNotice } from "@/components/data-status";
import { Icon } from "@/components/icon";
import { PanelHeading } from "@/components/panel-heading";
import type { AreaLatest, Dataset } from "@/lib/contracts/dashboard";
import { areaCatalog } from "@/lib/domain/catalog";
import { formatDateTime, formatRange, formatTime, getFreshness, getOverviewMetrics } from "@/lib/domain/metrics";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { metricLayout, numericText, pulseColors } from "@/theme/tokens";

export function MetricCards({ items, now, monitored, dataset, kind = "congestion", density = "standard" }: { items: AreaLatest[]; now: number; monitored: number; dataset: Dataset; kind?: "congestion" | "freshness"; density?: "standard" | "compact" }) {
  const metrics = getOverviewMetrics(items, now, monitored);
  const cards = kind === "freshness" ? [
    { label: "최신 자료", value: metrics.coverage.fresh, note: "인구 기준 시각 30분 이내" },
    { label: "갱신 지연", value: metrics.coverage.stale, note: "인구 기준 시각 30분 초과 60분 이내" },
    { label: "자료 만료", value: metrics.coverage.expired, note: "인구 기준 시각 60분 초과" },
    { label: "자료 없음", value: metrics.coverage.missing, note: "인구 값 또는 유효한 기준 시각 없음" },
  ] : [
    { label: dataset === "demo" ? "모니터링 장소" : "공개 대상 장소", value: monitored, note: metrics.coverage.fresh + "/" + monitored + "곳 최신 자료" },
    { label: "최신 자료 중 붐빔", value: metrics.busy, note: "최신 자료 " + metrics.coverage.fresh + "곳 기준" },
    { label: "최신 자료 중 여유", value: metrics.relaxed, note: "최신 자료 " + metrics.coverage.fresh + "곳 기준" },
    { label: "갱신 지연 및 만료", value: metrics.delayed, note: "자료 누락 " + metrics.coverage.missing + "곳은 별도" },
  ];
  return <Paper component="section" aria-label={dataset === "demo" ? "전체 시연 장소 기준 지표" : "전체 공개 대상 장소 기준 지표"} sx={metricLayout}>
    {cards.map((card, index) => <Box component="article" key={card.label} sx={{ px: density === "compact" ? 2 : { xs: 2, md: 3 }, py: density === "compact" ? 1 : 2, minWidth: 0, ...(density === "compact" ? { display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", alignItems: "center" } : {}), borderLeft: { xs: index % 2 ? "1px solid var(--mui-palette-divider)" : 0, md: index ? "1px solid var(--mui-palette-divider)" : 0 }, borderTop: { xs: index > 1 ? "1px solid var(--mui-palette-divider)" : 0, md: 0 }, borderColor: "divider" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Typography variant="caption" sx={{ color: pulseColors.heading }}>{card.label}</Typography>
      </Stack>
      <Typography sx={{ ...numericText, color: card.value === null ? "text.secondary" : "text.primary", fontSize: density === "compact" ? 28 : 32, fontWeight: 500, letterSpacing: 0, lineHeight: 1.125, mt: density === "compact" ? 0 : 0.5, mb: density === "compact" ? 0 : 0.5 }}>{card.value ?? "—"}<Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 1 }}>{card.value !== null ? "곳" : ""}</Typography></Typography>
      <Typography variant="caption" color="textSecondary" sx={{ display: "block", ...(density === "compact" ? { gridColumn: "1 / -1" } : {}) }}>{card.note}</Typography>
    </Box>)}
  </Paper>;
}

export function SelectedAreaSummary({ area, state, now, outsideFilter, standalone = false }: {
  area: AreaLatest | undefined; state: DashboardState; now: number; outsideFilter: boolean; standalone?: boolean;
}) {
  const selectedCatalog = areaCatalog.find((item) => item.areaCode === state.area);
  if (!state.area) return <Box component="section" sx={{ p: 2 }}><Typography variant="h2" component="h2">장소를 선택해 주세요</Typography><Typography variant="body2" color="textSecondary">지도나 목록에서 선택하면 인구 흐름을 볼 수 있습니다.</Typography></Box>;
  const freshness = area?.population.value ? getFreshness(area.population.observedAt, now) : "missing";
  return <Box component="section" aria-labelledby="selection-heading" sx={{ px: standalone ? 2 : { xs: 2, md: 3 }, pt: standalone ? 1.5 : 2, pb: 0.5, flexShrink: 0 }}>
    <Stack direction={{ xs: "column", sm: "row" }} sx={{ justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="caption" sx={{ ...numericText, color: "text.secondary" }}>{state.area} / {selectedCatalog?.category}</Typography>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Typography component="h2" variant="h2" id="selection-heading" sx={{ fontSize: standalone ? 20 : 24, fontWeight: 500 }}>{selectedCatalog?.areaName ?? "선택한 장소"}</Typography>
          <CongestionBadge level={area?.population.value?.congestion ?? "unknown"} />
        </Stack>
        {!standalone ? <Button component={NextLink} href={dashboardHref(state, {}, "/areas/" + state.area)} nativeButton={false} size="small" endIcon={<Icon name="arrow" />} sx={{ px: 0, mt: 0.5, minHeight: 32 }}>장소 상세</Button> : null}
      </Box>
      <Box sx={{ textAlign: { sm: "right" } }}>
        <Typography variant="caption" color="textSecondary">마지막 추정 인구</Typography>
        <Typography aria-label={"추정 인구 범위 " + formatRange(area?.population.value ?? null) + (area?.population.value ? "명" : "")} sx={{ ...numericText, fontSize: { xs: 28, md: 32 }, lineHeight: 1.4, mt: 0.5 }}>
          {formatRange(area?.population.value ?? null)}<Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>{area?.population.value ? "명" : ""}</Typography>
        </Typography>
        {!standalone ? <Button component={NextLink} href={dashboardHref(state, { area: null })} scroll={false} nativeButton={false} size="small" sx={{ color: "text.secondary", minHeight: 32, px: 0 }}>선택 해제</Button> : null}
      </Box>
    </Stack>
    <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, flexWrap: "wrap", mt: standalone ? 1 : 1.5, pt: standalone ? 0.5 : 1, borderTop: 1, borderColor: "divider" }}>
      <Typography variant="caption" color="textSecondary">원천 기준 {formatDateTime(area?.population.observedAt ?? null)}</Typography><FreshnessBadge freshness={freshness} />
    </Stack>
    {outsideFilter ? <Typography variant="caption" color="warning">현재 필터 밖의 장소입니다. 상세 선택은 유지됩니다.</Typography> : null}
    {state.dataset === "live" && area?.collectionEnabled === false ? <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>수집 비활성 / 저장된 마지막 자료입니다.</Typography> : null}
    {area?.lastAttemptAt && (area.population.lastResult !== "valid" || area.weather.lastResult !== "valid") ? <Typography variant="caption" color="warning" sx={{ display: "block" }}>최근 자료 일부 누락 또는 실패. 상세에서 확인하세요.</Typography> : null}
  </Box>;
}

export function DataStatusDetails({ items, state, now, monitored }: { items: AreaLatest[]; state: DashboardState; now: number; monitored: number }) {
  const { coverage } = getOverviewMetrics(items, now, monitored);
  const resultLabels = { valid: "수신 성공", "not-provided": "인구 미제공", invalid: "형식 확인 필요", "fetch-failed": "요청 실패" } as const;
  return <Stack spacing={2}>
    <Box>
      <Typography variant="body2">수신 성공과 원천 최신성은 별개입니다</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>서울시 인구 기준 시각이 30분을 넘으면 갱신 지연, 60분을 넘으면 자료 만료로 표시합니다. 방금 받은 응답이어도 원천 시각이 오래되면 지연으로 표시됩니다.</Typography>
      <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>전체 {monitored}곳 중 최신 {coverage.fresh}곳, 갱신 지연 {coverage.stale}곳, 자료 만료 {coverage.expired}곳, 자료 없음 {coverage.missing}곳</Typography>
    </Box>
    <TableContainer tabIndex={0} aria-label="장소별 자료 상태 표 스크롤"><Table size="small">
      <caption className="sr-only">{state.dataset === "demo" ? "시연 장소별 인구와 날씨 기준 시각 및 수집 시각" : "공개 장소별 인구와 날씨 기준 시각 및 수집 시각"}. 한국 시간.</caption>
      <TableHead><TableRow>{["장소", "추정 인구 범위", "인구 기준", "마지막 인구 수신", "최근 수집 결과", "날씨 기준", "원천 최신성"].map((label) => <TableCell scope="col" key={label}>{label}</TableCell>)}</TableRow></TableHead>
      <TableBody>{items.length ? items.map((item) => <TableRow key={item.areaCode}>
        <TableCell component="th" scope="row"><MuiLink component={NextLink} href={dashboardHref(state, { area: item.areaCode }, "/areas/" + item.areaCode)} scroll={false}>{item.areaName}</MuiLink></TableCell>
        <TableCell align="right" sx={numericText}>{formatRange(item.population.value)}{item.population.value ? "명" : ""}</TableCell>
        <TableCell>{formatDateTime(item.population.observedAt)}</TableCell><TableCell>{formatDateTime(item.population.fetchedAt)}</TableCell>
        <TableCell>
          <Typography variant="caption" sx={{ color: !item.lastAttemptAt ? "text.secondary" : item.population.lastResult === "valid" ? "success.main" : "warning.main" }}>{item.lastAttemptAt ? resultLabels[item.population.lastResult] : "수집 전"}</Typography>
          {item.lastAttemptAt ? <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>{formatDateTime(item.lastAttemptAt)}</Typography> : null}
        </TableCell>
        <TableCell>{formatDateTime(item.weather.observedAt)}</TableCell>
        <TableCell><FreshnessBadge freshness={item.population.value ? getFreshness(item.population.observedAt, now) : "missing"} /></TableCell>
      </TableRow>) : <TableRow><TableCell colSpan={7}>제공된 자료 없음</TableCell></TableRow>}</TableBody>
    </Table></TableContainer>
  </Stack>;
}

export function SelectedAreaDetails({ area, state, now, outsideFilter, standalone = false }: { area: AreaLatest | undefined; state: DashboardState; now: number; outsideFilter: boolean; standalone?: boolean }) {
  const selectedCatalog = areaCatalog.find((item) => item.areaCode === state.area);
  const freshness = area?.population.value ? getFreshness(area.population.observedAt, now) : "missing";
  const weather = area?.weather.value;
  return <Paper component="section" aria-labelledby="detail-heading" sx={{ gridColumn: { md: "1 / -1", lg: "auto" }, overflow: "hidden" }}>
    <PanelHeading id="detail-heading" title={standalone ? "장소 정보와 환경" : "선택한 장소"} density={standalone ? "compact" : "standard"} action={state.area && !standalone ? <IconButton component={NextLink} href={dashboardHref(state, { area: null })} scroll={false} aria-label="장소 선택 해제" nativeButton={false}><Icon name="close" /></IconButton> : <Typography variant="caption" color="textSecondary">장소별 상세</Typography>} />
    {!state.area ? <StateNotice title="어떤 장소가 궁금한가요?" description="목록에서 장소를 선택하면 추정 인구 범위와 최근 흐름을 볼 수 있습니다." /> : <>
      {!standalone ? <Box sx={{ px: 2.5, pt: 2.5 }}><Typography variant="caption" color="textSecondary">{selectedCatalog?.category} / {state.area}</Typography><Typography variant="h3" component="h3">{selectedCatalog?.areaName}</Typography><Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mt: 1.5 }}><CongestionBadge level={area?.population.value?.congestion ?? "unknown"} /><FreshnessBadge freshness={freshness} /></Stack></Box> : null}
      {state.dataset === "live" && area?.collectionEnabled === false ? <Alert severity="info" sx={{ mx: 2, mt: 2 }}>현재 이 장소의 수집은 비활성입니다. 저장된 자료가 있으면 그 기준 시각과 함께 표시합니다.</Alert> : null}
      {outsideFilter ? <Alert severity="warning" sx={{ mx: 2, mt: 2 }}>선택한 장소가 현재 필터에서 제외되었습니다. 상세 선택은 유지됩니다.</Alert> : null}
      <Box sx={{ p: standalone ? 2 : 2.5 }}>
        {standalone ? <Typography component="h3" variant="h4">자료 해석</Typography> : <><Typography variant="caption" color="textSecondary">추정 인구 범위 / 명</Typography><Typography sx={{ ...numericText, fontSize: 24, mt: 0.5, letterSpacing: 0 }}>{formatRange(area?.population.value ?? null)}</Typography></>}
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>{state.dataset === "demo" ? "시연용 합성 값. 확정 인원이나 현장의 안전 상태를 의미하지 않습니다." : "서울시 원천 추정 범위입니다. 확정 인원이나 현장의 안전 상태를 의미하지 않습니다."}</Typography>
      </Box>
      {area?.lastAttemptAt && area.population.lastResult !== "valid" ? <Alert severity="warning" sx={{ mx: 2, mb: 2 }}>{state.dataset === "demo" ? "최근 인구 자료의 누락/실패를 시연 중입니다." : "최근 수집에서 인구 자료를 확인하지 못했습니다."} 직전 자료가 있으면 그 기준 시각과 함께 유지합니다.</Alert> : null}
      <Stack component="dl" spacing={1} sx={{ mx: standalone ? 2 : 2.5, py: standalone ? 1.5 : 2, borderTop: 1, borderBottom: 1, borderColor: "divider" }}>{[["인구 기준 시각", area?.population.observedAt], ["자료 수집 시각", area?.population.fetchedAt]].map(([label, value]) => <Stack direction="row" key={label} sx={{ justifyContent: "space-between", gap: 1 }}><Typography component="dt" variant="caption" color="textSecondary">{label}</Typography><Typography component="dd" variant="caption" sx={{ m: 0 }}>{formatDateTime(value ?? null)}</Typography></Stack>)}</Stack>
      <Box sx={{ p: standalone ? 2 : 2.5 }}><Stack direction="row" sx={{ justifyContent: "space-between" }}><Typography component={standalone ? "h3" : "h4"} variant="h4">날씨 보조 정보</Typography><Typography variant="caption" color="textSecondary">{state.dataset === "demo" ? "합성 데이터" : "원천 자료"}</Typography></Stack>{weather ? <>
        <Box component="dl" sx={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 1.5, mt: 2, p: 1.5, bgcolor: "background.default", borderRadius: 1 }}>{[["기온", weather.temperatureC, "°C"], ["습도", weather.humidityPct, "%"], ["초미세먼지", weather.pm25MicrogramsPerM3, "μg/m³"]].map(([label, value, unit]) => <Box key={label}><Typography component="dt" variant="caption" color="textSecondary">{label}</Typography><Typography component="dd" sx={{ ...numericText, m: 0, fontSize: standalone ? 20 : 24, display: "flex", alignItems: "baseline", flexWrap: "wrap", columnGap: 0.5 }}>{value ?? "—"}<Typography component="span" variant="caption" color="textSecondary" sx={{ whiteSpace: "nowrap" }}>{value === null ? "" : unit}</Typography></Typography></Box>)}</Box>
        <Stack direction="row"   sx={{ alignItems: "center", justifyContent: "space-between",  mt: 2  }}><Typography variant="caption" color="textSecondary">날씨 기준 {formatTime(area.weather.observedAt)}</Typography><FreshnessBadge freshness={getFreshness(area.weather.observedAt, now, "weather")} /></Stack>
      </> : <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>제공된 정보 없음</Typography>}{area?.lastAttemptAt && area.weather.lastResult !== "valid" ? <Alert severity="warning" sx={{ mt: 2 }}>최근 날씨 자료를 확인하지 못했습니다. 직전 자료가 있으면 그 기준 시각을 유지합니다.</Alert> : null}</Box>
      {!standalone ? <Button component={NextLink} href={dashboardHref(state, {}, "/areas/" + state.area)} fullWidth endIcon={<Icon name="arrow" />} sx={{ borderTop: 1, borderColor: "divider", borderRadius: 0, py: 1.5 }} nativeButton={false}>장소 상세 링크 열기</Button> : null}
    </>}
  </Paper>;
}

