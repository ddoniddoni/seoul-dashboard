const darkColors = {
  background: "#111315", surface: "#191c1f", hover: "#22262a", border: "#34393f",
  text: "#eff1f3", heading: "#b0c4dd", muted: "#8f9ba8", accent: "#91baff",
  relaxed: "#68d5a5", normal: "#f0ca70", "slightly-busy": "#f6a16b", busy: "#f2828e", unknown: "#929aa5",
  chartLine: "#91baff",
  historyBar: "#6086b7", historyHighlight: "#c6dcff", historyGrid: "#30363c",
} as const;
export type PulseColors = { [Key in keyof typeof darkColors]: string };
export type ShellColors = { sidebar: string; header: string; active: string };
export type ComparisonColors = { first: string; second: string; third: string };
export type CardDepth = { resting: string; hovered: string };
export const colorSchemes = {
  dark: {
    pulse: darkColors,
    shell: { sidebar: "#141618", header: "#17191c", active: "#282f38" },
    comparison: { first: "#91baff", second: "#bba5ff", third: "#d6e4f5" },
    cardDepth: {
      resting: "0 2px 3px rgb(0 0 0 / 28%), 0 8px 14px -8px rgb(0 0 0 / 65%), inset 0 1px 0 rgb(255 255 255 / 7%)",
      hovered: "0 3px 5px rgb(0 0 0 / 32%), 0 12px 20px -10px rgb(0 0 0 / 70%), inset 0 1px 0 rgb(255 255 255 / 10%)",
    },
  },
  light: {
    pulse: {
      background: "#f3f5f7", surface: "#ffffff", hover: "#e7ebef", border: "#cbd3dc",
      text: "#202b38", heading: "#48617d", muted: "#5b6775", accent: "#275f9f",
      relaxed: "#16704e", normal: "#8c6515", "slightly-busy": "#ae4f19", busy: "#bb3650", unknown: "#606b77",
      chartLine: "#275f9f", historyBar: "#477bad", historyHighlight: "#173f73", historyGrid: "#dce2e8",
    },
    shell: { sidebar: "#f9fafb", header: "#ffffff", active: "#e2eaf5" },
    comparison: { first: "#275f9f", second: "#7653ad", third: "#287271" },
    cardDepth: {
      resting: "0 1px 2px rgb(24 39 58 / 8%), 0 6px 12px -6px rgb(24 39 58 / 22%), inset 0 1px 0 rgb(255 255 255 / 95%)",
      hovered: "0 2px 4px rgb(24 39 58 / 10%), 0 10px 18px -8px rgb(24 39 58 / 25%), inset 0 1px 0 rgb(255 255 255 / 95%)",
    },
  },
} satisfies Record<"light" | "dark", { pulse: PulseColors; shell: ShellColors; comparison: ComparisonColors; cardDepth: CardDepth }>;

