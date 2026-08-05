"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { cn } from "@/lib/utils";

const DOCK_ITEMS = [
  { id: "contact", glyph: "D", label: "DOTM" },
  { id: "notes", glyph: "N", label: "Notes" },
  { id: "instagram", glyph: "◉", label: "Instagram" },
  { id: "youtube", glyph: "▶", label: "YouTube" },
  { id: "spotify", glyph: "♫", label: "Spotify" },
];

export function Dock() {
  const wm = useWindowManager();
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="fixed bottom-4 inset-x-0 z-[200] flex justify-center">
      <div className="macos-glass rounded-2xl flex items-end gap-2 px-3 py-2">
        {DOCK_ITEMS.map((item) => (
          <div key={item.id} className="relative flex flex-col items-center">
            {hovered === item.id && (
              <span className="absolute -top-8 macos-glass rounded-md px-2 py-0.5 text-[11px] font-chrome whitespace-nowrap">
                {item.label}
              </span>
            )}
            <motion.button
              type="button"
              onMouseEnter={() => setHovered(item.id)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => wm.openWindow(item.id)}
              animate={{ scale: hovered === item.id ? 1.35 : 1, y: hovered === item.id ? -8 : 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 15 }}
              className={cn(
                "w-11 h-11 rounded-xl bg-persona-surface-alt border border-white/10 flex items-center justify-center font-chrome text-base",
              )}
            >
              {item.glyph}
            </motion.button>
          </div>
        ))}
      </div>
    </div>
  );
}
