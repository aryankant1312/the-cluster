"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useWindowManager } from "@/components/window-manager/window-manager-context";
import { StartTrayIcon } from "./icons";

export function StartMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [shuttingDown, setShuttingDown] = useState(false);
  const router = useRouter();
  const wm = useWindowManager();
  const t = useTranslations("nav");
  const wrapRef = useRef<HTMLDivElement>(null);

  /**
   * A press anywhere else closes it, and so does Escape.
   *
   * The menu used to stay open until something inside it was chosen or the
   * Start button was pressed a second time — so opening it by accident meant
   * it sat over the desktop while you clicked at icons underneath, and every
   * one of those clicks went to the desktop with the menu still on top of it.
   * Every menu on the platform this is dressed as closes this way, which is
   * why nobody thinks to look for the button again.
   *
   * `pointerdown` rather than `click`: the menu should be gone by the time the
   * press it was dismissed by completes, not a beat after it.
   */
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  // Every surface is reachable from here, so nothing depends on spotting the
  // right desktop icon. Windows first, then the routed pages.
  // Kept in full even though every entry now also has a taskbar launcher —
  // the Start menu is where this persona's visitors expect to find things,
  // and the quick-launch strip is an addition to it, not a replacement.
  const windowItems: Array<{ label: string; id: string }> = [
    // The Story opens itself on first boot and has no launcher anywhere else,
    // so trimming the taskbar left it reachable exactly once per session.
    { label: "The Story", id: "welcome" },
    { label: "Book DOTM", id: "book" },
    { label: "Drops", id: "merch" },
    { label: "Cluster Wall", id: "cluster-wall" },
    { label: "Live Stats", id: "stats" },
    { label: "Portfolio", id: "portfolio" },
    { label: "The Vault", id: "vault" },
  ];

  const items: Array<{ label: string; action: () => void }> = [
    { label: t("home"), action: () => router.push("/dev") },
    { label: t("music"), action: () => wm.openWindow("my-music") },
    { label: t("shows"), action: () => router.push("/shows") },
    { label: t("contact"), action: () => wm.openWindow("contact") },
  ];

  const shutDown = () => {
    setShuttingDown(true);
    setTimeout(() => router.push("/enter"), 1200);
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="win98-border win98-press bg-taskbar px-3 py-1.5 font-chrome text-base tracking-wide flex items-center gap-2"
      >
        <StartTrayIcon />
        Start
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 win98-border bg-taskbar w-60 z-50">
          {windowItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className="block w-full text-left px-3 py-2 text-[15px] font-body font-normal hover:bg-persona-titlebar hover:text-white"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                wm.openWindow(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
          <div className="border-t border-black/40" />
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="block w-full text-left px-3 py-2 text-[15px] font-body font-normal hover:bg-persona-titlebar hover:text-white"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                item.action();
              }}
            >
              {item.label}
            </button>
          ))}
          {/* The account used to sit here, directly above Shut Down. It has
              moved to the top-right of the persona bar, where it is on screen
              without opening a menu first — and where DOTM's now is too. */}
          <div className="border-t border-black/40" />
          <button
            type="button"
            className="block w-full text-left px-3 py-2 text-[15px] font-body font-normal hover:bg-persona-titlebar hover:text-white"
            onClick={shutDown}
          >
            {t("shutDown")}
          </button>
        </div>
      )}
      {shuttingDown && (
        <div
          className={cn(
            "fixed inset-0 z-[9999] bg-[#1a2a3a] flex items-center justify-center",
            "font-chrome text-white text-lg tracking-widest",
          )}
        >
          SHUTTING DOWN...
        </div>
      )}
    </div>
  );
}
