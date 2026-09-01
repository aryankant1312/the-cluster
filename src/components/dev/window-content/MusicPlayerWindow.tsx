"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { LyricRail } from "@/components/shared/LyricRail";
import { PlatformLinkRow } from "@/components/shared/PlatformLinkRow";
import { trackArtwork, tracks } from "@/content/tracks";
import { getAudioSource } from "@/lib/audio-source";
import { cn } from "@/lib/utils";

/**
 * DEV's music player.
 *
 * The window is sized so the sleeve, the scrubber, the title block and the
 * transport all sit in the default frame — the previous 420px column put the
 * transport row below the fold of a window that had no reason to scroll, and
 * the controls themselves were typographic glyphs ("|◀◀", "❚❚") that
 * rendered at whatever weight the system font felt like. They are drawn SVG
 * now, on a proper Win98 plate, at one consistent size.
 *
 * Lyrics are an overlay on the sleeve rather than a panel that replaces it,
 * opened from the Spotify-style microphone toggle in the sleeve's corner.
 * Nothing about opening them touches playback: the audio element is untouched
 * by the toggle, and pause/play, previous and next remain the only things
 * that move the transport. That is the whole point of a time-synced sheet —
 * it has to be watched while the song runs.
 */

const SEEK_STEP_SECONDS = 10;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

