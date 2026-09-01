"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useTrackLyrics } from "@/hooks/use-track-lyrics";
import { activeCueIndex } from "@/lib/lrc";
import { cn } from "@/lib/utils";

/**
 * The time-synced lyric rail, shared by both personas' players.
 *
 * Three lines at a time, moving top-down: the line being sung is lit, its
 * neighbours are dimmed, and as the song advances the topmost fades up and
 * out while the next fades in from below.
 *
 * A rolling window rather than a scrolling sheet. A full sheet with a
 * highlight makes the visitor hunt for the lit line; three lines put it in
 * the same place every time, which is the entire point of syncing to audio.
 *
 * This used to live inside `DotmMusicWheel`. DEV's player needed the same
 * behaviour over its album art, and a second implementation would have been
 * two sets of timings to keep in step — the sync is the feature, so there is
 * one of it.
 */

const LYRIC_EASE = [0.22, 1, 0.36, 1] as const;

/** How many lines are on screen at once. */
const LYRIC_WINDOW = 3;

/**
 * `column` is DOTM's own pane — type sized for a tall, wide column.
 * `overlay` sits on top of album art, so it runs a shade smaller and leans on
 * a heavier shadow to stay readable over a photograph.
 */
export type LyricRailVariant = "column" | "overlay";

export function LyricRail({
  trackId,
  seconds,
  playing,
  reduceMotion,
  variant = "column",
  showPausedHint = true,
}: {
  trackId: string;
  seconds: number;
  playing: boolean;
  reduceMotion: boolean;
  variant?: LyricRailVariant;
  showPausedHint?: boolean;
}) {
  const { cues, offset, loading, failed } = useTrackLyrics(trackId);
  const overlay = variant === "overlay";

  const active = cues.length ? activeCueIndex(cues, seconds, offset) : -1;
  // Before the first cue lands, show the opening lines dimmed rather than an
  // empty column — the sheet is there, the song has simply not reached it.
  const start = active <= 0 ? 0 : active - 1;
  const visible = cues
    .slice(start, start + LYRIC_WINDOW)
    .map((cue, i) => ({ ...cue, index: start + i }));

  if (loading) {
    return (
      <RailFrame overlay={overlay}>
        <p className="font-chrome text-[10px] uppercase tracking-[0.3em] text-white/30">
          Loading lyrics…
        </p>
      </RailFrame>
    );
  }

  if (!cues.length) {
    return (
      <RailFrame overlay={overlay}>
        <p className="max-w-[22rem] text-center font-body text-sm leading-relaxed text-white/40">
          {failed
            ? "This song's lyric sheet couldn't be loaded."
            : "No timed lyrics for this one yet."}
        </p>
      </RailFrame>
    );
  }

  return (
    <RailFrame overlay={overlay}>
      <AnimatePresence mode="popLayout" initial={false}>
        {visible.map((cue) => {
          const lit = cue.index === active;
          return (
            <motion.p
              key={`${trackId}-${cue.index}`}
              layout={!reduceMotion}
              initial={
                reduceMotion
                  ? { opacity: lit ? 1 : 0.3 }
                  : { opacity: 0, y: 34, filter: "blur(7px)" }
              }
              animate={
                reduceMotion
                  ? { opacity: lit ? 1 : 0.3 }
                  : {
                      opacity: lit ? 1 : 0.3,
                      y: 0,
                      filter: "blur(0px)",
                      scale: lit ? 1 : 0.95,
                    }
              }
              exit={
                reduceMotion ? { opacity: 0 } : { opacity: 0, y: -34, filter: "blur(7px)" }
              }
              transition={
                reduceMotion ? { duration: 0 } : { duration: 0.44, ease: LYRIC_EASE }
              }
              className={cn(
                "px-3 text-center font-body leading-snug",
                overlay
                  ? lit
                    ? "text-base font-semibold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.95)] sm:text-lg"
                    : "text-sm text-white/65 [text-shadow:0_2px_8px_rgba(0,0,0,0.9)]"
                  : lit
                    ? "text-lg font-semibold text-white drop-shadow-[0_0_18px_rgba(255,212,0,0.35)] sm:text-xl"
                    : "text-base text-white/60",
              )}
            >
              {cue.text || "…"}
            </motion.p>
          );
        })}
      </AnimatePresence>

      {showPausedHint && !playing && (
        <p className="absolute bottom-1 font-chrome text-[9px] uppercase tracking-[0.28em] text-white/25">
          Paused
        </p>
      )}
    </RailFrame>
  );
}

/**
 * The rail's frame. Masked top and bottom so a line does not vanish at a hard
 * edge — it thins into the dark, which is what makes the movement read as a
 * fade rather than a clip.
 */
function RailFrame({
  children,
  overlay,
}: {
  children: React.ReactNode;
  overlay: boolean;
}) {
  return (
    <div
      className={cn(
        // Reading surface: lyrics are read line by line, at speed, against
        // artwork. See `.long-text` in globals.css.
        "long-text relative flex min-h-0 w-full flex-1 flex-col items-center justify-center overflow-hidden",
        overlay ? "gap-2.5" : "gap-4",
      )}
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent 0%, #000 16%, #000 84%, transparent 100%)",
      }}
    >
      {children}
    </div>
  );
}

export default LyricRail;
