"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MuiLink from "@mui/material/Link";
import Alert from "@mui/material/Alert";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Tooltip from "@mui/material/Tooltip";
import Chip from "@mui/material/Chip";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Fullscreen from "@mui/icons-material/Fullscreen";
import FullscreenExit from "@mui/icons-material/FullscreenExit";
import MenuRounded from "@mui/icons-material/MenuRounded";
import ViewSidebarOutlined from "@mui/icons-material/ViewSidebarOutlined";
import PlaceOutlined from "@mui/icons-material/PlaceOutlined";
import { areaCatalog } from "@/lib/domain/catalog";
import type { DashboardState } from "@/lib/url-state/dashboard";
import { dashboardHref } from "@/lib/url-state/dashboard";
import { shellColors, shellLayout, shortWallboardMedia, wallboardMedia } from "@/theme/tokens";
import { Icon } from "./icon";
import { useShellPreferences } from "./shell-preferences";
import { ThemeModeToggle } from "./theme-mode-toggle";

export type ShellPage = "overview" | "places" | "map" | "detail" | "compare" | "status" | "info";
const navigation = [
  { key: "overview", label: "종합 현황", path: "/", icon: "overview" },
  { key: "places", label: "장소 탐색", path: "/places", icon: "search" },
  { key: "map", label: "지도 보기", path: "/map", icon: "map" },
  { key: "compare", label: "장소 비교", path: "/compare", icon: "compare" },
  { key: "status", label: "자료 상태", path: "/data-status", icon: "clock" },
  { key: "info", label: "데이터 안내", path: "/data-info", icon: "info" },
] as const;

