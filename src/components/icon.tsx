"use client";
import CompareArrows from "@mui/icons-material/CompareArrows";
import MonitorHeartOutlined from "@mui/icons-material/MonitorHeartOutlined";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import ChevronRight from "@mui/icons-material/ChevronRight";
import Search from "@mui/icons-material/Search";
import Refresh from "@mui/icons-material/Refresh";
import AccessTime from "@mui/icons-material/AccessTime";
import MapOutlined from "@mui/icons-material/MapOutlined";
import Close from "@mui/icons-material/Close";
import ExpandMore from "@mui/icons-material/ExpandMore";
import type { SvgIconProps } from "@mui/material/SvgIcon";

const icons = { compare: CompareArrows, pulse: MonitorHeartOutlined, overview: DashboardOutlined, info: InfoOutlined, arrow: ChevronRight,
  search: Search, refresh: Refresh, clock: AccessTime, map: MapOutlined, close: Close, expand: ExpandMore };
export function Icon({ name, ...props }: SvgIconProps & { name: keyof typeof icons }) {
  const Component = icons[name];
  return <Component fontSize="small" aria-hidden="true" {...props} />;
}
