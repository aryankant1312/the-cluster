"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export function NotificationMenu({ skin }: { skin: "dotm" | "dev" }) {
  const isDotm = skin === "dotm";
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    document.addEventListener("pointerdown", closeOutside, true);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      document.removeEventListener("pointerdown", closeOutside, true);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        aria-label="Notifications"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "grid h-10 w-10 shrink-0 place-items-center focus:outline-none focus-visible:ring-2",
          isDotm
            ? "rounded-full focus-visible:ring-white"
            : "win98-border win98-press bg-persona-surface focus-visible:ring-[#0a2f5c]",
        )}
      >
        {isDotm ? (
          // Animated assets are kept as plain images so the optimizer does not flatten them.
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/images/dotm/notification-bell.webp" alt="" className="h-8 w-8 object-contain" />
        ) : (
          <DevBell />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "fixed right-2 top-16 z-[400] w-[min(20rem,calc(100vw-1rem))] p-2 sm:right-4",
            isDotm
              ? "macos-glass rounded-xl text-white shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9)]"
              : "win98-border bg-persona-surface text-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]",
          )}
        >
          <p className="px-2 pb-2 pt-1 font-chrome text-xs uppercase tracking-[0.2em]">
            Notifications
          </p>
          <div
            className={cn(
              "grid min-h-28 place-items-center border px-5 py-7 text-center",
              isDotm
                ? "rounded-lg border-white/10 bg-white/[0.03]"
                : "win98-border bg-white",
            )}
          >
            <div>
              <p className="font-chrome text-xs uppercase tracking-[0.16em]">
                No notifications
              </p>
              <p
                className={cn(
                  "mt-1.5 font-body text-xs",
                  isDotm ? "text-white/45" : "text-black/55",
                )}
              >
                You&apos;re all caught up.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DevBell() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <path d="M5 16h14l-1.7-2.4V9a5.3 5.3 0 0 0-10.6 0v4.6L5 16Z" fill="#ffd83d" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.5 18a2.6 2.6 0 0 0 5 0" fill="#808080" stroke="#111" strokeWidth="1.2" />
      <path d="M9 7.5c.6-1.3 1.7-2 3-2" fill="none" stroke="#fff6a0" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
