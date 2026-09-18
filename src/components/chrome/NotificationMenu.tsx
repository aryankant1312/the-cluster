"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

const NOTIFICATIONS = [
  {
    title: "New ad with Hero released",
    detail: "The Xtreme 160R campaign is live.",
    image: "/images/brands/brand-hero.webp",
  },
  {
    title: '“Bhala Kyun” crossed 2M views',
    detail: "A new video milestone.",
    image: "/images/track-cards/bhala-kyun.jpg",
  },
  {
    title: '“Touch Down” reached 5 lakh streams',
    detail: "Thanks for listening.",
    image: "/images/covers/badside.jpg",
  },
] as const;

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
          "grid h-8 w-8 shrink-0 place-items-center focus:outline-none focus-visible:ring-2",
          isDotm
            ? "rounded-full focus-visible:ring-white"
            : "win98-border win98-press bg-persona-surface focus-visible:ring-[#0a2f5c]",
        )}
      >
        {isDotm ? (
          // Animated assets are kept as plain images so the optimizer does not flatten them.
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/images/dotm/notification-bell.webp" alt="" className="h-6 w-6 object-contain" />
        ) : (
          <DevBell />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className={cn(
            "fixed right-2 top-[3.25rem] z-[400] w-[min(20rem,calc(100vw-1rem))] p-2 sm:right-4",
            isDotm
              ? "macos-glass rounded-xl text-white shadow-[0_20px_50px_-18px_rgba(0,0,0,0.9)]"
              : "win98-border bg-persona-surface text-black shadow-[3px_3px_0_rgba(0,0,0,0.4)]",
          )}
        >
          <p className="px-2 pb-2 pt-1 font-chrome text-xs uppercase tracking-[0.2em]">
            Notifications
          </p>
          <div className={cn("overflow-hidden", isDotm ? "divide-y divide-white/10" : "divide-y divide-black/20")}>
            {NOTIFICATIONS.map((notification) => (
              <article key={notification.title} className="flex items-center gap-3 px-2 py-2.5">
                <Image
                  src={notification.image}
                  alt=""
                  width={48}
                  height={48}
                  className={cn(
                    "h-12 w-12 shrink-0 object-cover",
                    isDotm ? "rounded-md ring-1 ring-white/15" : "win98-border",
                  )}
                />
                <div className="min-w-0">
                  <p className="font-chrome text-[11px] leading-tight tracking-[0.04em]">
                    {notification.title}
                  </p>
                  <p className={cn("mt-1 font-body text-xs leading-tight", isDotm ? "text-white/55" : "text-black/60")}>
                    {notification.detail}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DevBell() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5 16h14l-1.7-2.4V9a5.3 5.3 0 0 0-10.6 0v4.6L5 16Z" fill="#ffd83d" stroke="#111" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M9.5 18a2.6 2.6 0 0 0 5 0" fill="#808080" stroke="#111" strokeWidth="1.2" />
      <path d="M9 7.5c.6-1.3 1.7-2 3-2" fill="none" stroke="#fff6a0" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
