"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import CircleImage, {
  type RingHandle,
} from "@/components/originkit/ui/hero-04/ring-gallery";
import { VinylDisc } from "@/components/originkit/ui/hero-04/vinyl-disc";
import { trackArtwork, trackDurationMs, tracks, type Track } from "@/content/tracks";
import { findCatalogueTrackById, msToClock } from "@/content/catalogue";
import { LyricRail } from "@/components/shared/LyricRail";
import { PlatformLinkRow } from "@/components/shared/PlatformLinkRow";
import { getAudioSource } from "@/lib/audio-source";
import { cn } from "@/lib/utils";

/**
 * DOTM's record player — the wheel on the left, the record playing on the
 * right.
 *
 * The wheel used to be the whole window, and clicking a sleeve threw a modal
 * over it: the visitor lost the wheel to look at one record, then lost the
 * record to get the wheel back. Split in two, both stay on screen. Pick a
 * sleeve and it starts playing; the right half becomes that record's page.
 *
 * Transport lives inside the ring rather than under it. The seeker is drawn
 * as an arc around the centre label, so the thing showing how far through the
 * song you are is the record itself; play, previous and next sit in the band
 * below it, between the label and the sleeves, where there is bare vinyl and
 * nothing to collide with.
 *
 * Ten of the twenty-two records have masters under `public/audio`. The rest
 * are catalogue entries with no file yet — their transport is disabled and
 * says so, rather than offering a play button that does nothing.
 */

const EASE_OUT = [0.215, 0.61, 0.355, 1] as const;

/** The Cluster Wall mark, where the stock Originkit glyph used to sit. */
const CENTER_LOGO = "/images/dotm/logo.jpg";

const SEEKER_YELLOW = "#ffd400";

/**
 * Ring geometry, every value a fraction of the disc's outer diameter so the
 * whole assembly scales with the window instead of being pinned to one size.
 *
 * The bands do not overlap, and that is load-bearing. Measured outward from
 * the centre as fractions of the diameter: the label ends at 0.1685
 * (VinylDisc draws it at 33.7%), the seeker arc sits at 0.19, the transport
 * row spans roughly 0.21–0.284, and the sleeves reach inward to 0.317. Move
 * any one of these and re-check the other three — the clearances are single
 * digits of a percent, which is a couple of pixels on a small window.
 */
const RING_RADIUS = 0.415;
const CARD_WIDTH = 0.132;
const CARD_HEIGHT = 0.144;
const SEEKER_RADIUS = 0.19;
const CONTROLS_CENTRE_Y = 0.247;

/** How far a hovered sleeve steps out of the ring, as a fraction of size. */
const POP_OUT = 0.032;

function artworkSrc(track: Track): string {
  const art = trackArtwork(track);
  return typeof art === "string" ? art : art.src;
}

function clock(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

/**
 * The wheel pane, measured. The assembly is sized from whichever axis runs
 * out first, with room left at the sides for a hovered sleeve's title to sit
 * outside the ring without leaving the pane.
 *
 * Measured with `getBoundingClientRect` in a layout effect rather than with a
 * ResizeObserver. The rect is read synchronously and is correct before paint,
 * where an observer only reports on a later frame — so the wheel is drawn at
 * its real size on the first pass instead of appearing a beat late.
 */
function useBoxSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setBox((prev) =>
      prev.width === width && prev.height === height ? prev : { width, height },
    );
  }, []);

  // Runs on every render on purpose, matching `useCenterOffsets`: the pane
  // resizes with the window and with the shell around it, and no dependency
  // captures that. The equality guard above is what keeps it from looping.
  useLayoutEffect(measure);

  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  return [ref, box] as const;
}

