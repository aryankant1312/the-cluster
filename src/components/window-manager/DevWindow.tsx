"use client";

import { useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useWindowManager } from "./window-manager-context";

const MENU_ITEMS = ["File", "Edit", "View", "Go", "Help"];

export function DevWindow({
  id,
  title,
  children,
  defaultPosition = { x: 80, y: 60 },
  width = 480,
}: {
  id: string;
  title: string;
  children: ReactNode;
  defaultPosition?: { x: number; y: number };
  width?: number;
}) {
  const wm = useWindowManager();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);

  if (!wm.isOpen(id) || wm.isMinimized(id)) return null;

  const close = () => {
    setClosing(true);
    setTimeout(() => {
      wm.closeWindow(id);
      setClosing(false);
    }, 150);
  };

  return (
    <motion.div
      drag
      dragMomentum={false}
      initial={{ x: defaultPosition.x, y: defaultPosition.y, opacity: 0, scale: 0.98 }}
      animate={{
        opacity: closing ? 0 : 1,
        scale: closing ? 0.96 : 1,
      }}
      transition={{ duration: 0.15 }}
      onMouseDown={() => wm.focusWindow(id)}
      style={{ position: "absolute", zIndex: wm.zIndexOf(id), width }}
      className="win98-border bg-persona-surface flex flex-col"
    >
      <div className="bg-persona-titlebar text-white flex items-center justify-between px-1.5 py-1 cursor-move select-none">
        <span className="font-chrome text-sm tracking-wide truncate">{title}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="win98-border w-5 h-5 flex items-center justify-center text-black bg-persona-surface text-xs leading-none"
            onClick={() => wm.minimizeWindow(id)}
            aria-label="Minimize"
          >
            _
          </button>
          <button
            type="button"
            className="win98-border w-5 h-5 flex items-center justify-center text-black bg-persona-surface text-xs leading-none"
            aria-label="Maximize"
          >
            &#9633;
          </button>
          <button
            type="button"
            className="win98-border w-5 h-5 flex items-center justify-center text-black bg-persona-surface text-xs leading-none"
            onClick={close}
            aria-label="Close"
          >
            X
          </button>
        </div>
      </div>
      <div className="flex bg-persona-surface border-b border-black text-xs font-body relative">
        {MENU_ITEMS.map((item) => (
          <div key={item} className="relative">
            <button
              type="button"
              className="px-2 py-0.5 hover:bg-persona-titlebar hover:text-white"
              onClick={() => setOpenMenu((prev) => (prev === item ? null : item))}
            >
              {item}
            </button>
            {openMenu === item && (
              <div className="absolute left-0 top-full win98-border bg-persona-surface min-w-[120px] z-10">
                {item === "File" ? (
                  <button
                    type="button"
                    className="block w-full text-left px-3 py-1 hover:bg-persona-titlebar hover:text-white"
                    onClick={() => {
                      setOpenMenu(null);
                      close();
                    }}
                  >
                    Close
                  </button>
                ) : (
                  <>
                    <div className="px-3 py-1 text-fg-muted">—</div>
                    <div className="px-3 py-1 text-fg-muted">—</div>
                  </>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="win98-sky p-3 font-body text-sm text-black overflow-auto max-h-[60vh]">
        {children}
      </div>
      <div className="self-end w-3 h-3 mr-0.5 mb-0.5 border-r-2 border-b-2 border-black/50" />
    </motion.div>
  );
}
