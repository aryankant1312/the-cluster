"use client";

import { usePersona } from "@/components/providers/PersonaProvider";
import { cn } from "@/lib/utils";

export function LocaleToggle({ className }: { className?: string }) {
  const { locale, toggleLocale, persona } = usePersona();

  return (
    <button
      type="button"
      onClick={toggleLocale}
      className={cn(
        "font-chrome text-xs px-2 py-1 tracking-wide",
        persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-full",
        className,
      )}
    >
      {locale.toUpperCase()}
    </button>
  );
}