export function DotmMusicWheel() {
  const reduceMotion = useReducedMotion();
  const [paneRef, pane] = useBoxSize<HTMLDivElement>();

  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hovered, setHovered] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);
  const ringRef = useRef<RingHandle | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = tracks[index];
  const src = getAudioSource(track);
  const meta = track.spotifyId ? findCatalogueTrackById(track.spotifyId) : undefined;

  const ringImages = useMemo(
    () =>
      tracks.map((t, i) => ({
        image: { src: artworkSrc(t), alt: t.title },
        focusY: 25 + (i % 5) * 5,
      })),
    [],
  );

  /**
   * 0.82 of the pane's width rather than all of it: the remaining ninth on
   * each side is where a hovered sleeve's title goes, and a label running off
   * the pane is worse than a slightly smaller wheel.
   */
  const size = Math.max(260, Math.min(pane.width * 0.82, pane.height - 24, 720));

  /**
   * Drive the element from `isPlaying`.
   *
   * A rejected `play()` used to flip the transport back to paused, which is
   * what broke the mystery roll: swapping `src` and calling `play()` in the
   * same commit rejects with an AbortError ("interrupted by a new load
   * request") before the new file has even started loading. The record was
   * selected, its sleeve appeared on the right, and the button silently
   * un-pressed itself.
   *
   * So the rejection is no longer treated as a refusal. `onCanPlay` retries
   * once the element actually has data, which is the point at which a browser
   * can honour the request — and a genuine autoplay block still leaves the
   * transport showing "playing", where a second click is the visitor's own
   * gesture and always works.
   *
   * Unmounting this window tears the <audio> element down with it, which
   * stops playback — there is no separate cleanup to run.
   */
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !src) return;
    if (isPlaying) void audio.play().catch(() => undefined);
    else audio.pause();
  }, [isPlaying, src]);

  const select = (next: number) => {
    const wrapped = (next + tracks.length) % tracks.length;
    setIndex(wrapped);
    setCurrentTime(0);
    setDuration(0);
    // Picking a record is a request to hear it. One with no master cannot
    // honour that, so it opens paused rather than pretending.
    setIsPlaying(Boolean(getAudioSource(tracks[wrapped])));
  };

  const togglePlay = () => {
    if (!src) return;
    setIsPlaying((prev) => !prev);
  };

  const seekTo = (fraction: number) => {
    const audio = audioRef.current;
    if (!audio || !src || !duration) return;
    const time = Math.min(duration, Math.max(0, fraction * duration));
    audio.currentTime = time;
    setCurrentTime(time);
  };

  /** Spotify's duration stands in for the seeker's clock until metadata lands. */
  const catalogueSeconds = (trackDurationMs(track) ?? 0) / 1000;
  const totalSeconds = duration || catalogueSeconds;
  const progress = totalSeconds > 0 ? Math.min(1, currentTime / totalSeconds) : 0;

  const hoveredTrack = hovered === null ? null : tracks[hovered];

  /**
   * Mystery roll. The landing card is drawn here rather than inside the ring
   * so the wheel stays a dumb renderer — it is handed a winner and asked to
   * arrive there convincingly.
   */
  const roll = () => {
    const ring = ringRef.current;
    if (!ring || ring.isSpinning()) return;
    const count = ring.count();
    if (count === 0) return;
    setHovered(null);
    setSpinning(true);
    ring.spinTo(Math.floor(Math.random() * count));
  };

  return (
    <section
      aria-label="DOTM music wheel"
      className="relative isolate flex h-full w-full overflow-hidden bg-[#901214]"
    >
      {/* One vignette across the whole surface — both panes read as the same
          room instead of two tones stitched together at the seam. */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_45%,rgba(0,0,0,0.12)_0%,rgba(0,0,0,0.62)_78%)]" />
      {/* Glass sheen: a soft diagonal highlight, the thing that reads as
          "glass" rather than just "translucent". */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.10)_0%,rgba(255,255,255,0)_28%,rgba(255,255,255,0)_72%,rgba(255,255,255,0.05)_100%)]" />

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
          // The retry that makes a freshly selected record actually start.
          onCanPlay={(e) => {
            if (isPlaying) void e.currentTarget.play().catch(() => undefined);
          }}
          onEnded={() => select(index + 1)}
        />
      )}

      {/* ── Left: the wheel ─────────────────────────────────────────────── */}
      <div
        ref={paneRef}
        className="relative z-10 flex min-w-0 flex-[1.05] items-center justify-center px-4 py-4"
      >
        {pane.width > 0 && (
          <motion.div
            initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={
              reduceMotion
                ? { duration: 0 }
                : { type: "tween", duration: 0.5, ease: EASE_OUT }
            }
            className="relative shrink-0"
            style={{ width: size, height: size }}
          >
            <VinylDisc size={size} centerLogo={CENTER_LOGO} centerLogoFullBleed />

            <div className="pointer-events-auto absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <CircleImage
                cardWidth={Math.round(size * CARD_WIDTH)}
                cardHeight={Math.round(size * CARD_HEIGHT)}
                rounded={16}
                ring={{
                  radiusX: Math.round(size * RING_RADIUS),
                  radiusY: Math.round(size * RING_RADIUS),
                  tilt: true,
                  repeat: 1,
                }}
                direction="anticlockwise"
                drag
                transition={{ type: "tween", ease: "linear", duration: 48 }}
                images={ringImages}
                activeIndex={index}
                popOut={Math.round(size * POP_OUT)}
                paused={Boolean(reduceMotion)}
                onCardClick={select}
                onCardHover={(i) => setHovered(i)}
                apiRef={ringRef}
                onSpinEnd={(landed) => {
                  setSpinning(false);
                  select(landed);
                }}
              />
            </div>

            <SeekerRing
              size={size}
              progress={progress}
              enabled={Boolean(src)}
              onSeek={seekTo}
            />

            <Transport
              size={size}
              isPlaying={isPlaying}
              canPlay={Boolean(src)}
              onPrevious={() => select(index - 1)}
              onToggle={togglePlay}
              onNext={() => select(index + 1)}
            />

            <SpinPin size={size} active={spinning} />

            <AnimatePresence>
              {hoveredTrack && !spinning && (
                <HoverLabel
                  size={size}
                  title={hoveredTrack.title}
                  playing={hovered === index && isPlaying}
                  hasAudio={Boolean(getAudioSource(hoveredTrack))}
                />
              )}
            </AnimatePresence>

            <MysteryRoll size={size} spinning={spinning} onRoll={roll} />
          </motion.div>
        )}
      </div>

      {/* ── Right: the record playing ───────────────────────────────────── */}
      {/* A floating glass card, not a slab that shares an edge with the wheel
          pane — the seam that used to read as a partition down the middle is
          gone because both panes now sit on the same maroon backdrop, with
          this one lifted off it by blur, border and inset highlight alone. */}
      <div className="relative z-10 my-5 mr-5 flex min-w-0 flex-1 flex-col items-center gap-3 rounded-[28px] border border-white/10 bg-white/[0.06] px-6 py-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_60px_-20px_rgba(0,0,0,0.65)] backdrop-blur-2xl">
        <NowPlaying
          track={track}
          albumName={meta?.albumName}
          durationLabel={meta?.durationMs ? msToClock(meta.durationMs) : null}
          // The clock lives here rather than inside the ring: the band
          // between the centre label and the sleeves is exactly wide enough
          // for the seeker and the transport row, and a third element there
          // could only have gone on top of the logo.
          elapsed={src ? `${clock(currentTime)} / ${clock(totalSeconds)}` : null}
        />
        <LyricRail
          trackId={track.id}
          seconds={currentTime}
          playing={isPlaying}
          reduceMotion={Boolean(reduceMotion)}
        />
      </div>
    </section>
  );
}

