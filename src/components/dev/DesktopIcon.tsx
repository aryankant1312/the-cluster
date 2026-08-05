"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function DesktopIcon({
  label,
  icon,
  onOpen,
  href,
}: {
  label: string;
  icon: ReactNode;
  onOpen?: () => void;
  href?: string;
}) {
  const content = (
    <>
      <div className="win98-border w-10 h-10 flex items-center justify-center bg-white/90 shadow-[1px_2px_3px_rgba(0,0,0,0.5)]">
        {icon}
      </div>
      <span className="font-chrome text-white text-xs text-center leading-tight drop-shadow-[1px_1px_0_#000] max-w-[72px]">
        {label}
      </span>
    </>
  );

  const className = cn(
    "flex flex-col items-center gap-1 w-20 py-2 select-none cursor-pointer focus:outline-none focus:bg-blue-900/40",
  );

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onDoubleClick={onOpen} onClick={onOpen} className={className}>
      {content}
    </button>
  );
}
