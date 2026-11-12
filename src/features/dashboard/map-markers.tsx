"use client";

import { useId, useState } from "react";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MuiLink from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { AreaLatest } from "@/lib/contracts/dashboard";
import { groupMapMarkers } from "@/lib/geo/marker-groups";
import { congestionLabels, formatRange, freshnessLabels, getFreshness } from "@/lib/domain/metrics";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { numericText, pulseColors, translucent } from "@/theme/tokens";

type LocatedArea = { area: AreaLatest; x: number; y: number; sourceX: number; sourceY: number };

export function MapMarkers({ points, width, height, state, now, openDetails, revealPoint }: {
  points: LocatedArea[]; width: number; height: number; state: DashboardState; now: number; openDetails: boolean;
  revealPoint: (x: number, y: number) => void;
}) {
  const menuId = useId();
  const [menu, setMenu] = useState<{ anchor: HTMLElement; codes: string[] } | null>(null);
  const groups = groupMapMarkers(points.map((point) => ({ x: point.x / 100 * width, y: point.y / 100 * height, value: point })));
  const menuCodes = new Set(menu?.codes);
  const menuPlaces = points.filter((point) => menuCodes.has(point.area.areaCode));
  const href = (code: string) => dashboardHref(state, { area: code }, openDetails ? "/areas/" + code : "/");
  const label = (area: AreaLatest) => `${area.areaName}, ${congestionLabels[area.population.value?.congestion ?? "unknown"]}, ${formatRange(area.population.value)}${area.population.value ? "명" : ""}, ${freshnessLabels[area.population.value ? getFreshness(area.population.observedAt, now) : "missing"]}`;

  return <>
    {groups.map((group) => {
      const members = group.points.map((point) => point.value);
      const first = members[0];
      const selected = members.some((point) => point.area.areaCode === state.area);
      const key = members.map((point) => point.area.areaCode).sort().join(",");
      const position = { position: "absolute" as const, left: `calc(${group.x / width * 100}% - 18px)`, top: `calc(${group.y / height * 100}% - 18px)`,
        width: 36, height: 36, minWidth: 36, minHeight: 36, p: 0, borderRadius: "50%", zIndex: selected ? 3 : 2,
        "&:focus-visible": { outline: "2px solid", outlineColor: "primary.main", outlineOffset: 2, zIndex: 4 } };
      if (members.length > 1) return <Tooltip key={key} title={`${members.length}곳 보기: ${members.map((point) => point.area.areaName).join(", ")}`}>
        <Button aria-label={`가까운 장소 ${members.length}곳 선택: ${members.map((point) => point.area.areaName).join(", ")}`}
          aria-haspopup="menu" aria-expanded={menu?.codes.join(",") === members.map((point) => point.area.areaCode).join(",")} aria-controls={menu ? menuId : undefined}
          onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) revealPoint(first.sourceX, first.sourceY); }}
          onClick={(event) => setMenu({ anchor: event.currentTarget, codes: members.map((point) => point.area.areaCode) })}
          sx={{ ...position, ...numericText, bgcolor: "background.paper", color: "text.primary", border: "2px solid", borderColor: selected ? "primary.main" : "text.secondary", boxShadow: 2,
            "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" } }}>{members.length}</Button>
      </Tooltip>;
      const area = first.area;
      const color = pulseColors[area.population.value?.congestion ?? "unknown"];
      const fresh = area.population.value && getFreshness(area.population.observedAt, now) === "fresh";
      return <Tooltip key={key} title={label(area)}>
        <MuiLink component={NextLink} href={href(area.areaCode)} scroll={openDetails} underline="none"
          aria-current={selected ? "true" : undefined} aria-label={label(area) + (openDetails ? ". 상세 보기" : ". 인구 흐름 보기")}
          onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) revealPoint(first.sourceX, first.sourceY); }}
          sx={{ ...position, display: "grid", placeItems: "center", bgcolor: translucent(color, selected ? 0.2 : 0.08), "&:hover": { bgcolor: translucent(color, 0.24) } }}>
          <Box aria-hidden="true" sx={{ width: selected ? 16 : 11, height: selected ? 16 : 11, bgcolor: color, border: "2px solid", borderColor: "background.default", outline: `2px ${fresh ? "solid" : "dashed"} ${color}`, borderRadius: "50%" }} />
        </MuiLink>
      </Tooltip>;
    })}
    <Menu id={menuId} anchorEl={menu?.anchor} open={Boolean(menu) && menuPlaces.length > 0} onClose={() => setMenu(null)}
      slotProps={{ list: { "aria-label": "가까운 장소 선택" }, paper: { sx: { maxWidth: "calc(100vw - 32px)", minWidth: 280 } } }}>
      {menuPlaces.map(({ area }) => <MenuItem key={area.areaCode} component={NextLink} href={href(area.areaCode)} scroll={openDetails}
        selected={state.area === area.areaCode} onClick={() => setMenu(null)} sx={{ py: 1.25, gap: 1.5, whiteSpace: "normal" }}>
        <Box aria-hidden="true" sx={{ width: 9, height: 9, flexShrink: 0, borderRadius: "50%", bgcolor: pulseColors[area.population.value?.congestion ?? "unknown"] }} />
        <Stack sx={{ minWidth: 0 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{area.areaName}</Typography>
          <Typography variant="caption" color="textSecondary">{congestionLabels[area.population.value?.congestion ?? "unknown"]} / {formatRange(area.population.value)}{area.population.value ? "명" : ""}</Typography>
        </Stack>
      </MenuItem>)}
    </Menu>
  </>;
}