/* ── The seeker ─────────────────────────────────────────────────────────── */

/**
 * A thin yellow arc around the centre label, filling clockwise from twelve
 * o'clock as the song plays and closing the circle as it ends.
 *
 * Drawn as an SVG ring rather than a rotated element so the stroke keeps an
 * even width the whole way round, and turned back a quarter so it starts at
 * the top — the only place a progress ring reads as starting from.
 */
function SeekerRing({
  size,
  progress,
  enabled,
  onSeek,
}: {
  size: number;
  progress: number;
  enabled: boolean;
  onSeek: (fraction: number) => void;
}) {
  const radius = size * SEEKER_RADIUS;
  const stroke = Math.max(2.5, size * 0.006);
  const box = radius * 2 + stroke * 2;
  const circumference = 2 * Math.PI * radius;

  /** Click anywhere on the ring to jump to that point in the song. */
  const seekFromPoint = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!enabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    // atan2 measures from the positive x-axis; the ring starts at the top, so
    // a quarter turn is added before folding the result into [0,1).
    const turns = (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) / (Math.PI * 2);
    onSeek(turns % 1);
  };

  return (
    <svg
      viewBox={`0 0 ${box} ${box}`}
      width={box}
      height={box}
      role={enabled ? "slider" : "presentation"}
      aria-label={enabled ? "Seek" : undefined}
      aria-valuemin={enabled ? 0 : undefined}
      aria-valuemax={enabled ? 100 : undefined}
      aria-valuenow={enabled ? Math.round(progress * 100) : undefined}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={seekFromPoint}
      className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
      // The element spans the whole centre of the disc, but only the grab
      // ring below accepts pointers. Left interactive as a whole it would
      // have swallowed every press over the centre label and turned a click
      // on dead centre — where the angle is meaningless — into a seek.
      style={{ pointerEvents: "none", overflow: "visible" }}
    >
      <g transform={`rotate(-90 ${box / 2} ${box / 2})`}>
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth={stroke}
        />
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke={SEEKER_YELLOW}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          style={{ transition: "stroke-dashoffset 220ms linear" }}
        />
      </g>

      {/* The grab ring: invisible, concentric, and thick enough to hit
          without aiming. `pointer-events: stroke` confines it to the band
          itself, so the label inside and the vinyl outside stay untouched. */}
      {enabled && (
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="transparent"
          strokeWidth={Math.max(16, stroke * 6)}
          style={{ pointerEvents: "stroke", cursor: "pointer" }}
        />
      )}
    </svg>
  );
}

