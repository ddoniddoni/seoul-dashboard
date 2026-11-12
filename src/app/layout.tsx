import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import { themeStorage } from "@/theme/tokens";

export const metadata: Metadata = {
  title: "SEOUL PULSE | 서울 도시 데이터",
  description: "서울 주요 20곳의 혼잡도와 추정 인구 범위, 최근 24시간 흐름을 비교하는 도시 데이터 대시보드. 서울시 자료의 기준 시각과 최신성을 함께 확인합니다.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <InitColorSchemeScript attribute="data" defaultMode="dark" modeStorageKey={themeStorage.mode} colorSchemeStorageKey={themeStorage.scheme} />
        <AppRouterCacheProvider><Providers>{children}</Providers></AppRouterCacheProvider>
      </body>
    </html>
  );
}
