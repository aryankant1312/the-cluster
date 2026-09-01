"use client";

import { useEffect, useState } from "react";
import { voteCities } from "@/content/vote-cities";
import { useCityVotes } from "@/hooks/use-city-votes";
import { cn } from "@/lib/utils";

/**
 * "Where should DOTM play next?" — DEV's vote board.
 *
 * The tubes fill in proportion to each city's share, so the leader reads at a
 * glance without anyone parsing a number. Counts come from the database
 * rather than this browser's localStorage, which is what makes the board mean
 * anything: it shows what everyone voted, not what you voted.
 *
 * One vote per city per session. Once cast, the tube locks and shows a tick
 * — an already-counted city that still looks tappable invites a second click
 * that silently does nothing, which reads as broken. Every other city stays
 * open, so a visitor can back several.
 */

const MIN_FILL_PERCENT = 18;

function fillPercentFor(votes: number, maxVotes: number): number {
  if (maxVotes <= 0) return MIN_FILL_PERCENT;
  return Math.max(MIN_FILL_PERCENT, Math.round((votes / maxVotes) * 100));
}

function CityTube({
  name,
  votes,
  maxVotes,
  voted,
  leading,
  onVote,
}: {
  name: string;
  votes: number;
  maxVotes: number;
  voted: boolean;
  leading: boolean;
  onVote: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [pulse, setPulse] = useState(0);
  const target = fillPercentFor(votes, maxVotes);
  const prominent = hovered || voted;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      aria-pressed={voted}
      aria-label={
        voted
          ? `${name}: voted. ${votes} votes.`
          : `Vote for ${name}. Currently ${votes} votes.`
      }
      onClick={() => {
        if (voted) return;
        onVote();
        setPulse((p) => p + 1);
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        "group flex select-none flex-col items-center gap-2.5 focus:outline-none",
        voted ? "cursor-default" : "cursor-pointer",
      )}
    >
      <div className="relative h-40 w-14 sm:h-44 sm:w-16">
        {/* Running total — legible on hover, and after any tap. */}
        <div
          className={cn(
            "absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 font-chrome text-white shadow-md transition-all duration-200",
            prominent
              ? "scale-110 px-3 py-1.5 text-sm opacity-100"
              : "pointer-events-none scale-100 px-2.5 py-1 text-[11px] opacity-0",
          )}
        >
          {votes.toLocaleString("en-IN")}
        </div>

        {/* "+1" on every tap — the feedback that makes repeat voting read as
            deliberate rather than broken. Keyed so it replays each time. */}
        {pulse > 0 && (
          <span
            key={pulse}
            aria-hidden="true"
            // Unbolded: a transient "+1" is feedback, not a title, and faux
            // bold on a single-weight pixel face blurs it. Size carries what
            // the weight was doing. The city name below keeps its bold —
            // that one is the card's title.
            className="vote-pop pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 font-chrome text-base text-emerald-600"
          >
            +1
          </span>
        )}

        {voted ? (
          <span
            className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-500 shadow"
            title="You voted for this city"
          >
            <svg viewBox="0 0 20 20" width={11} height={11} aria-hidden="true" fill="none">
              <path
                d="M5 10.5l3 3 7-7"
                stroke="white"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        ) : (
          leading && (
            <span
              className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-amber-400 shadow"
              title="Currently leading"
            >
              <svg viewBox="0 0 20 20" width={10} height={10} aria-hidden="true">
                <path d="M3 15l2-8 5 4 5-4 2 8z" fill="#1a1a1a" />
              </svg>
            </span>
          )
        )}

        <div className="absolute inset-0 overflow-hidden border-2 border-slate-400/80 bg-slate-200/40 shadow-inner backdrop-blur-[1px]">
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 bg-gradient-to-t transition-[height] duration-[900ms] ease-out",
              leading
                ? "from-amber-700 via-amber-500 to-yellow-300"
                : "from-blue-800 via-blue-500 to-sky-400",
            )}
            style={{ height: mounted ? `${target}%` : "0%" }}
          >
            <div className="h-2 w-full bg-white/60" />
          </div>
        </div>

        <div
          className={cn(
            "pointer-events-none absolute inset-0 ring-1 ring-white/30 transition-shadow",
            !voted && "group-hover:ring-2 group-hover:ring-blue-500/60",
          )}
        />
      </div>

      <span
        className={cn(
          "win98-border px-3 py-1.5 font-chrome text-sm font-bold tracking-wide text-black sm:text-base",
          voted ? "bg-emerald-200" : "win98-press bg-taskbar",
        )}
      >
        {name}
      </span>
    </button>
  );
}

export function VoteCities() {
  const { counts, hasVoted, vote } = useCityVotes();

  const maxVotes = Math.max(1, ...Object.values(counts));
  const leaderId = [...voteCities].sort(
    (a, b) => (counts[b.id] ?? 0) - (counts[a.id] ?? 0),
  )[0]?.id;

  return (
    <div className="relative w-full">
      {/* All eight across on a wide screen. At four columns the board wrapped
          to two rows and the second row fell below the fold, which made the
          interactive half of this page the half nobody scrolled to. */}
      <div className="mx-auto grid w-full max-w-[1100px] grid-cols-4 justify-items-center gap-x-2 gap-y-8 lg:grid-cols-8">
        {voteCities.map((city) => (
          <CityTube
            key={city.id}
            name={city.name}
            votes={counts[city.id] ?? 0}
            maxVotes={maxVotes}
            voted={hasVoted(city.id)}
            leading={city.id === leaderId}
            onVote={() => vote(city.id)}
          />
        ))}
      </div>
    </div>
  );
}
