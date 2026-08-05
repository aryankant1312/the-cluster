"use client";

import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import type { Show } from "@/content/types";
import { cn } from "@/lib/utils";

export function ShowsList({ shows }: { shows: Show[] }) {
  const { persona, locale } = usePersona();
  const t = useTranslations("shows");
  const past = shows.filter((s) => s.isPast);
  const upcoming = shows.filter((s) => !s.isPast);

  const row = (show: Show) => (
    <li
      key={show.id}
      className={cn(
        "flex items-center justify-between px-3 py-2 text-sm",
        persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-lg",
      )}
    >
      <span className="font-chrome tracking-wide">{show.city[locale]}</span>
      <span className="text-fg-muted text-xs">{show.venue ?? t("venueTbd")}</span>
      <span className="text-fg-muted text-xs">{show.date ?? t("dateTbd")}</span>
    </li>
  );

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      <div>
        <p className="font-chrome text-xs tracking-widest text-fg-muted mb-2">{t("past")}</p>
        <ul className="space-y-2">{past.map(row)}</ul>
      </div>
      <div>
        <p className="font-chrome text-xs tracking-widest text-fg-muted mb-2">{t("upcoming")}</p>
        <ul className="space-y-2">{upcoming.map(row)}</ul>
      </div>
    </div>
  );
}
