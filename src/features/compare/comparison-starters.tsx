"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { Icon } from "@/components/icon";
import { monitoredAreaCatalog } from "@/lib/domain/catalog";
import { pulseColors } from "@/theme/tokens";

const presets = [
  { title: "상권의 하루", description: "세 상권의 시간대별 인구 흐름을 나란히 봅니다", codes: ["POI014", "POI007", "POI068"] },
  { title: "도심 관광지", description: "도심의 관광 장소에 사람이 모이는 시간을 살펴봅니다", codes: ["POI003", "POI008", "POI009"] },
  { title: "공원 이용 흐름", description: "세 공원의 추정 인구가 시간에 따라 어떻게 달라지는지 봅니다", codes: ["POI091", "POI101", "POI105"] },
].map((preset) => ({ ...preset, places: preset.codes.flatMap((code) => {
  const area = monitoredAreaCatalog.find((item) => item.areaCode === code);
  return area ? [area] : [];
}) })).filter((preset) => preset.places.length === preset.codes.length);

export function ComparisonStarters({ selected, onSelect }: { selected: string[]; onSelect: (places: string[]) => void }) {
  const first = monitoredAreaCatalog.find((area) => area.areaCode === selected[0]);
  if (first) {
    const suggestions = presets.flatMap((preset) => preset.places)
      .filter((area, index, all) => area.areaCode !== first.areaCode && all.findIndex((item) => item.areaCode === area.areaCode) === index).slice(0, 4);
    return <Paper component="section" aria-labelledby="compare-next-heading" sx={{ p: { xs: 2, md: 3 } }}>
      <Typography component="h2" variant="h2" id="compare-next-heading">함께 비교할 장소를 골라보세요</Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>선택한 {first.areaName}의 기록과 같은 시간축으로 비교합니다.</Typography>
      <Stack direction="row" sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}>{suggestions.map((area) => <Button key={area.areaCode} variant="outlined" onClick={() => onSelect([first.areaCode, area.areaCode])}>{area.areaName} 추가</Button>)}</Stack>
    </Paper>;
  }

  return <Box component="section" aria-labelledby="compare-start-heading">
    <Typography component="h2" variant="h2" id="compare-start-heading">이 조합으로 시작해 보세요</Typography>
    <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, mb: 2 }}>조합을 고르면 저장된 실제 기록을 바로 비교합니다. 장소는 이후에도 바꿀 수 있습니다.</Typography>
    <Box sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(3, minmax(0, 1fr))" }, gap: 2 }}>
      {presets.map((preset) => <Paper component="article" key={preset.title} sx={{ p: { xs: 2, md: 3 }, display: "flex", flexDirection: "column", minWidth: 0 }}>
        <Typography component="h3" variant="h2">{preset.title}</Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>{preset.description}</Typography>
        <Stack component="ul" sx={{ listStyle: "none", p: 0, my: 2, flex: 1 }}>{preset.places.map((area) => <Typography component="li" key={area.areaCode} variant="body2" sx={{ py: 1, color: pulseColors.heading, borderBottom: 1, borderColor: "divider" }}>{area.areaName}</Typography>)}</Stack>
        <Button variant="outlined" endIcon={<Icon name="arrow" />} aria-label={`${preset.title} 3곳 비교`} onClick={() => onSelect(preset.codes)}>이 3곳 비교</Button>
      </Paper>)}
    </Box>
    <Typography variant="caption" color="textSecondary" sx={{ display: "block", mt: 1.5 }}>장소별 영역 크기가 다릅니다. 인구 수와 혼잡 단계는 구분해서 읽어주세요. 기록이 없는 시간대는 비워 둡니다.</Typography>
  </Box>;
}
