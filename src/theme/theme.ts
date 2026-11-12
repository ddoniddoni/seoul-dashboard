"use client";

import { createTheme, alpha, type PaletteOptions } from "@mui/material/styles";
import { colorSchemes, pulseColors as colors, type PulseColors, type ShellColors, type ComparisonColors, type CardDepth } from "./tokens";

declare module "@mui/material/styles" {
  interface Palette { pulse: PulseColors; shell: ShellColors; comparison: ComparisonColors; cardDepth: CardDepth }
  interface PaletteOptions { pulse?: PulseColors; shell?: ShellColors; comparison?: ComparisonColors; cardDepth?: CardDepth }
}

function palette(mode: "light" | "dark"): PaletteOptions {
  const { pulse, shell, comparison, cardDepth } = colorSchemes[mode];
  return {
    mode, pulse, shell, comparison, cardDepth,
    primary: { main: pulse.accent }, background: { default: pulse.background, paper: pulse.surface },
    text: { primary: pulse.text, secondary: pulse.muted }, divider: pulse.border,
    success: { main: pulse.relaxed }, warning: { main: pulse.normal }, error: { main: pulse.busy },
    action: { hover: pulse.hover, selected: alpha(pulse.accent, 0.12) },
  };
}

export const theme = createTheme({
  cssVariables: { colorSchemeSelector: "data" },
  defaultColorScheme: "dark",
  colorSchemes: { light: { palette: palette("light") }, dark: { palette: palette("dark") } },
  spacing: 8, shape: { borderRadius: 6 },
  breakpoints: { values: { xs: 0, sm: 600, md: 768, lg: 1200, xl: 1600 } },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", sans-serif',
    fontSize: 14, h1: { fontSize: "2rem", fontWeight: 500, lineHeight: 1.3, letterSpacing: 0, color: colors.heading },
    h2: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5, color: colors.heading }, h3: { fontSize: "1.5rem", fontWeight: 600, lineHeight: 1.5, color: colors.heading },
    h4: { fontSize: "0.875rem", fontWeight: 600, color: colors.heading }, body1: { fontSize: "0.875rem", lineHeight: 1.7 },
    body2: { fontSize: "0.875rem", lineHeight: 1.5 }, caption: { fontSize: "0.75rem", lineHeight: 1.6 },
    button: { fontSize: "0.875rem", textTransform: "none", fontWeight: 500 },
  },
  components: {
    MuiCssBaseline: { styleOverrides: {
      body: { wordBreak: "keep-all", overflowWrap: "anywhere" }, "h1,h2,h3,h4,p,figure,dl": { margin: 0 },
      ":focus-visible": { outline: `2px solid ${colors.accent}`, outlineOffset: 3 },
      "@media (prefers-reduced-motion: reduce)": { "*,*::before,*::after": { animation: "none !important", transition: "none !important", scrollBehavior: "auto !important" } },
    } },
    MuiPaper: { defaultProps: { variant: "outlined" }, styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { defaultProps: { disableElevation: true }, styleOverrides: { root: { minHeight: 40, borderRadius: 6 }, outlined: { borderColor: colors.border } } },
    MuiIconButton: { styleOverrides: { root: { minWidth: 44, minHeight: 44 } } },
    MuiOutlinedInput: { styleOverrides: { root: { backgroundColor: colors.background, fontSize: 14 } } },
    MuiTextField: { defaultProps: { size: "small", variant: "outlined" } },
    MuiChip: { defaultProps: { size: "small" }, styleOverrides: { root: { borderRadius: 5 }, label: { fontSize: 12 } } },
    MuiTableRow: { styleOverrides: { root: { "&:hover td, &:hover th[scope=row]": { backgroundColor: colors.hover } } } },
    MuiTableCell: { styleOverrides: { root: { fontSize: 12, whiteSpace: "nowrap", borderColor: colors.border }, head: { color: colors.heading, backgroundColor: colors.background } } },
    MuiAccordion: { defaultProps: { disableGutters: true }, styleOverrides: { root: { boxShadow: "none", backgroundImage: "none", "&::before": { display: "none" } } } },
    MuiToggleButton: { styleOverrides: { root: { minHeight: 40, fontSize: 12, textTransform: "none", borderRadius: 5 } } },
    MuiLink: { defaultProps: { underline: "hover" } }, MuiAlert: { styleOverrides: { root: { fontSize: 12, alignItems: "center" } } },
  },
});