export function MusicPlayerWindow({
  initialIndex = 0,
  playRequestId = 0,
}: {
  initialIndex?: number;
  playRequestId?: number;
}) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(playRequestId > 0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showLyrics, setShowLyrics] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [prevRequestId, setPrevRequestId] = useState(playRequestId);
  const [prevIndex, setPrevIndex] = useState(index);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Adjusting state in response to changed props, per React's guidance on
  // avoiding effects for derived state: https://react.dev/learn/you-might-not-need-an-effect
  //
  // `showLyrics` is deliberately NOT reset here any more. It is a viewing
  // preference, not a property of the record: someone who opened the sheet
  // wants the next song's sheet too, and closing it on every skip meant
  // re-opening it after every track.
  if (playRequestId !== prevRequestId) {
    setPrevRequestId(playRequestId);
    setPrevIndex(initialIndex);
    setIndex(initialIndex);
    setIsPlaying(true);
    setCurrentTime(0);
    setDuration(0);
  } else if (index !== prevIndex) {
    setPrevIndex(index);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }

  const track = tracks[index];
  const src = getAudioSource(track);

  // Closing the window unmounts this subtree and takes the <audio> element
  // with it, which stops playback — no separate cleanup needed here.
  // Minimizing does NOT: the shell is `keepMounted`, so a minimized player
  // keeps playing. That is the point of the flag.
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    audio.volume = volume;
    // A rejected play() is not treated as a refusal: swapping `src` and
    // calling play() in the same commit rejects with AbortError before the
    // file has loaded. `onCanPlay` below retries once there is data.
    if (isPlaying) void audio.play().catch(() => undefined);
    else audio.pause();
    // volume is intentionally not a dependency here - it has its own effect below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = volume;
  }, [volume]);

  const togglePlay = () => {
    if (!src) return;
    setIsPlaying((prev) => !prev);
  };

  const goTo = (nextIndex: number) => {
    setIndex((nextIndex + tracks.length) % tracks.length);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const fastForward = () => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    const time = Math.min(duration || audio.duration || 0, audio.currentTime + SEEK_STEP_SECONDS);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      {src && (
        <audio
          ref={audioRef}
          src={src}
          /* Only one <audio> exists at a time and it is always the record the
             visitor has already selected, so fetching it up front costs one
             file and removes the pause between pressing play and hearing
             anything. The default ("metadata" in Chrome) waited for the first
             byte range until the click. */
          preload="auto"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onCanPlay={(e) => {
            if (isPlaying) void e.currentTarget.play().catch(() => undefined);
          }}
          onEnded={() => goTo(index + 1)}
        />
      )}

      {/* The sleeve. `min-h-0` + `flex-1` is what lets it take the room left
          over after the fixed rows below instead of forcing the window to
          scroll — an aspect-ratio box here would win the size negotiation and
          push the transport out of frame on a short viewport. */}
      <div className="win98-border relative min-h-0 flex-1 bg-black">
        <Image
          src={trackArtwork(track)}
          alt={track.title}
          fill
          className="object-cover"
          sizes="560px"
        />

        <LyricsToggle open={showLyrics} onClick={() => setShowLyrics((v) => !v)} />

        <AnimatePresence>
          {showLyrics && (
            <motion.div
              key="lyrics"
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="absolute inset-0 flex flex-col bg-black/72 backdrop-blur-[3px]"
            >
              <LyricRail
                trackId={track.id}
                seconds={currentTime}
                playing={isPlaying}
                reduceMotion={Boolean(reduceMotion)}
                variant="overlay"
                // The transport under the sleeve already says whether the
                // song is running; repeating it over the art is noise.
                showPausedHint={false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Scrubber */}
      <div className="mt-2 flex shrink-0 items-center gap-2">
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-black">
          {src ? formatTime(currentTime) : "--:--"}
        </span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={seek}
          disabled={!src}
          className="h-4 flex-1 cursor-pointer accent-black disabled:cursor-default disabled:opacity-40"
          aria-label="Seek"
        />
        <span className="w-9 shrink-0 text-[11px] tabular-nums text-black">
          {src ? formatTime(duration) : "--:--"}
        </span>
      </div>

      {/* Title block */}
      <div className="mt-1.5 flex shrink-0 items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-chrome text-sm leading-tight">
            {track.title.replace(/\.mp3$/i, "")}
          </p>
          <p className="text-[11px] text-fg-muted">{track.artist}</p>
        </div>
        {!src && (
          <span className="ml-2 shrink-0 text-[10px] tracking-wide text-fg-muted">
            UNAVAILABLE
          </span>
        )}
      </div>

      {/* Transport */}
      <div className="win98-border mt-2 flex shrink-0 items-center gap-1.5 bg-persona-surface-alt px-2 py-1.5">
        <TransportButton label="Previous" onClick={() => goTo(index - 1)}>
          <PreviousGlyph />
        </TransportButton>
        <TransportButton
          label={isPlaying ? "Pause" : "Play"}
          onClick={togglePlay}
          disabled={!src}
          primary
        >
          {isPlaying ? <PauseGlyph /> : <PlayGlyph />}
        </TransportButton>
        <TransportButton label="Fast forward 10 seconds" onClick={fastForward} disabled={!src}>
          <FastForwardGlyph />
        </TransportButton>
        <TransportButton label="Next" onClick={() => goTo(index + 1)}>
          <NextGlyph />
        </TransportButton>

        <div className="flex-1" />

        <VolumeGlyph muted={volume === 0} />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          className="h-4 w-20 cursor-pointer accent-black"
          aria-label="Volume"
        />
      </div>

      {/* Where else to hear it.
          DEV had no link out at all — the record played here or nowhere, which
          on a persona built as a nineties file browser read as a player with no
          "open with". The row is the same component and the same 38px marks the
          DOTM wheel uses, so a visitor who has seen one recognises the other.
          Boxed in a sunken plate rather than floating on the window's ground,
          which is what every other group of controls in this persona sits in. */}
      <div className="win98-border mt-2 flex shrink-0 items-center justify-center bg-persona-surface-alt py-2">
        <PlatformLinkRow
          trackId={track.id}
          title={track.title.replace(/\.mp3$/i, "")}
          spotifyId={track.spotifyId}
          isDotm={false}
        />
      </div>
    </div>
  );
}

/* ── Controls ───────────────────────────────────────────────────────────── */

/**
 * One transport key. Every key is the same 30px square (34px for play) with
 * the glyph centred inside it, so the row reads as an evenly spaced deck
 * rather than as four differently sized pieces of text.
 */
function TransportButton({
  label,
  onClick,
  disabled,
  primary,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "win98-border win98-press flex items-center justify-center bg-white text-black",
        "disabled:pointer-events-none disabled:opacity-40",
        primary ? "h-[34px] w-[34px]" : "h-[30px] w-[30px]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Spotify's lyrics control: a microphone with a sheet of lines behind it,
 * which is the mark people already read as "show me the words".
 *
 * Pressed state is a real toggle, not a colour change — `aria-pressed` plus
 * the inverted plate, so the control says what it is doing to a screen reader
 * as well as to an eye.
 */
function LyricsToggle({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={open}
      aria-label={open ? "Hide lyrics" : "Show lyrics"}
      title={open ? "Hide lyrics" : "Show lyrics"}
      className={cn(
        "win98-border win98-press absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center transition-colors",
        open ? "bg-persona-titlebar text-white" : "bg-white/90 text-black hover:bg-white",
      )}
    >
      <svg viewBox="0 0 24 24" width={15} height={15} aria-hidden="true">
        {/* The sheet behind the mic. */}
        <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity="0.75">
          <path d="M3.5 5.5h9" />
          <path d="M3.5 9.5h6.5" />
          <path d="M3.5 13.5h5" />
        </g>
        {/* The mic itself. */}
        <rect x="14" y="3.2" width="4.6" height="8.4" rx="2.3" fill="currentColor" />
        <path
          d="M12.4 10.4a3.9 3.9 0 0 0 7.8 0M16.3 14.3v2.6"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M13.4 20.6l2.9-3.7 2.9 3.7z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/* ── Glyphs ─────────────────────────────────────────────────────────────── */

const GLYPH = 14;

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={GLYPH} height={GLYPH} fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a.8.8 0 0 0 1.23.67l10.3-6.8a.8.8 0 0 0 0-1.34L9.23 4.53A.8.8 0 0 0 8 5.2Z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={GLYPH} height={GLYPH} fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="4.5" width="4.2" height="15" rx="1" />
      <rect x="13.3" y="4.5" width="4.2" height="15" rx="1" />
    </svg>
  );
}

function PreviousGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={GLYPH} height={GLYPH} fill="currentColor" aria-hidden="true">
      <rect x="4.5" y="5" width="2.6" height="14" rx="0.8" />
      <path d="M20 6.1v11.8a.8.8 0 0 1-1.24.67l-8.7-5.9a.8.8 0 0 1 0-1.34l8.7-5.9A.8.8 0 0 1 20 6.1Z" />
    </svg>
  );
}

function NextGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={GLYPH} height={GLYPH} fill="currentColor" aria-hidden="true">
      <rect x="16.9" y="5" width="2.6" height="14" rx="0.8" />
      <path d="M4 6.1v11.8a.8.8 0 0 0 1.24.67l8.7-5.9a.8.8 0 0 0 0-1.34l-8.7-5.9A.8.8 0 0 0 4 6.1Z" />
    </svg>
  );
}

function FastForwardGlyph() {
  return (
    <svg viewBox="0 0 24 24" width={GLYPH} height={GLYPH} fill="currentColor" aria-hidden="true">
      <path d="M3 6.4v11.2a.8.8 0 0 0 1.24.67l8.2-5.6a.8.8 0 0 0 0-1.34l-8.2-5.6A.8.8 0 0 0 3 6.4Z" />
      <path d="M12.4 6.4v11.2a.8.8 0 0 0 1.24.67l8.2-5.6a.8.8 0 0 0 0-1.34l-8.2-5.6a.8.8 0 0 0-1.24.67Z" />
    </svg>
  );
}

function VolumeGlyph({ muted }: { muted: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="#1a1a1a"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5Z" fill="#1a1a1a" stroke="none" />
      {muted ? (
        <path d="m16 9.5 5 5M21 9.5l-5 5" strokeLinecap="round" />
      ) : (
        <path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.4 6.6a8 8 0 0 1 0 10.8" strokeLinecap="round" />
      )}
    </svg>
  );
}
