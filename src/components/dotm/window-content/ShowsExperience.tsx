"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
} from "framer-motion";
import { shows, upcomingShows } from "@/content/shows";
import { voteCities } from "@/content/vote-cities";
import { useCityVotes } from "@/hooks/use-city-votes";
import { useCountTo } from "@/hooks/use-count-to";
import { usePersona } from "@/components/providers/PersonaProvider";
import { cn } from "@/lib/utils";

const DotmShowsMap = dynamic(() => import("./DotmShowsMap").then((m) => m.DotmShowsMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center font-chrome text-xs tracking-widest text-fg-muted">
      LOADING MAP…
    </div>
  ),
});

function formatDate(date: string | null) {
  if (!date) return "DATE TBD";
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return date;
  return d
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .toUpperCase();
}

/* ── PAST: map + city posters ──────────────────────────────────────────── */

function PastView() {
  const { locale } = usePersona();
  const past = shows.filter((s) => s.isPast);
  const [selectedId, setSelectedId] = useState<string | null>(past[0]?.id ?? null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const selected = past.find((s) => s.id === selectedId) ?? past[0];

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      {/* Map, with the selected city laid over it as a poster plate. */}
      <div className="relative min-h-[300px] overflow-hidden rounded-2xl shadow-[0_16px_40px_-16px_rgba(0,0,0,0.8)] ring-1 ring-white/10">
        <DotmShowsMap
          shows={past}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onHover={setHoveredId}
        />

        {selected && (
          <AnimatePresence mode="wait">
            <motion.div
              key={selected.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22 }}
              className="pointer-events-none absolute inset-x-3 bottom-3 z-[500]"
            >
              <div className="macos-glass rounded-xl px-4 py-3">
                <p className="font-chrome text-[9px] uppercase tracking-[0.32em] text-persona-accent">
                  {formatDate(selected.date)}
                </p>
                <p className="mt-1 font-headline text-3xl leading-none tracking-wide text-white">
                  {selected.city[locale]}
                </p>
                <p className="mt-1 truncate font-body text-xs text-white/60">
                  {selected.venue ?? "VENUE TBD"}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5" />
      </div>

      {/* The stops, numbered like a tour itinerary rather than tabulated. */}
      <div className="flex min-h-0 flex-col gap-2 overflow-y-auto pr-1">
        {past.map((show, i) => {
          const active = show.id === selectedId;
          const hot = show.id === hoveredId;
          return (
            <motion.button
              key={show.id}
              type="button"
              onClick={() => setSelectedId(show.id)}
              onMouseEnter={() => setHoveredId(show.id)}
              onMouseLeave={() => setHoveredId(null)}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className={cn(
                "group relative overflow-hidden rounded-xl border p-3 text-left transition-all",
                active
                  ? "border-persona-accent bg-persona-accent/10 shadow-[0_0_0_1px_rgba(180,0,26,0.5)]"
                  : hot
                    ? "border-white/25 bg-white/5"
                    : "border-white/10 bg-white/[0.03] hover:bg-white/5",
              )}
            >
              {/* Itinerary number, sunk into the card as texture. */}
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -right-1 -top-3 font-headline text-5xl leading-none transition-colors",
                  active ? "text-persona-accent/25" : "text-white/[0.06]",
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="relative flex items-center justify-between gap-2">
                <span className="font-headline text-base tracking-wide">
                  {show.city[locale]}
                </span>
                <span className="text-[10px] tabular-nums text-fg-muted">
                  {formatDate(show.date)}
                </span>
              </div>
              <p className="relative mt-0.5 truncate text-xs text-fg-muted">
                {show.venue ?? "VENUE TBD"}
              </p>

              {active && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="relative mt-2.5 flex gap-2 overflow-hidden"
                >
                  <a
                    href={show.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 rounded-full border border-white/10 bg-white/10 py-1.5 text-center font-chrome text-[11px] tracking-wide transition-colors hover:bg-white/15"
                  >
                    DIRECTIONS
                  </a>
                  {show.instagramUrl && (
                    <a
                      href={show.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 rounded-full bg-gradient-to-r from-fuchsia-600 via-pink-600 to-orange-500 py-1.5 text-center font-chrome text-[11px] tracking-wide text-white transition-opacity hover:opacity-90"
                    >
                      WATCH
                    </a>
                  )}
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

/* ── NEXT CITY: podium + full board ────────────────────────────────────── */

/**
 * THE VOTE BOARD.
 *
 * This is the one surface on the Shows window a visitor can change, so it is
 * built to feel like it. Three things carry that:
 *
 *   THE BARS ARE THE DATA. Podium heights and row fills are both derived from
 *   the live counts against the leader, not from fixed classes — the old podium
 *   was `h-20 / h-28 / h-14` regardless of what the board actually said, which
 *   is a picture of a podium rather than a reading of one. They rise from
 *   nothing on open, staggered, so the shape assembles in front of you.
 *
 *   VOTING ANSWERS BACK. A tap fires a ripple out of the point of contact and
 *   throws a short burst of sparks, the count tweens to its new figure rather
 *   than snapping, and the card locks into an emerald VOTED state. Nothing here
 *   waits on the network: `useCityVotes` moves the count optimistically and
 *   rolls it back itself if the write fails.
 *
 *   THE GROUND HAS DEPTH. A crimson mesh sits under the board and a soft
 *   spotlight follows the cursor across it, so the surface reads as lit rather
 *   than as flat black behind flat cards.
 *
 * ALL OF IT STANDS DOWN UNDER `prefers-reduced-motion`: bars and fills are drawn
 * at their final size, the spotlight is not mounted, sparks and ripples are not
 * rendered, the shine is hidden by `motion-reduce`, and counts land on their
 * figures without tweening. What is left is the same board, still — which is the
 * test each of these had to pass, because none of the motion carries information
 * the static state does not.
 *
 * COLOUR IS NEVER THE ONLY SIGNAL. Voted cards carry a tick and the word VOTED
 * as well as the emerald; unvoted ones carry the word VOTE; rank is a numeral
 * before it is a medal colour.
 *
 * VOTED CARDS STAY FOCUSABLE. `aria-disabled`, not `disabled` — a `disabled`
 * button leaves the tab order entirely, so a keyboard visitor would tab from one
 * unvoted city straight past every city they had already voted for without ever
 * hearing the count. The handler refuses the repeat instead; `useCityVotes`
 * refuses it a second time against storage.
 */

/** Shortest a podium bar may be, as a fraction of its track. */
const PODIUM_FLOOR = 0.42;
/** Shortest a row fill may be, so a low count is still a readable bar. */
const ROW_FLOOR = 0.08;

/** Medal colours by finishing place — gold, silver, bronze. */
const MEDALS = ["#f5c542", "#c0c6cf", "#c98a5b"] as const;

/**
 * One vote counter.
 *
 * Counts up from zero on open, then tweens between figures for the rest of the
 * window's life — two behaviours out of one hook. `useCountTo` animates
 * *between* targets and shows the first one it is handed outright, so giving it
 * 0 on the first render and the real figure on the next makes that first
 * transition the count-up and every later change a delta.
 *
 * Its sibling `useCountUp` restarts from zero whenever its target moves, so
 * casting a vote would have spun the whole number up from nothing again — which
 * reads as the board reloading rather than as one tally ticking over.
 */
function VoteCount({ votes, className }: { votes: number; className?: string }) {
  /**
   * Zero on the first render, the real figure on every one after — which is
   * what turns `useCountTo` into a count-up exactly once.
   *
   * Flipped during render rather than from an effect. React re-runs the render
   * immediately and throws the first pass away, so nothing is ever painted at
   * zero and there is no cascading commit; an effect would paint 0, commit it,
   * then correct it a frame later. This is React's own "adjusting state when a
   * prop changes" — the same idiom `useCountTo` uses internally, and the reason
   * the lint rule against setState-in-an-effect does not apply here.
   */
  const [primed, setPrimed] = useState(false);
  if (!primed) setPrimed(true);

  const shown = useCountTo(primed ? votes : 0) ?? 0;

  return (
    <span className={cn("tabular-nums", className)}>
      {Math.round(shown).toLocaleString("en-IN")}
    </span>
  );
}

/**
 * The spark burst thrown by a vote.
 *
 * Angles and distances are drawn once per burst rather than on every render.
 * The count is tweening throughout the burst's short life, so this component
 * re-renders several times while it is on screen — re-rolling the particles on
 * each of those would make the burst scintillate in place instead of fly apart.
 */
function VoteBurst({ seed }: { seed: number }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const angle = (i / 12) * Math.PI * 2 + (seed % 7) * 0.19;
        const distance = 34 + ((i * 13 + seed * 7) % 26);
        return {
          x: Math.cos(angle) * distance,
          // Biased upward, the way thrown confetti leaves the hand.
          y: Math.sin(angle) * distance - 8,
          hue: i % 3 === 0 ? "#f5c542" : i % 3 === 1 ? "#ff2f4d" : "#ffffff",
          size: 3 + (i % 3),
        };
      }),
    [seed],
  );

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0">
      {sparks.map((spark, i) => (
        <motion.span
          key={i}
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{ width: spark.size, height: spark.size, background: spark.hue }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: spark.x, y: spark.y, opacity: 0, scale: 0.4 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

/** The ripple that leaves the point of contact. One per vote, then gone. */
function VoteRipple({ x, y }: { x: number; y: number }) {
  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full"
      style={{
        left: x,
        top: y,
        width: 12,
        height: 12,
        marginLeft: -6,
        marginTop: -6,
        background:
          "radial-gradient(circle, rgba(255,47,77,0.55) 0%, rgba(255,47,77,0.12) 55%, rgba(255,47,77,0) 70%)",
      }}
      initial={{ scale: 0, opacity: 0.9 }}
      animate={{ scale: 26, opacity: 0 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
    />
  );
}

/**
 * Where a vote landed.
 *
 * `seed` increments per vote and is what re-keys the burst and the ripple, so
 * two taps in quick succession restart them rather than the second being
 * swallowed while the first is still on screen. `x`/`y` are the contact point in
 * the card's own coordinates, which is where the ripple starts.
 */
interface Hit {
  cityId: string;
  seed: number;
  x: number;
  y: number;
}

/**
 * NEXT CITY — the dates that exist, beside the vote for the ones that do not.
 *
 * Deliberately the same object as a past-show card next door in `PastView`:
 * the rounded border, the sunk itinerary numeral, the city over the venue over
 * the date. Two lists of tour stops on one screen should read as the same kind
 * of thing, and the only difference worth drawing is what the card offers —
 * DIRECTIONS and WATCH on a show that happened, GET TICKETS on one that has
 * not.
 *
 * NOT A BUTTON WRAPPING A BUTTON. The past card is itself a `<button>` because
 * it drives the map beside it; there is no map on this side, so the card is a
 * plain container and the only control in it is the ticket action. Nesting one
 * inside the other would be invalid markup and would give a keyboard visitor
 * two stops for one card.
 */
function NextCityTiles() {
  const { locale } = usePersona();

  if (upcomingShows.length === 0) return null;

  return (
    <div className="flex min-h-0 flex-col gap-2.5">
      {upcomingShows.map((show, i) => (
        <motion.article
          key={show.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left transition-colors hover:border-white/25 hover:bg-white/5"
        >
          {/* Itinerary number, sunk into the card as texture — the same device
              the past list uses. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-1 -top-3 font-headline text-5xl leading-none text-white/[0.06]"
          >
            {String(i + 1).padStart(2, "0")}
          </span>

          <div className="relative flex items-center justify-between gap-2">
            <span className="font-headline text-base tracking-wide">
              {show.city[locale]}
            </span>
            <span className="text-[10px] tabular-nums text-fg-muted">
              {formatDate(show.date)}
            </span>
          </div>
          <p className="relative mt-0.5 truncate text-xs text-fg-muted">
            {show.venue ?? "VENUE TBD"}
          </p>

          {/*
            ONE LABEL, TWO STATES. The button reads GET TICKETS whether or not
            there is anywhere to send you, so the cards keep one shape down the
            list; what changes is whether it is a link or an inert, greyed
            control that says why in its tooltip.

            A disabled `<a>` is not a thing — `aria-disabled` on an anchor still
            follows its href — so the unsold state is a real `<button disabled>`
            rather than a styled link. See `ticketsUrl` in `content/types.ts`
            for why null is the honest default while nothing is on sale.
          */}
          {show.ticketsUrl ? (
            <a
              href={show.ticketsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="relative mt-2.5 block rounded-full bg-persona-accent py-1.5 text-center font-chrome text-[11px] tracking-wide text-white transition-colors hover:bg-persona-accent/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            >
              GET TICKETS
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Tickets are not on sale for this date yet"
              className="relative mt-2.5 block w-full cursor-not-allowed rounded-full border border-white/10 bg-white/[0.04] py-1.5 text-center font-chrome text-[11px] tracking-wide text-white/35"
            >
              GET TICKETS
            </button>
          )}
        </motion.article>
      ))}
    </div>
  );
}

function VoteView() {
  const { counts, hasVoted, vote } = useCityVotes();
  const reduced = Boolean(useReducedMotion());

  const [hit, setHit] = useState<Hit | null>(null);
  const seedRef = useRef(0);

  const cast = (cityId: string) => (e: React.MouseEvent<HTMLElement>) => {
    if (hasVoted(cityId)) return;
    const rect = e.currentTarget.getBoundingClientRect();
    seedRef.current += 1;
    setHit({
      cityId,
      seed: seedRef.current,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    vote(cityId);
  };

  const ranked = [...voteCities].sort((a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0));
  const leader = Math.max(1, ...Object.values(counts));
  const podium = ranked.slice(0, 3);
  const rest = ranked.slice(3);

  // Silver, gold, bronze — gold in the centre, so a podium reads as a podium.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <AmbientField reduced={reduced} />

      {/*
        TWO HALVES: the dates on the left, the vote on the right.

        The screen was one centred column — heading, podium, board — which put
        the only two things this window is about, "here is where we are going"
        and "tell us where to go next", one below the other with the second
        below the fold. Side by side, the offer and the ask are one sentence.

        `lg:grid-cols-2` rather than a flex row: an equal-fraction grid is what
        makes the alignment below true. The three podium bars are `flex-1`, so
        three bars plus two gaps come to exactly the width of one column — and
        that column is exactly the width of a next-city tile opposite. Sized in
        rems, the three would only ever have matched at one viewport width.

        Each half scrolls on its own above `lg`; below it they stack and the
        outer column scrolls, because two independent scrollers stacked on a
        phone is two ways to lose your place.
      */}
      <div className="relative grid min-h-0 flex-1 gap-5 overflow-y-auto px-1 pb-3 pt-1 lg:grid-cols-2 lg:gap-6 lg:overflow-hidden">
        {/* ── LEFT: the dates that exist ──────────────────────────────── */}
        <section className="flex min-h-0 flex-col gap-3 lg:overflow-y-auto lg:pr-1">
          <div className="text-center">
            <p className="font-chrome text-[11px] tracking-[0.24em] text-fg-muted">
              NEXT CITY
            </p>
            <p className="mt-1 font-chrome text-[10px] tracking-[0.2em] text-white/30">
              DATES ON THE BOOKS
            </p>
          </div>
          <NextCityTiles />
        </section>

        {/* ── RIGHT: the ranking and the vote ─────────────────────────── */}
        <section className="flex min-h-0 flex-col gap-7 lg:overflow-y-auto lg:pr-1">
        <div className="text-center">
          <p className="font-chrome text-[11px] tracking-[0.24em] text-fg-muted">
            WHERE SHOULD DOTM PLAY NEXT?
          </p>
          <p className="mt-1 font-chrome text-[10px] tracking-[0.2em] text-white/30">
            ONE VOTE PER CITY
          </p>
        </div>

        {/* ── The podium ─────────────────────────────────────────────── */}
        <div className="flex items-end justify-center gap-3 sm:gap-5">
          {podiumOrder.map((city, i) => {
            const place = ranked.indexOf(city);
            const votes = counts[city.id] ?? 0;
            const voted = hasVoted(city.id);
            const gold = place === 0;
            const fill = PODIUM_FLOOR + (1 - PODIUM_FLOOR) * (votes / leader);

            return (
              <motion.button
                key={city.id}
                type="button"
                onClick={cast(city.id)}
                aria-disabled={voted || undefined}
                aria-label={
                  voted
                    ? `${city.name}, rank ${place + 1}: voted. ${votes} votes.`
                    : `Vote for ${city.name}, rank ${place + 1}. Currently ${votes} votes.`
                }
                initial={reduced ? false : { opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: reduced ? 0 : i * 0.09, duration: 0.45, ease: "easeOut" }}
                className={cn(
                  // `flex-1 min-w-0` rather than a fixed 6.5rem/8rem. This is
                  // the alignment the layout note above promises: three equal
                  // bars plus the two gaps between them come to exactly the
                  // width of this column, which the grid makes exactly the
                  // width of a next-city tile opposite. A rem width could only
                  // ever have matched at one viewport size. `min-w-0` because
                  // a flex item refuses to shrink below its content otherwise,
                  // and the city name inside is what would have set that floor.
                  "group relative flex min-w-0 flex-1 flex-col items-center gap-2 rounded-2xl border p-3 pb-0 text-center outline-none backdrop-blur-md",
                  "transition-[transform,border-color,background-color] duration-300",
                  "focus-visible:ring-2 focus-visible:ring-white/70",
                  voted
                    ? "cursor-default border-emerald-400/40 bg-emerald-400/[0.06]"
                    : gold
                      ? "cursor-pointer border-[#f5c542]/35 bg-white/[0.04] hover:-translate-y-1 hover:border-[#f5c542]/70"
                      : "cursor-pointer border-white/10 bg-white/[0.04] hover:-translate-y-1 hover:border-white/25",
                )}
                style={{
                  // The lit top edge is what makes a translucent card read as
                  // glass rather than as a tinted rectangle; the leader also
                  // gets a warm drop so it sits forward of the other two.
                  boxShadow: gold
                    ? "inset 0 1px 0 rgba(255,255,255,0.16), 0 18px 40px -22px rgba(245,197,66,0.6)"
                    : "inset 0 1px 0 rgba(255,255,255,0.09)",
                }}
              >
                {/* First place, as ambient light rather than another badge.
                    Behind the card and breathing on a long cycle. */}
                {gold && (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute -inset-3 -z-10 rounded-[1.6rem]"
                    style={{
                      background:
                        "radial-gradient(60% 55% at 50% 22%, rgba(245,197,66,0.34) 0%, rgba(245,197,66,0) 72%)",
                    }}
                    initial={false}
                    animate={
                      reduced
                        ? { opacity: 0.7, scale: 1 }
                        : { opacity: [0.45, 0.95, 0.45], scale: [0.97, 1.05, 0.97] }
                    }
                    transition={
                      reduced
                        ? { duration: 0 }
                        : { duration: 3.4, repeat: Infinity, ease: "easeInOut" }
                    }
                  />
                )}

                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-chrome text-xs font-bold text-black"
                  style={{
                    background: MEDALS[place] ?? "#c0c6cf",
                    boxShadow: gold
                      ? "0 0 0 3px rgba(245,197,66,0.18), 0 6px 18px -6px rgba(245,197,66,0.9)"
                      : "0 4px 12px -6px rgba(0,0,0,0.9)",
                  }}
                >
                  {place + 1}
                </span>

                <span className="flex max-w-full items-center gap-1 truncate font-headline text-sm tracking-wide text-white">
                  {city.name}
                  {voted && <Ticked />}
                </span>

                <VoteCount
                  votes={votes}
                  className={cn(
                    "font-chrome text-sm",
                    gold ? "text-[#f5c542]" : "text-persona-accent",
                  )}
                />

                {/* A fixed track with the bar rising inside it, so the card's
                    own height never depends on the count. Cards that resized as
                    the board moved made the whole podium jump on every vote. */}
                <span className="relative mt-1 flex h-24 w-full items-end overflow-hidden rounded-t-xl sm:h-28">
                  <motion.span
                    className={cn(
                      "w-full rounded-t-xl border border-b-0 transition-colors duration-300",
                      voted
                        ? "border-emerald-400/50 bg-gradient-to-t from-emerald-400/45 to-emerald-400/5"
                        : gold
                          ? "border-[#f5c542]/40 bg-gradient-to-t from-[#f5c542]/45 via-persona-accent/25 to-transparent group-hover:from-[#f5c542]/70"
                          : "border-white/15 bg-gradient-to-t from-persona-accent/45 to-persona-accent/5 group-hover:from-persona-accent/70",
                    )}
                    // `"0%"`, not `0`. A bare zero is a pixel zero, so both
                    // ends of this tween would be in different units and
                    // framer-motion has to measure the element to reconcile
                    // them. Writing the start as a percentage skips that
                    // round-trip entirely — same visual result, one less thing
                    // that depends on the element having been laid out first.
                    initial={reduced ? false : { height: "0%" }}
                    animate={{ height: `${fill * 100}%` }}
                    transition={{
                      delay: reduced ? 0 : 0.18 + i * 0.12,
                      duration: reduced ? 0 : 0.85,
                      ease: "easeOut",
                    }}
                  />
                </span>

                {/* The call to action, kept out of the resting state so three
                    cards are not shouting VOTE at once. Decorative — the
                    button's own `aria-label` already says what it does. */}
                {!voted && (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 bottom-2 font-chrome text-[9px] tracking-[0.22em] text-transparent transition-colors duration-200 group-hover:text-white/85 group-focus-visible:text-white/85"
                  >
                    VOTE
                  </span>
                )}

                {hit?.cityId === city.id && !reduced && (
                  <>
                    <VoteRipple key={`r${hit.seed}`} x={hit.x} y={hit.y} />
                    <VoteBurst key={`b${hit.seed}`} seed={hit.seed} />
                  </>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── The rest of the board ────────────────────────────────────
            `max-w-3xl` is gone with the centring that needed it. In a half
            column it was capping the rows narrower than the podium above
            them, so the board stepped in at the fourth row for no reason a
            reader could see. Full width now, which is the podium's width,
            which is the tile's width. */}
        <div className="flex w-full flex-col gap-2">
          {rest.map((city, i) => {
            const votes = counts[city.id] ?? 0;
            const voted = hasVoted(city.id);
            const fill = Math.max(ROW_FLOOR, votes / leader);

            return (
              <motion.button
                key={city.id}
                type="button"
                onClick={cast(city.id)}
                aria-disabled={voted || undefined}
                aria-label={
                  voted
                    ? `${city.name}, rank ${i + 4}: voted. ${votes} votes.`
                    : `Vote for ${city.name}, rank ${i + 4}. Currently ${votes} votes.`
                }
                initial={reduced ? false : { opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduced ? 0 : 0.3 + i * 0.05, duration: 0.35 }}
                className={cn(
                  // 52px floor: these are the primary targets on this board and
                  // a 40px row is under every platform minimum.
                  "group relative min-h-[52px] overflow-hidden rounded-xl border px-3 py-2.5 text-left outline-none",
                  "transition-[transform,border-color,box-shadow,background-color] duration-300",
                  "focus-visible:ring-2 focus-visible:ring-white/70",
                  voted
                    ? "cursor-default border-emerald-400/35 bg-emerald-400/[0.06]"
                    : "cursor-pointer border-white/10 bg-white/[0.03] hover:scale-[1.01] hover:border-persona-accent/50 hover:bg-white/[0.06] hover:shadow-[0_10px_30px_-14px_rgba(180,0,26,0.9)] active:scale-[0.995]",
                )}
              >
                {/* The fill, as a proportion of the leader count. */}
                <motion.span
                  aria-hidden="true"
                  className={cn(
                    "pointer-events-none absolute inset-y-0 left-0",
                    voted
                      ? "bg-gradient-to-r from-emerald-400/28 via-emerald-400/10 to-transparent"
                      : "bg-gradient-to-r from-persona-accent/40 via-persona-accent/14 to-transparent",
                  )}
                  // `"0%"` rather than `0`, for the same reason as the podium
                  // bar above: keep both ends of the tween in one unit.
                  initial={reduced ? false : { width: "0%" }}
                  animate={{ width: `${fill * 100}%` }}
                  transition={{
                    delay: reduced ? 0 : 0.34 + i * 0.05,
                    duration: reduced ? 0 : 0.9,
                    ease: "easeOut",
                  }}
                />

                {/* One sweep of light across the row on hover. Pure transform,
                    so it costs a composited layer and no layout. */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[420%] motion-reduce:hidden"
                />

                <div className="relative flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="w-5 shrink-0 font-chrome text-[10px] tabular-nums text-white/40">
                      {String(i + 4).padStart(2, "0")}
                    </span>
                    <span className="truncate font-headline text-base tracking-wide">
                      {city.name}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-3">
                    <VoteCount votes={votes} className="text-xs text-persona-fg" />

                    {voted ? (
                      <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/50 bg-emerald-400/10 px-2.5 py-1 font-chrome text-[10px] tracking-widest text-emerald-300 shadow-[0_0_14px_-2px_rgba(52,211,153,0.55)]">
                        <Ticked />
                        VOTED
                      </span>
                    ) : (
                      <span className="rounded-full border border-white/15 px-2.5 py-1 font-chrome text-[10px] tracking-widest text-fg-muted transition-[color,border-color,box-shadow,background-color] duration-200 group-hover:border-persona-accent group-hover:bg-persona-accent/15 group-hover:text-white group-hover:shadow-[0_0_16px_-1px_rgba(255,47,77,0.85)] group-focus-visible:border-persona-accent group-focus-visible:text-white">
                        VOTE
                      </span>
                    )}
                  </div>
                </div>

                {hit?.cityId === city.id && !reduced && (
                  <>
                    <VoteRipple key={`r${hit.seed}`} x={hit.x} y={hit.y} />
                    <VoteBurst key={`b${hit.seed}`} seed={hit.seed} />
                  </>
                )}
              </motion.button>
            );
          })}
        </div>
        </section>
      </div>
    </div>
  );
}

/**
 * The ground the board sits on.
 *
 * Three fixed blooms — two crimson, one gold — give the panel depth instead of
 * flat black, and a fourth follows the cursor so the surface reads as lit rather
 * than printed.
 *
 * The spotlight is driven by motion values written straight from the pointer
 * handler, so sweeping the mouse across the board re-renders nothing at all; a
 * `useState` here would re-render the entire vote board on every mousemove.
 *
 * The listener is on the window, not on this layer: the layer lies over the
 * whole board and is necessarily `pointer-events-none`, so it never receives a
 * pointer event of its own.
 */
function AmbientField({ reduced }: { reduced: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(-1000);
  const my = useMotionValue(-1000);
  const spotlight = useMotionTemplate`radial-gradient(280px circle at ${mx}px ${my}px, rgba(255,47,77,0.16), transparent 72%)`;

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      mx.set(e.clientX - rect.left);
      my.set(e.clientY - rect.top);
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduced, mx, my]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(80% 60% at 50% -10%, rgba(180,0,26,0.20) 0%, rgba(180,0,26,0) 62%)," +
            "radial-gradient(55% 45% at 12% 108%, rgba(245,197,66,0.10) 0%, rgba(245,197,66,0) 70%)," +
            "radial-gradient(60% 50% at 92% 88%, rgba(180,0,26,0.14) 0%, rgba(180,0,26,0) 72%)",
        }}
      />
      {!reduced && (
        <motion.div className="absolute inset-0" style={{ background: spotlight }} />
      )}
    </div>
  );
}

/**
 * The confirmation tick, shared by the podium cards and the board rows.
 *
 * `aria-hidden`: it always sits beside the word VOTED or inside a label that
 * already says so, and a screen reader announcing "image, tick" after that adds
 * nothing. It is here for sighted readers, and so that the voted state is not
 * carried by the emerald alone.
 */
function Ticked() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500"
    >
      <svg viewBox="0 0 20 20" width={9} height={9} fill="none">
        <path
          d="M5 10.5l3 3 7-7"
          stroke="white"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

/* ── Shell ─────────────────────────────────────────────────────────────── */

export function ShowsExperience() {
  const past = shows.filter((s) => s.isPast);
  const [view, setView] = useState<"past" | "vote">("past");
  /**
   * The nudge on the NEXT CITY tab. It stops the moment the tab is opened —
   * a permanent attention-grabber stops being a nudge and becomes noise.
   */
  const [voteSeen, setVoteSeen] = useState(false);

  return (
    <div className="shows-type flex h-full w-full flex-col gap-4 overflow-hidden bg-[#0b0b0c] p-5">
      {/*
        Three tracks, not two ends. `justify-between` put the switch hard
        against the right edge, where it read as a setting attached to nothing;
        the DEV shows page centres its own view switch, and this is the same
        control doing the same job.

        A grid rather than a centred flex child, because centring inside
        `justify-between` only centres between the two siblings — the switch
        would drift left or right with the length of the heading beside it.
        `1fr auto 1fr` pins it to the middle of the window regardless, and the
        empty third track is what buys that. It stays on the heading's own row,
        so nothing moves vertically.

        Below `sm` the tracks collapse: at that width a centred pill and a
        two-line heading fighting for one row is worse than stacking them.
      */}
      <div className="grid shrink-0 grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div>
          <h2 className="font-headline text-3xl leading-none tracking-wide">SHOWS</h2>
          <p className="mt-1.5 font-chrome text-[11px] tracking-[0.2em] text-fg-muted">
            {past.length} STOPS · LIVE ACROSS INDIA
          </p>
        </div>

        <div className="flex justify-self-start gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5 sm:justify-self-center">
          <button
            type="button"
            onClick={() => setView("past")}
            className={cn(
              "rounded-full px-4 py-1.5 font-chrome text-[11px] tracking-widest transition-colors",
              view === "past"
                ? "bg-persona-accent text-white"
                : "text-fg-muted hover:text-persona-fg",
            )}
          >
            PAST
          </button>

          <button
            type="button"
            onClick={() => {
              setView("vote");
              setVoteSeen(true);
            }}
            className={cn(
              "relative rounded-full px-4 py-1.5 font-chrome text-[11px] tracking-widest transition-colors",
              view === "vote"
                ? "bg-persona-accent text-white"
                : "text-fg-muted hover:text-persona-fg",
            )}
          >
            NEXT CITY
            {/* Nudge: a live dot plus a one-line hint, only while unseen. */}
            {!voteSeen && view !== "vote" && (
              <>
                <span aria-hidden="true" className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-persona-accent opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-persona-accent" />
                </span>
                <motion.span
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="pointer-events-none absolute right-0 top-full z-10 mt-2 whitespace-nowrap rounded-full bg-persona-accent px-2.5 py-1 font-chrome text-[9px] tracking-widest text-white shadow-lg"
                >
                  YOUR CITY NEXT?
                </motion.span>
              </>
            )}
          </button>
        </div>

        {/* The third track. Empty on purpose — it is what holds the switch in
            the centre of the window rather than in the centre of the gap left
            over by the heading. */}
        <span aria-hidden="true" className="hidden sm:block" />
      </div>

      {/*
        The switch between the two views, as a slide in the direction the tabs
        sit: PAST is the left tab, NEXT CITY the right, so moving right brings
        the incoming panel in from the right. Direction is what makes a
        crossfade read as navigation rather than as a redraw.

        A plain keyed `motion.div` rather than `AnimatePresence`: the outgoing
        PAST view owns a Leaflet map, and an exit animation has to hold that
        mount alive until it finishes — which, with a map tearing down inside
        it, is a handover that can simply never complete. Keying re-mounts
        immediately and the incoming panel animates in on its own.
      */}
      <motion.div
        key={view}
        initial={{ opacity: 0, x: view === "vote" ? 24 : -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        className="flex min-h-0 flex-1 flex-col"
      >
        {view === "past" ? <PastView /> : <VoteView />}
      </motion.div>
    </div>
  );
}
