"use client";

import { createContext, useContext, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Tooltip from "@mui/material/Tooltip";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsTooltipContainer, useAxesTooltip, type ChartsTooltipProps } from "@mui/x-charts/ChartsTooltip";
import type { History } from "@/lib/contracts/dashboard";
import { getHourlyHistory, type HourlyHistoryPoint } from "@/lib/domain/hourly-history";
import { congestionLabels, formatDateTime, formatNumber, formatTime } from "@/lib/domain/metrics";
import { CongestionBadge, StateNotice } from "@/components/data-status";
import { numericText, pulseColors, shortWallboardMedia, wallboardMedia } from "@/theme/tokens";
import { DashboardDialog } from "./dashboard-dialog";

const HistoryContext = createContext<{ history: History; hours: HourlyHistoryPoint[] } | null>(null);
const dayFormatter = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric", day: "numeric" });
function hourLabel(time: number) { return formatTime(time).slice(0, 2) + "시"; }
function fullHourLabel(time: number) { return dayFormatter.format(time) + " " + hourLabel(time); }

function PopulationTooltip(props: ChartsTooltipProps) {
  const context = useContext(HistoryContext);
  const axes = useAxesTooltip();
  const index = axes?.[0]?.dataIndex;
  const bucket = index === undefined ? undefined : context?.hours[index];
  const series = context?.history.data.series[0];
  if (!bucket || !series) return null;
  const point = bucket.point;
  return <ChartsTooltipContainer {...props}>
    <Paper sx={{ p: 2, maxWidth: 320, borderColor: "primary.main" }}>
      <Typography variant="caption" color="textSecondary">{series.areaName} / {fullHourLabel(bucket.start)}</Typography>
      {!point ? <Typography variant="body2" sx={{ mt: 1 }}>이 시간대에 저장된 기록이 없습니다.</Typography> : <>
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>마지막 관측의 추정 인구</Typography>
        <Typography sx={{ ...numericText, fontSize: 22, my: 0.5 }}>{formatNumber(point.min)}~{formatNumber(point.max)}명</Typography>
        <CongestionBadge level={point.congestion} />
        <Typography variant="caption" sx={{ display: "block", mt: 1.5 }}>원천 기준 {formatDateTime(point.observedAt)}</Typography>
        <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>막대 높이: 범위 중앙값 {formatNumber(bucket.midpoint)}명</Typography>
      </>}
      <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>{context?.history.data.resolutionMinutes}분 구간 {bucket.totalBuckets}개 중 {bucket.availableBuckets}개에 기록 있음</Typography>
      {bucket.partial ? <Typography variant="caption" color="textSecondary">조회 시작 또는 끝에 걸친 일부 시간대입니다.</Typography> : null}
    </Paper>
  </ChartsTooltipContainer>;
}

