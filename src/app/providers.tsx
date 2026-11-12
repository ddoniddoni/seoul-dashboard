"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import MuiLink from "@mui/material/Link";
import { ShellPreferencesProvider } from "@/components/shell-preferences";
import { theme } from "@/theme/theme";
import { themeStorage } from "@/theme/tokens";

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } }));
  return <ThemeProvider theme={theme} defaultMode="dark" modeStorageKey={themeStorage.mode} colorSchemeStorageKey={themeStorage.scheme} disableTransitionOnChange><CssBaseline /><MuiLink href="#main" className="skip-link">본문으로 이동</MuiLink><QueryClientProvider client={client}><ShellPreferencesProvider>{children}</ShellPreferencesProvider></QueryClientProvider></ThemeProvider>;
}
