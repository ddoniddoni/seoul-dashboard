"use client";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import MuiLink from "@mui/material/Link";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import { AppShell } from "@/components/app-shell";
import { PanelHeading } from "@/components/panel-heading";
import { Icon } from "@/components/icon";
import { monitoredAreaCatalog as areaCatalog } from "@/lib/domain/catalog";
import { dashboardHref, type DashboardState } from "@/lib/url-state/dashboard";
import { numericText } from "@/theme/tokens";

const explanations = [
  { label: "인구의 의미", title: "한 숫자가 아닌 추정 범위", paragraphs: ["실제 서울시 인구 자료는 통신 신호를 바탕으로 추정한 값입니다. 현장 인원과 차이가 있을 수 있으며, 각 장소의 영역과 특성이 다릅니다.", "인구 수치는 상하한을 그대로 표시하며, 차트의 막대는 1시간별 마지막 관측에서 두 값의 평균인 추정 범위 중앙값을 표시합니다. 장소별 값을 더해 서울 전체 인구로 해석하지 않으며, 혼잡 단계만으로 현장의 안전 여부를 판단하지 않습니다."] },
  { label: "시각의 의미", title: "기준 시각과 수집 시각", paragraphs: ["기준 시각은 원천 값이 설명하는 시점입니다. 수집 시각은 그 자료를 받은 시점으로, 둘은 다를 수 있습니다. 인구와 날씨의 기준 시각도 각각 표시합니다.", "화면의 시간은 한국 시간입니다. 화면을 다시 조회한 시각이 원천 자료의 갱신 시각을 뜻하지 않습니다."] },
  { label: "과거 기록", title: "기록은 수집 이후부터", paragraphs: ["서울시 실시간 도시데이터의 과거 자료는 별도로 제공되지 않습니다. 실데이터 이력은 직접 수집을 시작한 시점부터 쌓으며, 빈 시간을 만들어 채우지 않습니다.", "차트는 최근 24시간의 기록 없는 구간을 채우지 않고, 1시간별 마지막 유효 관측값에서 계산한 추정 범위 중앙값을 표시합니다. 원래의 상하한은 툴팁과 기록 표에서 확인할 수 있습니다. 예측을 과거 관측처럼 표시하지 않습니다."] },
  { label: "조회와 갱신", title: "다시 조회의 의미", paragraphs: ["다시 조회는 저장된 자료를 확인하는 동작입니다. 방문자가 새로고침할 때마다 서울시 API를 수집하지 않습니다.", "수집된 자료만 표시하며, 누락된 값과 기록이 없는 시간대는 비워 둡니다."] },
];

