"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function DesktopTile({
  label,
  initial,
  onOpen,
}: {
  label: string;
  initial: { x: number; y: number };
  onOpen: () => void;
}) {
  const [selected, setSelected] = useState(false);

  return (
    <motion.button
      type="button"
      drag
      dragMomentum={false}
      initial={{ x: initial.x, y: initial.y, opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 200, damping: 18 }}
      onClick={() => setSelected(true)}
      onBlur={() => setSelected(false)}
      onDoubleClick={onOpen}
      style={{ position: "absolute" }}
      className="flex flex-col items-center gap-1 w-24 select-none cursor-grab active:cursor-grabbing"
    >
      <div
        className={cn(
          "w-16 h-16 rounded-lg bg-persona-surface-alt border flex items-center justify-center font-headline text-xs text-center px-1",
          selected ? "border-blue-400 ring-2 ring-blue-400/60" : "border-white/10",
        )}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      <span className="text-[11px] text-fg drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{label}</span>
    </motion.button>
  );
}
