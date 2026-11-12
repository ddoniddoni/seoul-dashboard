"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import LinearProgress from "@mui/material/LinearProgress";
import { BarChart } from "@mui/x-charts/BarChart";
import type { AreaLatest, Congestion } from "@/lib/contracts/dashboard";
import { congestionLabels, getOverviewMetrics } from "@/lib/domain/metrics";
import { PanelHeading } from "@/components/panel-heading";
import { StateNotice } from "@/components/data-status";
import { dashboardPanel, numericText, pulseColors } from "@/theme/tokens";

const levels: Congestion[] = ["busy", "slightly-busy", "normal", "relaxed", "unknown"];

export default function CongestionChart({ items, now, monitored }: { items: AreaLatest[]; now: number; monitored: number }) {
  const { coverage } = getOverviewMetrics(items, now, monitored);
  const available = items.filter((item) => item.population.value);
  const counts = levels.map((level) => available.filter((item) => item.population.value?.congestion === level).length);
  const delayed = coverage.stale + coverage.expired;
  return <Paper component="section" aria-labelledby="congestion-heading" sx={dashboardPanel}>
    <PanelHeading id="congestion-heading" title="혼잡 분포" subtitle="저장 자료 기준 / 필터 적용 전" />
    <Box sx={{ px: 2.5, pt: 2 }}>
      <Stack direction="row" sx={{ alignItems: "baseline", gap: 1 }}>
        <Typography sx={{ ...numericText, fontSize: 28, fontWeight: 500 }}>{available.length}<Typography component="span" variant="body2" color="textSecondary" sx={{ ml: 0.75 }}>곳</Typography></Typography>
        <Typography variant="caption" color="textSecondary">인구 자료 보유 / 전체 {monitored}곳</Typography>
      </Stack>
      <Typography variant="caption" color={delayed ? "warning" : "textSecondary"}>갱신 지연 또는 만료 {delayed}곳 포함. 현재 현장과 다를 수 있습니다.</Typography>
    </Box>
    {available.length ? <Box component="figure" sx={{ px: 1.5, py: 1, flex: 1 }}>
      <BarChart height={218} layout="horizontal" borderRadius={2}
        margin={{ left: 0, right: 28, top: 10, bottom: 0 }}
        yAxis={[{ scaleType: "band", categoryGapRatio: 0.76, data: levels.map((level) => congestionLabels[level]), width: 76, disableLine: true, disableTicks: true,
          colorMap: { type: "ordinal", colors: levels.map((level) => pulseColors[level]) } }]}
        xAxis={[{ min: 0, max: Math.max(1, ...counts) * 1.18, tickMinStep: 1, tickNumber: 4, height: 28, disableLine: true, disableTicks: true }]}
        series={[{ data: counts, label: "장소 수", barLabel: (item) => `${item.value ?? 0}곳`, barLabelPlacement: "outside", valueFormatter: (value) => `${value ?? 0}곳` }]}
        grid={{ vertical: false }} hideLegend skipAnimation
        aria-label={"저장 자료 혼잡 분포. " + levels.map((level, index) => `${congestionLabels[level]} ${counts[index]}곳`).join(", ")}
        sx={{ "& .MuiBarLabel-root": { fill: pulseColors.text, fontWeight: 500 }, "& .MuiChartsGrid-line": { strokeDasharray: "3 4", strokeOpacity: 0.5 }, "& .MuiChartsAxis-tickLabel": { fill: pulseColors.muted, fontSize: 12 } }}
      />
      <Typography component="figcaption" variant="caption" color="textSecondary" sx={{ display: "block", px: 1 }}>
        {levels.map((level, index) => `${congestionLabels[level]} ${counts[index]}곳`).join(" / ")}
      </Typography>
    </Box> : <StateNotice compact title="집계할 인구 자료가 없습니다" description="자료가 없는 장소를 여유나 0명으로 표시하지 않습니다." />}
    <Box sx={{ p: 2.5, mt: "auto", borderTop: 1, borderColor: "divider", bgcolor: "background.default" }}>
      <Stack direction="row" sx={{ justifyContent: "space-between", gap: 1, mb: 1 }}><Typography variant="body2" sx={{ fontWeight: 500 }}>자료 최신성</Typography><Typography variant="body2" sx={numericText}>{coverage.fresh}<Box component="span" sx={{ color: "text.secondary" }}> / {monitored}곳 최신</Box></Typography></Stack>
      <LinearProgress variant="determinate" value={monitored ? coverage.fresh / monitored * 100 : 0} aria-label="전체 모니터링 장소 중 최신 인구 자료 비율" sx={{ height: 3, borderRadius: 1, bgcolor: "divider" }} />
      <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1 }}>인구 기준 30분 이내 최신 / 지연 및 만료 {delayed}곳 / 자료 없음 {coverage.missing}곳</Typography>
    </Box>
  </Paper>;
}
