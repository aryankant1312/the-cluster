"use client";

import { useTranslations } from "next-intl";
import { usePersona } from "@/components/providers/PersonaProvider";
import { VoteCities } from "@/components/shows/VoteCities";
import { upcomingShows } from "@/content/shows";
import { cn } from "@/lib/utils";

/**
 * NEXT CITY — the dates that exist, beside the vote for the ones that do not.
 *
 * WHAT THIS REPLACED. The LIST tab used to be past dates on the left and the
 * vote board on the right. The past dates are now the rail beside the map,
 * where they belong, and printing them twice on one screen would only raise
 * the question of which copy was authoritative. So this tab is what DOTM calls
 * NEXT CITY: everything still to come. Announced dates on the left, the cities
 * being campaigned for on the right, and nothing on it that has happened.
 *
 * NOTHING HERE SCROLLS. The tab is `min-h-0 flex-1` inside a page already
 * capped at the viewport, both columns are `min-h-0`, and the announced dates
 * are spaced with `justify-between` rather than a fixed gap — so five cards use
 * the height they are given instead of demanding a height and overflowing. The
 * vote board is eight tubes in one row on a wide screen, which is the
 * arrangement it was sized for.
 *
 * ONE LABEL, TWO STATES on the ticket control. It reads Get Tickets whether or
 * not there is anywhere to send you, so the cards keep one shape down the
 * column; what changes is whether it is a link or an inert, greyed control
 * that says why in its tooltip. A disabled `<a>` is not a thing —
 * `aria-disabled` on an anchor still follows its href — so the unsold state is
 * a real `<button disabled>` rather than a styled link.
 */

export function NextCityBoard() {
  const { persona, locale } = usePersona();
  const t = useTranslations("shows");
  const isDev = persona === "dev";

  return (
    // The vote board is the wider half: eight tubes in four columns wrapped to
    // two rows and pushed the bottom row off screen. Given room to run eight
    // across, the whole board fits above the fold.
    <div className="mx-auto grid min-h-0 w-full max-w-[1500px] flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
      {/* ── Announced ──────────────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-col">
        <h2
          className={cn(
            "mb-3 shrink-0 self-start px-4 py-2 font-chrome text-lg tracking-widest sm:text-xl",
            isDev ? "win98-border bg-[#0a2f5c] text-white" : "macos-glass rounded-full",
          )}
        >
          {t("upcoming")}
        </h2>

        {upcomingShows.length === 0 ? (
          <p className="font-chrome text-sm text-fg-muted">Nothing announced yet.</p>
        ) : (
          <ul className="flex min-h-0 flex-1 flex-col justify-start gap-2 overflow-hidden">
            {upcomingShows.map((show, i) => (
              <li
                key={show.id}
                className={cn(
                  "relative min-h-0 overflow-hidden px-3 py-2",
                  isDev ? "win98-border bg-persona-surface" : "macos-glass rounded-lg",
                )}
              >
                {/* The same sunk numeral the past rail uses next door: two
                    lists of tour stops on one surface should read as the same
                    kind of thing. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-1 -top-2 font-chrome text-4xl leading-none text-black/[0.06]"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>

                <div className="relative flex items-baseline gap-2">
                  <span className="min-w-0 truncate font-chrome text-base tracking-wide">
                    {show.city[locale]}
                  </span>
                </div>

                {/* VENUE AND TICKETS SHARE A LINE, and that is what keeps this
                    tab off the scrollbar. As a full-width bar under the venue,
                    the ticket control made each card about 72px and four of
                    them overran the page by 34px at 1280×720. Inline it is a
                    chip beside the venue, the card comes in under 50px, and the
                    column has room for a fifth date without changing anything
                    here. */}
                <div className="relative mt-0.5 flex items-center justify-between gap-2">
                  <span className="min-w-0 truncate text-sm text-fg-muted">
                    {show.venue ?? t("venueTbd")}
                  </span>

                  {show.ticketsUrl ? (
                    <a
                      href={show.ticketsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "shrink-0 px-2 py-1 text-center font-chrome text-[10px] uppercase tracking-[0.14em] transition-colors",
                        isDev
                          ? "win98-border win98-press bg-[#0a2f5c] text-white hover:bg-[#14477f]"
                          : "rounded-full bg-persona-accent text-white hover:bg-persona-accent/80",
                      )}
                    >
                      Get Tickets
                    </a>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Tickets are not on sale for this date yet"
                      className={cn(
                        "shrink-0 cursor-not-allowed px-2 py-1 text-center font-chrome text-[10px] uppercase tracking-[0.14em]",
                        isDev
                          ? "win98-border bg-taskbar text-black/35"
                          : "rounded-full border border-white/10 bg-white/[0.04] text-white/35",
                      )}
                    >
                      Get Tickets
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Vote ───────────────────────────────────────────────────────── */}
      <section className="flex min-h-0 flex-col">
        {/* Centred over the tubes it labels, not tucked into the left corner
            where it read as a second column heading. Amber on near-black
            clears 4.5:1 against anything behind it. */}
        <h2
          className={cn(
            "mb-3 shrink-0 self-center px-5 py-2 text-center font-chrome text-lg tracking-widest sm:text-xl",
            isDev
              ? "win98-border bg-[#111827] text-[#ffc233] shadow-[3px_3px_0_rgba(0,0,0,0.45)]"
              : "macos-glass rounded-full",
          )}
        >
          {t("voteTitle")}
        </h2>
        {/* Top-aligned, with room above for the running-total bubble each tube
            pops on hover. */}
        <div className="flex min-h-0 flex-1 items-start justify-center pt-8">
          <VoteCities />
        </div>
      </section>
    </div>
  );
}

export default NextCityBoard;
