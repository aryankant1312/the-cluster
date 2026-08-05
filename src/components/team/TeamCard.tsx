"use client";

import { usePersona } from "@/components/providers/PersonaProvider";
import type { TeamMember } from "@/content/types";
import { cn } from "@/lib/utils";

export function TeamCard({ member }: { member: TeamMember }) {
  const { persona, locale } = usePersona();
  const initials = member.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 p-4 text-center",
        persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-2xl",
      )}
    >
      <div
        className={cn(
          "w-20 h-20 flex items-center justify-center font-chrome text-xl",
          persona === "dev" ? "win98-border bg-persona-surface-alt" : "rounded-full bg-persona-surface-alt",
        )}
      >
        {initials}
      </div>
      <div>
        <p className="font-chrome text-sm tracking-wide">{member.name}</p>
        <p className="text-xs text-fg-muted mt-1">{member.role[locale]}</p>
        <p className="text-[11px] text-fg-muted mt-1">@{member.instagramHandle}</p>
      </div>
    </div>
  );
}
