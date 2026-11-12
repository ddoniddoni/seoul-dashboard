"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Tooltip from "@mui/material/Tooltip";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import { useColorScheme } from "@mui/material/styles";

export function ThemeModeToggle({ compact = false }: { compact?: boolean }) {
  const { mode, systemMode, setMode } = useColorScheme();
  const selected = mode === "system" ? systemMode : mode;
  const dark = selected !== "light";
  const label = dark ? "다크 모드" : "라이트 모드";
  const action = dark ? "라이트 모드로 전환" : "다크 모드로 전환";
  return <Tooltip title={action} describeChild placement="right">
    <Box component="span" sx={{ display: "inline-flex", width: compact ? 44 : "100%" }}>
      <Button variant="text" color="inherit" disabled={!selected} onClick={() => setMode(dark ? "light" : "dark")}
        aria-label={`${label}, ${action}`}
        sx={{ width: "100%", minWidth: 44, minHeight: 44, px: compact ? 0 : 1.5, gap: 1,
          justifyContent: compact ? "center" : "flex-start", color: "text.secondary", fontSize: 13,
          "&:hover": { color: "text.primary", bgcolor: "action.hover" } }}>
        {dark ? <DarkModeOutlined sx={{ fontSize: 18, flexShrink: 0 }} /> : <LightModeOutlined sx={{ fontSize: 18, flexShrink: 0 }} />}
        {!compact ? label : null}
      </Button>
    </Box>
  </Tooltip>;
}
