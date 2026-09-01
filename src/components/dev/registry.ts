export interface DevWindowMeta {
  id: string;
  title: string;
  glyph: string;
  label: string;
}

export const DEV_WINDOWS: DevWindowMeta[] = [
  { id: "welcome", title: "Welcome", glyph: "★", label: "Welcome" },
  { id: "my-music", title: "My Music", glyph: "♫", label: "My Music" },
  { id: "folder-therapy-session", title: "Therapy Session, Pt. 1", glyph: "▤", label: "Therapy Session, Pt. 1" },
  { id: "folder-666-the-beginning", title: "666 - The Beginning", glyph: "▤", label: "666 - The Beginning" },
  { id: "folder-its-ok", title: "It's OK", glyph: "▤", label: "It's OK" },
  { id: "folder-finding-peace", title: "Finding peace", glyph: "▤", label: "Finding peace" },
  { id: "portfolio", title: "Portfolio", glyph: "▦", label: "Portfolio" },
  { id: "vault", title: "The Vault", glyph: "▣", label: "The Vault" },
  { id: "cluster-wall", title: "Cluster Wall", glyph: "▤", label: "Cluster Wall" },
  { id: "shoot-on-sight", title: "Shoot at Site", glyph: "◎", label: "Shoot at Site" },
  { id: "recycle-bin", title: "Recycle Bin", glyph: "♻", label: "Recycle Bin" },
  { id: "contact", title: "Contact", glyph: "✉", label: "Contact Me" },
  { id: "music-player", title: "Music", glyph: "▶", label: "Music" },
  { id: "book", title: "Book DOTM", glyph: "✦", label: "Book DOTM" },
  { id: "merch", title: "Drops", glyph: "▩", label: "Drops" },
  { id: "stats", title: "Live Stats", glyph: "▨", label: "Live Stats" },
];

export function devWindowTitle(id: string): string {
  return DEV_WINDOWS.find((w) => w.id === id)?.title ?? id;
}
