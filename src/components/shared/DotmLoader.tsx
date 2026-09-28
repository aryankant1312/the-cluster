"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { completeWindowLoaderRotation } from "@/lib/window-loader";

/**
 * THE SHARED WINDOW LOADER — the black ball bouncing over the M while the
 * window already visible behind it is blurred. It has no coloured plate or
 * central bloom, so loading feels like the current window coming into focus.
 */

/** How long the fade-out runs. Must match `duration-300` on the root. */
const FADE_MS = 300;
/** The supplied video completes one down-and-up bounce in roughly 1.6s. */
const BOUNCE_SECONDS = 1.6;
/** Keep the shared loader brief while still letting the motion read clearly. */
const DEFAULT_BOUNCE_COUNT = 3;

export function LoaderVideo({
  label = "Loading",
  gateKey,
  bounceCount = DEFAULT_BOUNCE_COUNT,
  onBounceSequenceComplete,
}: {
  label?: string;
  gateKey?: string;
  /** Number of complete bounces before a gated window may be revealed. */
  bounceCount?: number;
  onBounceSequenceComplete?: () => void;
}) {
  const completedSequence = useRef(false);

  const completeSequence = () => {
    if (completedSequence.current) return;
    completedSequence.current = true;
    if (gateKey) completeWindowLoaderRotation(gateKey);
    onBounceSequenceComplete?.();
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-black px-6">
      <video
        autoPlay
        muted
        playsInline
        preload="auto"
        aria-hidden="true"
        className="aspect-square w-[min(58vmin,360px)] object-contain"
        src="/videos/window-loader.mp4"
        onTimeUpdate={(event) => {
          const revealAt = Math.max(1, bounceCount) * BOUNCE_SECONDS;
          if (event.currentTarget.currentTime >= revealAt) completeSequence();
        }}
        onEnded={(event) => {
          // Fallback for browsers that throttle `timeupdate`; never leave a
          // gated window waiting if the video reaches its natural end.
          completeSequence();
          event.currentTarget.currentTime = 0;
          void event.currentTarget.play().catch(() => undefined);
        }}
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export function DotmLoader({
  show,
  label = "Loading",
  className,
}: {
  /** False starts the fade; the overlay unmounts itself when it finishes. */
  show: boolean;
  label?: string;
  className?: string;
}) {
  /**
   * Kept mounted for one fade after `show` drops.
   *
   * Unmounting on the same tick would cut the loader off mid-bounce, which
   * over a wall of photographs reads as a flash rather than as a hand-over.
   * The timer is the only reason this component holds state at all.
   *
   * `faded` is only ever set from the timer's callback, and cleared by the
   * render-time adjustment below — React's documented way to reset state when
   * a prop changes, and the reason there is no `setState` in the effect. A
   * `setMounted(true)` there would have re-rendered the whole overlay a second
   * time on every open for a value the render already knows.
   */
  const [faded, setFaded] = useState(false);
  const [wasShown, setWasShown] = useState(show);
  const [minimumElapsed, setMinimumElapsed] = useState(false);

  if (wasShown !== show) {
    setWasShown(show);
    if (show) setFaded(false);
  }

  const visible = show || !minimumElapsed;

  useEffect(() => {
    if (visible) return;
    const t = setTimeout(() => setFaded(true), FADE_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!visible && faded) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "absolute inset-0 z-40 flex items-center justify-center overflow-hidden bg-[#f4f4f1]/55 backdrop-blur-lg transition-opacity duration-300",
        // Inert once it is on its way out, so a click during the fade reaches
        // the content rather than the thing leaving.
        visible ? "opacity-100" : "pointer-events-none opacity-0",
        className,
      )}
    >
      <LoaderVideo
        label={label}
        onBounceSequenceComplete={() => setMinimumElapsed(true)}
      />
    </div>
  );
}

/**
 * The same loader as a whole window's worth of surface.
 *
 * `DotmLoader` is `absolute inset-0` because it is an overlay, and an overlay
 * needs a positioned parent. A `next/dynamic` `loading:` fallback has no parent
 * of its own — it *is* the window's contents for as long as the chunk is in
 * flight — so it gets one here rather than at each of the four call sites.
 */
export function DotmWindowLoader({ label, gateKey }: { label?: string; gateKey?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      {gateKey ? <LoaderVideo label={label} gateKey={gateKey} /> : <DotmLoader show label={label} />}
    </div>
  );
}

export default DotmLoader;