export function DataInfo({ state }: { state: DashboardState }) {
  const catalog = areaCatalog;
  return <AppShell state={state} active="info" actions={<Button component={NextLink} variant="outlined" href={dashboardHref(state)} endIcon={<Icon name="arrow" />} nativeButton={false}>개요로 돌아가기</Button>}>
    <Box sx={{ mb: 3 }}><Typography variant="caption" color="primary">숫자를 이해하기 전에</Typography><Typography variant="h1" component="h1">데이터를 읽는 방법</Typography><Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>무엇을 보여주고, 어디까지 해석할 수 있는지 설명합니다.</Typography></Box>
    <Paper component="section" sx={{ p: { xs: 3, md: 4 }, mb: 2.5 }}><Typography variant="caption" color="primary">현재 제공 범위</Typography><Typography variant="h3" component="h2">서울시에서 수집한 20곳의 현황과 최근 24시간 기록</Typography><Typography color="textSecondary" sx={{ mt: 2, maxWidth: 680 }}>장소 이름과 코드는 공식 카탈로그를 사용합니다. 인구, 혼잡도와 날씨는 수집해 저장한 서울시 자료이며, 원천 기준 시각과 수집 시각을 구분해 표시합니다. 기록은 수집한 시점부터 제공하며, 비어 있는 과거를 만들어 채우지 않습니다.</Typography></Paper>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr)", md: "repeat(2,minmax(0,1fr))" }, gap: 2.5, mb: 2.5 }}>{explanations.map((item) => <Paper component="section" key={item.label} sx={{ p: 3 }}><Typography variant="caption" color="primary">{item.label}</Typography><Typography variant="h2" component="h2" sx={{ mb: 2 }}>{item.title}</Typography><Stack spacing={1.5}>{item.paragraphs.map((paragraph) => <Typography color="textSecondary" key={paragraph}>{paragraph}</Typography>)}</Stack></Paper>)}</Box>
    <Paper component="section" sx={{ mb: 2.5, overflow: "hidden" }}><PanelHeading title="자료의 상태" subtitle="프로젝트의 표시 정책 / 원천 제공 보장 아님" /><TableContainer tabIndex={0} aria-label="자료 최신성 정책 표"><Table size="small"><caption className="sr-only">인구와 날씨의 기준 시각에 따른 최신성 정책</caption><TableHead><TableRow>{["자료", "최신", "갱신 지연", "만료"].map((label) => <TableCell scope="col" key={label}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{[["인구", "30분 이내", "30분 초과~60분", "60분 초과"], ["날씨", "120분 이내", "120분 초과~240분", "240분 초과"]].map(([name, ...values]) => <TableRow key={name}><TableCell component="th" scope="row">{name}</TableCell>{values.map((value) => <TableCell key={value}>{value}</TableCell>)}</TableRow>)}</TableBody></Table></TableContainer><Typography color="textSecondary" sx={{ p: 3 }}>자료가 없으면 확인 불가로 표시합니다. 오래된 값을 다시 받아도 원천 기준 시각을 새 시각으로 바꾸지 않습니다. 종합 현황의 혼잡 분포는 유효한 원천 시각이 있는 마지막 관측을 집계합니다. 지연/만료 자료도 포함하며 관측 시각과 최신성 상태를 함께 표시합니다. 혼잡 단계를 확인할 수 없는 자료는 별도로 구분합니다.</Typography></Paper>
    <Paper component="section" sx={{ mb: 2.5, overflow: "hidden" }}><PanelHeading title={"공식 도시데이터 대상 " + catalog.length + "곳"} subtitle="공식 명칭을 그대로 사용 / 현재 수집 여부는 장소 상세에서 확인" /><List disablePadding>{catalog.map((area) => <ListItem key={area.areaCode} sx={{ px: 3, gap: 2, flexWrap: "wrap", borderBottom: 1, borderColor: "divider" }}><Typography  sx={{ fontWeight: 600,  flex: 1  }}>{area.areaName}</Typography><Typography variant="caption" color="textSecondary">{area.category}</Typography><Chip label={area.areaCode} variant="outlined" sx={numericText} /></ListItem>)}</List><Typography color="textSecondary" sx={{ p: 3 }}>서울 위치 개요는 공식 경계와 장소 표시 위치를 함께 보여줍니다. 자치구별 관측 현황을 뜻하지 않으며, 동일한 장소는 목록과 상세 화면에서도 탐색할 수 있습니다. 지도에서 최대 4배 확대와 드래그 이동을 지원합니다.</Typography></Paper>
    <Paper component="section" sx={{ p: 3 }}><Typography variant="caption" color="primary">공식 출처</Typography><Typography component="h2" variant="h2">서울특별시 서울 열린데이터광장</Typography><Typography color="textSecondary" sx={{ my: 2 }}>공식 장소 카탈로그: 2026년 4월 2일 수정 첨부 목록. 장소 자료의 이용허락은 공공누리 제1유형으로 출처 표시가 필요합니다. 위치 개요의 자치구 경계 기준일은 2025년 6월 30일입니다.</Typography><Stack direction={{ xs: "column", md: "row" }}  sx={{ gap: 2 }}><MuiLink href="https://data.seoul.go.kr/dataList/OA-21285/F/1/datasetView.do">서울시 실시간 도시데이터 ↗</MuiLink><MuiLink href="https://data.seoul.go.kr/dataVisual/seoul/guide.do">서울시 공식 데이터 설명 ↗</MuiLink><MuiLink href="https://data.seoul.go.kr/opendata/seoulStay/grid_viewer.html">자치구 경계의 공식 출처 ↗</MuiLink></Stack></Paper>
  </AppShell>;
}
