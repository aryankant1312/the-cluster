"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * Counts 0 -> target once, on mount.
 *
 * Driven by elapsed time read inside requestAnimationFrame rather than by
 * accumulating per-frame increments, so a dropped frame shifts nothing — the
 * value is a pure function of elapsed time and always lands exactly on the
 * target.
 *
 * A timer backstops the animation. Browsers throttle or suspend rAF in a
 * background tab, so a visitor who opens the site in one and comes back would
 * otherwise find the counter frozen at 0 — a real figure misreported as
 * nothing. If the animation did run, the timeout sets what is already there.
 *
 * Reduced motion is served by the return value rather than by writing the
 * final figure into state, which keeps setState out of the effect body.
 */

export const COUNT_UP_MS = 2600;

export function useCountUp(target: number | null, durationMs = COUNT_UP_MS) {
  const [value, setValue] = useState(0);
  const reduced = useReducedMotion();
  const frameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (target === null || reduced) return;

    const start = performance.now();
    // easeOutExpo — quick off the mark, with a settle long enough to leave
    // the final digits readable instead of a blur.
    const ease = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      setValue(target * ease(t));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);

    const settle = setTimeout(() => setValue(target), durationMs + 150);

    return () => {
      if (frameRef.current !== undefined) cancelAnimationFrame(frameRef.current);
      clearTimeout(settle);
    };
  }, [target, durationMs, reduced]);

  if (target === null) return null;
  return reduced ? target : value;
}