function Sidebar({ state, active, compact, onNavigate, onToggle, toggleLabel }: {
  state: DashboardState; active: ShellPage; compact: boolean; onNavigate: () => void; onToggle: () => void; toggleLabel: string;
}) {
  const selectedArea = areaCatalog.find((area) => area.areaCode === state.area);
  return <Stack sx={{ height: "100%", minHeight: 0 }}>
    <Tooltip title={compact ? "SEOUL PULSE 종합 현황" : ""} placement="right">
      <MuiLink component={NextLink} href={dashboardHref(state, { area: null })} onClick={onNavigate} underline="none" color="text.primary" aria-label="SEOUL PULSE 종합 현황"
        sx={{ display: "flex", alignItems: "center", gap: 1, px: 2.75, minHeight: shellLayout.headerHeight, flexShrink: 0, borderBottom: 1, borderColor: "divider" }}>
        <Icon name="pulse" color="primary" sx={{ fontSize: 30, flexShrink: 0 }} />
        {!compact ? <Box sx={{ minWidth: 0 }}>
          <Typography sx={{ fontFamily: '"Avenir Next", "Helvetica Neue", sans-serif', fontWeight: 600, letterSpacing: ".02em", fontSize: 16, whiteSpace: "nowrap" }}>SEOUL <Box component="span" sx={{ color: "primary.main" }}>PULSE</Box></Typography>
          <Typography variant="caption" color="textSecondary" sx={{ fontSize: 12 }}>서울 도시 데이터</Typography>
        </Box> : null}
      </MuiLink>
    </Tooltip>
    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 1.5, py: 3 }}>
      {!compact ? <Typography variant="caption" color="textSecondary" sx={{ display: "block", px: 1.5, mb: 1, fontSize: 12 }}>워크스페이스</Typography> : null}
      <List component="nav" aria-label="주요 메뉴" disablePadding sx={{ display: "grid", gap: 0.5 }}>
        {navigation.filter((item) => item.key !== "info").map((item, index) => <Tooltip title={compact ? item.label : ""} placement="right" key={item.key}>
          <ListItemButton component={NextLink} href={dashboardHref(state, item.key === "overview" ? { area: null } : {}, item.path)} onClick={onNavigate} nativeButton={false}
            selected={active === item.key} aria-current={active === item.key ? "page" : undefined} aria-label={item.label}
            sx={{ minHeight: { xs: 44, lg: 36 }, py: 0.5, px: 1.5, borderRadius: 1, mt: index === 4 ? 3 : 0, color: active === item.key ? "primary.main" : "text.secondary",
              "&.Mui-selected": { bgcolor: shellColors.active, color: "primary.main" }, "&.Mui-selected:hover": { bgcolor: shellColors.active } }}>
            <ListItemIcon sx={{ minWidth: compact ? 0 : 28, color: "inherit" }}><Icon name={item.icon} sx={{ fontSize: 18 }} /></ListItemIcon>
            {!compact ? <><ListItemText sx={{ my: 0 }} primary={item.label} slotProps={{ primary: { sx: { fontSize: 14, lineHeight: "20px", fontWeight: active === item.key ? 600 : 400 } } }} />{item.key === "compare" && state.places.length ? <Typography variant="caption" color="textSecondary" sx={{ fontVariantNumeric: "tabular-nums", ml: 1 }}>{state.places.length}</Typography> : null}</> : null}
          </ListItemButton>
        </Tooltip>)}
      </List>
      {selectedArea ? <Box sx={{ mt: 3 }}>
        {!compact ? <Typography variant="caption" color="textSecondary" sx={{ display: "block", px: 1.5, mb: 1 }}>선택한 장소</Typography> : null}
        <Tooltip title={compact ? selectedArea.areaName + " 상세" : ""} placement="right">
          <ListItemButton component={NextLink} href={dashboardHref(state, {}, "/areas/" + selectedArea.areaCode)} nativeButton={false} onClick={onNavigate}
            aria-label={selectedArea.areaName + " 상세"} aria-current={active === "detail" ? "page" : undefined} selected={active === "detail"}
            sx={{ px: 1.5, minHeight: { xs: 44, lg: 36 }, py: 0.5, borderRadius: 1, color: active === "detail" ? "primary.main" : "text.secondary" }}>
            <ListItemIcon sx={{ color: "inherit", minWidth: compact ? 0 : 28 }}><PlaceOutlined sx={{ fontSize: 18 }} /></ListItemIcon>
            {!compact ? <ListItemText sx={{ my: 0 }} primary={selectedArea.areaName} slotProps={{ primary: { sx: { fontSize: 14, lineHeight: "20px", fontWeight: 500 } } }} /> : null}
          </ListItemButton>
        </Tooltip>
      </Box> : null}
    </Box>
    {!compact ? <Box sx={{ mx: 2, mt: 2, pt: 2, flexShrink: 0, borderTop: 1, borderColor: "divider" }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 0.5 }}><Icon name="info" color="primary" /><Typography variant="caption" sx={{ fontWeight: 500 }}>{state.dataset === "demo" ? "데이터 안내" : "서울시 도시데이터"}</Typography></Stack>
      <Typography variant="caption" color="textSecondary">{state.dataset === "demo" ? "장소별 추정 범위와 원천 시각" : "저장된 자료와 원천 기준 시각"}</Typography>
    </Box> : null}
    <Box sx={{ p: 2, flexShrink: 0, display: "grid", gap: 1 }}>
      <ThemeModeToggle compact={compact} />
      <Tooltip title={toggleLabel} placement="right">
        <Button variant="outlined" aria-label={toggleLabel} aria-expanded={!compact} onClick={onToggle}
          sx={{ width: compact ? 44 : "100%", minWidth: 44, minHeight: 44, px: 1.125, gap: 1.25, justifyContent: "flex-start", color: "text.secondary", fontSize: 12,
            "&:hover": { color: "text.primary", bgcolor: "action.hover", borderColor: "text.secondary" } }}>
          <ViewSidebarOutlined sx={{ fontSize: 24, flexShrink: 0, transform: "scaleX(-1)" }} />
          {!compact ? <Box component="span">{toggleLabel}</Box> : null}
        </Button>
      </Tooltip>
    </Box>
  </Stack>;
}

