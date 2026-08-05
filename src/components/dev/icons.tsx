import {
  Music,
  Briefcase,
  Wrench,
  Lock,
  LayoutGrid,
  Ticket,
  Newspaper,
  Trash2,
  Camera,
  Music2,
} from "lucide-react";

const DESKTOP_ICON_PROPS = {
  size: 30,
  strokeWidth: 1.75,
  color: "#1a1a1a",
} as const;

export function MusicIcon() {
  return <Music {...DESKTOP_ICON_PROPS} />;
}

export function PortfolioIcon() {
  return <Briefcase {...DESKTOP_ICON_PROPS} />;
}

export function ToolsIcon() {
  return <Wrench {...DESKTOP_ICON_PROPS} />;
}

export function VaultIcon() {
  return <Lock {...DESKTOP_ICON_PROPS} />;
}

export function ClusterWallIcon() {
  return <LayoutGrid {...DESKTOP_ICON_PROPS} />;
}

export function ShowsIcon() {
  return <Ticket {...DESKTOP_ICON_PROPS} />;
}

export function PressKitIcon() {
  return <Newspaper {...DESKTOP_ICON_PROPS} />;
}

export function RecycleBinIcon() {
  return <Trash2 {...DESKTOP_ICON_PROPS} />;
}

export function InstagramTrayIcon() {
  return <Camera size={20} strokeWidth={2} color="#1a1a1a" />;
}

export function MusicTrayIcon() {
  return <Music2 size={20} strokeWidth={2} color="#1a1a1a" />;
}
