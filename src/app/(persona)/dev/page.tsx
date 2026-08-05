"use client";

import { startTransition, useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { usePersona } from "@/components/providers/PersonaProvider";
import { DevWindow } from "@/components/window-manager/DevWindow";
import { DesktopIcon } from "@/components/dev/DesktopIcon";
import { CountdownMiniWindow } from "@/components/dev/CountdownMiniWindow";
import { DEV_WINDOWS } from "@/components/dev/registry";
import { MyMusicWindow } from "@/components/dev/window-content/MyMusicWindow";
import { PortfolioWindow } from "@/components/dev/window-content/PortfolioWindow";
import { ToolsWindow } from "@/components/dev/window-content/ToolsWindow";
import { VaultWindow } from "@/components/dev/window-content/VaultWindow";
import { RecycleBinWindow } from "@/components/dev/window-content/RecycleBinWindow";
import { ContactWindow } from "@/components/dev/window-content/ContactWindow";
import { MusicPlayerWindow } from "@/components/dev/window-content/MusicPlayerWindow";
import { ComingSoon } from "@/components/shared/ComingSoon";
import {
  MusicIcon,
  PortfolioIcon,
  ToolsIcon,
  VaultIcon,
  ClusterWallIcon,
  ShowsIcon,
  PressKitIcon,
  RecycleBinIcon,
} from "@/components/dev/icons";
import devWallpaper from "../../../../public/images/dev/wallpaper.jpg";

const ICONS: Array<{ id: string; label: string; icon: React.ReactNode; href?: string }> = [
  { id: "my-music", label: "My Music", icon: <MusicIcon /> },
  { id: "portfolio", label: "Portfolio", icon: <PortfolioIcon /> },
  { id: "tools", label: "Tools", icon: <ToolsIcon /> },
  { id: "vault", label: "The Vault", icon: <VaultIcon /> },
  { id: "cluster-wall", label: "Cluster Wall", icon: <ClusterWallIcon /> },
  { id: "shows", label: "Shows", icon: <ShowsIcon />, href: "/shows" },
  { id: "press-kit", label: "Press Kit", icon: <PressKitIcon /> },
  { id: "recycle-bin", label: "Recycle Bin", icon: <RecycleBinIcon /> },
];

export default function DevDesktopPage() {
  const wm = useWindowManager();
  const { syncPersona } = usePersona();
  const [iconsVisible, setIconsVisible] = useState<number>(0);

  useEffect(() => {
    startTransition(() => syncPersona("dev"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const justBooted = window.sessionStorage.getItem("dev-welcome") === "1";
    window.sessionStorage.removeItem("dev-welcome");

    let cancelled = false;
    ICONS.forEach((_, i) => {
      setTimeout(() => {
        if (!cancelled) setIconsVisible((v) => Math.max(v, i + 1));
      }, justBooted ? i * 80 : 0);
    });

    if (justBooted) {
      const timer = setTimeout(() => wm.openWindow("welcome"), ICONS.length * 80 + 200);
      return () => {
        cancelled = true;
        clearTimeout(timer);
      };
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="absolute inset-0">
      <Image
        src={devWallpaper}
        alt=""
        fill
        priority
        className="object-cover -z-10"
        sizes="100vw"
      />

      <div className="absolute top-3 left-3 flex flex-col gap-1">
        {ICONS.map((icon, i) => (
          <motion.div
            key={icon.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: i < iconsVisible ? 1 : 0, scale: i < iconsVisible ? 1 : 0.8 }}
            transition={{ duration: 0.25 }}
          >
            <DesktopIcon
              label={icon.label}
              icon={icon.icon}
              href={icon.href}
              onOpen={icon.href ? undefined : () => wm.openWindow(icon.id)}
            />
          </motion.div>
        ))}
      </div>

      <CountdownMiniWindow />

      <DevWindow id="welcome" title="Welcome">
        <p className="font-chrome text-sm">WELCOME BACK. YOU KNOW THE WAY.</p>
      </DevWindow>
      <DevWindow id="my-music" title={DEV_WINDOWS.find((w) => w.id === "my-music")!.title}>
        <MyMusicWindow />
      </DevWindow>
      <DevWindow id="portfolio" title="Portfolio">
        <PortfolioWindow />
      </DevWindow>
      <DevWindow id="tools" title="Tools">
        <ToolsWindow />
      </DevWindow>
      <DevWindow id="vault" title="The Vault">
        <VaultWindow />
      </DevWindow>
      <DevWindow id="cluster-wall" title="Cluster Wall">
        <ComingSoon label="CLUSTER WALL" />
      </DevWindow>
      <DevWindow id="press-kit" title="Press Kit">
        <ComingSoon label="PRESS KIT" />
      </DevWindow>
      <DevWindow id="recycle-bin" title="Recycle Bin">
        <RecycleBinWindow />
      </DevWindow>
      <DevWindow id="contact" title="Contact Me">
        <ContactWindow />
      </DevWindow>
      <DevWindow id="instagram" title="Instagram">
        <ComingSoon label="INSTAGRAM" />
      </DevWindow>
      <DevWindow id="music-player" title="Music" width={280}>
        <MusicPlayerWindow />
      </DevWindow>
    </div>
  );
}
