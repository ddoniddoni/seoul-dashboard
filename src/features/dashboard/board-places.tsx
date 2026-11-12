"use client";

import NextLink from "next/link";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import Tooltip from "@mui/material/Tooltip";
import { CongestionBadge } from "@/components/data-status";
import { Icon } from "@/components/icon";
import type { AreaLatest, Freshness } from "@/lib/contracts/dashboard";
import { monitoredAreaCatalog } from "@/lib/domain/catalog";
import { congestionLabels, formatDateTime, formatRange, freshnessLabels, getFreshness } from "@/lib/domain/metrics";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { boardPlacesLayout, boardPlaceRow, congestionTint, numericText, pulseColors, translucent } from "@/theme/tokens";

const catalog = monitoredAreaCatalog.toSorted((a, b) => a.areaName.localeCompare(b.areaName, "ko"));
const ageColor = (age: Freshness) => age === "expired" ? "error.main" : age === "stale" ? "warning.main" : "text.secondary";

export function BoardPlaces({ items, state, now, onStatus }: {
  items: AreaLatest[]; state: DashboardState; now: number; onStatus: () => void;
}) {
  const places = catalog.map((area) => {
    const population = items.find((item) => item.areaCode === area.areaCode)?.population;
    const value = population?.value ?? null;
    return { ...area, value, observedAt: population?.observedAt ?? null,
      age: value ? getFreshness(population!.observedAt, now) : "missing" as Freshness };
  });
  const sharedTime = places.every((place) => place.value && place.observedAt === places[0].observedAt) ? places[0].observedAt : null;
  const sharedAge = places.every((place) => place.age === places[0].age) ? places[0].age : null;
  const sourceLabel = sharedTime ? `원천 ${formatDateTime(sharedTime)}` : "장소별 원천 시각 확인";
  const statusLabel = sharedAge ? `전체 ${freshnessLabels[sharedAge]}` : (["stale", "expired", "missing"] as const)
    .map((age) => ({ age, count: places.filter((place) => place.age === age).length }))
    .filter(({ count }) => count > 0).map(({ age, count }) => `${freshnessLabels[age]} ${count}곳`).join(" / ");

  return <Paper component="section" aria-labelledby="board-places-heading" sx={{ minWidth: 0, overflow: "hidden" }}>
    <Stack direction="row" sx={{ px: 2, py: 0.5, minHeight: 44, alignItems: "center", flexWrap: "wrap", gap: 1, borderBottom: 1, borderColor: "divider" }}>
      <Typography component="h2" variant="h2" id="board-places-heading">장소별 현황 <Box component="span" sx={{ ml: 1, color: "text.secondary", fontWeight: 400 }}>{places.length}곳</Box></Typography>
      <Button onClick={onStatus} color="inherit" size="small" aria-label="장소별 원천 시각과 자료 상태 확인"
        sx={{ ml: { xs: 0, md: "auto" }, order: { xs: 3, md: 0 }, width: { xs: "100%", md: "auto" }, justifyContent: "flex-start", px: 0.5, py: 0, minHeight: 28 }}>
        <Typography component="span" id="board-places-summary" variant="caption" color="textSecondary">{sourceLabel}<Box component="span" sx={{ ml: 1, color: sharedAge ? ageColor(sharedAge) : "text.secondary" }}>{statusLabel}</Box></Typography>
      </Button>
      <Button component={NextLink} nativeButton={false} href={dashboardHref(state, {}, "/places")} size="small" sx={{ ml: { xs: "auto", md: 0 }, minHeight: 28 }} endIcon={<Icon name="arrow" />}>상세 탐색</Button>
    </Stack>
    <List aria-label="전체 모니터링 장소 현황" aria-describedby="board-places-summary" disablePadding sx={boardPlacesLayout}>
      {places.map((place) => {
        const level = place.value?.congestion ?? "unknown";
        const elevated = level === "slightly-busy" || level === "busy";
        const selected = place.areaCode === state.area;
        const description = `${place.areaName} / 원천 ${formatDateTime(place.observedAt)} / ${freshnessLabels[place.age]}`;
        return <ListItem key={place.areaCode} disablePadding sx={{ minWidth: 0, borderBottom: 1, borderColor: "divider" }}>
          <Tooltip title={description} describeChild placement="top" enterDelay={400}>
            <ListItemButton component={NextLink} nativeButton={false} href={dashboardHref(state, { area: place.areaCode })} scroll={false}
              selected={selected} data-area-code={place.areaCode} aria-current={selected ? "true" : undefined}
              aria-label={`${description}, ${congestionLabels[level]}, ${formatRange(place.value)}${place.value ? "명" : ""}, 인구 흐름 보기`}
              sx={{ ...boardPlaceRow, borderLeftColor: selected ? "primary.main" : pulseColors[level],
                bgcolor: !selected && elevated ? translucent(pulseColors[level], congestionTint[level]) : undefined,
                "&.Mui-focusVisible": { outline: `2px solid ${pulseColors.accent}`, outlineOffset: -2 } }}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, minWidth: 0 }}>
                <Typography className="board-place-name" noWrap sx={{ color: selected ? "primary.main" : pulseColors.heading, fontSize: 16, fontWeight: 500, lineHeight: "20px", minWidth: 0 }}>{place.areaName}</Typography>
                {!sharedAge ? <Typography variant="caption" sx={{ color: ageColor(place.age), flexShrink: 0 }}>{freshnessLabels[place.age]}</Typography> : null}
              </Stack>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography className="board-place-value" sx={{ ...numericText, color: place.value ? "text.primary" : "text.secondary", fontSize: { xs: 16, lg: 14, xl: 18 }, lineHeight: "24px", whiteSpace: "nowrap" }}>
                  {formatRange(place.value)}<Typography component="span" variant="caption" color="textSecondary" sx={{ ml: 0.5 }}>{place.value ? "명" : ""}</Typography>
                </Typography>
                <CongestionBadge level={level} />
              </Stack>
            </ListItemButton>
          </Tooltip>
        </ListItem>;
      })}
    </List>
  </Paper>;
}
