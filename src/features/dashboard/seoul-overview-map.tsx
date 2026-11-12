"use client";
import { Component, useId, useRef } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import map from "@/lib/geo/seoul-overview.json";
import type { AreaLatest } from "@/lib/contracts/dashboard";
import { congestionLabels } from "@/lib/domain/metrics";
import { type DashboardState } from "@/lib/url-state/dashboard";
import { StateNotice } from "@/components/data-status";
import { PanelHeading } from "@/components/panel-heading";
import { dashboardPanel, numericText, pulseColors, translucent, wallboardMedia } from "@/theme/tokens";
import { MapMarkers } from "./map-markers";
import { useMapCamera } from "./use-map-camera";

const geometryByCode = new Map(map.places.map((place) => [place.areaCode, place]));

export class MapBoundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <Paper component="section"><StateNotice title="위치 개요를 표시하지 못했습니다" description="장소 목록과 상세 화면에서 계속 탐색할 수 있습니다." /></Paper> : this.props.children;
  }
}

export function SeoulOverviewMap({ items, state, now, openDetails = false, presentation = "standard" }: { items: AreaLatest[]; state: DashboardState; now: number; openDetails?: boolean; presentation?: "standard" | "board" }) {
  const demo = state.dataset === "demo";
  const board = presentation === "board";
  const mapId = useId();
  const viewportRef = useRef<HTMLDivElement>(null);
  const camera = useMapCamera(map.viewBox[2], map.viewBox[3], viewportRef);
  return <Paper component="section" aria-labelledby="map-heading" sx={{ ...dashboardPanel, overflow: "hidden" }}>
    <PanelHeading id="map-heading" title="서울 장소 지도" density={board ? "compact" : "standard"} subtitle={board ? undefined : openDetails ? "표식은 장소, 숫자는 가까이 모인 장소 수입니다" : "표식이나 숫자를 선택해 장소별 인구 흐름을 확인하세요"} action={
      <Stack direction="row" role="group" aria-label="지도 배율 조절" sx={{ alignItems: "center", flexShrink: 0 }}>
        <Typography component="span" variant="caption" aria-live="polite" aria-atomic="true" aria-label={`지도 배율 ${Math.round(camera.zoom * 100)}퍼센트`} sx={{ ...numericText, color: "text.secondary", width: 42, textAlign: "center" }}>{Math.round(camera.zoom * 100)}%</Typography>
        <Tooltip title="지도 축소"><span><IconButton size="small" aria-label="지도 축소" aria-controls={mapId} disabled={!camera.canZoomOut} onClick={camera.zoomOut} sx={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}><RemoveRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="지도 확대"><span><IconButton size="small" aria-label="지도 확대" aria-controls={mapId} disabled={!camera.canZoomIn} onClick={camera.zoomIn} sx={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}><AddRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
        <Tooltip title="서울 전체 보기"><span><IconButton size="small" aria-label="서울 전체 보기" aria-controls={mapId} disabled={!camera.canZoomOut} onClick={camera.reset} sx={{ width: 32, height: 32, minWidth: 32, minHeight: 32 }}><RestartAltRoundedIcon fontSize="small" /></IconButton></span></Tooltip>
      </Stack>
    } />
    <Box sx={{ display: "grid", placeItems: board ? "center" : "start center", minHeight: board ? 260 : 0, flex: 1, bgcolor: "background.default", py: board ? 0 : 2, ...(board ? { [wallboardMedia]: { minHeight: 0, containerType: "size" } } : {}) }}>
    <Box ref={viewportRef} id={mapId} role="group" aria-label="서울 지도 탐색" aria-describedby={`${mapId}-help`} tabIndex={0} {...camera.handlers} onDragStart={(event) => event.preventDefault()}
      sx={{ position: "relative", width: "100%", maxWidth: 680, aspectRatio: "720 / 520", mx: "auto", overflow: "clip", userSelect: "none", touchAction: camera.canZoomOut ? "pinch-zoom" : "pan-y pinch-zoom", cursor: camera.dragging ? "grabbing" : camera.canZoomOut ? "grab" : "default", "&:focus-visible": { outline: `2px solid ${pulseColors.accent}`, outlineOffset: -2 }, ...(board ? { [wallboardMedia]: { width: "100%", height: "100cqh", aspectRatio: "auto", maxWidth: "none" } } : {}) }}>
      <Box component="svg" viewBox={camera.viewBox} role="img" aria-labelledby={`${mapId}-title ${mapId}-description`} sx={{ width: "100%", height: "100%", display: "block" }}>
        <title id={`${mapId}-title`}>서울 자치구 경계와 선택 장소의 위치</title><desc id={`${mapId}-description`}>{demo ? "자치구는 지리적 배경입니다. 혼잡도는 시연 대상 장소만의 합성 값이며 서울 전체나 자치구별 혼잡도를 뜻하지 않습니다." : "자치구는 지리적 배경입니다. 혼잡도는 공개 대상 장소의 저장된 원천 값이며 서울 전체나 자치구별 혼잡도를 뜻하지 않습니다."} 같은 정보는 장소 목록에서 볼 수 있습니다.</desc>
        <g>{map.districts.map((district) => <path key={district.name} d={district.path} fill={pulseColors.hover} stroke={pulseColors.border} strokeWidth={1} vectorEffect="non-scaling-stroke" fillRule="evenodd" />)}</g>
        <Box component="g" aria-hidden="true" sx={{ display: { xs: "none", md: "block" } }}>{map.districts.map((district) => <text key={district.name} x={district.label[0]} y={district.label[1]} textAnchor="middle" fill={pulseColors.muted} fontSize={12}>{district.name}</text>)}</Box>
        <g aria-hidden="true">{items.map((item) => {
          const geometry = geometryByCode.get(item.areaCode);
          const color = pulseColors[item.population.value?.congestion ?? "unknown"];
          return geometry ? <path key={item.areaCode} d={geometry.path} fill={translucent(color, state.area === item.areaCode ? 0.35 : 0.10)} stroke={color} strokeWidth={state.area === item.areaCode ? 1.8 : 0.65} vectorEffect="non-scaling-stroke" fillRule="evenodd" /> : null;
        })}</g>
      </Box>
      <Typography aria-hidden="true" variant="caption" color="textSecondary" sx={{ position: "absolute", top: 12, right: 16 }}>↑ N</Typography>
      <MapMarkers points={items.flatMap((area) => {
        const geometry = geometryByCode.get(area.areaCode);
        return geometry ? [{ area, ...camera.project(geometry.position[0], geometry.position[1]), sourceX: geometry.position[0], sourceY: geometry.position[1] }] : [];
      })} width={camera.viewportSize.width} height={camera.viewportSize.height} state={state} now={now} openDetails={openDetails} revealPoint={camera.revealPoint} />
      {!items.length ? <Paper sx={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", p: 2 }}><Typography variant="body2">표시할 장소가 없습니다.</Typography><Typography variant="caption" color="textSecondary">아래 목록과 데이터 상태를 확인하세요.</Typography></Paper> : null}
      <Box component="span" id={`${mapId}-help`} sx={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>확대 후 드래그하거나 방향키로 이동합니다. 더하기와 빼기 키로 배율을 바꾸고 Home 키로 서울 전체를 봅니다. 같은 장소는 아래 목록에서도 선택할 수 있습니다.</Box>
    </Box></Box>
    <Stack direction="row" aria-label={demo ? "시연 혼잡 단계 범례" : "혼잡 단계 범례"} sx={{ justifyContent: "center", flexWrap: "wrap", gap: 1.25, px: 1.5, py: 1, flexShrink: 0 }}>{(["relaxed", "normal", "slightly-busy", "busy", "unknown"] as const).map((level) => <Typography variant="caption" color="textSecondary" key={level}><Box component="span" aria-hidden="true" sx={{ display: "inline-block", bgcolor: pulseColors[level], width: 6, height: 6, borderRadius: "50%", mr: 0.75 }} />{congestionLabels[level]}{board ? ` ${items.filter((item) => (item.population.value?.congestion ?? "unknown") === level).length}곳` : ""}</Typography>)}</Stack>
    <Typography variant="caption" color="textSecondary" sx={{ display: "block", px: 2, py: board ? 0.5 : 1.25, borderTop: 1, borderColor: "divider", flexShrink: 0 }}>{camera.canZoomOut ? "드래그 / 방향키로 이동할 수 있습니다." : "확대하면 드래그로 이동할 수 있습니다."} 숫자를 누르면 가까운 장소 목록이 열립니다.</Typography>
  </Paper>;
}
