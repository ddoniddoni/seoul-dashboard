"use client";

import NextLink from "next/link";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { areaCatalog } from "@/lib/domain/catalog";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { comparisonColors } from "@/theme/tokens";
import { Icon } from "@/components/icon";

export function ComparisonTray({ state, onChange }: { state: DashboardState; onChange: (places: string[]) => void }) {
  if (!state.places.length) return null;
  return <Paper component="section" aria-label="선택한 비교 장소" sx={{ position: "sticky", bottom: 12, zIndex: 10, p: 1.5, display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5, borderColor: "divider", boxShadow: "none" }}>
    <Typography variant="body2" sx={{ fontWeight: 600 }} role="status">비교 {state.places.length}/3곳</Typography>
    <Box sx={{ display: "flex", flex: { xs: "1 0 100%", sm: 1 }, order: { xs: 1, sm: 0 }, gap: 1, flexWrap: "wrap", minWidth: 0 }}>
      {state.places.map((code, index) => <Chip key={code} label={areaCatalog.find((area) => area.areaCode === code)?.areaName ?? code}
        onDelete={() => onChange(state.places.filter((place) => place !== code))} sx={{ color: comparisonColors[index], maxWidth: "100%" }} />)}
    </Box>
    <Button color="inherit" size="small" onClick={() => onChange([])}>전체 해제</Button>
    {state.places.length >= 2 ? <Button component={NextLink} href={dashboardHref(state, { range: "24h" }, "/compare")} variant="contained" startIcon={<Icon name="compare" />} nativeButton={false}>비교하기</Button>
      : <Typography variant="caption" color="textSecondary">한 곳을 더 선택하세요</Typography>}
  </Paper>;
}
