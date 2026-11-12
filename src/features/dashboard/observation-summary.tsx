"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { AreaLatest } from "@/lib/contracts/dashboard";
import { congestionLabels, formatDateTime, getObservationSummary } from "@/lib/domain/metrics";
import { Icon } from "@/components/icon";
import { congestionTint, metricLayout, numericText, pulseColors, translucent } from "@/theme/tokens";

export function ObservationSummary({ items, now, monitored, onStatus }: {
  items: AreaLatest[]; now: number; monitored: number; onStatus: () => void;
}) {
  const summary = getObservationSummary(items, now, monitored);
  const { coverage } = summary;
  const source = summary.oldestAt === null ? "원천 시각 없음" : summary.oldestAt === summary.newestAt
    ? `원천 ${formatDateTime(summary.newestAt)}`
    : `원천 ${formatDateTime(summary.oldestAt)} ~ ${formatDateTime(summary.newestAt)}`;
  const freshness = [
    { label: "최신", count: coverage.fresh }, { label: "지연", count: coverage.stale },
    { label: "만료", count: coverage.expired }, { label: "자료 없음", count: coverage.missing },
  ].filter((part) => part.count > 0).map((part) => `${part.label} ${part.count}곳`).join(" / ");

  return <Paper component="section" aria-label="마지막 관측 기준 혼잡 분포" aria-describedby="observation-basis" sx={metricLayout}>
    {(["relaxed", "normal", "slightly-busy", "busy"] as const).map((level, index) => <Stack component="article" direction="row" key={level}
      sx={{ px: 2, py: 1, alignItems: "center", justifyContent: "space-between", gap: 1, minWidth: 0,
        bgcolor: summary.counts[level] ? translucent(pulseColors[level], congestionTint[level]) : "transparent",
        boxShadow: `inset 0 2px 0 ${translucent(pulseColors[level], summary.counts[level] ? 1 : 0.3)}`,
        borderLeft: { xs: index % 2 ? "1px solid var(--mui-palette-divider)" : 0, md: index ? "1px solid var(--mui-palette-divider)" : 0 }, borderTop: { xs: index > 1 ? "1px solid var(--mui-palette-divider)" : 0, md: 0 } }}>
      <Typography variant="body2" sx={{ color: pulseColors[level] }}>{congestionLabels[level]}</Typography>
      <Typography sx={{ ...numericText, fontSize: 28, lineHeight: 1.125, color: !summary.classified || !summary.counts[level] ? "text.secondary" : pulseColors[level] }}>
        {summary.classified ? summary.counts[level] : "—"}<Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 0.75 }}>{summary.classified ? "곳" : ""}</Typography>
      </Typography>
    </Stack>)}
    <Stack direction="row" sx={{ gridColumn: "1 / -1", px: 2, py: 0.25, borderTop: 1, borderColor: "divider", alignItems: "center", justifyContent: "space-between", gap: { xs: 0.5, md: 1.5 }, flexWrap: "wrap" }}>
      <Typography id="observation-basis" variant="caption" color="textSecondary">
        <Box component="span" sx={{ color: pulseColors.heading }}>마지막 관측 기준</Box> / {summary.available}/{monitored}곳 자료 / {source}
        {summary.unknown > 0 ? ` / 혼잡 확인 불가 ${summary.unknown}곳` : ""}
      </Typography>
      <Button size="small" color="inherit" onClick={onStatus} aria-label={`자료 최신성 상세: ${freshness || "대상 장소 없음"}`} endIcon={<Icon name="arrow" />}
        sx={{ px: 0, py: 0, minHeight: 24, fontSize: 12, color: coverage.expired || coverage.missing ? "error.main" : coverage.stale ? "warning.main" : "text.secondary" }}>
        {freshness || "대상 장소 없음"}
      </Button>
    </Stack>
  </Paper>;
}