// text는 핵심 값/본문, heading은 제목/항목명, muted는 시각/단위/설명이다.
// MUI가 두 모드의 CSS 변수를 생성한다. SVG와 차트도 같은 토큰으로 즉시 전환한다.
export const pulseColors = Object.fromEntries(Object.keys(darkColors).map((key) => [key, `var(--mui-palette-pulse-${key})`])) as PulseColors;
export const shellColors: ShellColors = {
  sidebar: "var(--mui-palette-shell-sidebar)", header: "var(--mui-palette-shell-header)", active: "var(--mui-palette-shell-active)",
};
export const themeStorage = { mode: "seoul-pulse-theme-v1", scheme: "seoul-pulse-color-scheme-v1" } as const;
export function translucent(color: string, opacity: number) {
  return `color-mix(in srgb, ${color} ${opacity * 100}%, transparent)`;
}
// 마지막 관측의 혼잡 단계만 표현한다. 순위나 인구 수를 위험도 색상으로 바꾸지 않는다.
export const congestionTint = { relaxed: 0.04, normal: 0.05, "slightly-busy": 0.07, busy: 0.09, unknown: 0.03 } as const;
export const dataFont = '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
export const numericText = { fontFamily: dataFont, fontVariantNumeric: "tabular-nums" } as const;
export const shellLayout = { sidebarWidth: 232, railWidth: 76, headerHeight: 64, contentMaxWidth: 1760 } as const;
// 큰 화면은 높이를 나눠 쓰고, 작은 창과 확대 화면은 자연스럽게 세로로 읽는다.
export const wallboardMedia = "@media (min-width: 1280px) and (min-height: 800px)";
export const largeWallboardMedia = "@media (min-width: 1800px) and (min-height: 1000px)";
export const shortWallboardMedia = "@media (min-width: 1280px) and (min-height: 800px) and (max-height: 899px)";
export const rankingRow = {
  minWidth: 0, height: "100%", minHeight: 48, px: 1, py: 0.5, borderRadius: 0.5, gap: 1,
  borderLeft: "4px solid", transition: "background-color 150ms ease-out",
  "&.Mui-focusVisible": { outline: `2px solid ${pulseColors.accent}`, outlineOffset: -2 },
  "& .MuiChip-root": { height: 20, flexShrink: 0, "& .MuiChip-label": { px: 0.75 } },
  [shortWallboardMedia]: { minHeight: 44, py: 0.25 },
} as const;
export const wallboardLayout = {
  display: "grid", gap: 1.5, minWidth: 0,
  [wallboardMedia]: { height: "100%", minHeight: 0, gridTemplateRows: "auto auto minmax(0, 1fr) auto" },
  [shortWallboardMedia]: { gap: 1 },
} as const;
export const wallboardAnalysis = {
  display: "grid", gap: 1.5, minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "minmax(0, 0.85fr) minmax(0, 1.15fr)" },
  [wallboardMedia]: { minHeight: 0, gridTemplateRows: "minmax(0, 1fr)" },
} as const;
export const boardPlacesLayout = {
  display: "grid", columnGap: 2, px: 1.5, py: 0.5,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", sm: "repeat(2, minmax(0, 1fr))", lg: "repeat(4, minmax(0, 1fr))" },
  [wallboardMedia]: { gridTemplateRows: "repeat(5, minmax(0, 1fr))", gridAutoFlow: "column", "& > li:nth-of-type(5n)": { borderBottom: 0 } },
  "@media (min-width: 1440px) and (min-height: 800px)": {
    gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gridTemplateRows: "repeat(4, minmax(0, 1fr))",
    "& > li:nth-of-type(5n)": { borderBottom: "1px solid var(--mui-palette-divider)" },
    "& > li:nth-of-type(4n)": { borderBottom: 0 },
  },
} as const;
export const boardPlaceRow = {
  display: "block", minWidth: 0, width: "100%", px: 1, py: 1, borderRadius: 0.5, borderLeft: "2px solid transparent",
  "&.Mui-selected": { bgcolor: "action.selected" },
  "& .MuiChip-root": { height: 20, flexShrink: 0, "& .MuiChip-label": { px: 0.75 } },
  [wallboardMedia]: { minHeight: 44, py: 0.25, "& .board-place-value": { lineHeight: "20px" } },
  "@media (min-width: 1440px) and (min-height: 800px)": { minHeight: 52, py: 0.75 },
} as const;
// 현황과 분석을 먼저 읽고 지도로 탐색하는 반응형 현황판.
export const dashboardLayout = {
  display: "grid", gap: 2, minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", lg: "minmax(0, 2.5fr) minmax(260px, 1fr)" },
  alignItems: "stretch",
} as const;
export const detailAnalysisLayout = {
  ...dashboardLayout,
  [wallboardMedia]: { flex: 1, minHeight: 480, gridTemplateRows: "minmax(min-content, 1fr)" },
} as const;
export const explorationLayout = {
  display: "grid", gap: 2, minWidth: 0,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(2, minmax(0, 1fr))" },
} as const;
export const dashboardPanel = {
  minWidth: 0, display: "flex", flexDirection: "column", overflow: "hidden",
} as const;
export const placeGrid = { minColumnWidth: 300, maxColumns: 4, minRowHeight: 152, compactRowHeight: 144, columnGap: 12, rowGap: 12, fallbackRows: 3 } as const;
export const placesPanelLayout = {
  ...dashboardPanel, bgcolor: "background.default",
  [wallboardMedia]: { flex: "1 1 0", minHeight: 390 },
} as const;
export const placeCard = {
  flexDirection: "column", flexWrap: "nowrap", alignItems: "stretch", overflow: "hidden",
  border: "1px solid", borderColor: `color-mix(in srgb, ${pulseColors.border} 75%, ${pulseColors.muted})`,
  borderRadius: "8px", bgcolor: "background.paper", boxShadow: "var(--mui-palette-cardDepth-resting)",
  transition: "border-color 150ms ease-out, box-shadow 150ms ease-out",
  "&:hover": { borderColor: "text.secondary", boxShadow: "var(--mui-palette-cardDepth-hovered)" },
  "&:focus-within, &[data-selected=true]": { borderColor: "primary.main" },
} as const;
export const placeCardAction = {
  px: 2, py: 1.5, border: 0, borderRadius: 0,
  "&.Mui-focusVisible": { outline: `2px solid ${pulseColors.accent}`, outlineOffset: -3 },
} as const;
export const placeCardFooter = {
  alignItems: "center", justifyContent: "space-between", gap: 1, px: 1.5, py: 0.5, flexShrink: 0,
  borderTop: "1px solid", borderColor: "divider",
  bgcolor: `color-mix(in srgb, ${pulseColors.background} 45%, ${pulseColors.surface})`,
  "& .Mui-focusVisible": { outlineOffset: -2 },
} as const;
export const metricLayout = {
  display: "grid", gap: 0, flexShrink: 0, overflow: "hidden",
  gridTemplateColumns: { xs: "repeat(2, minmax(0, 1fr))", md: "repeat(4, minmax(0, 1fr))" },
} as const;

// 혼잡 단계 색과 분리한 비교 장소 식별 색상. URL의 장소 순서에 대응한다.
export const comparisonColors = ["var(--mui-palette-comparison-first)", "var(--mui-palette-comparison-second)", "var(--mui-palette-comparison-third)"] as const;
export const comparisonCards = {
  display: "grid", gap: 2,
  gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "repeat(auto-fit, minmax(240px, 1fr))" },
} as const;

export const comparisonPlot = {
  height: { xs: 250, lg: "clamp(180px, calc(100dvh - 680px), 340px)" }, minWidth: 0,
  [shortWallboardMedia]: { height: 160 },
} as const;
