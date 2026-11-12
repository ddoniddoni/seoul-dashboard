"use client";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { StateNotice } from "@/components/data-status";

export default function NotFound() {
  return <Box component="main" id="main" tabIndex={-1} sx={{ minHeight: "100dvh", display: "grid", placeContent: "center", p: 3 }}><Typography variant="caption" color="primary" align="center">SEOUL PULSE / 404</Typography><StateNotice headingComponent="h1" title="찾을 수 없는 장소입니다" description="등록된 장소 목록에서 다시 선택하세요."><Button variant="contained" component={NextLink} href="/demo" nativeButton={false}>시연 장소 목록 열기</Button></StateNotice></Box>;
}
