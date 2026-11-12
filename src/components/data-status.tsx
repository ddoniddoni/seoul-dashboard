"use client";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Skeleton from "@mui/material/Skeleton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { Congestion, Freshness } from "@/lib/contracts/dashboard";
import { congestionLabels, freshnessLabels } from "@/lib/domain/metrics";
import { dashboardLayout, dashboardPanel, explorationLayout, metricLayout, pulseColors, translucent } from "@/theme/tokens";
import { Icon } from "./icon";

export function CongestionBadge({ level }: { level: Congestion }) {
  const color = pulseColors[level];
  return <Chip label={congestionLabels[level]} sx={{ color, bgcolor: `color-mix(in srgb, ${color} 10%, ${pulseColors.surface})`, border: `1px solid ${translucent(color, 0.25)}` }} />;
}
export function FreshnessBadge({ freshness }: { freshness: Freshness }) {
  return <Chip variant="outlined" icon={<Icon name="clock" />} label={freshnessLabels[freshness]} sx={{ color: freshness === "stale" ? "warning.main" : freshness === "expired" ? "error.main" : "text.secondary", border: 0, "& .MuiChip-icon": { color: "inherit", fontSize: 16 } }} />;
}
export function StateNotice({ title, description, children, error = false, headingComponent = "h2", compact = false }: {
  title: string; description: string; children?: React.ReactNode; error?: boolean; headingComponent?: "h1" | "h2"; compact?: boolean;
}) {
  return <Stack role={error ? "alert" : undefined} spacing={compact ? 1 : 2} sx={{ alignItems: "center", flex: 1, minHeight: compact ? 160 : 240, justifyContent: "center", px: 2, py: compact ? 2 : 5, textAlign: "center" }}>
    <Paper sx={{ p: 1.25, color: error ? "error.main" : "primary.main" }}><Icon name={error ? "info" : "pulse"} /></Paper>
    <Typography component={headingComponent} variant={headingComponent}>{title}</Typography><Typography variant="body2" color="textSecondary" sx={{ maxWidth: 450 }}>{description}</Typography>{children}
  </Stack>;
}
export function DashboardSkeleton() {
  return <Stack role="status" aria-label="데이터 불러오는 중" spacing={2}>
    <Box component="span" className="sr-only">데이터를 불러오고 있습니다.</Box>
    <Paper sx={metricLayout}>{[0, 1, 2, 3].map((id) => <Box key={id} sx={{ px: 3, py: 2 }}><Skeleton width="60%" /><Skeleton height={36} width="45%" /><Skeleton width="75%" /></Box>)}</Paper>
    <Box sx={dashboardLayout}>{["인구 흐름", "혼잡 분포"].map((label) => <Paper key={label} sx={{ ...dashboardPanel, p: 2.5 }}>
      <Skeleton width="55%" /><Skeleton variant="rounded" height={340} sx={{ mt: 2 }} />
    </Paper>)}</Box>
    <Box sx={explorationLayout}>{["서울 지도", "장소 목록"].map((label) => <Paper key={label} sx={{ p: 2.5 }}><Skeleton width="45%" /><Skeleton variant="rounded" height={240} sx={{ mt: 2 }} /></Paper>)}</Box>
  </Stack>;
}
