"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export function StartMenu({ onNavigate }: { onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const [shuttingDown, setShuttingDown] = useState(false);
  const router = useRouter();
  const t = useTranslations("nav");

  const items: Array<{ label: string; action: () => void }> = [
    { label: t("home"), action: () => router.push("/dev") },
    { label: t("music"), action: () => router.push("/dev") },
    { label: t("portfolio"), action: () => router.push("/dev") },
    { label: t("shows"), action: () => router.push("/shows") },
    { label: t("contact"), action: () => router.push("/dev") },
  ];

  const shutDown = () => {
    setShuttingDown(true);
    setTimeout(() => router.push("/enter"), 1200);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="win98-border bg-persona-surface px-3 py-1 font-chrome text-sm tracking-wide"
      >
        Start
      </button>
      {open && (
        <div className="absolute bottom-full left-0 mb-1 win98-border bg-persona-surface w-48 z-50">
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              className="block w-full text-left px-3 py-1.5 text-sm font-body hover:bg-persona-titlebar hover:text-white"
              onClick={() => {
                setOpen(false);
                onNavigate?.();
                item.action();
              }}
            >
              {item.label}
            </button>
          ))}
          <div className="border-t border-black/40" />
          <button
            type="button"
            className="block w-full text-left px-3 py-1.5 text-sm font-body hover:bg-persona-titlebar hover:text-white"
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
