"use client";

import { motion, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import {
  desktopFreeBounds,
  pushOutOfObstacles,
} from "@/components/window-manager/window-geometry";
import {
  DropsTile,
  NotesTile,
  PortfolioTile,
  ServicesTile,
  ShootOnSightTile,
} from "./dock-tiles";

interface Shortcut {
  id: string;
  label: string;
  icon: ReactNode;
  position: string;
  rotate: string;
  /** Transparent artwork that should float without a rounded tile plate. */
  bare?: boolean;
}

const SHORTCUTS: readonly Shortcut[] = [
  { id: "services", label: "Services", icon: <ServicesTile />, position: "left-[8%] top-[18%]", rotate: "-rotate-2", bare: true },
  { id: "merch", label: "Drops", icon: <DropsTile />, position: "right-[7%] top-[22%]", rotate: "rotate-2" },
  { id: "shoot-on-sight", label: "Shoot at Site", icon: <ShootOnSightTile />, position: "right-[17%] top-[49%]", rotate: "-rotate-1" },
  { id: "portfolio", label: "Portfolio", icon: <PortfolioTile />, position: "left-[9%] top-[58%]", rotate: "rotate-1" },
  { id: "notes", label: "Notes", icon: <NotesTile />, position: "right-[31%] top-[67%]", rotate: "-rotate-2" },
] as const;

/**
 * DOTM desktop shortcuts behave like desktop files: one click selects, a
 * double click opens, and a drag moves the selected shortcut. Each shortcut
 * uses the same free-desktop limits and live obstacle avoidance as the 666
 * Vault disc, including the top bar, dock and tray boundaries.
 */
export function DotmDesktopShortcuts() {
  const wm = useWindowManager();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const clearSelection = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-dotm-shortcut]")) return;
      setSelectedId(null);
    };
    document.addEventListener("pointerdown", clearSelection);
    return () => document.removeEventListener("pointerdown", clearSelection);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-30 hidden min-[760px]:block" aria-label="DOTM desktop shortcuts">
      {SHORTCUTS.map((shortcut) => (
        <DraggableShortcut
          key={shortcut.id}
          shortcut={shortcut}
          selected={selectedId === shortcut.id}
          onSelect={() => setSelectedId(shortcut.id)}
          onOpen={() => wm.openWindow(shortcut.id)}
        />
      ))}
    </div>
  );
}

function DraggableShortcut({
  shortcut,
  selected,
  onSelect,
  onOpen,
}: {
  shortcut: Shortcut;
  selected: boolean;
  onSelect: () => void;
  onOpen: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const draggedRef = useRef(false);
  const [bounds, setBounds] = useState<ReturnType<typeof desktopFreeBounds>>(undefined);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  useEffect(() => {
    const updateBounds = () => setBounds(desktopFreeBounds(ref.current));
    updateBounds();
    window.addEventListener("resize", updateBounds);
    return () => window.removeEventListener("resize", updateBounds);
  }, []);

  return (
    <motion.button
      ref={ref}
      type="button"
      data-dotm-shortcut
      data-desktop-obstacle
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={bounds}
      style={{ x, y }}
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 26 }}
      whileDrag={{ scale: 1.05, zIndex: 195 }}
      onPointerDown={onSelect}
      onClick={onSelect}
      onDoubleClick={(event) => {
        if (draggedRef.current) return;
        event.preventDefault();
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" && selected) {
          event.preventDefault();
          onOpen();
        }
      }}
      onDragStart={() => {
        draggedRef.current = true;
        onSelect();
        setBounds(desktopFreeBounds(ref.current));
      }}
      onDrag={() => {
        const topBar = document.querySelector<HTMLElement>(".persona-topbar");
        const minTop = topBar ? topBar.getBoundingClientRect().bottom : 64;
        const element = ref.current;
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top < minTop) y.set(y.get() + minTop - rect.top);
        }

        const push = pushOutOfObstacles(element);
        if (!push) return;
        if (push.dx) x.set(x.get() + push.dx);
        if (push.dy) y.set(y.get() + push.dy);
      }}
      onDragEnd={() => window.setTimeout(() => { draggedRef.current = false; }, 0)}
      aria-label={`${shortcut.label}${selected ? ", selected" : ""}`}
      aria-pressed={selected}
      title={`${shortcut.label} — double-click to open, drag to move`}
      className={`pointer-events-auto absolute inline-flex touch-none select-none flex-col items-center gap-1.5 rounded-md outline-none cursor-default active:cursor-grabbing [&_img]:pointer-events-none [&_video]:pointer-events-none ${shortcut.position} ${shortcut.rotate}`}
    >
      <span
        className={`block h-14 w-14 transition-[transform,filter,box-shadow] duration-150 ${
          shortcut.bare ? "overflow-visible rounded-none" : "overflow-hidden rounded-[14px]"
        } ${
          shortcut.bare
            ? selected
              ? "scale-[1.04] drop-shadow-[0_0_6px_#2563eb]"
              : "drop-shadow-[0_10px_10px_rgba(0,0,0,0.38)] hover:scale-105"
            : selected
              ? "scale-[1.04] shadow-[0_0_0_2px_#fff,0_0_0_4px_#2563eb,0_12px_28px_rgba(0,0,0,0.48)]"
              : "shadow-[0_10px_24px_rgba(0,0,0,0.38)] hover:scale-105"
        }`}
      >
        {shortcut.icon}
      </span>
      <span
        className={`max-w-24 rounded px-1.5 py-0.5 text-center font-chrome text-[11px] tracking-wide text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.95)] ${
          selected ? "bg-[#2563eb]" : "bg-black/35"
        }`}
      >
        {shortcut.label}
      </span>
    </motion.button>
  );
}
