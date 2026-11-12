"use client";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { StateNotice } from "@/components/data-status";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <Box component="main" id="main" tabIndex={-1} sx={{ minHeight: "100dvh", display: "grid", placeContent: "center", p: 3 }}><Typography variant="caption" color="primary" align="center">SEOUL PULSE</Typography><StateNotice headingComponent="h1" error title="화면을 불러오지 못했습니다" description="잠시 뒤 다시 시도하세요."><Button variant="contained" onClick={reset}>다시 시도</Button></StateNotice></Box>;
}
