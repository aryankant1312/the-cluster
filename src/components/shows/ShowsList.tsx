"use client";

import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import { VoteCities } from "@/components/shows/VoteCities";
import type { Show } from "@/content/types";
import { cn } from "@/lib/utils";

/**
 * The list tab: past dates on the left, the vote board on the right.
 *
 * These used to be stacked in one narrow column with 40px between them, so
 * the vote board — the interactive half, and the reason to open this tab at
 * all — sat entirely below the fold. Side by side, both fit one screen and
 * the page itself never scrolls.
 *
 * The past column is the only part that can outgrow its space, so it is the
 * only part that scrolls, inside its own panel rather than taking the whole
 * page with it.
 */

function formatDate(date: string | null, fallback: string) {
  if (!date) return fallback;
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

export function ShowsList({ shows }: { shows: Show[] }) {
  const { persona, locale } = usePersona();
  const t = useTranslations("shows");
  const past = shows.filter((s) => s.isPast);
  const isDev = persona === "dev";

  return (
    // The vote board is the wider half now. Eight tubes in four columns
    // wrapped to two rows and pushed the bottom row off screen; given the
    // room to run eight across, the whole board fits above the fold and the
    // page never scrolls.
    <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      {/* ── Past ───────────────────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-col">
        <h2
          className={cn(
            "mb-3 inline-block self-start px-4 py-2 font-chrome text-lg tracking-widest sm:text-xl",
            isDev ? "bg-slate-700 text-white" : "macos-glass rounded-full",
          )}
        >
          {t("past")}
        </h2>

        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
          {past.map((show, i) => (
            <li
              key={show.id}
              className={cn(
                "relative overflow-hidden",
                isDev ? "win98-border bg-persona-surface" : "macos-glass rounded-lg",
              )}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-1 -top-2 font-chrome text-4xl leading-none text-black/[0.06]"
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative flex items-center justify-between gap-2 px-3 py-2">
                <a
                  href={show.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-w-0 flex-1 transition-opacity hover:opacity-70"
                >
                  {/* The city is the row's title and keeps the display face.
                      The venue and date under it are a detail line, so they go
                      up a step for legibility without being promoted into a
                      second heading. */}
                  <span className="block font-chrome text-base tracking-wide">
                    {show.city[locale]}
                  </span>
                  <span className="block truncate text-sm font-normal text-fg-muted">
                    {show.venue ?? t("venueTbd")} · {formatDate(show.date, t("dateTbd"))}
                  </span>
                </a>

                {show.instagramUrl && (
                  <a
                    href={show.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    // Square, and in the page's own navy rather than the
                    // Instagram gradient. The gradient was the loudest thing
                    // on a screen whose subject is the tour, and its pink
                    // sat under 3:1 against the card — white on #0a2f5c is
                    // the same pairing the title plate already uses.
                    className={cn(
                      "shrink-0 px-3 py-1.5 font-chrome text-[13px] uppercase tracking-[0.14em] transition-colors",
                      isDev
                        ? "win98-border win98-press bg-[#0a2f5c] text-white hover:bg-[#14477f]"
                        : "bg-white/90 text-black hover:bg-white",
                    )}
                  >
                    {t("checkItOut")}
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Vote ───────────────────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-col">
        {/* Centred over the tubes it labels, not tucked into the left
            corner where it read as a second column heading. `bg-blue-600` on
            a bright sky was blue on blue; amber on near-black clears 4.5:1
            against anything behind it. */}
        <h2
          className={cn(
            "mb-3 self-center px-5 py-2 text-center font-chrome text-lg tracking-widest sm:text-xl",
            isDev
              ? "win98-border bg-[#111827] text-[#ffc233] shadow-[3px_3px_0_rgba(0,0,0,0.45)]"
              : "macos-glass rounded-full",
          )}
        >
          {t("voteTitle")}
        </h2>
        {/* Top-aligned, with room above for the running-total bubble that
            each tube pops on hover. */}
        <div className="flex min-h-0 flex-1 items-start justify-center pt-8">
          <VoteCities />
        </div>
      </section>
    </div>
  );
}