/* ── Transport ──────────────────────────────────────────────────────────── */

/**
 * Previous / play / next on one line, in the band of bare vinyl between the
 * centre label and the sleeves. The row swallows pointer-down so a press here
 * never reaches the ring underneath, which would otherwise read it as the
 * start of a drag and spin the wheel out from under the button.
 */
function Transport({
  size,
  isPlaying,
  canPlay,
  onPrevious,
  onToggle,
  onNext,
}: {
  size: number;
  isPlaying: boolean;
  canPlay: boolean;
  onPrevious: () => void;
  onToggle: () => void;
  onNext: () => void;
}) {
  const side = Math.max(28, Math.min(40, size * 0.062));
  const primary = side * 1.18;
  const glyph = Math.round(side * 0.42);

  return (
    <div
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
      style={{ top: `calc(50% + ${size * CONTROLS_CENTRE_Y}px)`, gap: side * 0.34 }}
    >
      <TransportButton label="Previous track" onClick={onPrevious} diameter={side}>
        <PreviousGlyph size={glyph} />
      </TransportButton>

      <TransportButton
        label={isPlaying ? "Pause" : "Play"}
        onClick={onToggle}
        diameter={primary}
        disabled={!canPlay}
        accent
      >
        {isPlaying ? (
          <PauseGlyph size={Math.round(glyph * 1.05)} />
        ) : (
          <PlayGlyph size={Math.round(glyph * 1.05)} />
        )}
      </TransportButton>

      <TransportButton label="Next track" onClick={onNext} diameter={side}>
        <NextGlyph size={glyph} />
      </TransportButton>
    </div>
  );
}

function TransportButton({
  label,
  onClick,
  diameter,
  disabled,
  accent,
  children,
}: {
  label: string;
  onClick: () => void;
  diameter: number;
  disabled?: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        width: diameter,
        height: diameter,
        ...(accent ? { backgroundColor: SEEKER_YELLOW } : {}),
      }}
      className={cn(
        "flex items-center justify-center rounded-full transition-[transform,background-color,border-color] duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black/60",
        "active:scale-95 disabled:pointer-events-none disabled:opacity-35",
        accent
          ? "border border-black/40 text-black shadow-[0_6px_18px_-6px_rgba(0,0,0,0.9)] hover:brightness-110"
          : "border border-white/25 bg-black/55 text-white backdrop-blur-sm hover:border-white/60 hover:bg-black/75",
      )}
    >
      {children}
    </button>
  );
}

function PlayGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M8 5.2v13.6a.8.8 0 0 0 1.23.67l10.3-6.8a.8.8 0 0 0 0-1.34L9.23 4.53A.8.8 0 0 0 8 5.2Z" />
    </svg>
  );
}

function PauseGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="6.5" y="4.5" width="4.2" height="15" rx="1.1" />
      <rect x="13.3" y="4.5" width="4.2" height="15" rx="1.1" />
    </svg>
  );
}

function PreviousGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="4.5" y="5" width="2.8" height="14" rx="1" />
      <path d="M20 6.1v11.8a.8.8 0 0 1-1.24.67l-8.7-5.9a.8.8 0 0 1 0-1.34l8.7-5.9A.8.8 0 0 1 20 6.1Z" />
    </svg>
  );
}

function NextGlyph({ size }: { size: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <rect x="16.7" y="5" width="2.8" height="14" rx="1" />
      <path d="M4 6.1v11.8a.8.8 0 0 0 1.24.67l8.7-5.9a.8.8 0 0 0 0-1.34l-8.7-5.9A.8.8 0 0 0 4 6.1Z" />
    </svg>
  );
}

/* ── Hover label ────────────────────────────────────────────────────────── */

