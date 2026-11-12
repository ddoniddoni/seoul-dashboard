"use client";

import { createContext, useContext, useState, type Dispatch, type SetStateAction } from "react";

type ShellPreferences = { collapsed: boolean; setCollapsed: Dispatch<SetStateAction<boolean>> };
const ShellPreferencesContext = createContext<ShellPreferences | null>(null);

// 메뉴를 이동해도 사이드바 너비를 유지하는 화면 전용 상태. 서버 자료나 URL 선택은 저장하지 않는다.
export function ShellPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return <ShellPreferencesContext value={{ collapsed, setCollapsed }}>{children}</ShellPreferencesContext>;
}

export function useShellPreferences() {
  const preferences = useContext(ShellPreferencesContext);
  if (!preferences) throw new Error("사이드바 설정 Provider가 필요합니다.");
  return preferences;
}
