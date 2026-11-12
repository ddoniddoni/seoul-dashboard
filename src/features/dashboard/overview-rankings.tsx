"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import { PanelHeading } from "@/components/panel-heading";
import { CongestionBadge } from "@/components/data-status";
import { Icon } from "@/components/icon";
import type { AreaLatest } from "@/lib/contracts/dashboard";
import { congestionLabels, formatDateTime, formatRange, formatTime, freshnessLabels, getFreshness } from "@/lib/domain/metrics";
import { getPlaceRankings, type PlaceRanking } from "@/lib/domain/place-rankings";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { congestionTint, dashboardPanel, largeWallboardMedia, numericText, pulseColors, rankingRow, shortWallboardMedia, translucent, wallboardMedia } from "@/theme/tokens";

function RankingList({ title, id, ranking, state, now, kind }: { title: string; id: string; ranking: PlaceRanking; state: DashboardState; now: number; kind: "congestion" | "population" }) {
  const leadingLevel = ranking.entries[0]?.area.population.value?.congestion ?? "unknown";
  const headingColor = kind === "population" ? pulseColors.accent : pulseColors[leadingLevel];
  return <Box component="section" aria-labelledby={id} sx={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
    <Stack direction="row" sx={{ px: 1.5, py: 1, alignItems: "center", justifyContent: "space-between", gap: 1,
      bgcolor: translucent(headingColor, 0.06), borderBottom: `1px solid ${translucent(headingColor, 0.2)}` }}>
      <Typography component="h3" variant="body2" id={id} sx={{ color: headingColor, fontWeight: 600, [largeWallboardMedia]: { fontSize: 16 } }}>{title}</Typography>
      <Typography variant="caption" color="textSecondary" sx={{ flexShrink: 0 }}>
        {ranking.eligible}곳{ranking.excluded > 0 ? ` / ${ranking.excluded}곳 제외` : " 기준"}
      </Typography>
    </Stack>
    {ranking.entries.length ? <List disablePadding sx={{ flex: 1, display: "flex", flexDirection: "column", p: 0.5, gap: 0.5, [shortWallboardMedia]: { gap: 0.25 } }}>
      {ranking.entries.map(({ area, rank, tied }) => {
        const freshness = getFreshness(area.population.observedAt, now);
        const level = area.population.value!.congestion;
        const color = kind === "population" ? pulseColors.accent : pulseColors[level];
        const tint = kind === "population" ? 0.05 : congestionTint[level];
        const label = `${tied ? "공동 " : ""}${rank}위, ${area.areaName}, ${congestionLabels[area.population.value!.congestion]}, 추정 인구 ${formatRange(area.population.value)}명, 원천 ${formatDateTime(area.population.observedAt)}, ${freshnessLabels[freshness]}`;
        return <ListItem key={area.areaCode} disablePadding sx={{ flex: 1, minWidth: 0, "&:nth-of-type(4)": { [shortWallboardMedia]: { display: "none" } } }}>
          <Tooltip title={label} describeChild placement="top" enterDelay={400}>
            <ListItemButton component={NextLink} nativeButton={false} href={dashboardHref(state, { area: area.areaCode })} scroll={false}
              aria-label={label + ". 인구 흐름 보기"} data-ranking-area={area.areaCode}
              sx={{ ...rankingRow, borderLeftColor: color, bgcolor: translucent(color, tint),
                "&:hover, &.Mui-focusVisible": { bgcolor: translucent(color, tint + 0.04) } }}>
              <Stack aria-hidden="true" sx={{ width: 28, flexShrink: 0, alignItems: "center" }}>
                <Typography sx={{ ...numericText, fontSize: 20, [largeWallboardMedia]: { fontSize: 26 }, lineHeight: 1.1, color }}>{rank}</Typography>
                {tied ? <Typography variant="caption" color="textSecondary" sx={{ fontSize: 11, lineHeight: 1.2 }}>공동</Typography> : null}
              </Stack>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                  <Typography noWrap variant="body2" sx={{ color: pulseColors.heading, fontWeight: 500, [largeWallboardMedia]: { fontSize: 18 } }}>{area.areaName}</Typography>
                  <CongestionBadge level={area.population.value!.congestion} />
                </Stack>
                <Stack direction="row" sx={{ alignItems: "baseline", justifyContent: "space-between", gap: 0.5 }}>
                  <Typography variant="caption" sx={{ ...numericText, color: kind === "population" ? color : "text.primary", whiteSpace: "nowrap", [largeWallboardMedia]: { fontSize: 16 } }}>{formatRange(area.population.value)}명</Typography>
                  <Typography variant="caption" sx={{ color: freshness === "expired" ? "error.main" : "text.secondary", whiteSpace: "nowrap" }}>{formatTime(area.population.observedAt)}</Typography>
                </Stack>
              </Box>
            </ListItemButton>
          </Tooltip>
        </ListItem>;
      })}
    </List> : <Typography variant="body2" color="textSecondary" sx={{ px: 2, py: 3 }}>순위를 계산할 관측이 없습니다.</Typography>}
  </Box>;
}

export function OverviewRankings({ items, state, now, monitored }: { items: AreaLatest[]; state: DashboardState; now: number; monitored: number }) {
  const rankings = getPlaceRankings(items, now, monitored);
  return <Paper component="section" aria-labelledby="overview-rankings-heading" sx={{ ...dashboardPanel, minHeight: 0 }}>
    <PanelHeading id="overview-rankings-heading" title="장소별 순위" density="compact" action={<Tooltip describeChild title="마지막 관측의 혼잡 단계 높은 순과 추정 범위 중앙값이 작은 순입니다. 지연/만료 자료도 포함합니다. 동률은 공동 순위로 표시하고 장소명순으로 나열합니다. 각 최대 4곳, 낮은 모니터에서는 3곳을 보여줍니다.">
      <Typography tabIndex={0} variant="caption" color="textSecondary">마지막 관측 기준</Typography>
    </Tooltip>} />
    <Box sx={{ display: "grid", flex: 1, gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))" },
      "& > section + section": { borderTop: { xs: "1px solid var(--mui-palette-divider)", sm: 0 }, borderLeft: { xs: 0, sm: "1px solid var(--mui-palette-divider)" } },
      [wallboardMedia]: { minHeight: 0 } }}>
      <RankingList id="congestion-ranking-heading" title="혼잡 단계 높은 순" kind="congestion" ranking={rankings.congestion} state={state} now={now} />
      <RankingList id="population-ranking-heading" title="추정 인구 적은 순" kind="population" ranking={rankings.population} state={state} now={now} />
    </Box>
    <Stack direction="row" sx={{ px: 1.5, py: 0.5, borderTop: 1, borderColor: "divider", gap: 1, alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
      <Typography variant="caption" color="textSecondary">인구가 적다고 더 여유로운 것은 아닙니다</Typography>
      <Button component={NextLink} nativeButton={false} href={dashboardHref(state, { area: null }, "/places")} size="small" endIcon={<Icon name="arrow" />} sx={{ px: 0, py: 0, minHeight: 24, fontSize: 12, flexShrink: 0 }}>전체 탐색</Button>
    </Stack>
  </Paper>;
}
