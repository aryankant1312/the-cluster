export interface DevWindowMeta {
  id: string;
  title: string;
  glyph: string;
  label: string;
}

export const DEV_WINDOWS: DevWindowMeta[] = [
  { id: "welcome", title: "Welcome", glyph: "★", label: "Welcome" },
  { id: "my-music", title: "My Music", glyph: "♫", label: "My Music" },
  { id: "portfolio", title: "Portfolio", glyph: "▦", label: "Portfolio" },
  { id: "tools", title: "Tools", glyph: "⚒", label: "Tools" },
  { id: "vault", title: "The Vault", glyph: "▣", label: "The Vault" },
  { id: "cluster-wall", title: "Cluster Wall", glyph: "▤", label: "Cluster Wall" },
  { id: "press-kit", title: "Press Kit", glyph: "■", label: "Press Kit" },
  { id: "recycle-bin", title: "Recycle Bin", glyph: "♻", label: "Recycle Bin" },
  { id: "contact", title: "Contact", glyph: "✉", label: "Contact Me" },
  { id: "instagram", title: "Instagram", glyph: "◉", label: "Instagram" },
  { id: "music-player", title: "Music", glyph: "▶", label: "Music" },
  { id: "countdown-mini", title: "Countdown", glyph: "⏱", label: "Countdown" },
];

export function devWindowTitle(id: string): string {
  return DEV_WINDOWS.find((w) => w.id === id)?.title ?? id;
}
