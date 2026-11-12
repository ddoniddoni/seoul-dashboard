"use client";

import { createContext, useContext, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableHead from "@mui/material/TableHead";
import TableBody from "@mui/material/TableBody";
import TableRow from "@mui/material/TableRow";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import { BarChart } from "@mui/x-charts/BarChart";
import { ChartsTooltipContainer, useAxesTooltip, type ChartsTooltipProps } from "@mui/x-charts/ChartsTooltip";
import { DashboardDialog } from "@/features/dashboard/dashboard-dialog";
import { CongestionBadge, StateNotice } from "@/components/data-status";
import type { History } from "@/lib/contracts/dashboard";
import { areaCatalog } from "@/lib/domain/catalog";
import { getHourlyHistory, type HourlyHistoryPoint } from "@/lib/domain/hourly-history";
import { formatDateTime, formatNumber, formatTime } from "@/lib/domain/metrics";
import { comparisonColors, comparisonPlot, numericText, pulseColors } from "@/theme/tokens";

const TooltipContext = createContext<{ areaName: string; hours: HourlyHistoryPoint[]; color: string; resolutionMinutes: number } | null>(null);
function ComparisonTooltip(props: ChartsTooltipProps) {
  const context = useContext(TooltipContext);
  const axes = useAxesTooltip();
  const index = axes?.[0]?.dataIndex;
  const hour = index === undefined ? undefined : context?.hours[index];
  if (!context || !hour) return null;
  return <ChartsTooltipContainer {...props}><Paper sx={{ p: 2, maxWidth: 300, borderColor: context.color }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>{context.areaName}</Typography>
    <Typography variant="caption" color="textSecondary">{formatDateTime(new Date(hour.start).toISOString())} 시간대</Typography>
    {hour.point ? <>
      <Typography sx={{ ...numericText, fontSize: 21, my: 1 }}>{formatNumber(hour.point.min)}~{formatNumber(hour.point.max)}명</Typography>
      <CongestionBadge level={hour.point.congestion} />
      <Typography variant="caption" sx={{ display: "block", mt: 1 }}>인구 기준 {formatDateTime(hour.point.observedAt)}</Typography>
      <Typography variant="caption" color="textSecondary" sx={{ display: "block" }}>범위 중앙값 {formatNumber(hour.midpoint)}명</Typography>
    </> : <Typography variant="body2" sx={{ my: 1 }}>기록 없음</Typography>}
    <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>{context.resolutionMinutes}분 구간 {hour.totalBuckets}개 중 {hour.availableBuckets}개 기록</Typography>
    {hour.partial ? <Typography variant="caption" color="textSecondary">조회 경계에 걸친 일부 시간대</Typography> : null}
  </Paper></ChartsTooltipContainer>;
}

export default function ComparisonChart({ history, places }: { history: History; places: string[] }) {
  const [tableOpen, setTableOpen] = useState(false);
  const series = places.map((code, index) => {
    const source = history.data.series.find((item) => item.areaCode === code);
    const hours = getHourlyHistory(history, source ?? null);
    return { code, color: comparisonColors[index], areaName: areaCatalog.find((area) => area.areaCode === code)?.areaName ?? code,
      hours, source, resolutionMinutes: history.data.resolutionMinutes, available: hours.filter((hour) => hour.point).length };
  });
  const maximum = Math.max(1, ...series.flatMap((item) => item.hours.map((hour) => hour.point?.max ?? 0)));
  const step = 10 ** Math.max(0, Math.floor(Math.log10(maximum))) / 2;
  const yMax = Math.ceil(maximum / step) * step;
  const timeline = series[0]?.hours ?? [];
  return <Box sx={{ p: 1.5 }}>
    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 1 }}>
      <Typography variant="caption" color="textSecondary">{formatDateTime(history.data.from)} ~ {formatDateTime(history.data.to)} / 한국 시간</Typography>
      <Button size="small" onClick={() => setTableOpen(true)}>시간별 범위 비교 표 ↗</Button>
    </Stack>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", lg: `repeat(${places.length}, minmax(0,1fr))` }, gap: 1.5 }}>
      {series.map((item) => <Box component="figure" key={item.code} aria-labelledby={`compare-chart-${item.code}`} sx={{ minWidth: 0, m: 0, p: 1.25, bgcolor: "background.default", borderRadius: 1 }}>
        <Stack component="figcaption" direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, mb: 1 }}>
          <Typography id={`compare-chart-${item.code}`} variant="body2" sx={{ color: item.color, fontWeight: 600 }}>{item.areaName}</Typography>
          <Typography variant="caption" color="textSecondary">기록 {item.available}/{item.hours.length}시간대</Typography>
        </Stack>
        {item.available ? <Box sx={comparisonPlot}><TooltipContext value={item}>
          <BarChart borderRadius={2} margin={{ top: 12, left: 0, right: 8, bottom: 0 }}
            xAxis={[{ data: timeline.map((hour) => hour.start), scaleType: "band", categoryGapRatio: 0.38,
              tickInterval: (value: number) => Number(formatTime(value).slice(0, 2)) % 4 === 0,
              height: 32, disableLine: true, disableTicks: true,
              valueFormatter: (value: number, context) => context.location === "tick" ? formatTime(value).slice(0, 2) + "시" : formatDateTime(new Date(value).toISOString()) }]}
            yAxis={[{ min: 0, max: yMax, width: 46, tickNumber: 4, disableLine: true, disableTicks: true,
              valueFormatter: (value: number) => value >= 10_000 ? Number((value / 10_000).toFixed(1)) + "만" : formatNumber(value) }]}
            series={[{ id: item.code, data: item.hours.map((hour) => hour.midpoint), color: item.color, label: item.areaName,
              valueFormatter: (value) => value === null ? "기록 없음" : formatNumber(value) + "명" }]}
            slots={{ tooltip: ComparisonTooltip }} grid={{ horizontal: true }} hideLegend skipAnimation
            aria-label={item.areaName + " 시간대별 추정 인구 비교. 다른 장소와 동일한 0~" + formatNumber(yMax) + "명 축."}
            sx={{ "& .MuiChartsGrid-line": { stroke: pulseColors.historyGrid, strokeDasharray: "3 5" }, "& .MuiChartsAxis-tickLabel": { fill: pulseColors.muted, fontSize: 12 } }} />
        </TooltipContext></Box> : <Box sx={{ ...comparisonPlot, display: "flex" }}><StateNotice compact title="비교할 기록 없음" description="이 장소의 해당 기간 기록이 없습니다. 다른 장소의 자료로 채우지 않습니다." /></Box>}
        <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>
          기록 없는 시간대 {item.hours.length - item.available}개{item.source ? ` / 원본 ${history.data.resolutionMinutes}분 누락 ${item.source.points.filter((point) => point.min === null).length}개` : " / 제공된 이력 없음"}
        </Typography>
        {item.source?.availableSince && Date.parse(item.source.availableSince) > Date.parse(history.data.from) ? <Typography variant="caption" color="warning" sx={{ display: "block" }}>보유 시작 {formatDateTime(item.source.availableSince)}</Typography> : null}
      </Box>)}
    </Box>
    <Typography variant="caption" color="textSecondary" sx={{ display: "block", borderTop: 1, borderColor: "divider", mt: 1.25, pt: 1 }}>색상은 장소를 구분합니다. 원천 시각과 영역 크기가 달라 인구 수가 혼잡도나 위험도를 뜻하지 않습니다. 기록 없는 시간은 채우지 않습니다.</Typography>
    <DashboardDialog id="compare-table-title" title="시간별 추정 인구 범위 비교" open={tableOpen} onClose={() => setTableOpen(false)}>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>각 시간대의 마지막 유효 관측입니다. 추정 범위와 인구 기준 시각을 함께 표시합니다. 조회 시작/끝에 걸친 시간대는 일부 구간입니다.</Typography>
      <TableContainer tabIndex={0} aria-label="시간별 비교 표 스크롤"><Table size="small">
        <caption className="sr-only">{history.meta.dataset === "demo" ? "시연용 합성 데이터" : "저장된 실데이터"}. 선택한 장소의 동일 시간대 추정 인구 범위. 한국 시간.</caption>
        <TableHead><TableRow><TableCell scope="col">시간대 시작</TableCell>{series.map((item) => <TableCell key={item.code} scope="col" sx={{ color: item.color }}>{item.areaName}</TableCell>)}</TableRow></TableHead>
        <TableBody>{timeline.map((hour, index) => <TableRow key={hour.start}>
          <TableCell component="th" scope="row">{formatDateTime(new Date(hour.start).toISOString())}{hour.partial ? " / 일부" : ""}</TableCell>
          {series.map((item) => { const point = item.hours[index]?.point; return <TableCell key={item.code}>{point ? <>
            <Typography variant="body2" sx={numericText}>{formatNumber(point.min)}~{formatNumber(point.max)}명</Typography>
            <Typography variant="caption" color="textSecondary">기준 {formatDateTime(point.observedAt)}</Typography>
          </> : "기록 없음"}</TableCell>; })}
        </TableRow>)}</TableBody>
      </Table></TableContainer>
    </DashboardDialog>
  </Box>;
}
