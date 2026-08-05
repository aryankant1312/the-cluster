"use client";

import Link from "next/link";
import { usePersona } from "@/components/providers/PersonaProvider";
import { CountdownWidget } from "@/components/countdown/CountdownWidget";
import { PersonaToggle } from "@/components/chrome/PersonaToggle";
import { LocaleToggle } from "@/components/chrome/LocaleToggle";
import { cn } from "@/lib/utils";

export function PersonaTopBar() {
  const { persona } = usePersona();

  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between gap-4 px-4 py-2",
        persona === "dev"
          ? "bg-persona-titlebar text-white win98-border"
          : "macos-glass",
      )}
    >
      <Link href={`/${persona}`} className="font-chrome text-sm tracking-widest">
        THE CLUSTER
      </Link>
      <CountdownWidget className="flex-1 justify-center" />
      <div className="flex items-center gap-2">
        <LocaleToggle />
        <PersonaToggle />
      </div>
    </header>
  );
}
