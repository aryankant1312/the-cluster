"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { shows } from "@/content/shows";
import { ShowsList } from "@/components/shows/ShowsList";
import { usePersona } from "@/components/providers/PersonaProvider";
import { cn } from "@/lib/utils";

const IndiaShowsMap = dynamic(
  () => import("@/components/shows/IndiaShowsMap").then((m) => m.IndiaShowsMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center font-chrome text-xs text-fg-muted">
        LOADING MAP…
      </div>
    ),
  },
);

export default function ShowsPage() {
  const t = useTranslations("shows");
  const router = useRouter();
  const { persona } = usePersona();
  const [view, setView] = useState<"map" | "list">("map");
  const isDev = persona === "dev";

  return (
    // `min-h-0` is what stops this page scrolling. Without it a flex child in
    // a column sizes to its own content and pushes the page past the viewport
    // — which is exactly what the fixed-height map below used to do. With it,
    // main is capped at whatever the top bar leaves over, and the view inside
    // (map or list) flexes into that.
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden px-6 pb-6 pt-4">
      {/* The desktop wallpaper, painted behind this page.
          /shows is its own route, so the persona desktop is not mounted under
          it — without this there would be nothing behind the glass to frost,
          and `backdrop-filter` would blur an empty background. */}
      <Image
        src={isDev ? "/images/dev/wallpaper.jpg" : "/images/dotm/wallpaper.jpg"}
        alt=""
        aria-hidden="true"
        fill
        priority
        sizes="100vw"
        className="pointer-events-none -z-20 object-cover"
      />

      {/* Liquid-glass plate. `backdrop-filter` frosts the wallpaper above,
          giving the page the depth of a real window resting on the desktop
          rather than an opaque sheet that hides it. */}
      {/* DEV gets a lighter plate than DOTM: less blur and a much thinner
          tint, so the wallpaper's own blues come through instead of being
          flattened to near-black. Everything that sits on top of it — the
          Win98 cards, the navy title plate, the vote badge — is opaque, so
          letting more light through costs no contrast. */}
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 -z-10 backdrop-saturate-150",
          isDev ? "backdrop-blur-md" : "backdrop-blur-2xl",
        )}
        style={{
          background: isDev
            ? "linear-gradient(160deg, rgba(96,152,214,0.28) 0%, rgba(38,96,164,0.38) 58%, rgba(18,58,110,0.50) 100%)"
            : "linear-gradient(160deg, rgba(20,20,22,0.58) 0%, rgba(10,10,11,0.82) 100%)",
        }}
      />
      {/* A single specular sweep, so the plate reads as glass rather than as
          a flat tint. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 22%, transparent 46%)",
        }}
      />
      <button
        type="button"
        onClick={() => router.push(isDev ? "/dev" : "/dotm")}
        className={cn(
          "absolute left-4 top-4 z-10 px-3 py-1.5 font-chrome text-xs tracking-wide",
          isDev ? "win98-border bg-taskbar text-black" : "macos-glass rounded-full",
        )}
      >
        ← {t("backToDesktop")}
      </button>

      {/* Title badge. A bare centred <h1> read as a page heading floating on
          the wallpaper; plated, it reads as this surface's own nameplate. */}
      <div className="mb-4 flex justify-center">
        <div
          className={cn(
            "inline-flex items-center gap-3 px-6 py-2.5",
            isDev
              ? // THE SAME PLATE THE PRESS KIT BUTTON WEARS, and it dropped the
                // bevel for the reason that button did: `win98-border` draws a
                // four-tone chiselled frame, and a chiselled frame around a
                // blue gradient sitting on a photograph reads as a grey box
                // that happens to contain a nameplate — two frames for one
                // object. What is left is the navy-to-blue face on its own,
                // with a soft cast shadow lifting it off the wallpaper rather
                // than a hard 3px offset stamping it onto one.
                //
                // Written out rather than extracted to a shared class: the
                // press kit is an interactive `<a>` with hover and press
                // states, this is an inert plate, and the face is the only
                // part the two are meant to have in common. See
                // `PressKitButton` in `components/shared/BrandUniverse.tsx`.
                "rounded-[3px] bg-gradient-to-b from-[#1f5fa9] to-[#0a2f5c] shadow-[0_2px_10px_rgba(0,0,0,0.35)]"
              : "macos-glass rounded-full",
          )}
        >
          <span aria-hidden="true" className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-danger" />
          </span>
          <h1 className="font-chrome text-xl font-bold uppercase tracking-[0.34em] text-white sm:text-2xl">
            {t("title")}
          </h1>
          <span className="font-chrome text-[11px] uppercase tracking-[0.2em] text-white/65">
            {shows.filter((s) => s.isPast).length} stops
          </span>
        </div>
      </div>

      <div className="mb-5 flex justify-center gap-2">
        <button
          type="button"
          onClick={() => setView("map")}
          className={cn(
            "px-4 py-1.5 font-chrome text-sm font-semibold tracking-wide transition-colors",
            isDev ? "win98-border win98-press bg-persona-surface" : "macos-glass rounded-full",
            view === "map" && "outline outline-2 outline-accent",
          )}
        >
          {t("mapView")}
        </button>

        <button
          type="button"
          onClick={() => setView("list")}
          className={cn(
            "px-4 py-1.5 font-chrome text-sm font-semibold tracking-wide transition-colors",
            isDev ? "win98-border win98-press bg-persona-surface" : "macos-glass rounded-full",
            view === "list" && "outline outline-2 outline-accent",
          )}
        >
          {t("listView")}
        </button>
      </div>

      {view === "map" ? (
        // Was a hard 560px, which on a 900px-tall laptop put the map's bottom
        // edge below the fold and made the page scroll — on a *map*, where the
        // page scrolling and the map panning are the same gesture. It fills
        // the leftover height instead, so it is as tall as the screen allows
        // and never taller.
        <div
          className={cn(
            "mx-auto min-h-0 w-full max-w-5xl flex-1 overflow-hidden",
            isDev ? "win98-border" : "macos-glass rounded-2xl",
          )}
        >
          <IndiaShowsMap shows={shows} />
        </div>
      ) : (
        <ShowsList shows={shows} />
      )}
    </main>
  );
}
