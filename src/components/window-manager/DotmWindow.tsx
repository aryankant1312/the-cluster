"use client";

import { useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWindowManager } from "./window-manager-context";

export function DotmWindow({
  id,
  title,
  children,
  defaultPosition = { x: 120, y: 80 },
  width = 420,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  width?: number;
}) {
  const wm = useWindowManager();
  const [closing, setClosing] = useState(false);

  const isOpen = wm.isOpen(id) && !wm.isMinimized(id);

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      wm.closeWindow(id);
      setClosing(false);
    }, 200);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          drag
          dragMomentum={false}
          dragElastic={0}
          initial={{ x: defaultPosition.x, y: defaultPosition.y, opacity: 0, scale: 0.94 }}
          animate={{ opacity: closing ? 0 : 1, scale: closing ? 0.94 : 1 }}
          exit={{ opacity: 0, scale: 0.94 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          onMouseDown={() => wm.focusWindow(id)}
          style={{ position: "absolute", zIndex: wm.zIndexOf(id), width }}
          className="macos-glass rounded-[var(--radius-window)] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.35)] overflow-hidden"
        >
          <div className="relative flex items-center justify-center px-3 py-2 cursor-move select-none border-b border-white/10">
            <div className="absolute left-3 flex items-center gap-1.5">
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="w-3 h-3 rounded-full bg-[#ff5f57]"
              />
              <button
                type="button"
                onClick={() => wm.minimizeWindow(id)}
                aria-label="Minimize"
                className="w-3 h-3 rounded-full bg-[#febc2e]"
              />
              <span className="w-3 h-3 rounded-full bg-[#28c840]" />
            </div>
            <span className="font-chrome text-xs text-fg-muted tracking-wide">{title}</span>
          </div>
          <div className="p-4 font-body text-sm text-persona-fg overflow-auto max-h-[60vh]">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
