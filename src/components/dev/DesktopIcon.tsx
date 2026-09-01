"use client";

import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function DesktopIcon({
  label,
  icon,
  onOpen,
  initial,
  style,
  className,
  iconBoxVariant = "white",
  size = 46,
}: {
  label: string;
  icon: ReactNode;
  onOpen?: () => void;
  initial: { x: number; y: number };
  style?: CSSProperties;
  /** merged onto the button itself - use for transition/opacity/scale classes so they share the same containing block as `style`'s position offsets, instead of a wrapping div (which would create a new containing block and break right/top/bottom anchoring) */
  className?: string;
  /** white = default win98 chip (most icons); black = inverted chip (Shows); none = icon floats bare on the wallpaper (Music, Recycle Bin) */
  iconBoxVariant?: "white" | "black" | "none";
  /** icon box side length in px; most icons share the 46 default, a couple opt into a bigger, clearer thumbnail */
  size?: number;
}) {
  const [selected, setSelected] = useState(false);

  return (
    <motion.button
      type="button"
      drag
      dragMomentum={false}
      initial={{ x: initial.x, y: initial.y }}
      onClick={() => setSelected(true)}
      onBlur={() => setSelected(false)}
      onDoubleClick={onOpen}
      style={{ position: "absolute", ...style }}
      className={cn(
        "flex flex-col items-center gap-1 w-[104px] py-2 select-none cursor-grab active:cursor-grabbing focus:outline-none",
        selected && "bg-blue-900/40",
        className,
      )}
    >
      <div
        style={{ width: size, height: size }}
        className={cn(
          "flex items-center justify-center overflow-hidden shrink-0",
          iconBoxVariant === "white" &&
            "win98-border bg-white/90 shadow-[1px_2px_3px_rgba(0,0,0,0.5)]",
          iconBoxVariant === "black" &&
            "win98-border bg-black shadow-[1px_2px_3px_rgba(0,0,0,0.5)]",
        )}
      >
        {icon}
      </div>
      {/* One step up from `text-xs`, and no further. This briefly ran at
          `text-2xl` and the desktop read as a mock-up at 150% zoom — the
          labels came out wider than the icons they name. */}
      <span className="font-chrome text-white text-sm text-center leading-tight drop-shadow-[1px_1px_0_#000] max-w-[96px]">
        {label}
      </span>
    </motion.button>
  );
}