/**
 * The hovered sleeve's title, in the empty band of vinyl at the top of the
 * wheel.
 *
 * It used to follow the sleeve around the ring, anchored on the same radius.
 * That reads well for a card at three or nine o'clock and badly everywhere
 * else: near the top and bottom it crossed the sleeves it was naming, and out
 * on the edge it ran past the pane. One fixed home solves both — and the band
 * between the seeker (0.19) and the sleeves (0.317) is bare vinyl whose only
 * occupant is the transport row, which sits at the bottom.
 *
 * Centred a quarter of the diameter above the middle, the label lands in the
 * mirror image of that row. Its width is the chord of the sleeves' inner
 * circle at that height, so it cannot reach them on either side.
 */
function HoverLabel({
  size,
  title,
  playing,
  hasAudio,
}: {
  size: number;
  title: string;
  playing: boolean;
  hasAudio: boolean;
}) {
  /**
   * The label lives *inside* the seeker ring, over the centre label.
   *
   * The band between the seeker and the sleeves looks like the obvious home
   * for it, and two passes tried to use it — but that annulus is only about
   * an eighth of the diameter thick, and a title long enough to wrap ("25TH
   * BDAY (confession)") pushes its corners straight through the sleeve ring
   * on one side and the seeker arc on the other. There is no width that fits
   * every title in a band that narrow.
   *
   * The disc inside the seeker has no such problem: it is a clean circle of
   * radius 0.19, nothing is drawn in it but the logo, and a box of this size
   * keeps its furthest corner well inside. Covering the logo costs nothing —
   * it is decorative, and it is only covered while the pointer rests on a
   * sleeve.
   */
  const innerRadius = size * SEEKER_RADIUS;
  const boxWidth = Math.min(size * 0.3, innerRadius * 1.62);
  const boxHeight = innerRadius * 0.62;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.16, ease: "easeOut" }}
      // Centred by `inset-0` + flex rather than a translate: framer-motion
      // owns this element's `transform` for the entrance, and a centring
      // translate written as a class is simply overwritten by it.
      className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
    >
      <div
        className="flex flex-col items-center justify-center rounded-full text-center"
        style={{
          width: boxWidth,
          maxHeight: boxHeight,
          // Just enough scrim to lift type off the logo art beneath it.
          background:
            "radial-gradient(ellipse at center, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.72) 55%, rgba(0,0,0,0) 100%)",
        }}
      >
        <span
          className="block overflow-hidden font-headline font-bold uppercase leading-tight tracking-[0.04em] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
          style={{ fontSize: Math.max(12, size * 0.031) }}
        >
          {title.replace(/\.mp3$/i, "")}
        </span>
        <span
          className={cn(
            "mt-1 block font-chrome uppercase tracking-[0.22em]",
            hasAudio ? "text-[#ffd400]" : "text-white/55",
          )}
          style={{ fontSize: Math.max(8, size * 0.018) }}
        >
          {playing ? "Now playing" : hasAudio ? "Click to play" : "No master yet"}
        </span>
      </div>
    </motion.div>
  );
}

/* ── Mystery roll ───────────────────────────────────────────────────────── */

/**
 * The pin the wheel is spun against — a needle that drops out of the centre
 * label and points at twelve o'clock, which is where `spinTo` lands its
 * winner.
 *
 * It exists only during a spin. A permanent marker over a wheel that is idly
 * turning would claim to be selecting something at every moment, which is the
 * opposite of what a pin means.
 */
function SpinPin({ size, active }: { size: number; active: boolean }) {
  const length = size * 0.078;
  const width = size * 0.028;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0.15 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.15 }}
          transition={{ type: "spring", stiffness: 420, damping: 22 }}
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 z-40 -translate-x-1/2"
          style={{
            // Grows upward from the label's edge, so the tip reaches into the
            // sleeve ring while its base stays tucked behind the logo — the
            // needle reads as emerging rather than simply appearing.
            top: `calc(50% - ${size * 0.1685 + length}px)`,
            transformOrigin: "50% 100%",
            width,
            height: length,
          }}
        >
          <svg viewBox="0 0 20 56" width={width} height={length} aria-hidden="true">
            <path d="M10 56 L1.5 14 A8.5 8.5 0 1 1 18.5 14 Z" fill={SEEKER_YELLOW} />
            <path
              d="M10 56 L1.5 14 A8.5 8.5 0 1 1 18.5 14 Z"
              fill="none"
              stroke="rgba(0,0,0,0.55)"
              strokeWidth="1.5"
            />
            <circle cx="10" cy="12" r="3.4" fill="rgba(0,0,0,0.6)" />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * The roll button, bottom-left of the wheel.
 *
 * It sits in the corner of the wheel's bounding box — the one region of this
 * pane the disc's circle never reaches — so it needs no clearance negotiated
 * with the ring, the seeker or the transport.
 */
