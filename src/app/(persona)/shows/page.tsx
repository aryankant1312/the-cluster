"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { shows } from "@/content/shows";
import { WorldMap } from "@/components/shows/WorldMap";
import { ShowsList } from "@/components/shows/ShowsList";
import { usePersona } from "@/components/providers/PersonaProvider";
import { cn } from "@/lib/utils";

export default function ShowsPage() {
  const t = useTranslations("shows");
  const { persona } = usePersona();
  const [view, setView] = useState<"map" | "list">("map");

  return (
    <main className="flex-1 px-6 py-10">
      <h1 className="font-chrome text-xl tracking-widest mb-6 text-center">{t("title")}</h1>

      <div className="flex justify-center gap-2 mb-6">
        {(["map", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={cn(
              "font-chrome text-xs px-3 py-1 tracking-wide",
              persona === "dev" ? "win98-border bg-persona-surface" : "macos-glass rounded-full",
              view === v && "outline outline-1 outline-accent",
            )}
          >
            {v === "map" ? t("mapView") : t("listView")}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <div className="max-w-3xl mx-auto">
          <WorldMap shows={shows} />
        </div>
      ) : (
        <ShowsList shows={shows} />
      )}
    </main>
  );
}
