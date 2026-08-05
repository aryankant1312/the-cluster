"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { useClock } from "@/hooks/use-clock";
import { CountdownWidget } from "@/components/countdown/CountdownWidget";
import { StartMenu } from "./StartMenu";
import { devWindowTitle } from "./registry";
import { InstagramTrayIcon, MusicTrayIcon } from "./icons";
import { cn } from "@/lib/utils";

export function Taskbar() {
  const wm = useWindowManager();
  const router = useRouter();
  const clock = useClock();
  const t = useTranslations("nav");

  return (
    <div className="fixed bottom-0 inset-x-0 z-[200] flex items-center gap-2 bg-persona-surface border-t border-black px-2 py-1">
      <StartMenu />
      <div className="flex items-center gap-1 border-l border-black/30 pl-2">
        <button
          type="button"
          onClick={() => router.push("/dev")}
          className="text-xs font-body px-2 py-1 hover:bg-black/10"
        >
          {t("home")}
        </button>
        <button
          type="button"
          onClick={() => wm.openWindow("portfolio")}
          className="text-xs font-body px-2 py-1 hover:bg-black/10"
        >
          {t("portfolio")}
        </button>
        <button
          type="button"
          onClick={() => wm.openWindow("contact")}
          className="text-xs font-body px-2 py-1 hover:bg-black/10"
        >
          {t("contact")}
        </button>
      </div>

      <div className="flex-1 flex items-center gap-1 overflow-x-auto">
        {wm.openIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              wm.isMinimized(id) ? wm.restoreWindow(id) : wm.minimizeWindow(id)
            }
            className={cn(
              "win98-border text-xs font-body px-2 py-1 whitespace-nowrap max-w-[140px] truncate",
              wm.isFront(id) && !wm.isMinimized(id) ? "bg-white" : "bg-persona-surface-alt",
            )}
          >
            {devWindowTitle(id)}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1.5 border-l border-black/30 pl-2">
        <button
          type="button"
          onClick={() => wm.openWindow("instagram")}
          aria-label="Instagram"
          className="win98-border bg-white w-7 h-7 flex items-center justify-center"
        >
          <InstagramTrayIcon />
        </button>
        <button
          type="button"
          onClick={() => wm.openWindow("music-player")}
          aria-label="Music"
          className="win98-border bg-white w-7 h-7 flex items-center justify-center"
        >
          <MusicTrayIcon />
        </button>
        <span className="text-xs font-body tabular-nums">{clock}</span>
        <CountdownWidget />
      </div>
    </div>
  );
}