function MysteryRoll({
  size,
  spinning,
  onRoll,
}: {
  size: number;
  spinning: boolean;
  onRoll: () => void;
}) {
  const diameter = Math.max(46, Math.min(66, size * 0.115));

  return (
    <button
      type="button"
      onClick={onRoll}
      disabled={spinning}
      aria-label="Mystery roll — spin the wheel and play whatever it lands on"
      title="Mystery roll"
      onMouseDown={(e) => e.stopPropagation()}
      style={{ width: diameter, height: diameter }}
      className={cn(
        "absolute bottom-0 left-0 z-40 flex flex-col items-center justify-center gap-0.5 rounded-full",
        "border border-[#ffd400]/50 bg-black/70 text-[#ffd400] backdrop-blur-sm",
        "shadow-[0_10px_26px_-10px_rgba(0,0,0,0.95)] transition-all duration-150",
        "hover:scale-105 hover:border-[#ffd400] hover:bg-black/85 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ffd400] focus-visible:ring-offset-2 focus-visible:ring-offset-black/60",
        "disabled:pointer-events-none disabled:opacity-45",
      )}
    >
      <motion.span
        animate={spinning ? { rotate: 360 } : { rotate: 0 }}
        transition={
          spinning ? { repeat: Infinity, ease: "linear", duration: 0.9 } : { duration: 0.3 }
        }
        className="flex items-center justify-center"
      >
        <svg
          viewBox="0 0 24 24"
          width={Math.round(diameter * 0.42)}
          height={Math.round(diameter * 0.42)}
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
          <path
            d="M12 2.6v18.8M2.6 12h18.8M5.4 5.4l13.2 13.2M18.6 5.4L5.4 18.6"
            stroke="currentColor"
            strokeWidth="1.1"
            opacity="0.55"
          />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      </motion.span>
      <span
        className="font-chrome uppercase leading-none tracking-[0.12em]"
        style={{ fontSize: Math.max(6, diameter * 0.13) }}
      >
        {spinning ? "Rolling" : "Roll"}
      </span>
    </button>
  );
}

/* ── Now playing ────────────────────────────────────────────────────────── */

function NowPlaying({
  track,
  albumName,
  durationLabel,
  elapsed,
}: {
  track: Track;
  albumName?: string;
  durationLabel: string | null;
  /** `0:42 / 3:02`, or null when this record has no master to play. */
  elapsed: string | null;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center">
      <motion.div
        key={track.id}
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: EASE_OUT }}
        className="relative aspect-square w-full max-w-[min(30vh,300px)] overflow-hidden rounded-xl shadow-[0_24px_50px_-20px_rgba(0,0,0,0.9)] ring-1 ring-white/15"
      >
        <Image
          src={artworkSrc(track)}
          alt={track.title}
          fill
          sizes="300px"
          className="object-cover"
        />
      </motion.div>

      <h3 className="mt-3 text-center font-headline text-3xl leading-tight tracking-wide text-white sm:text-4xl">
        {track.title.replace(/\.mp3$/i, "")}
      </h3>
      {/* The credit line and the clock, both roughly doubled. Lonedruida sets
          small sizes tight and dark, and at 12px this line was a grey bar you
          could tell was text without being able to read. The title above keeps
          its lead because it moves up with them — same hierarchy, legible. */}
      <p className="mt-1 text-center font-body text-base text-white/65 sm:text-lg">
        {track.artist}
        {albumName ? ` · ${albumName}` : ""}
        {durationLabel ? ` · ${durationLabel}` : ""}
      </p>

      <p
        className={cn(
          "mt-2 font-chrome text-[19px] tabular-nums tracking-[0.2em]",
          elapsed ? "text-[#ffd400]" : "text-white/35",
        )}
      >
        {elapsed ?? "NO MASTER YET"}
      </p>

      {/* Four marks now, not one. Spotify keeps its place at the head of the
          row; Apple Music, JioSaavn and YouTube Music follow at the same size.
          See `PlatformLinkRow` for why none of them is ever a dead control. */}
      <PlatformLinkRow
        trackId={track.id}
        title={track.title.replace(/\.mp3$/i, "")}
        spotifyId={track.spotifyId}
        isDotm
        className="mt-2.5"
      />
    </div>
  );
}
