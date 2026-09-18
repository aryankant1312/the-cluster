"use client";

import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import type { Show } from "@/content/types";
import { cn } from "@/lib/utils";

/**
 * THE STOPS ALREADY PLAYED, as a rail beside the map.
 *
 * WHAT THIS REPLACED. The map used to be the whole of the MAP tab — one wide
 * panel with nothing beside it — and the dates it was plotting lived a tab
 * away, in a list. Two halves of one fact, and only ever one of them on
 * screen: the pins said where without saying when, the list said when without
 * saying where.
 *
 * So this is DOTM's arrangement on DEV's furniture. Map on the left, itinerary
 * down the right, and the links that were buried in the old list — directions
 * to the venue, the clip from the night — attached to the stop they belong to.
 * See `PastView` in `dotm/window-content/ShowsExperience`: the same object,
 * with rounded corners where this one has bevels.
 *
 * SELECTION IS SHARED WITH THE MAP. Pressing a card moves the map, and the map
 * reports its own clicks back the same way, so the two panes are never looking
 * at different cities. The card is therefore a real `<button>` — and the links
 * inside it stop their clicks from reaching it, because "get directions" and
 * "show me this one" are different intentions.
 *
 * THE RAIL IS THE ONLY THING THAT SCROLLS, inside its own column. Five stops
 * fit at a laptop's height; a sixth should push this list rather than the page.
 */

function formatDate(date: string | null, fallback: string) {
  if (!date) return fallback;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function PastShowsRail({
  shows,
  selectedId,
  onSelect,
}: {
  shows: Show[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { persona, locale } = usePersona();
  const t = useTranslations("shows");
  const isDev = persona === "dev";

  return (
    <section className="flex min-h-0 flex-col">
      <h2
        className={cn(
          "mb-3 shrink-0 self-start px-4 py-2 font-chrome text-lg tracking-widest sm:text-xl",
          isDev ? "win98-border bg-[#0a2f5c] text-white" : "macos-glass rounded-full",
        )}
      >
        {t("past")}
      </h2>

      <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
        {shows.map((show, i) => {
          const active = show.id === selectedId;
          return (
            <li key={show.id}>
              <button
                type="button"
                onClick={() => onSelect(show.id)}
                aria-pressed={active}
                className={cn(
                  "relative block w-full overflow-hidden px-3 py-2 text-left transition-colors",
                  isDev ? "win98-border win98-press" : "macos-glass rounded-lg",
                  isDev &&
                    (active
                      ? "bg-[#dbe7f6]"
                      : "bg-persona-surface hover:bg-persona-surface-alt"),
                )}
              >
                {/* The stop number, sunk into the card as texture rather than
                    set as a column — the device the story wall's pieces use. */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute -right-1 -top-2 font-chrome text-4xl leading-none",
                    active ? "text-[#0a2f5c]/20" : "text-black/[0.06]",
                  )}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <span className="relative flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate font-chrome text-base tracking-wide">
                    {show.city[locale]}
                  </span>
                  <span className="shrink-0 font-chrome text-[11px] tabular-nums text-fg-muted">
                    {formatDate(show.date, t("dateTbd"))}
                  </span>
                </span>
                <span className="relative mt-0.5 block truncate text-sm text-fg-muted">
                  {show.venue ?? t("venueTbd")}
                </span>

                {/*
                  THE LINKS, ON THE SELECTED STOP ONLY.

                  Every card carrying both would put ten controls down a rail
                  four inches wide, nine of them for a city nobody is looking
                  at. `stopPropagation` is what keeps "open the map" from also
                  meaning "select this one" — the card is a button, and these
                  sit inside it.
                */}
                {active && (
                  <span className="relative mt-2 flex gap-2">
                    <a
                      href={show.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className={cn(
                        "flex-1 px-2 py-1.5 text-center font-chrome text-[11px] uppercase tracking-[0.14em] transition-colors",
                        isDev
                          ? "win98-border win98-press bg-taskbar text-black hover:bg-persona-surface-alt"
                          : "rounded-full border border-white/10 bg-white/10 hover:bg-white/15",
                      )}
                    >
                      Directions
                    </a>
                    {show.instagramUrl && (
                      <a
                        href={show.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        // The page's own navy rather than the Instagram
                        // gradient: the gradient was the loudest thing on a
                        // screen whose subject is the tour, and its pink sat
                        // under 3:1 against this card.
                        className={cn(
                          "flex-1 px-2 py-1.5 text-center font-chrome text-[11px] uppercase tracking-[0.14em] transition-colors",
                          isDev
                            ? "win98-border win98-press bg-[#0a2f5c] text-white hover:bg-[#14477f]"
                            : "rounded-full bg-white/90 text-black hover:bg-white",
                        )}
                      >
                        {t("checkItOut")}
                      </a>
                    )}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export default PastShowsRail;
