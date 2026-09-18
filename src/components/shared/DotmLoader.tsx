"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * THE SHARED WINDOW LOADER — the black ball bouncing over the M while the
 * window already visible behind it is blurred. It has no coloured plate or
 * central bloom, so loading feels like the current window coming into focus.
 */

/** How long the fade-out runs. Must match `duration-300` on the root. */
const FADE_MS = 300;
/** One complete down-and-up bounce. Kept in sync with globals.css. */
const BOUNCE_MS = 1200;
/** Never reveal the loaded surface before the mark has bounced twice. */
const MIN_VISIBLE_MS = BOUNCE_MS * 2;

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

  useEffect(() => {
    const timer = setTimeout(() => setMinimumElapsed(true), MIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

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
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 18% 22%, rgba(255,255,255,.92) 0%, rgba(255,255,255,.48) 23%, transparent 48%), radial-gradient(ellipse at 78% 68%, rgba(255,255,255,.78) 0%, rgba(225,225,222,.42) 28%, transparent 58%), radial-gradient(circle at 10% 82%, rgba(255,0,51,.20), transparent 28%), radial-gradient(circle at 88% 16%, rgba(201,0,32,.16), transparent 30%), linear-gradient(135deg, rgba(255,255,255,.30), rgba(205,205,202,.12))",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.16] mix-blend-multiply"
        style={{
          backgroundImage:
            "repeating-linear-gradient(118deg, rgba(30,30,30,.20) 0, rgba(30,30,30,.20) 1px, transparent 1px, transparent 4px)",
        }}
      />

      <div className="relative aspect-square w-[min(46vmin,300px)] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.44),rgba(255,255,255,0)_67%)]">
        {/* `overflow-visible`, as in the source file: the ball leaves the
            viewBox at the bottom of its drop and would otherwise be clipped. */}
        <svg
          viewBox="0 0 1000 1000"
          className="relative h-full w-full overflow-visible drop-shadow-[0_10px_22px_rgba(0,0,0,0.34)]"
          aria-hidden="true"
        >
          <image href="/images/dotm/loader-mark.png" x="0" y="0" width="1000" height="1000" />

          <g className="dotm-loader-bounce">
            <circle cx="498" cy="223" r="61" fill="#050505" />
          </g>
        </svg>
      </div>

      <span className="sr-only">{label}</span>
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
export function DotmWindowLoader({ label }: { label?: string }) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-transparent">
      <DotmLoader show label={label} />
    </div>
  );
}

export default DotmLoader;
