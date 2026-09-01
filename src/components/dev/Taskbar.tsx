"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { useClock } from "@/hooks/use-clock";
import { StartMenu } from "./StartMenu";
import { DEV_WINDOWS, devWindowTitle } from "./registry";
import {
  InstagramTrayIcon,
  YoutubeTrayIcon,
  SpotifyTrayIcon,
  MusicTrayIcon,
  PortfolioTrayIcon,
  ContactTrayIcon,
  RecycleBinTrayIcon,
  MyMusicImageIcon,
  VaultTrayIcon,
  ClusterWallIcon,
  DropsTrayIcon,
  StatsTrayIcon,
} from "./icons";
import { cn } from "@/lib/utils";

const WINDOW_TILE_ICONS: Record<string, ReactNode> = {
  "my-music": (
    <span className="w-4 h-4 shrink-0 inline-block">
      <MyMusicImageIcon />
    </span>
  ),
  portfolio: (
    <span className="shrink-0">
      <PortfolioTrayIcon />
    </span>
  ),
  vault: (
    <span className="shrink-0">
      <VaultTrayIcon />
    </span>
  ),
  "cluster-wall": (
    <span className="w-4 h-4 shrink-0 inline-block">
      <ClusterWallIcon />
    </span>
  ),
  "recycle-bin": (
    <span className="shrink-0">
      <RecycleBinTrayIcon />
    </span>
  ),
};

const INSTAGRAM_URL = "https://www.instagram.com/devilonthemic/";
const YOUTUBE_URL = "https://www.youtube.com/@devilonthemic";
const SPOTIFY_URL =
  "https://open.spotify.com/artist/2AL0XQ1mbnWU5xVR6R4KRa?si=4EILAYryQjWvmeARp5Xtsg";

/**
 * The DEV taskbar.
 *
 * Everything in the Start menu now also has a launcher here. The Start menu
 * stays exactly as it was — it is the right idiom for this persona and people
 * expect to find things in it — but a menu alone means every surface costs a
 * click into a list the visitor has to read first. The quick-launch strip
 * makes the same destinations reachable in one click and, more to the point,
 * visible without opening anything.
 *
 * Labels drop away below `lg` so the strip degrades to icons rather than
 * wrapping or shoving the window tiles off the bar. Every button keeps both a
 * `title` and an `aria-label`, so an icon-only button is never unlabelled.
 */
export function Taskbar() {
  const wm = useWindowManager();
  const clock = useClock();
  const t = useTranslations("nav");

  /**
   * Three launchers, not ten. The strip had grown to hold every surface on
   * the desktop, which made it a second Start menu rather than a shortcut row
   * — and Music, Portfolio and Cluster Wall already have desktop icons a
   * couple of inches above it, while Shows and Book are one click inside
   * windows that are themselves already here. What is left is the set with no
   * other one-click route.
   *
   * The Vault left this strip for the same reason: its desktop icon is now
   * the looping locker clip, which is the loudest thing in the column and
   * impossible to miss, so a second route to it was redundant.
   */
  const quickLaunch: Array<{
    label: string;
    icon: ReactNode;
    onClick: () => void;
    primary?: boolean;
  }> = [
    {
      label: "Drops",
      icon: <DropsTrayIcon />,
      onClick: () => wm.openWindow("merch"),
      primary: true,
    },
    {
      label: "Stats",
      icon: <StatsTrayIcon />,
      onClick: () => wm.openWindow("stats"),
      primary: true,
    },
    {
      label: t("contact"),
      icon: <ContactTrayIcon />,
      onClick: () => wm.openWindow("contact"),
      primary: true,
    },
  ];

  /**
   * Stand down for a window that has taken the whole tab.
   *
   * The strip is `fixed` at `z-[200]`, above every window shell, so a
   * fullscreen window covered the top bar at `z-40` and still had this one
   * lying across the bottom of it. Nobody is stranded: a window that claims the
   * chrome always keeps its own way out on screen.
   */
  if (wm.chromeHidden) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] flex items-center gap-2 bg-taskbar border-t border-black px-2 py-1">
      <StartMenu />

      {/*
        `no-scrollbar`, not `overflow-x-hidden`.

        This strip was plain `overflow-x-auto`, and on Windows that paints a
        permanent grey scrollbar with two arrow caps across the bottom of the
        taskbar — visible at every width and on every click, whether or not
        there is anything to scroll to, because the platform reserves the gutter
        rather than overlaying it. The utility keeps the strip scrollable for
        the narrow viewports that genuinely need it and takes the gutter away;
        see `globals.css`.
      */}
      <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-l border-black/30 pl-2">
        {quickLaunch.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={item.onClick}
            title={item.label}
            aria-label={item.label}
            // `gap-2` and `px-2.5`, up from 1.5/2: the marks are 24px now, and
            // the old spacing left the label crowding an icon half again its
            // former size. `text-[13px]` brings the type up with them so the
            // pairing holds — a 12px label beside a 24px mark reads as a
            // caption rather than as the button's own name.
            className="win98-press flex shrink-0 items-center gap-2 px-2.5 py-1.5 font-body text-[15px] font-normal hover:bg-black/10"
          >
            {item.icon}
            <span
              className={cn(
                "whitespace-nowrap",
                item.primary ? "hidden lg:inline" : "hidden xl:inline",
              )}
            >
              {item.label}
            </span>
          </button>
        ))}
      </div>

      {/* Same treatment as the strip above, and for the same reason: a row of
          window tiles that happens to be one tile too wide must not answer with
          a permanent grey gutter under the whole taskbar. */}
      <div className="no-scrollbar flex-1 flex items-center gap-1 overflow-x-auto">
        {wm.openIds.map((id) => {
          const isFront = wm.isFront(id) && !wm.isMinimized(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => (wm.isMinimized(id) ? wm.restoreWindow(id) : wm.minimizeWindow(id))}
              className={cn(
                "win98-border win98-press flex items-center gap-1.5 text-[13px] font-body font-normal px-2 py-1 whitespace-nowrap max-w-[140px] truncate",
                isFront ? "bg-white" : "bg-persona-surface-alt hover:bg-white",
              )}
            >
              {WINDOW_TILE_ICONS[id] ?? (
                <span className="shrink-0">{DEV_WINDOWS.find((w) => w.id === id)?.glyph}</span>
              )}
              {devWindowTitle(id)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 border-l border-black/30 pl-2">
        <a
          href={YOUTUBE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="YouTube"
          title="YouTube"
          className="win98-border win98-press bg-white w-7 h-7 flex items-center justify-center"
        >
          <YoutubeTrayIcon />
        </a>
        <a
          href={SPOTIFY_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Spotify"
          title="Spotify"
          className="win98-border win98-press bg-white w-7 h-7 flex items-center justify-center"
        >
          <SpotifyTrayIcon />
        </a>
        <a
          href={INSTAGRAM_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Instagram"
          title="Instagram"
          className="win98-border win98-press bg-white w-7 h-7 flex items-center justify-center"
        >
          <InstagramTrayIcon />
        </a>
        <button
          type="button"
          onClick={() => wm.openWindow("music-player")}
          aria-label="Music player"
          title="Music player"
          className="win98-border win98-press bg-white w-7 h-7 flex items-center justify-center"
        >
          <MusicTrayIcon />
        </button>
        {/* Unbolded. The clock is a readout rather than a title, and semibold
            made it the heaviest thing on a bar full of controls. */}
        <span className="font-body text-[15px] tabular-nums text-black">{clock}</span>
      </div>
    </div>
  );
}
