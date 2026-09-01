"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCountdown } from "@/hooks/use-countdown";
import { siteSettings } from "@/content/site-settings";
import { cn } from "@/lib/utils";

/**
 * THE SPECTRUM countdown, as the top bar's centrepiece.
 *
 * This is the first thing a visitor sees on every page, and it used to be a
 * single run of text — `70D 04:33:07` — carrying the same weight as the
 * locale switcher beside it. A date the whole site is building toward should
 * look like one.
 *
 * Each digit is its own split-flap cell and rolls when it changes, so the
 * seconds column is visibly alive while nothing else moves. Only digits that
 * actually change re-animate: each cell is keyed on its value, so React
 * leaves the other seven untouched.
 *
 * One treatment serves both personas. The top bar carries its own dark
 * `--chrome-*` scale — DEV navy, DOTM near-black — so a single dark-glass
 * design reads correctly in both instead of needing two variants.
 */

const pad = (n: number) => n.toString().padStart(2, "0");

export function SpectrumCountdown({ className }: { className?: string }) {
  const state = useCountdown(siteSettings.countdownTarget);
  const reduceMotion = useReducedMotion();

  if (state.phase === "arrived") {
    return (
      <div className={cn("flex items-center justify-center gap-2", className)}>
        <span className="relative flex h-2 w-2" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff2f4d] opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-[#ff2f4d]" />
        </span>
        <span className="font-chrome text-sm tracking-[0.28em] text-white">
          THE SPECTRUM IS LIVE
        </span>
      </div>
    );
  }

  const urgent = state.phase === "t24h" && siteSettings.featureFlags.t24hTriggerEnabled;

  const units: Array<{ value: number; label: string; hot?: boolean }> = [
    { value: state.days, label: "DAYS" },
    { value: state.hours, label: "HRS" },
    { value: state.minutes, label: "MIN" },
    { value: state.seconds, label: "SEC", hot: true },
  ];

  return (
    <div className={cn("flex items-center justify-center gap-3", className)}>
      {/* Eyebrow hides on narrow widths so the digits never wrap. */}
      <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
        <span className="relative flex h-1.5 w-1.5" aria-hidden="true">
          <span
            className={cn(
              "absolute inline-flex h-full w-full rounded-full bg-[#ff2f4d]",
              !reduceMotion && "animate-ping opacity-75",
            )}
          />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#ff2f4d]" />
        </span>
        <span
          className={cn(
            // Up from 10px. At that size, in either display face, "The
            // Spectrum" was a grey smudge beside a row of lit digits — and it
            // is the one word on the bar that says what is being counted.
            "font-chrome text-[13px] uppercase leading-none tracking-[0.3em]",
            urgent ? "text-[#ff6b7a]" : "text-white/70",
          )}
        >
          {urgent ? "Final 24h" : "The Spectrum"}
        </span>
      </div>

      <div className="flex items-end gap-1.5" role="timer">
        {units.map((unit, i) => (
          <div key={unit.label} className="flex items-end gap-1.5">
            <Unit
              value={unit.value}
              label={unit.label}
              hot={unit.hot}
              urgent={urgent}
              reduceMotion={!!reduceMotion}
            />
            {i < units.length - 1 && (
              <span
                aria-hidden="true"
                className="pb-4 font-chrome text-sm leading-none text-white/25"
              >
                :
              </span>
            )}
          </div>
        ))}
      </div>

      {/* One accessible reading of the whole timer, so a screen reader gets a
          sentence rather than eight loose digits. */}
      <span className="sr-only">
        {state.days} days, {state.hours} hours, {state.minutes} minutes and {state.seconds}{" "}
        seconds until The Spectrum.
      </span>
    </div>
  );
}

function Unit({
  value,
  label,
  hot,
  urgent,
  reduceMotion,
}: {
  value: number;
  label: string;
  hot?: boolean;
  urgent: boolean;
  reduceMotion: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex gap-0.5">
        {pad(value)
          .split("")
          .map((digit, i) => (
            <Cell
              key={i}
              digit={digit}
              hot={hot}
              urgent={urgent}
              reduceMotion={reduceMotion}
            />
          ))}
      </div>
      {/* DAYS / HRS / MIN / SEC. 8px was below the point where a display face
          resolves into letters at all; these are the captions that say which
          number is which. */}
      <span className="font-chrome text-[10px] uppercase leading-none tracking-[0.2em] text-white/55">
        {label}
      </span>
    </div>
  );
}

function Cell({
  digit,
  hot,
  urgent,
  reduceMotion,
}: {
  digit: string;
  hot?: boolean;
  urgent: boolean;
  reduceMotion: boolean;
}) {
  const accent = urgent || hot;

  return (
    <span
      className={cn(
        // The cell grows with the digit inside it: a bigger figure in the old
        // 19px box would have been clipped by `overflow-hidden` mid-flip.
        "relative flex h-8 w-[22px] items-center justify-center overflow-hidden rounded-[3px] border",
        "bg-gradient-to-b from-white/[0.14] to-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]",
        accent ? "border-[#ff2f4d]/50" : "border-white/15",
      )}
    >
      {/* The split-flap seam. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-px bg-black/40"
      />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={digit}
          initial={reduceMotion ? false : { y: "-110%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { y: "110%", opacity: 0 }}
          transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            "font-chrome text-[18px] leading-none tabular-nums",
            accent ? "text-[#ff5c73]" : "text-white",
          )}
        >
          {digit}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export default SpectrumCountdown;