export function AppShell({ state, active = "overview", actions, children, layout = "page" }: {
  state: DashboardState; active?: ShellPage; actions?: React.ReactNode; children: React.ReactNode; layout?: "page" | "dashboard" | "wallboard" | "detail" | "places" | "compare";
}) {
  const { collapsed, setCollapsed } = useShellPreferences();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  const wallboard = layout === "wallboard";
  const fitted = wallboard || layout === "detail" || layout === "places" || layout === "compare";
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  async function toggleFullscreen() {
    setFullscreenError(false);
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { setFullscreenError(true); }
  }
  const theme = useTheme();
  const mobileViewport = useMediaQuery(theme.breakpoints.down("lg"));
  const width = collapsed ? shellLayout.railWidth : shellLayout.sidebarWidth;
  const title = active === "detail" ? "장소 상세" : navigation.find((item) => item.key === active)?.label;
  return <Box sx={{ minHeight: "100dvh", display: "flex", ...(fitted ? { [wallboardMedia]: { height: "100dvh", minHeight: 0 } } : {}) }}>
    <Drawer variant="permanent" sx={{ display: fullscreen && wallboard ? "none" : { xs: "none", lg: "block" }, width, flexShrink: 0,
      "& .MuiDrawer-paper": { width, boxSizing: "border-box", bgcolor: shellColors.sidebar, borderRadius: 0, border: 0, borderRight: 1, borderColor: "divider" } }}>
      <Sidebar state={state} active={active} compact={collapsed} onNavigate={() => setMobileOpen(false)} onToggle={() => setCollapsed((value) => !value)} toggleLabel={collapsed ? "사이드바 펼치기" : "사이드바 접기"} />
    </Drawer>
    <Drawer open={mobileOpen && mobileViewport} onClose={() => setMobileOpen(false)} slotProps={{ paper: { "aria-label": "워크스페이스 메뉴" } }} sx={{ display: { lg: "none" }, "& .MuiDrawer-paper": { width: shellLayout.sidebarWidth + 28, maxWidth: "85vw", bgcolor: shellColors.sidebar, borderRadius: 0 } }}>
      <Sidebar state={state} active={active} compact={false} onNavigate={() => setMobileOpen(false)} onToggle={() => setMobileOpen(false)} toggleLabel="메뉴 닫기" />
    </Drawer>
    <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex", flexDirection: "column" }}>
      <AppBar component="header" position="sticky" elevation={0} sx={{ bgcolor: shellColors.header, color: "text.primary", border: 0, borderBottom: 1, borderColor: "divider" }}>
        <Toolbar sx={{ minHeight: { xs: 60, lg: shellLayout.headerHeight }, gap: 1, px: { xs: 1.5, md: 3 }, flexWrap: "wrap", py: 0.5 }}>
          <IconButton aria-label="메뉴 열기" aria-expanded={mobileOpen} aria-haspopup="dialog" onClick={() => setMobileOpen(true)} sx={{ display: { lg: "none" } }}><MenuRounded /></IconButton>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flex: 1 }}>
            <Typography variant="body2" color="textSecondary" sx={{ display: { xs: "none", sm: "block" } }}>{wallboard ? "SEOUL PULSE" : "워크스페이스"}</Typography>
            <Box sx={{ display: { xs: "none", sm: "flex" }, color: "text.secondary" }}><Icon name="arrow" sx={{ fontSize: 16 }} /></Box>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{title}</Typography>
          </Stack>
          {state.dataset === "demo" ? <Chip variant="outlined" label="합성 데이터" sx={{ color: "text.secondary", fontSize: 12 }} /> : null}
          {wallboard ? <Tooltip title={fullscreen ? "전체화면 종료 (Esc)" : "모니터에 전체화면으로 표시"}><Button variant="text" color="inherit" onClick={() => { void toggleFullscreen(); }} startIcon={fullscreen ? <FullscreenExit /> : <Fullscreen />} sx={{ display: { xs: "none", lg: "inline-flex" }, fontSize: 12 }}>{fullscreen ? "전체화면 종료" : "전체화면"}</Button></Tooltip> : null}
          {actions ? <Stack direction="row" sx={{ gap: 0.5, alignItems: "center", width: { xs: "100%", sm: "auto" }, justifyContent: "flex-end", "& .MuiButton-root": { minHeight: { xs: 44, sm: 36 }, fontSize: 12 } }}>{actions}</Stack> : null}
        </Toolbar>
      </AppBar>
      {!wallboard && state.dataset === "demo" ? <Alert severity="info" icon={<Icon name="info" />} sx={{ borderRadius: 0, px: { xs: 2, md: 3 }, py: 0, borderBottom: 1, borderColor: "divider", flexShrink: 0 }}>
        <Typography variant="caption">시연용 합성 데이터 / 실제 서울 현황이 아님</Typography>
      </Alert> : null}
      {fullscreenError ? <Alert severity="warning" onClose={() => setFullscreenError(false)}>브라우저에서 전체화면을 열지 못했습니다. 브라우저의 전체화면 메뉴를 사용해 주세요.</Alert> : null}
      <Box component="main" id="main" tabIndex={-1} sx={{ maxWidth: fitted ? "none" : shellLayout.contentMaxWidth, width: "100%", mx: "auto", p: fitted ? { xs: 2, lg: 1.5 } : { xs: 2, md: 3, xl: 4 }, flex: 1, minWidth: 0, minHeight: 0,
        ...(layout === "dashboard" || layout === "detail" || layout === "places" || layout === "compare" ? { display: "flex", flexDirection: "column", gap: 2 } : {}),
        ...(layout === "detail" || layout === "places" || layout === "compare" ? { "& > *": { flexShrink: 0 }, [wallboardMedia]: { gap: 1.5 } } : {}),
        ...(layout === "compare" ? { [shortWallboardMedia]: { gap: 1 } } : {}) }}>{children}</Box>
    </Box>
  </Box>;
}