export default function HistoryChart({ history, presentation = "standard" }: { history: History; presentation?: "standard" | "board" | "detail" }) {
  const [tableOpen, setTableOpen] = useState(false);
  const board = presentation === "board";
  const detail = presentation === "detail";
  const series = history.data.series[0];
  if (!series || !series.points.some((point) => point.min !== null)) return <StateNotice compact title="표시할 기록이 없습니다" description="기록은 수집을 시작한 시점부터 쌓입니다. 비어 있는 과거는 만들어 채우지 않습니다." />;
  const demo = history.meta.dataset === "demo";
  const valid = series.points.filter((point) => point.min !== null && point.max !== null);
  const low = Math.min(...valid.map((point) => point.min!));
  const high = Math.max(...valid.map((point) => point.max!));
  const gaps = series.points.filter((point) => point.min === null).length;
  const short = series.availableSince !== null && Date.parse(series.availableSince) - Date.parse(history.data.from) > 60 * 60_000;
  const hours = getHourlyHistory(history);
  const recordedHours = hours.filter((hour) => hour.midpoint !== null);
  const peak = recordedHours.length > 1 ? recordedHours.reduce<HourlyHistoryPoint | undefined>((best, hour) => !best || hour.midpoint! > best.midpoint! ? hour : best, undefined) : undefined;
  const peakIndex = peak ? hours.indexOf(peak) : -1;
  const peakTies = peak ? recordedHours.filter((hour) => hour.midpoint === peak.midpoint).length : 0;
  const missingHours = hours.length - recordedHours.length;
  return <Box component="figure" aria-labelledby="history-description" sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: detail ? "min-content" : 0, px: board || detail ? 2 : { xs: 1.5, md: 3 }, pb: board ? 0.5 : detail ? 1 : 2.5, pt: board ? 0 : detail ? 0.5 : 1.5,
    ...(detail ? { "& > :not([data-history-plot])": { flexShrink: 0 } } : {}) }}>
    <Stack component="figcaption" id="history-description" direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: board || detail ? 0 : 1 }}>
      <Stack direction="row" sx={{ gap: 1.5, alignItems: "baseline" }}>
        <Typography variant="body2" sx={{ color: pulseColors.heading, fontWeight: 600 }}>추정 인구 (명)</Typography>
        <Typography variant="caption" color="textSecondary">1시간 단위</Typography>
      </Stack>
      <Button size="small" onClick={() => setTableOpen(true)} sx={{ minHeight: board ? 24 : 32, ...(board ? { py: 0, fontSize: 12 } : {}) }}>{history.data.resolutionMinutes}분 기록 표 ↗</Button>
    </Stack>
    {short && !board ? <Alert severity="warning" sx={{ mb: 1, py: 0 }}>기록 수집 중 / 보유 시작 {formatDateTime(series.availableSince)}</Alert> : null}
    <Box data-history-plot sx={{ height: { xs: 260, md: 300 }, minWidth: 0, ...(board ? { [wallboardMedia]: { flex: 1, minHeight: 120, height: "auto" }, [shortWallboardMedia]: { minHeight: 100 } } : {}),
      ...(detail ? { [wallboardMedia]: { flex: 1, minHeight: 180, height: "auto" } } : {}) }}>
      <HistoryContext value={{ history, hours }}>
        <BarChart
          borderRadius={2}
          margin={{ top: 12, right: 8, bottom: 0, left: 0 }}
          xAxis={[{ data: hours.map((hour) => hour.start), scaleType: "band", categoryGapRatio: 0.38,
            tickInterval: (value: number) => Number(formatTime(value).slice(0, 2)) % 4 === 0,
            height: 36, disableLine: true, disableTicks: true,
            colorMap: { type: "ordinal", values: hours.map((hour) => hour.start), colors: hours.map((_, index) => index === peakIndex ? pulseColors.historyHighlight : pulseColors.historyBar) },
            valueFormatter: (value: number, context) => context.location === "tick" ? hourLabel(value) : fullHourLabel(value) }]}
          yAxis={[{ min: 0, width: 46, tickNumber: board ? 3 : 4, disableLine: true, disableTicks: true,
            valueFormatter: (value: number) => value >= 10_000 ? Number((value / 10_000).toFixed(1)) + "만" : formatNumber(value) }]}
          series={[{ id: "population", data: hours.map((hour) => hour.midpoint), color: pulseColors.historyBar, label: "추정 인구 범위 중앙값", valueFormatter: (value) => value === null ? "기록 없음" : formatNumber(value) + "명" }]}
          slots={{ tooltip: PopulationTooltip }}
          grid={{ horizontal: true }} hideLegend skipAnimation
          aria-label={series.areaName + (demo ? " 시연" : " 수집") + " 시간별 추정 인구. 1시간 구간의 마지막 관측 범위 중앙값을 막대로 표시합니다."}
          sx={{
            "& .MuiChartsGrid-line": { stroke: pulseColors.historyGrid, strokeDasharray: "3 5" },
            "& .MuiChartsAxis-tickLabel": { fontSize: 12, fill: pulseColors.muted },
          }}
        />
      </HistoryContext>
    </Box>
    {!board ? <><Stack direction="row" sx={{ justifyContent: "space-between", gap: 2, ml: "46px", mb: detail ? 0.5 : 2 }}>
      <Typography variant="caption" color="textSecondary">{formatDateTime(history.data.from)}</Typography>
      <Typography variant="caption" color="textSecondary">{formatDateTime(history.data.to)} / 한국 시간</Typography>
    </Stack>
    {peak?.point ? <Stack direction={{ xs: "column", sm: "row" }} sx={{ gap: { xs: 0.25, sm: 1 }, alignItems: { sm: "baseline" }, borderTop: 1, borderColor: "divider", pt: detail ? 0.75 : 1.5 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}><Box component="span" aria-hidden="true" sx={{ display: "inline-block", width: 8, height: 8, bgcolor: pulseColors.historyHighlight, borderRadius: 0.25, mr: 1 }} />시간별 비교 최대 / {fullHourLabel(peak.start)}</Typography>
      <Typography variant="body2" sx={{ ...numericText, color: pulseColors.historyHighlight }}>{formatNumber(peak.point.min)}~{formatNumber(peak.point.max)}명</Typography>
    </Stack> : null}
    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.75 }}>막대는 각 시간의 마지막 추정 범위 중앙값입니다. 정확한 범위는 막대에 올려보거나 기록 표에서 확인하세요.</Typography>
    <Typography variant="caption" color="textSecondary" sx={{ mt: 0.25 }}>{valid.length === 1 ? "보유 기록 1개. 추가 기록이 쌓이면 시간대별 비교가 가능합니다." : `기록 없는 시간대 ${missingHours}개 / 원본 ${history.data.resolutionMinutes}분 구간 중 ${gaps}개 누락. 빈 시간은 채우지 않습니다.`}</Typography>
    </> : peak?.point ? <Tooltip describeChild title={`기록이 있는 ${recordedHours.length}개 시간대의 마지막 관측 범위 중앙값을 비교했습니다. 실제 하루 전체의 최대 인구를 뜻하지 않습니다. 원천 ${formatDateTime(peak.point.observedAt)} / 기록 ${valid.length}개 / 기록 없는 시간대 ${missingHours}개`}>
      <Typography tabIndex={0} variant="caption" sx={{ color: pulseColors.heading }}>
        시간별 비교 최대 <Box component="span" sx={{ color: "text.primary" }}>{fullHourLabel(peak.start)}{peakTies > 1 ? ` 외 ${peakTies - 1}개 시간대` : ""}</Box>
        <Box component="span" sx={{ ...numericText, color: pulseColors.historyHighlight, ml: 1 }}>{formatNumber(peak.point.min)}~{formatNumber(peak.point.max)}명</Box>
      </Typography>
    </Tooltip> : <Typography variant="caption" color="textSecondary">기록 {valid.length}개 / 비교할 시간대가 더 쌓이면 최대 구간을 표시합니다</Typography>}
    <DashboardDialog id="history-table-title" title={series.areaName + " 인구 기록 표"} open={tableOpen} onClose={() => setTableOpen(false)}>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>{demo ? "시연 기록" : "수집 기록"}의 하한 최솟값 {formatNumber(low)}명, 상한 최댓값 {formatNumber(high)}명. 차트는 1시간별 마지막 관측의 추정 범위 중앙값을 표시하며, 아래 표에는 원본 {history.data.resolutionMinutes}분 기록을 모두 제공합니다. 확정 인원이 아닙니다.</Typography>
      <TableContainer tabIndex={0} aria-label="인구 기록 표 스크롤"><Table size="small" stickyHeader>
        <caption className="sr-only">{series.areaName} {demo ? "합성 시연 인구 기록" : "원천 수집 인구 기록"}. 버킷 시각과 원천 관측 시각은 한국 시간입니다.</caption>
        <TableHead><TableRow>{["버킷 시작", "인구 기준 시각", "추정 인구 범위", "혼잡 단계", "관측 수"].map((label) => <TableCell scope="col" key={label}>{label}</TableCell>)}</TableRow></TableHead>
        <TableBody>{series.points.map((point) => <TableRow key={point.bucketAt}>
          <TableCell>{formatDateTime(point.windowFrom ?? point.bucketAt)}{point.partial ? " / 부분 버킷" : ""}</TableCell>
          <TableCell>{point.observedAt ? formatDateTime(point.observedAt) : "—"}</TableCell>
          <TableCell>{point.min === null ? "기록 없음" : formatNumber(point.min) + "~" + formatNumber(point.max) + "명"}</TableCell>
          <TableCell>{point.observedAt ? congestionLabels[point.congestion] : "—"}</TableCell>
          <TableCell>{point.observationCount ?? "—"}</TableCell>
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </DashboardDialog>
  </Box>;
}
