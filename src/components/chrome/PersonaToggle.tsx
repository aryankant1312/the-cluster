"use client";

import { startTransition, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import { cn } from "@/lib/utils";

export function PersonaToggle({ className }: { className?: string }) {
  const { persona, firstChoice, togglePersona, justSwitched, clearSwitchNotice } = usePersona();
  const t = useTranslations("toggle");
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!justSwitched) return;
    const timer = setTimeout(clearSwitchNotice, 3000);
    return () => clearTimeout(timer);
  }, [justSwitched, clearSwitchNotice]);

  const handleToggle = () => {
    const next = persona === "dev" ? "dotm" : "dev";
    startTransition(() => {
      togglePersona();
      if (pathname === "/dev" || pathname === "/dotm") {
        router.push(`/${next}`);
      }
    });
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={handleToggle}
        title={t("persona")}
        className={cn(
          "font-chrome text-xs px-2 py-1 tracking-wide",
          persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-full",
        )}
      >
        {persona === "dev" ? "DEV" : "DOTM"}
      </button>
      {justSwitched && firstChoice && (
        <div
          className={cn(
            "absolute top-full mt-1 right-0 w-56 text-[11px] p-2 font-body z-50",
            persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-lg",
          )}
        >
          {t("personaSwitchNotice", { persona: firstChoice.toUpperCase() })}
        </div>
      )}
    </div>
  );
}
