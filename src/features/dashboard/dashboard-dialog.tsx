"use client";

import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import { Icon } from "@/components/icon";

export function DashboardDialog({ id, title, open, onClose, children }: {
  id: string; title: string; open: boolean; onClose: () => void; children: ReactNode;
}) {
  return <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" aria-labelledby={id}>
    <DialogTitle id={id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: 1 }}>
      {title}<IconButton aria-label={title + " 닫기"} onClick={onClose}><Icon name="close" /></IconButton>
    </DialogTitle>
    <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>{children}</DialogContent>
  </Dialog>;
}
