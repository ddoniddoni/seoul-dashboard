"use client";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import type { ReactNode } from "react";

export function PanelHeading({ id, title, subtitle, action, density = "standard" }: { id?: string; title: ReactNode; subtitle?: string; action?: ReactNode; density?: "standard" | "compact" }) {
  return <Box sx={{ px: density === "compact" ? 2 : { xs: 2, md: 3 }, py: density === "compact" ? 0.5 : 1.5, minHeight: density === "compact" ? 40 : 56, flexShrink: 0, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5 }}>
    <Box><Typography component="h2" variant="h2" id={id}>{title}</Typography>{subtitle ? <Typography variant="caption" color="textSecondary">{subtitle}</Typography> : null}</Box>{action}
  </Box>;
}
